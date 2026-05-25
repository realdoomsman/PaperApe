class ExitStrategy {
  #cleanupFunctions = [];
  #debounceTimers = new Map();
  constructor(e) {
    if (!e) throw new Error("Elements are required for ExitStrategy");
    ((this.elements = e),
      (this.isOpen = !1),
      (this.strategies = []),
      this.init());
  }
  debounce(s, i, n) {
    return (...e) => {
      this.#debounceTimers.has(n) && clearTimeout(this.#debounceTimers.get(n));
      const t = setTimeout(() => {
        (s.apply(this, e), this.#debounceTimers.delete(n));
      }, i);
      this.#debounceTimers.set(n, t);
    };
  }
  init() {
    (this.setupElements(), this.setupEventListeners());
  }
  setupElements() {
    ((this.exitToggle = document.querySelector(".exit-toggle")),
      (this.exitContainer = document.querySelector(".exit-strategy-container")),
      (this.exitContent = document.querySelector(".exit-strategy-content")),
      this.exitToggle &&
        this.exitContainer &&
        this.exitContent &&
        this.renderAddButton());
  }
  setupEventListeners() {
    if (this.exitToggle) {
      const e = () => {
          this.toggle();
        },
        t =
          (this.exitToggle.addEventListener("mousedown", e),
          this.#cleanupFunctions.push(() => {
            this.exitToggle.removeEventListener("mousedown", e);
          }),
          (e) => {
            const t = document.querySelector(".exit-strategy-dropdown"),
              s = document.querySelector(".exit-add-button");
            !t ||
              "none" === t.style.display ||
              t.contains(e.target) ||
              s.contains(e.target) ||
              (t.style.display = "none");
          });
      (document.addEventListener("mousedown", t),
        this.#cleanupFunctions.push(() => {
          document.removeEventListener("mousedown", t);
        }));
    }
  }
  toggle() {
    if (((this.isOpen = !this.isOpen), this.isOpen))
      ((this.exitContainer.style.display = "block"),
        this.exitToggle.classList.add("active"));
    else {
      ((this.exitContainer.style.display = "none"),
        this.exitToggle.classList.remove("active"));
      const e = document.querySelector(".exit-strategy-dropdown");
      e && (e.style.display = "none");
    }
  }
  renderAddButton() {
    if (this.exitContent) {
      let e = this.exitContent.querySelector(".exit-strategy-add");
      if (!e) {
        const n = document.createElement("div");
        ((n.innerHTML = TRADING_TEMPLATES.EXIT_STRATEGY_ADD_BUTTON),
          (e = n.firstElementChild),
          this.exitContent.insertBefore(e, this.exitContent.firstChild));
      }
      const t = e.querySelector(".exit-add-button"),
        i = e.querySelector(".exit-strategy-dropdown"),
        s = e.querySelectorAll(".exit-dropdown-item");
      if (t && i) {
        const a = (e) => {
          e.stopPropagation();
          const t = "block" === i.style.display;
          i.style.display = t ? "none" : "block";
        };
        (t.addEventListener("mousedown", a),
          this.#cleanupFunctions.push(() => {
            t.removeEventListener("mousedown", a);
          }));
      }
      s.forEach((s) => {
        const e = (e) => {
          e.stopPropagation();
          const t = s.getAttribute("data-type");
          (this.addStrategy(t), (i.style.display = "none"));
        };
        (s.addEventListener("mousedown", e),
          this.#cleanupFunctions.push(() => {
            s.removeEventListener("mousedown", e);
          }));
      });
    }
  }
  setupRemoveButton(e, t) {
    const s = e.querySelector(".exit-strategy-remove");
    if (s) {
      const i = () => {
        this.removeStrategy(t);
      };
      (s.addEventListener("mousedown", i),
        this.#cleanupFunctions.push(() => {
          s.removeEventListener("mousedown", i);
        }));
    }
  }
  setupInputListeners(e, t) {
    const l = e.querySelector(".exit-trigger-input"),
      c = e.querySelector(".exit-amount-input"),
      s = () => {
        const s = this.strategies.find((e) => e.id === t);
        if (s) {
          let e = parseFloat(l?.value) || 0,
            t = parseFloat(c?.value) || 0;
          const i = 100,
            n = 1e4,
            a = 100;
          if (
            ("stop-loss" === s.type || "trailing-stop" === s.type
              ? (e = Math.min(e, i))
              : "take-profit" === s.type && (e = Math.min(e, n)),
            (t = Math.min(Math.max(t, 0), a)),
            l && parseFloat(l.value) !== e && (l.value = e),
            c && parseFloat(c.value) !== t && (c.value = t),
            0 < e && 0 < t)
          ) {
            ((s.trigger = e), (s.amount = t));
            const o = AppState?.trading?.entryPrice;
            if (o && 0 < o) {
              const r = e / 100;
              "stop-loss" === s.type
                ? (s.targetPrice = o * (1 - r))
                : "trailing-stop" === s.type
                  ? ((s.targetPrice = o * (1 - r)), (s.highestSeenPrice = o))
                  : "take-profit" === s.type && (s.targetPrice = o * (1 + r));
            }
          } else
            ((s.trigger = 0),
              (s.amount = 0),
              (s.targetPrice = null),
              "trailing-stop" === s.type && (s.highestSeenPrice = null));
          (this.saveSnapshotIfInPosition().catch((e) => {}),
            this._emitStrategyMarkersUpdate());
        }
      },
      i = this.debounce(s, 2e3, "strategy-" + t);
    (l &&
      (l.addEventListener("input", i),
      this.#cleanupFunctions.push(() => {
        l.removeEventListener("input", i);
      })),
      c &&
        (c.addEventListener("input", i),
        this.#cleanupFunctions.push(() => {
          c.removeEventListener("input", i);
        })));
  }
  addStrategy(e) {
    if (this.exitContent) {
      const t = e + "-" + Date.now(),
        s = document.createElement("div"),
        i =
          ((s.innerHTML = TRADING_TEMPLATES.EXIT_STRATEGY_ENTRY(e)),
          s.firstElementChild);
      (i.setAttribute("data-id", t),
        this.exitContent.appendChild(i),
        this.strategies.push({
          id: t,
          type: e,
          trigger: 0,
          amount: 0,
          targetPrice: null,
          highestSeenPrice: null,
          element: i,
        }),
        this.saveSnapshotIfInPosition().catch((e) => {}),
        this.setupRemoveButton(i, t),
        this.setupInputListeners(i, t));
    }
  }
  removeStrategy(t) {
    const e = this.strategies.find((e) => e.id === t);
    e &&
      (e.element && e.element.parentNode && e.element.remove(),
      (this.strategies = this.strategies.filter((e) => e.id !== t)),
      this.saveSnapshotIfInPosition().catch((e) => {}),
      this._emitStrategyMarkersUpdate());
  }
  getStrategies() {
    return this.strategies;
  }
  serializeStrategies() {
    return this.strategies.map((e) => ({
      id: e.id,
      type: e.type,
      trigger: e.trigger,
      amount: e.amount,
      targetPrice: e.targetPrice,
    }));
  }
  restoreStrategies(e) {
    if (e && Array.isArray(e) && this.exitContent) {
      this.clearStrategies();
      for (var t of e)
        if (t.type && t.id) {
          const i = document.createElement("div"),
            n =
              ((i.innerHTML = TRADING_TEMPLATES.EXIT_STRATEGY_ENTRY(t.type)),
              i.firstElementChild),
            a =
              (n.setAttribute("data-id", t.id),
              this.exitContent.appendChild(n),
              {
                id: t.id,
                type: t.type,
                trigger: t.trigger || 0,
                amount: t.amount || 0,
                targetPrice: t.targetPrice || null,
                highestSeenPrice: null,
                element: n,
              }),
            o =
              (this.strategies.push(a), n.querySelector(".exit-trigger-input")),
            r = n.querySelector(".exit-amount-input");
          (o && 0 < a.trigger && (o.value = a.trigger),
            r && 0 < a.amount && (r.value = a.amount),
            this.setupRemoveButton(n, t.id),
            this.setupInputListeners(n, t.id));
        }
      const s = AppState?.trading?.entryPrice;
      (s && 0 < s && this.updateTargetPrices(s),
        this.isOpen || this.toggle(),
        this._emitStrategyMarkersUpdate());
    }
  }
  async saveSnapshotIfInPosition() {
    if (AppState?.trading?.inPosition)
      try {
        const e = AppState.config.platform,
          t = PLATFORM_PATTERNS[e];
        if (t) {
          const s = getTradeId(window.location.href, t.idPattern);
          if (s) {
            const i = this.serializeStrategies();
            await SnapshotManager.updateSnapshot(e, s, { strategies: i });
          }
        }
      } catch (e) {}
  }
  updateTargetPrices(e) {
    if (e && !(e <= 0))
      for (var t of this.strategies)
        if (0 < t.trigger) {
          const s = t.trigger / 100;
          "stop-loss" === t.type
            ? (t.targetPrice = e * (1 - s))
            : "trailing-stop" === t.type
              ? ((t.targetPrice = e * (1 - s)), (t.highestSeenPrice = e))
              : "take-profit" === t.type && (t.targetPrice = e * (1 + s));
        } else
          ((t.targetPrice = null),
            "trailing-stop" === t.type && (t.highestSeenPrice = null));
  }
  clearStrategies() {
    (this.strategies.forEach((e) => {
      e.element && e.element.parentNode && e.element.remove();
    }),
      (this.strategies = []),
      this._emitStrategyMarkersUpdate());
  }
  _emitStrategyMarkersUpdate() {
    if ("function" == typeof window.TVMarkerInjector?.updateStrategyLines)
      try {
        const t = AppState?.config?.platform,
          s = t ? window.PLATFORM_PATTERNS?.[t] : null;
        let e = null;
        s &&
          s.idPattern &&
          (e = window.getTradeId?.(window.location.href, s.idPattern));
        const i = 1e9,
          n = this.strategies
            .filter((e) => e.targetPrice && 0 < e.targetPrice)
            .map((e) => ({ type: e.type, targetMcap: e.targetPrice * i }));
        window.TVMarkerInjector.updateStrategyLines(e, n);
      } catch (e) {}
  }
  destroy() {
    (this.#debounceTimers.forEach((e) => {
      clearTimeout(e);
    }),
      this.#debounceTimers.clear(),
      this.#cleanupFunctions.forEach((e) => {
        try {
          e();
        } catch (e) {}
      }),
      (this.#cleanupFunctions = []),
      this.clearStrategies(),
      (this.isOpen = !1),
      this.exitContainer && (this.exitContainer.style.display = "none"),
      this.exitToggle && this.exitToggle.classList.remove("active"));
  }
}
class PnlCard {
  static MAX_IMAGE_SIZE_MB = 2;
  static MAX_IMAGE_SIZE_BYTES = 2097152;
  static ERROR_DISPLAY_DURATION = 4e3;
  static BYTES_PER_MB = 1048576;
  static PLATFORM_FEE_PERCENTAGE = 0.02;
  static MAX_CARD_WIDTH_PERCENTAGE = 0.5;
  static MAX_CARD_HEIGHT_PERCENTAGE = 0.8;
  static MIN_FONT_SCALE = 0.5;
  static MAX_FONT_SCALE = 2.5;
  static FONT_SCALE_STEP = 0.1;
  static TYPOGRAPHY_SAVE_DEBOUNCE_MS = 400;
  constructor() {
    ((this.element = null),
      (this.wrapper = null),
      (this.card = null),
      (this.isLoading = !1),
      (this.customBackgroundImage = null),
      (this.hasCustomBackground = !1),
      (this.vipEnabled = this.isVipActive()),
      (this.logoImage = chrome.runtime.getURL("tutorial/assets/Icon.png")),
      (this.fileInput = null),
      (this.showCryptoAmount = !0),
      (this.lastTradeData = null),
      (this.errorMessageTimeout = null),
      (this.showFeesInPnl = !1),
      (this.textColor = "#ffffff"),
      (this.fontScale = 1),
      (this.username = "@mockape"),
      (this.typographySettingsHydrated = !1),
      (this.typographySaveTimeout = null));
  }
  async setBackgroundImage(e) {
    ((this.vipEnabled = this.isVipActive()),
      this.vipEnabled &&
        ((this.customBackgroundImage = e),
        (this.hasCustomBackground = !0),
        this.card) &&
        (await this.applyCardDimensions(e),
        (this.card.style.backgroundImage = `url('${e}')`),
        this.toggleDecorations(!1),
        this.card.classList.add("custom-bg")));
  }
  async removeCustomBackground() {
    try {
      (await WalletManager.clearCardBackground(),
        (this.customBackgroundImage = null),
        (this.hasCustomBackground = !1),
        this.card &&
          ((this.card.style.backgroundImage = ""),
          (this.card.style.width = ""),
          (this.card.style.height = ""),
          this.toggleDecorations(!0),
          this.card.classList.remove("custom-bg")),
        this._reRenderControlPanel(this.lastTradeData));
    } catch (e) {
      this.showErrorMessage("Failed to remove background image");
    }
  }
  toggleDecorations(t) {
    if (this.card) {
      const e = this.card.querySelectorAll(".decoration");
      e.forEach((e) => {
        e.style.display = t ? "block" : "none";
      });
    }
  }
  getBackgroundImage() {
    return this.customBackgroundImage;
  }
  async loadSavedBackground() {
    if (((this.vipEnabled = this.isVipActive()), this.vipEnabled)) {
      try {
        const e = await WalletManager.getSettings().then(
          (e) => e?.cardBackground,
        );
      } catch (e) {}
      try {
        const t = await WalletManager.getCardBackground();
        t
          ? ((this.customBackgroundImage = t), (this.hasCustomBackground = !0))
          : (this.hasCustomBackground = !1);
      } catch (e) {
        this.hasCustomBackground = !1;
      }
    } else {
      try {
        await WalletManager.clearCardBackground();
      } catch (e) {}
      ((this.customBackgroundImage = null), (this.hasCustomBackground = !1));
    }
  }
  getImageDimensions(i) {
    return new Promise((e, t) => {
      const s = new Image();
      ((s.onload = () => {
        e({ width: s.naturalWidth, height: s.naturalHeight });
      }),
        (s.onerror = () => {
          t(new Error("Failed to load image: " + i));
        }),
        (s.src = i));
    });
  }
  async applyCardDimensions(e) {
    if (this.hasCustomBackground)
      try {
        const { width: s, height: i } = await this.getImageDimensions(e);
        if (this.card) {
          const n = 360,
            a = window.innerWidth - n,
            o = window.innerWidth * PnlCard.MAX_CARD_WIDTH_PERCENTAGE,
            r = Math.max(300, Math.min(o, a)),
            l = window.innerHeight * PnlCard.MAX_CARD_HEIGHT_PERCENTAGE;
          let e = s,
            t = i;
          if (e > r) {
            const c = r / e;
            ((e = r), (t = i * c));
          }
          if (t > l) {
            const u = l / t;
            ((t = l), (e = s * u));
          }
          ((this.card.style.width = e + "px"),
            (this.card.style.height = t + "px"));
        }
      } catch (e) {}
  }
  validateFileSize(e) {
    if (e.size > PnlCard.MAX_IMAGE_SIZE_BYTES) {
      const t = (e.size / PnlCard.BYTES_PER_MB).toFixed(2);
      return {
        valid: !1,
        error: `Image too large (${t}MB exceeds ${PnlCard.MAX_IMAGE_SIZE_MB}MB limit)`,
      };
    }
    return { valid: !0, error: null };
  }
  showErrorMessage(t) {
    if (this.controlPanel) {
      let e = this.controlPanel.querySelector(".error-message");
      (e ||
        ((e = document.createElement("div")),
        (e.className = "error-message"),
        this.controlPanel.insertBefore(e, this.controlPanel.firstChild)),
        this.errorMessageTimeout && clearTimeout(this.errorMessageTimeout),
        (e.textContent = t),
        e.classList.add("show"),
        (this.errorMessageTimeout = setTimeout(() => {
          (e.classList.remove("show"), (this.errorMessageTimeout = null));
        }, PnlCard.ERROR_DISPLAY_DURATION)));
    }
  }
  async handleFileUpload(e) {
    if (this.isVipActive()) {
      const t = e.target.files[0];
      if (t)
        if (t.type.startsWith("image/")) {
          const s = this.validateFileSize(t);
          if (s.valid) {
            const i = new FileReader();
            ((i.onload = async (e) => {
              const t = e.target.result;
              try {
                (await WalletManager.saveCardBackground(t),
                  await this.setBackgroundImage(t),
                  this._reRenderControlPanel(this.lastTradeData));
              } catch (e) {
                this.showErrorMessage("Failed to save image to storage");
              }
            }),
              (i.onerror = () => {
                this.showErrorMessage("Failed to read image file");
              }),
              i.readAsDataURL(t));
          } else this.showErrorMessage(s.error);
        } else this.showErrorMessage("Please select an image file");
    } else
      this.showErrorMessage(
        "Get Ape Pass on mockape.com to unlock this feature",
      );
  }
  createFileInput() {
    return (
      this.fileInput ||
        ((this.fileInput = document.createElement("input")),
        (this.fileInput.type = "file"),
        (this.fileInput.accept = "image/*"),
        (this.fileInput.style.display = "none"),
        this.fileInput.addEventListener("change", (e) =>
          this.handleFileUpload(e),
        ),
        document.body.appendChild(this.fileInput)),
      this.fileInput
    );
  }
  _reRenderControlPanel(e) {
    (this.controlPanel &&
      (this.controlPanel.remove(), (this.controlPanel = null)),
      this.createControlPanel(e));
  }
  _setupControlPanelListeners() {
    const e = this.controlPanel.querySelector(".close-card-btn"),
      t =
        (e &&
          (e.onclick = () => {
            this.wrapper.classList.remove("visible");
          }),
        this.controlPanel.querySelector(".upload-image-btn")),
      s =
        (t &&
          (t.onclick = () => {
            if (this.isVipActive()) {
              const e = this.createFileInput();
              e.click();
            } else
              this.showErrorMessage(
                "Buy ApePass on mockape.com to unlock this feature",
              );
          }),
        this.controlPanel.querySelector(".remove-image-btn")),
      i =
        (s &&
          (s.onclick = async () => {
            await this.removeCustomBackground();
          }),
        this.controlPanel.querySelector(".toggle-currency-btn")),
      n =
        (i &&
          (i.onclick = () => {
            ((this.showCryptoAmount = !this.showCryptoAmount),
              this.showCard(this.lastTradeData));
          }),
        this.controlPanel.querySelector(".toggle-fees-btn"));
    if (n) {
      const c = (e) => {
        (n.classList.toggle("is-active", Boolean(e)),
          n.setAttribute("aria-pressed", Boolean(e).toString()));
      };
      (WalletManager.getSettings()
        .then((e) => {
          c(Boolean(e?.showFeesInPnl));
        })
        .catch(() => {
          c(!1);
        }),
        (n.onclick = async () => {
          const e = await WalletManager.getSettings(),
            t = !e.showFeesInPnl;
          (await WalletManager.updateSettings({ showFeesInPnl: t }),
            c(t),
            this.showCard(this.lastTradeData));
        }));
    }
    const a = this.controlPanel.querySelector(".text-color-input"),
      o =
        (a &&
          (a.oninput = (e) => {
            const { value: t } = e.target;
            t &&
              /^#[0-9a-f]{6}$/i.test(t) &&
              ((this.textColor = t),
              this.applyTypographyPreferences(),
              this.scheduleTypographySave());
          }),
        this.controlPanel.querySelector(".font-size-slider")),
      r = this.controlPanel.querySelector(".font-size-value"),
      l =
        (o &&
          (o.oninput = (e) => {
            const t = parseFloat(e.target.value);
            isNaN(t) ||
              ((this.fontScale = t),
              this.applyTypographyPreferences(),
              r && (r.textContent = t.toFixed(1) + "x"),
              this.scheduleTypographySave());
          }),
        this.controlPanel.querySelector(".font-weight-select"));
    l &&
      ((l.value = String(this.fontWeight)),
      (l.onchange = (e) => {
        const t = parseInt(e.target.value, 10);
        Number.isNaN(t) ||
          ((this.fontWeight = this._clampFontWeight(t)),
          this.applyTypographyPreferences(),
          this.scheduleTypographySave());
      }));
  }
  createControlPanel(e) {
    if (!this.controlPanel) {
      ((this.controlPanel = document.createElement("div")),
        (this.controlPanel.className = "pnl-control-panel"));
      const t = this.isVipActive(),
        s = ((this.vipEnabled = t), Date.now()),
        i = "pnl-text-color-" + s,
        n = "pnl-font-slider-" + s,
        a = {
          image:
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
          trash:
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
          type: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
          user: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
          dollar:
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
          percent:
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
          x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
        };
      let e = "";
      if (this.hasCustomBackground && t)
        e = `
        <button type="button" class="btn btn-destructive btn-sm remove-image-btn" title="Remove Background">
          ${a.trash} Remove
        </button>`;
      else {
        const o = t ? "" : " locked",
          r = t ? "Upload Background" : "Requires ApePass";
        e = `
        <button type="button" class="btn btn-secondary btn-sm upload-image-btn${o}" title="${r}">
          ${a.image} Upload
        </button>`;
      }
      ((this.controlPanel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Card Settings</h3>
        <button type="button" class="btn btn-ghost btn-icon close-card-btn" title="Close">
          ${a.x}
        </button>
      </div>

      <div class="panel-content">
        <!-- Toggles Section -->
        <div class="control-group">
          <label class="group-label">Display</label>
          <div class="toggle-row">
            <button type="button" class="btn btn-outline btn-sm toggle-currency-btn flex-1" title="Toggle Currency">
              ${a.dollar} Currency
            </button>
            <button type="button" class="btn btn-outline btn-sm toggle-fees-btn flex-1" aria-pressed="false" title="Toggle Fees">
              ${a.percent} Fees
            </button>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="control-group">
          <label class="group-label">Appearance</label>
          
          <div class="control-row">
             <div class="image-actions-row">
                ${e}
             </div>
          </div>

          <div class="control-row">
            <div class="input-with-label">
              <label for="${i}">Text Color</label>
              <div class="color-picker-wrapper">
                <input type="color" id="${i}" class="text-color-input" value="${this.textColor}" title="Choose text color" />
                <div class="color-preview" style="background-color: ${this.textColor}"></div>
              </div>
            </div>
          </div>

          <div class="control-row">
             <div class="slider-group">
                <div class="slider-header">
                  <label for="${n}">Scale</label>
                  <span class="font-size-value value-badge">${this.fontScale.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="${PnlCard.MIN_FONT_SCALE}" 
                  max="${PnlCard.MAX_FONT_SCALE}" 
                  step="${PnlCard.FONT_SCALE_STEP}" 
                  value="${this.fontScale}" 
                  class="font-size-slider" 
                  id="${n}"
                />
             </div>
          </div>
        </div>

        <!-- Content Section -->
        <div class="control-group">
          <label class="group-label">Identity</label>
          <div class="input-wrapper">
            <span class="input-icon">${a.user}</span>
            <input type="text" class="username-input" value="${this.username}" placeholder="@username" />
          </div>
        </div>
      </div>
    `),
        this.wrapper.appendChild(this.controlPanel),
        this._setupControlPanelListeners());
    }
  }
  _setupControlPanelListeners() {
    const e = this.controlPanel.querySelector(".close-card-btn"),
      t =
        (e &&
          (e.onclick = () => {
            this.wrapper.classList.remove("visible");
          }),
        this.controlPanel.querySelector(".upload-image-btn")),
      s =
        (t &&
          (t.onclick = () => {
            if (this.isVipActive()) {
              const e = this.createFileInput();
              e.click();
            } else
              this.showErrorMessage(
                "Buy ApePass on mockape.com to unlock this feature",
              );
          }),
        this.controlPanel.querySelector(".remove-image-btn")),
      i =
        (s &&
          (s.onclick = async () => {
            await this.removeCustomBackground();
          }),
        this.controlPanel.querySelector(".toggle-currency-btn")),
      n =
        (i &&
          (i.onclick = () => {
            ((this.showCryptoAmount = !this.showCryptoAmount),
              this.showCard(this.lastTradeData));
          }),
        this.controlPanel.querySelector(".toggle-fees-btn"));
    if (n) {
      const u = (e) => {
        (n.classList.toggle("btn-secondary", Boolean(e)),
          n.classList.toggle("btn-outline", !Boolean(e)),
          n.setAttribute("aria-pressed", Boolean(e).toString()));
      };
      (WalletManager.getSettings()
        .then((e) => {
          u(Boolean(e?.showFeesInPnl));
        })
        .catch(() => {
          u(!1);
        }),
        (n.onclick = async () => {
          const e = await WalletManager.getSettings(),
            t = !e.showFeesInPnl;
          (await WalletManager.updateSettings({ showFeesInPnl: t }),
            u(t),
            this.showCard(this.lastTradeData));
        }));
    }
    const a = this.controlPanel.querySelector(".text-color-input"),
      o = this.controlPanel.querySelector(".color-preview"),
      r =
        (a &&
          (a.oninput = (e) => {
            const { value: t } = e.target;
            t &&
              /^#[0-9a-f]{6}$/i.test(t) &&
              ((this.textColor = t),
              o && (o.style.backgroundColor = t),
              this.applyTypographyPreferences(),
              this.scheduleTypographySave());
          }),
        this.controlPanel.querySelector(".username-input")),
      l =
        (r &&
          (r.oninput = (e) => {
            if (((this.username = e.target.value || "@mockape"), this.card)) {
              const t = this.card.querySelector(".nickname");
              t && (t.textContent = this.username);
            }
            this.scheduleTypographySave();
          }),
        this.controlPanel.querySelector(".font-size-slider")),
      c = this.controlPanel.querySelector(".font-size-value");
    l &&
      (l.oninput = (e) => {
        const t = parseFloat(e.target.value);
        isNaN(t) ||
          ((this.fontScale = t),
          this.applyTypographyPreferences(),
          c && (c.textContent = t.toFixed(1) + "x"),
          this.scheduleTypographySave());
      });
  }
  async syncVipAccess() {
    const e = this.vipEnabled;
    if (((this.vipEnabled = this.isVipActive()), e && !this.vipEnabled)) {
      try {
        await WalletManager.clearCardBackground();
      } catch (e) {}
      ((this.customBackgroundImage = null),
        (this.hasCustomBackground = !1),
        this.card &&
          ((this.card.style.backgroundImage = ""),
          (this.card.style.width = ""),
          (this.card.style.height = ""),
          this.toggleDecorations(!0)));
    }
    this.controlPanel && this._reRenderControlPanel(this.lastTradeData);
  }
  isVipActive() {
    return Boolean(window.AppState?.vip?.active);
  }
  createIcon(e) {
    (this.element && document.body.removeChild(this.element),
      (this.element = document.createElement("div")),
      (this.element.className = "pnl-trigger-btn"),
      (this.element.innerHTML = '<span class="pnl-trigger-text">PnL 🤘</span>'),
      (this.element.style.cssText =
        "position: fixed; right: 50%; top: 11.5%; cursor: pointer; background: rgb(20 83 45); height: 22px; min-width: 60px; padding: 0 6px; border-radius: 9999px; z-index: 9999; border: 1px solid rgb(22 101 52); font-size: 12px; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;"),
      (this.element.onmouseenter = () => (this.element.style.opacity = "0.8")),
      (this.element.onmouseleave = () => (this.element.style.opacity = "1")),
      (this.element.onclick = () => {
        this.isLoading || this.showCard(e);
      }),
      document.body.appendChild(this.element));
  }
  async calculateFees(e) {
    try {
      const t = await WalletManager.getSettings(),
        { totalInvested: s = 0, soldAmount: i = 0 } = e || {},
        n = s * PnlCard.PLATFORM_FEE_PERCENTAGE,
        a = i * PnlCard.PLATFORM_FEE_PERCENTAGE,
        o = t.buyPriorityFee || 0,
        r = t.sellPriorityFee || 0,
        l = n + a + o + r;
      return {
        buyPlatformFees: n,
        sellPlatformFees: a,
        buyPriorityFees: o,
        sellPriorityFees: r,
        totalFees: l,
      };
    } catch (e) {
      return {
        buyPlatformFees: 0,
        sellPlatformFees: 0,
        buyPriorityFees: 0,
        sellPriorityFees: 0,
        totalFees: 0,
      };
    }
  }
  async showCard(a) {
    const o = await PriceFetcher.fetchMetadata();
    try {
      if (!this.wrapper) {
        ((this.wrapper = document.createElement("div")),
          (this.wrapper.className = "pnl-card-wrapper"),
          document.body.appendChild(this.wrapper));
        const B = "pnl-card-styles";
        if (!document.getElementById(B)) {
          const q = document.createElement("link");
          ((q.id = B),
            (q.rel = "stylesheet"),
            (q.type = "text/css"),
            (q.href = chrome.runtime.getURL("components/PnlCard.css")),
            document.head.appendChild(q));
        }
      }
      if (!this.card) {
        (await this.loadSavedBackground(),
          (this.card = document.createElement("div")),
          (this.card.className = "pnl-card"));
        const _ = document.createElement("div"),
          N =
            ((_.className = "decoration blob-blue"),
            this.card.appendChild(_),
            document.createElement("div")),
          R =
            ((N.className = "decoration blob-purple"),
            this.card.appendChild(N),
            this.getBackgroundImage());
        (R
          ? ((this.card.style.backgroundImage = `url('${R}')`),
            this.toggleDecorations(!1),
            this.card.classList.add("custom-bg"),
            await this.applyCardDimensions(R))
          : (this.toggleDecorations(!0),
            this.card.classList.remove("custom-bg")),
          this.wrapper.appendChild(this.card),
          this.applyTypographyPreferences());
      }
      const {
          entryPrice: r = 0,
          lastPrice: l = 0,
          soldAmount: c = 0,
          totalInvested: u = 0,
        } = a || {},
        d = (c || u, PriceManager.getPrice(AppState.config.currentChain)),
        h = await WalletManager.getSettings(),
        p = (this._hydrateTypographyFromSettings(h), h.showFeesInPnl),
        g = await this.calculateFees({ totalInvested: u, soldAmount: c });
      let e, t, s, i;
      t =
        ((e = p
          ? ((s = u + g.buyPlatformFees + g.buyPriorityFees),
            (i = c - g.sellPlatformFees - g.sellPriorityFees),
            i - s)
          : ((s = u), (i = c), c - u)),
        e * d);
      const m = s * d,
        y = i * d,
        v = 0 < e,
        S = s ? (e / s) * 100 : 0,
        f = ((this.lastTradeData = a), s),
        w = i,
        b = e,
        P = AppState.config.currentChain?.toUpperCase() || "SOL",
        k = this.showCryptoAmount ? f.toFixed(2) + " " + P : "$" + m.toFixed(2),
        E = this.showCryptoAmount ? w.toFixed(2) + " " + P : "$" + y.toFixed(2),
        C = this.showCryptoAmount ? b : t,
        T = 0 < C ? "+" : "",
        A = "" + T + C.toFixed(2),
        x = o.name || a?.tokenName || "UNKNOWN";
      let n = a?.platform;
      (n ||
        "undefined" == typeof window ||
        (n = window.location.hostname.replace(/^www\./, "")),
        (n = n || "axiom.trade"));
      const M = TRADING_TEMPLATES.getChainIcon(),
        F = ((this.card.innerHTML = ""), document.createElement("div")),
        L =
          ((F.className = "decoration blob-blue"),
          this.card.appendChild(F),
          document.createElement("div")),
        I =
          ((L.className = "decoration blob-purple"),
          this.card.appendChild(L),
          this.hasCustomBackground &&
            ((F.style.display = "none"), (L.style.display = "none")),
          document.createElement("div"));
      ((I.className = "card-content"),
        (I.innerHTML = `
        <div class="header">
          <div class="logo-container">
            <img src="${this.logoImage}" class="logo-img" alt="Logo">
          </div>
          <div class="brand-name">MockApe</div>
        </div>

        <div class="token-label">
          <h1>${x}</h1>
        </div>

        <div class="pnl-display ${v ? "" : "loss"}">
          <div class="pnl-value">
            ${A}
            <span class="icon-svg">${this.showCryptoAmount ? M : "$"}</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-row">
            <span class="stat-label">PNL</span>
            <span class="stat-value ${v ? "text-green" : "text-red"}">
               ${0 < S ? "+" : ""}${S.toFixed(2)}%
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Invested</span>
            <span class="stat-value">
              ${k}
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Sold</span>
            <span class="stat-value">
              ${E}
            </span>
          </div>
        </div>

        <div class="footer">
          <div class="profile-icon"></div>
          <div class="footer-info">
            <div class="nickname">${this.username}</div>
            <div class="platform">${n}</div>
          </div>
        </div>
      `),
        this.card.appendChild(I),
        this.applyTypographyPreferences(),
        this.createControlPanel(a),
        this.wrapper.classList.add("visible"));
    } catch (e) {
      ((this.element.style.backgroundColor = "#ff4444"),
        setTimeout(() => {
          this.element.style.backgroundColor = "#2c2c2c";
        }, 1e3));
    }
  }
  destroy() {
    if (
      (this.errorMessageTimeout &&
        (clearTimeout(this.errorMessageTimeout),
        (this.errorMessageTimeout = null)),
      this.typographySaveTimeout &&
        (clearTimeout(this.typographySaveTimeout),
        (this.typographySaveTimeout = null),
        this._persistTypographyPreferences()),
      this.element &&
        ((this.element.onmouseenter = null),
        (this.element.onmouseleave = null),
        (this.element.onclick = null),
        document.body.removeChild(this.element),
        (this.element = null)),
      this.controlPanel)
    ) {
      const e = this.controlPanel.querySelector(".close-card-btn"),
        t =
          (e && (e.onclick = null),
          this.controlPanel.querySelector(".upload-image-btn")),
        s =
          (t && (t.onclick = null),
          this.controlPanel.querySelector(".toggle-currency-btn")),
        i =
          (s && (s.onclick = null),
          this.controlPanel.querySelector(".toggle-fees-btn"));
      (i && (i.onclick = null), (this.controlPanel = null));
    }
    (this.card && (this.card = null),
      this.wrapper &&
        (document.body.contains(this.wrapper) &&
          document.body.removeChild(this.wrapper),
        (this.wrapper = null)),
      this.fileInput &&
        (this.fileInput.removeEventListener("change", (e) =>
          this.handleFileUpload(e),
        ),
        document.body.contains(this.fileInput) &&
          document.body.removeChild(this.fileInput),
        (this.fileInput = null)));
  }
  applyTypographyPreferences() {
    if (this.card) {
      const e =
          "string" == typeof this.textColor && this.textColor
            ? this.textColor
            : "#ffffff",
        t = this._clampFontScale(this.fontScale);
      ((this.fontScale = t),
        this.card.style.setProperty("--pnl-user-text-color", e),
        this.card.style.setProperty("--pnl-font-scale", t.toString()));
    }
  }
  _clampFontScale(e) {
    return "number" != typeof e || Number.isNaN(e)
      ? 1
      : Math.min(PnlCard.MAX_FONT_SCALE, Math.max(PnlCard.MIN_FONT_SCALE, e));
  }
  scheduleTypographySave() {
    (this.typographySaveTimeout && clearTimeout(this.typographySaveTimeout),
      (this.typographySaveTimeout = setTimeout(() => {
        ((this.typographySaveTimeout = null),
          this._persistTypographyPreferences());
      }, PnlCard.TYPOGRAPHY_SAVE_DEBOUNCE_MS)));
  }
  async _persistTypographyPreferences() {
    try {
      (await WalletManager.updateSettings({
        pnlTextColor: this.textColor,
        pnlFontScale: this.fontScale,
        pnlUsername: this.username,
      }),
        (this.typographySettingsHydrated = !0));
    } catch (e) {}
  }
  _hydrateTypographyFromSettings(t) {
    if (!this.typographySettingsHydrated)
      if (t && "object" == typeof t) {
        let e = !1;
        ("string" == typeof t.pnlTextColor &&
          ((this.textColor = t.pnlTextColor), (e = !0)),
          "number" == typeof t.pnlFontScale &&
            ((this.fontScale = this._clampFontScale(t.pnlFontScale)), (e = !0)),
          "string" == typeof t.pnlUsername &&
            t.pnlUsername &&
            ((this.username = t.pnlUsername), (e = !0)),
          (this.typographySettingsHydrated = !0),
          e && this.applyTypographyPreferences());
      } else this.typographySettingsHydrated = !0;
  }
}
window.PnlCard = PnlCard;
class Settings {
  constructor(e, t = null) {
    ((this.elements = e),
      (this.tradingUI = t),
      (this.eventListeners = []),
      this.setupTabSystem(),
      this.setupApePassSection(),
      (this.currentVipStatus = null));
  }
  async load() {
    try {
      const e = await WalletManager.getSettings();
      if (e) {
        ((this.elements.buyPriorityFee.value = e.buyPriorityFee || 0),
          (this.elements.sellPriorityFee.value = e.sellPriorityFee || 0),
          (this.elements.buySlippage.value = e.buySlippage || 0),
          (this.elements.sellSlippage.value = e.sellSlippage || 0));
        const t = document.querySelector(".use-custom-buy-amounts"),
          s = document.querySelector(".custom-buy-amounts-container"),
          i = document.querySelectorAll(".custom-amount-input");
        if (t && s) {
          ((t.checked = e.useCustomBuyAmounts || !1),
            (s.style.display = t.checked ? "block" : "none"));
          const g = e.customBuyAmounts || [0.1, 0.2, 0.5, 1, 3, 5, 10, 20];
          i.forEach((e, t) => {
            void 0 !== g[t] && (e.value = g[t]);
          });
        }
        const n = document.querySelector(".use-custom-delay"),
          a = document.querySelector(".custom-delay-slider"),
          o = document.querySelector(".custom-delay-input-container"),
          r = document.querySelector(".delay-value-text");
        if (
          n &&
          a &&
          o &&
          ((n.checked = e.useCustomDelay || !1),
          (a.value = e.customDelayValue || 1e3),
          (o.style.display = n.checked ? "block" : "none"),
          r)
        ) {
          const m = (a.value / 1e3).toFixed(1);
          r.textContent = m;
        }
        const l = document.querySelector(".use-sound-effects"),
          c = document.querySelector(".sound-volume-container"),
          u = document.querySelector(".sound-volume-slider");
        if (l && c && u) {
          l.checked = e.soundEnabled || !1;
          const y = Math.round(100 * (e.soundVolume || 0.5));
          ((u.value = y), (c.style.display = l.checked ? "block" : "none"));
        }
        const d = document.querySelector(".launch-feed-quick-buy-toggle"),
          h = document.querySelector(".launch-feed-quick-buy-container"),
          p = document.querySelector(".launch-feed-quick-buy-amount");
        if (d && h && p) {
          const v = Boolean(window.AppState?.vip?.active),
            S = Boolean(e.launchFeedQuickBuyEnabled) && v,
            f =
              ((d.checked = S),
              (h.style.display = S ? "block" : "none"),
              parseFloat(e.launchFeedQuickBuyAmount)),
            w =
              ((p.value = Number.isFinite(f) && 0 < f ? f : 0.1),
              document.querySelector(".launch-feed-large-button-toggle")),
            b =
              (w && (w.checked = Boolean(e.launchFeedQuickBuyLargeButton)),
              document.querySelector(".launch-feed-quick-buy-error"));
          b && (b.hidden = !0);
        }
      }
    } catch (e) {
    } finally {
      await this.refreshApePassState();
    }
  }
  async save() {
    const e = document.querySelector(".use-custom-delay"),
      t = document.querySelector(".custom-delay-slider"),
      s = document.querySelector(".use-custom-buy-amounts"),
      i = document.querySelectorAll(".custom-amount-input"),
      n = document.querySelector(".use-sound-effects"),
      a = document.querySelector(".sound-volume-slider"),
      o = document.querySelector(".launch-feed-quick-buy-toggle"),
      r = document.querySelector(".launch-feed-quick-buy-amount"),
      l = document.querySelector(".launch-feed-quick-buy-error"),
      c = document.querySelector(".launch-feed-large-button-toggle"),
      u = [];
    i.forEach((e) => {
      const t = parseFloat(e.value);
      u.push(isNaN(t) || t <= 0 ? 0.1 : t);
    });
    let d = r ? parseFloat(r.value) : 0.1;
    (!Number.isFinite(d) || d <= 0) && (d = 0.1);
    const h = {
      buyPriorityFee: parseFloat(this.elements.buyPriorityFee.value),
      sellPriorityFee: parseFloat(this.elements.sellPriorityFee.value),
      buySlippage: parseFloat(this.elements.buySlippage.value),
      sellSlippage: parseFloat(this.elements.sellSlippage.value),
      useCustomDelay: !!e && e.checked,
      customDelayValue: t ? parseInt(t.value, 10) : 1e3,
      useCustomBuyAmounts: !!s && s.checked,
      customBuyAmounts: u,
      soundEnabled: !!n && n.checked,
      soundVolume: a ? parseInt(a.value, 10) / 100 : 0.5,
      launchFeedQuickBuyEnabled:
        !(!o || !window.AppState?.vip?.active) && o.checked,
      launchFeedQuickBuyAmount: d,
      launchFeedQuickBuyLargeButton: !!c && c.checked,
    };
    (await WalletManager.setSettings(h),
      window.LaunchFeedQuickBuy?.applySettings &&
        window.LaunchFeedQuickBuy.applySettings(h),
      this.tradingUI &&
        this.tradingUI.rebuildBuyButtons &&
        this.tradingUI.rebuildBuyButtons());
  }
  setupTabSystem() {
    this.elements.tabButtons.forEach((e) => {
      e.addEventListener("click", () => this.switchTab(e));
    });
    const e = document.querySelector(".use-custom-buy-amounts"),
      t = document.querySelector(".custom-buy-amounts-container"),
      s = document.querySelectorAll(".custom-amount-input"),
      i =
        (e &&
          t &&
          (e.addEventListener("change", () => {
            ((t.style.display = e.checked ? "block" : "none"), this.save());
          }),
          s.forEach((e) => {
            e.addEventListener("change", () => {
              this.save();
            });
          })),
        document.querySelector(".use-custom-delay")),
      n = document.querySelector(".custom-delay-input-container"),
      a = document.querySelector(".custom-delay-slider"),
      o = document.querySelector(".delay-value-text");
    if (i && n && a) {
      i.addEventListener("change", () => {
        ((n.style.display = i.checked ? "block" : "none"), this.save());
      });
      const m = () => {
        if (o) {
          const e = (parseInt(a.value, 10) / 1e3).toFixed(1);
          o.textContent = e;
        }
        this.save();
      };
      (a.addEventListener("input", () => {
        m();
      }),
        a.addEventListener("change", () => {
          m();
        }));
    }
    const r = document.querySelector(".use-sound-effects"),
      l = document.querySelector(".sound-volume-container"),
      c = document.querySelector(".sound-volume-slider");
    if (r && l && c) {
      r.addEventListener("change", () => {
        if (
          ((l.style.display = r.checked ? "block" : "none"),
          window.soundManager)
        ) {
          const e = parseInt(c.value, 10) / 100;
          window.soundManager.updateFromSettings(r.checked, e);
        }
        this.save();
      });
      const y = async () => {
        if (window.soundManager) {
          const e = parseInt(c.value, 10) / 100,
            t = r.checked;
          (window.soundManager.updateFromSettings(t, e),
            await window.soundManager.playVolumePreview());
        }
        this.save();
      };
      (c.addEventListener("input", () => {
        y();
      }),
        c.addEventListener("change", () => {
          y();
        }));
    }
    const u = document.querySelector(".launch-feed-quick-buy-toggle"),
      d = document.querySelector(".launch-feed-quick-buy-container"),
      h = document.querySelector(".launch-feed-quick-buy-amount"),
      p = document.querySelector(".launch-feed-quick-buy-error"),
      g =
        (u &&
          d &&
          u.addEventListener("change", () => {
            const e = Boolean(window.AppState?.vip?.active);
            if (!e && u.checked) ((u.checked = !1), p && (p.hidden = !1));
            else {
              if (u.checked) {
                const t = window.confirm(
                  "Reminder: Set the platform's own quick buy amount to 0 to avoid accidental purchases. We will not cover any losses.",
                );
                if (!t) return void (u.checked = !1);
              }
              (p && (p.hidden = !0),
                (d.style.display = u.checked ? "block" : "none"),
                this.save());
            }
          }),
        h && h.addEventListener("change", () => this.save()),
        document.querySelector(".launch-feed-large-button-toggle"));
    g &&
      g.addEventListener("change", () => {
        if (g.checked) {
          const e = window.confirm(
            "Warning: Large overlay buttons cover part of the token row. Make sure the platform's own quick buy amount is set to 0 and that you are not using the platform's own large buttons to avoid accidental purchases. We will not cover any losses.",
          );
          if (!e) return void (g.checked = !1);
        }
        this.save();
      });
  }
  setupApePassSection() {
    const e = this.elements.apePassInput,
      t = this.elements.apePassActionButton;
    if (e && t) {
      const s = () => {
          ((e.value = e.value.toUpperCase().replace(/\s+/g, "")),
            this.clearApePassMessage(),
            this.currentVipStatus?.hasValidData || (t.textContent = "Confirm"));
        },
        i = async () => {
          await this.handleApePassAction();
        };
      (e.addEventListener("input", s),
        t.addEventListener("click", i),
        this.eventListeners.push(() => e.removeEventListener("input", s)),
        this.eventListeners.push(() => t.removeEventListener("click", i)));
    }
  }
  async refreshApePassState(e = {}) {
    if (!window.VipSessionManager) return;
    const { skipValidate: t = !1, reason: s = "settings-refresh" } = e;
    (t || (await window.VipSessionManager.validateIfNeeded(s)),
      (this.currentVipStatus = window.VipSessionManager.getStatus()),
      window.AppState &&
        (window.AppState.vip = {
          active: Boolean(this.currentVipStatus?.active),
          data: this.currentVipStatus?.data || null,
        }),
      window.AppState?.ui?.pnlIcon?.syncVipAccess &&
        window.AppState.ui.pnlIcon.syncVipAccess(),
      window.AppState?.vip?.active &&
        window.TVMarkerInjector &&
        window.TVMarkerInjector.inject(),
      this.renderApePassSummary());
  }
  renderApePassSummary() {
    const e = this.elements.apePassInput,
      t = this.elements.apePassActionButton,
      s = this.elements.apePassExpiry;
    if (e && t && s) {
      const i = Boolean(this.currentVipStatus?.code),
        n = this.currentVipStatus?.data,
        a = i ? "remove" : "confirm";
      ((t.textContent = "remove" === a ? "Remove" : "Confirm"),
        (t.dataset.state = a),
        (e.value = i ? this.currentVipStatus.code : ""),
        (e.disabled = "remove" === a),
        i && n
          ? ((s.hidden = !1),
            (s.textContent = this.formatSubscriptionExpiry(n)))
          : ((s.hidden = !0), (s.textContent = "Subscription expires: --")));
    }
  }
  formatSubscriptionExpiry(e) {
    if (!e) return "Subscription expires: --";
    if (!e.subscriptionExpiresAt) return "Subscription expires: Never";
    const t = new Date(e.subscriptionExpiresAt);
    if (Number.isNaN(t.getTime())) return "Subscription expires: Unknown";
    const s = t.getTime() - Date.now();
    return s <= 0
      ? `Subscription expires: Expired (${t.toISOString().slice(0, 10)})`
      : `Subscription expires: In ${this.formatRelativeTime(s)} (${t.toISOString().slice(0, 10)})`;
  }
  formatRelativeTime(e) {
    const t = Math.floor(e / 6e4);
    if (t < 1) return "<1m";
    const s = Math.floor(t / 1440),
      i = Math.floor((t % 1440) / 60),
      n = t % 60,
      a = [];
    return (
      0 < s && a.push(s + "d"),
      0 < i && a.push(i + "h"),
      0 < n && a.length < 2 && a.push(n + "m"),
      a.join(" ")
    );
  }
  clearApePassMessage() {
    const e = this.elements.apePassMessage;
    e &&
      ((e.textContent = ""),
      e.classList.remove("is-error", "is-success"),
      (e.hidden = !0));
  }
  setApePassMessage(e, t = "info") {
    const s = this.elements.apePassMessage;
    s &&
      ((s.hidden = !1),
      (s.textContent = e),
      s.classList.remove("is-error", "is-success"),
      "error" === t
        ? s.classList.add("is-error")
        : "success" === t && s.classList.add("is-success"));
  }
  async handleApePassAction() {
    if (window.VipSessionManager) {
      const e = this.elements.apePassActionButton;
      if (e) {
        const t = Boolean(this.currentVipStatus?.code),
          s = e.dataset.state || "",
          i = "remove" === s || t || Boolean(window.AppState?.vip?.active);
        ((e.disabled = !0),
          (e.textContent = i ? "Removing..." : "Confirming..."),
          this.clearApePassMessage());
        try {
          if (i)
            (await window.VipSessionManager.removeActivationCode(),
              this.elements.apePassInput &&
                ((this.elements.apePassInput.value = ""),
                (this.elements.apePassInput.disabled = !1)),
              this.setApePassMessage("Ape Pass removed.", "success"));
          else {
            const n = this.elements.apePassInput?.value || "",
              a = await window.VipSessionManager.setActivationCode(n);
            if (a.success) this.clearApePassMessage();
            else {
              const o = a?.error || "Invalid activation code.";
              this.setApePassMessage(o, "error");
            }
          }
          await this.refreshApePassState({ skipValidate: !0 });
        } catch (e) {
          (this.setApePassMessage(
            "Failed to update Ape Pass. Please try again.",
            "error",
          ),
            await this.refreshApePassState({ skipValidate: !0 }));
        } finally {
          ((e.disabled = !1), this.renderApePassSummary());
        }
      }
    } else this.setApePassMessage("VIP manager is not available.", "error");
  }
  isSubscriptionExpired(e) {
    if (!e?.subscriptionExpiresAt) return !1;
    const t = new Date(e.subscriptionExpiresAt);
    return !Number.isNaN(t.getTime()) && Date.now() >= t.getTime();
  }
  switchTab(e) {
    const t = e.dataset.tab;
    (this.elements.tabButtons.forEach((e) => e.classList.remove("active")),
      document
        .querySelectorAll(".tab-content")
        .forEach((e) => e.classList.remove("active")),
      e.classList.add("active"),
      document
        .querySelector(`.tab-content[data-tab="${t}"]`)
        ?.classList.add("active"));
  }
  destroy() {
    (this.eventListeners.forEach((e) => e()), (this.eventListeners = []));
  }
}
window.Settings = Settings;
class Modal {
  constructor(e, t, s) {
    e &&
      t &&
      s &&
      ((this.modal = e),
      (this.trigger = t),
      (this.closeBtn = s),
      (this.eventListeners = []));
  }
  setup(t = () => {}, s = () => {}) {
    (this.addListener(this.trigger, "mousedown", (e) => {
      (e.preventDefault(), e.stopPropagation(), this.open(), t());
    }),
      this.addListener(this.closeBtn, "mousedown", (e) => {
        (e.preventDefault(), e.stopPropagation(), this.close(), s());
      }),
      this.addListener(this.modal, "mousedown", (e) => {
        e.target === this.modal &&
          (e.preventDefault(), e.stopPropagation(), this.close(), s());
      }));
  }
  open() {
    this.modal.classList.add("visible");
  }
  close() {
    this.modal.classList.remove("visible");
  }
  addListener(e, t, s, i = !1) {
    e &&
      (e.addEventListener(t, s, i),
      this.eventListeners.push(() => e.removeEventListener(t, s, i)));
  }
  destroy() {
    (this.eventListeners.forEach((e) => e()), (this.eventListeners = []));
  }
}
window.Modal = Modal;
