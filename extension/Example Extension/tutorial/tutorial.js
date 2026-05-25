function resetTutorial() {
  window.location.href = "tutorial.html";
}

function initializeExtensionToggle() {
  const toggle = document.getElementById("extensionToggle");

  if (!toggle) return;

  chrome.storage.local.get(
    "extensionEnabled",
    ({ extensionEnabled = true }) => {
      if (toggle) {
        toggle.checked = extensionEnabled;
      }
    },
  );

  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;

    // Update storage
    chrome.storage.local.set({ extensionEnabled: enabled });

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url) {
          const isSupportedPlatform =
            tab.url.includes("axiom") ||
            tab.url.includes("trade.padre.gg") ||
            tab.url.includes("photon-sol.tinyastro.io") ||
            tab.url.includes("gmgn.ai");

          if (isSupportedPlatform) {
            chrome.tabs
              .sendMessage(tab.id, {
                type: "EXTENSION_TOGGLE",
                enabled: enabled,
              })
              .catch(() => {
                console.debug("Could not send toggle message to tab:", tab.id);
              });
          }
        }
      });
    });
  });
}

const PLATFORM_CONFIG = {
  gmgn: { page: "gmgn-tutorial.html" },
  axiom: { page: "axiom-tutorial.html" },
  padre: { page: "padre-tutorial.html" },
};

document.addEventListener("DOMContentLoaded", () => {
  const restartButton = document.querySelector(".restart-button");
  if (restartButton) {
    restartButton.addEventListener("click", resetTutorial);
  }

  // Platform selection handlers
  const platformButtons = document.querySelectorAll(".platform-button");
  if (platformButtons.length > 0) {
    platformButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const platform = button.dataset.platform;
        const config = PLATFORM_CONFIG[platform];

        if (config) {
          window.location.href = config.page;
        }
      });
    });
  }

  // Handle start tutorial button
  const startTutorialButton = document.querySelector(
    ".next-button.tutorial-continue",
  );
  if (startTutorialButton) {
    startTutorialButton.addEventListener("click", () => {
      window.location.href = "general-tutorial.html";
    });
  }

  // Handle carousel
  const carousel = document.querySelector(".carousel-container");
  if (carousel) {
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dotsContainer = document.querySelector(".carousel-dots");
    const prevButton = document.querySelector(".carousel-button.prev");
    const nextButton = document.querySelector(".carousel-button.next");
    let currentSlide = 0;

    // Create dots
    slides.forEach((_, index) => {
      const dot = document.createElement("div");
      dot.className = `carousel-dot${index === 0 ? " active" : ""}`;
      dot.addEventListener("click", () => goToSlide(index));
      dotsContainer.appendChild(dot);
    });

    // Show first slide
    slides[0].classList.add("active");

    function goToSlide(index) {
      slides[currentSlide].classList.remove("active");
      dotsContainer.children[currentSlide].classList.remove("active");

      currentSlide = index;

      slides[currentSlide].classList.add("active");
      dotsContainer.children[currentSlide].classList.add("active");

      // Check if this is the final slide
      const isLastSlide = currentSlide === slides.length - 1;
      const platformLogo = document.querySelector(".logo-placeholder");
      const platformName = document.querySelector(".tutorial-title");
      if (platformLogo && platformName) {
        platformLogo.style.display = isLastSlide ? "none" : "block";
        platformName.style.display = isLastSlide ? "none" : "block";
      }
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % slides.length);
    }

    function prevSlide() {
      goToSlide((currentSlide - 1 + slides.length) % slides.length);
    }

    prevButton.addEventListener("click", prevSlide);
    nextButton.addEventListener("click", nextSlide);

    // Handle keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    });
  }

  // Only initialize toggle on the main tutorial page
  if (window.location.pathname.endsWith("tutorial.html")) {
    initializeExtensionToggle();
  }

  // Free trial button — only present on general-tutorial.html
  const freeTrialBtn = document.getElementById("free-trial-btn");
  if (freeTrialBtn) {
    freeTrialBtn.addEventListener("click", () => {
      freeTrialBtn.disabled = true;
      chrome.runtime.sendMessage({ type: "getInstallationId" }, (response) => {
        freeTrialBtn.disabled = false;
        const id = response?.installationId;
        if (id) {
          chrome.tabs.create({ url: `https://mockape.com/free-trial?iid=${id}` });
        }
      });
    });
  }
});

window.resetTutorial = resetTutorial;
