const VIP_STORAGE_KEY = "vipBundle";
const VALIDATION_ENDPOINT = "https://api.mockape.com/validatecode";
const INSTALLATION_ID_KEY = "installationId";

const inflightValidations = new Map();

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await getOrCreateInstallationId();
    setTimeout(() => {
      chrome.windows.create({
        url: chrome.runtime.getURL("tutorial/tutorial.html"),
        type: "popup",
        width: 400,
        height: 600,
        focused: true,
      });
    }, 2000); //Small delay to let Chrome permissions dialog close
  }
});

async function getOrCreateInstallationId() {
  const stored = await storageGet([INSTALLATION_ID_KEY]);
  if (stored[INSTALLATION_ID_KEY]) return stored[INSTALLATION_ID_KEY];
  const id = crypto.randomUUID();
  await storageSet({ [INSTALLATION_ID_KEY]: id });
  return id;
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.includes("axiom.trade") ||
      tab.url.includes("trade.padre.gg") ||
      tab.url.includes("photon-sol.tinyastro.io") ||
      tab.url.includes("gmgn.ai") ||
      // EXCLUDE_PRODUCTION_START
      tab.url.includes("localhost") ||
      tab.url.includes("127.0.0.1"))
    // EXCLUDE_PRODUCTION_END
  ) {
    chrome.tabs.sendMessage(tabId, { type: "URL_CHANGED" }).catch((error) => {
      console.debug(`Error sending message to tab: ${error}`);
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) {
    return;
  }

  if (message.type === "validateVipCode") {
    handleValidateVipCode(message, sendResponse);
    return true;
  }

  if (message.type === "clearVipBundle") {
    handleVipBundleClear(sendResponse);
    return true;
  }

  if (message.type === "getInstallationId") {
    getOrCreateInstallationId()
      .then((id) => sendResponse({ installationId: id }))
      .catch(() => sendResponse({ installationId: null }));
    return true;
  }
});

async function handleValidateVipCode(message, sendResponse) {
  const code = normalizeCode(message.code);
  if (!code) {
    sendResponse({
      success: false,
      error: "Activation code missing.",
      cleared: false,
    });
    return;
  }

  const reason = message.reason || "manual";
  const validationPromise = getOrStartValidation(code, reason);
  validationPromise
    .then((result) => sendResponse(result))
    .catch((error) => {
      console.warn("[VIP][bg] Unhandled validation error:", error.message);
      sendResponse({
        success: false,
        error: error.message || "Validation failed.",
      });
    });
}

async function handleVipBundleClear(sendResponse) {
  try {
    await clearVipBundleStorage();
    sendResponse({ success: true });
  } catch (error) {
    console.warn("[VIP][bg] Failed to clear VIP bundle:", error.message);
    sendResponse({ success: false, error: error.message });
  }
}

function getOrStartValidation(code, reason) {
  const existing = inflightValidations.get(code);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const payload = await requestValidation(code);

      const normalizedPayload = { ...payload };
      if (!normalizedPayload.activationCode) {
        normalizedPayload.activationCode = code;
      }

      const validatedAt = new Date().toISOString();
      const bundleSalt = await persistVipBundleStorage(
        normalizedPayload.activationCode,
        normalizedPayload,
        validatedAt,
      );

      return {
        success: true,
        payload: normalizedPayload,
        validatedAt,
        bundleSalt,
      };
    } catch (error) {
      if (error.clearState) {
        await clearVipBundleStorage();
      }

      return {
        success: false,
        error: error.message || "Activation code rejected.",
        cleared: Boolean(error.clearState),
      };
    } finally {
      inflightValidations.delete(code);
    }
  })();

  inflightValidations.set(code, promise);
  return promise;
}

async function requestValidation(code) {
  let response;
  try {
    response = await fetch(VALIDATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentCode: code }),
      credentials: "omit",
    });
  } catch (networkError) {
    console.warn("[VIP][bg] Validation network error:", networkError);
    const error = new Error("Network error during validation.");
    error.clearState = true;
    throw error;
  }

  if (!response.ok) {
    let errorMessage = `Validation failed (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch (_ignored) {
      // Ignore JSON parse failures – fall back to default message.
    }
    const error = new Error(errorMessage);
    error.clearState = true;
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    console.warn("[VIP][bg] Failed to parse validation payload:", parseError);
    const error = new Error("Invalid validation payload.");
    error.clearState = true;
    throw error;
  }

  if (!payload || payload.valid !== true) {
    const error = new Error(payload?.error || "Activation code rejected.");
    error.clearState = true;
    throw error;
  }

  return payload;
}

function isTokenCurrent(token) {
  return token === activeValidationToken;
}

async function persistVipBundleStorage(
  extensionCode,
  extensionCodeData,
  extensionCodeValidatedAt,
) {
  const serialized = JSON.stringify({
    extensionCode,
    extensionCodeData,
    extensionCodeValidatedAt,
  });

  const bundle = await buildBundle(serialized);
  await storageSet({ [VIP_STORAGE_KEY]: bundle });
  return bundle.salt;
}

async function buildBundle(serialized) {
  const payload = encodeToBase64(serialized);
  const existing = await getStoredBundle();
  const salt = existing?.salt || generateSalt();
  const proof = await computeProof(payload, salt);
  return { payload, proof, salt };
}

async function clearVipBundleStorage() {
  await storageRemove([VIP_STORAGE_KEY]);
}

function storageSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function storageRemove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(items || {});
    });
  });
}

async function getStoredBundle() {
  try {
    const result = await storageGet([VIP_STORAGE_KEY]);
    return result[VIP_STORAGE_KEY] || null;
  } catch (error) {
    console.warn("[VIP][bg] Failed to read stored VIP bundle:", error.message);
    return null;
  }
}

async function computeProof(payload, salt) {
  return sha256Hex(`${payload}::${salt}`);
}

function encodeToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt() {
  const random = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  random.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function normalizeCode(code) {
  if (typeof code !== "string") {
    return "";
  }
  return code.trim().toUpperCase();
}
