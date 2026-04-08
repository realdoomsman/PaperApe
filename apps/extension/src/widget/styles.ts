/**
 * PaperApe Widget Styles — Paper/Scrapbook Theme
 * Matches the PaperApe web app design system.
 * Self-contained CSS for the Shadow DOM widget.
 */
export function getWidgetStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    .pa-widget {
      font-family: 'Special Elite', 'Courier Prime', 'Courier New', monospace;
      width: 300px;
      background: #e8dfc8;
      border: 2px solid rgba(90,70,40,0.2);
      border-radius: 5px;
      box-shadow: 2px 3px 8px rgba(60,40,10,0.18), 0 1px 2px rgba(60,40,10,0.12);
      color: #1a1207;
      overflow: hidden;
      user-select: none;
      position: relative;
    }
    .pa-widget::before {
      content: '';
      position: absolute;
      top: -4px; left: 20px;
      width: 60px; height: 20px;
      background: rgba(220,210,170,0.55);
      transform: rotate(-1deg);
      z-index: 1;
      border-radius: 1px;
    }

    /* ─── Header ─── */
    .pa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(45,107,63,0.04), transparent);
      border-bottom: 2px dashed rgba(90,70,40,0.15);
      cursor: grab;
    }
    .pa-header:active { cursor: grabbing; }

    .pa-logo { display: flex; align-items: center; gap: 8px; }
    .pa-logo-text {
      font-weight: 700; font-size: 14px;
      color: #1a1207;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .pa-header-right { display: flex; align-items: center; gap: 8px; }
    .pa-balance {
      font-family: 'Courier Prime', monospace;
      font-size: 11px; font-weight: 700; color: #2d6b3f;
      background: rgba(45,107,63,0.08);
      padding: 3px 8px; border-radius: 3px;
      border: 1px solid rgba(45,107,63,0.15);
    }

    .pa-minimize {
      background: none; border: 1px solid rgba(90,70,40,0.2);
      color: #6b5d45; cursor: pointer; font-size: 12px; font-weight: 700;
      padding: 1px 6px; border-radius: 3px;
      font-family: 'Courier Prime', monospace;
    }
    .pa-minimize:hover { color: #1a1207; background: rgba(90,70,40,0.08); }

    /* ─── Body ─── */
    .pa-body { padding: 10px 14px 12px; }

    /* ─── Notifications ─── */
    .pa-notif {
      padding: 6px 10px; border-radius: 3px;
      font-size: 10px; font-weight: 700; margin-bottom: 8px;
      border: 1px dashed;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { transform: translateY(-4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .pa-notif-success { background: rgba(45,107,63,0.08); border-color: rgba(45,107,63,0.25); color: #2d6b3f; }
    .pa-notif-error { background: rgba(139,32,32,0.08); border-color: rgba(139,32,32,0.25); color: #8b2020; }
    .pa-notif-info { background: rgba(44,95,138,0.08); border-color: rgba(44,95,138,0.25); color: #2c5f8a; }
    .pa-notif-congestion { background: rgba(139,105,20,0.08); border-color: rgba(139,105,20,0.25); color: #8b6914; }

    /* ─── Congestion ─── */
    .pa-congestion {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 3px; margin-bottom: 8px;
      background: rgba(139,105,20,0.08); border: 1px dashed rgba(139,105,20,0.2);
      font-size: 9px; font-weight: 700; color: #8b6914;
    }
    .pa-cong-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: #8b6914; animation: pulse 1s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* ─── Token Info ─── */
    .pa-token-info { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed rgba(90,70,40,0.12); }
    .pa-token-name { font-size: 13px; font-weight: 700; color: #1a1207; margin-bottom: 1px; }
    .pa-token-address { font-family: 'Courier Prime', monospace; font-size: 9px; color: #9a8b6e; margin-bottom: 4px; }
    .pa-price-row { display: flex; align-items: baseline; gap: 8px; }
    .pa-price { font-family: 'Courier Prime', monospace; font-size: 16px; font-weight: 700; color: #1a1207; }
    .pa-price-sol { font-family: 'Courier Prime', monospace; font-size: 10px; color: #6b5d45; }

    /* ─── Tabs ─── */
    .pa-tabs {
      display: flex; gap: 2px; margin-bottom: 10px;
    }
    .pa-tab-btn {
      flex: 1; padding: 7px 0; font-weight: 700; font-size: 11px;
      text-align: center; cursor: pointer;
      background: #c9bb96; border: 2px solid rgba(90,70,40,0.15); color: #6b5d45;
      font-family: 'Special Elite', monospace;
      transition: all 0.15s; letter-spacing: 1px;
    }
    .pa-tab-btn:hover { color: #3d3222; background: #d4c8a8; }
    .pa-tab-active-buy { background: #2d6b3f; color: #e8dfc8; border-color: #1f5530; box-shadow: 3px 4px 0px rgba(60,40,10,0.25); }
    .pa-tab-active-sell { background: #8b2020; color: #e8dfc8; border-color: #6d1818; box-shadow: 3px 4px 0px rgba(60,40,10,0.25); }

    /* ─── Section ─── */
    .pa-section { margin-bottom: 8px; }
    .pa-section-label {
      font-size: 8px; font-weight: 700; color: #9a8b6e;
      letter-spacing: 1.5px; margin-bottom: 5px; text-transform: uppercase;
    }

    /* ─── Buy Grid ─── */
    .pa-buy-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; }
    .pa-buy-btn {
      background: rgba(45,107,63,0.06);
      border: 2px solid rgba(45,107,63,0.15);
      color: #2d6b3f; font-size: 9px; font-weight: 700;
      font-family: 'Courier Prime', monospace;
      padding: 6px 2px; border-radius: 3px; cursor: pointer;
      transition: all 0.15s;
    }
    .pa-buy-btn:hover:not(:disabled) {
      background: rgba(45,107,63,0.12);
      border-color: rgba(45,107,63,0.3);
      box-shadow: 2px 2px 0px rgba(60,40,10,0.15);
      transform: translateY(-1px);
    }
    .pa-buy-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ─── Slippage Grid ─── */
    .pa-slip-grid { display: flex; gap: 3px; }
    .pa-slip-btn {
      flex: 1; padding: 4px 0; font-size: 9px; font-weight: 700;
      text-align: center; cursor: pointer;
      background: #d4c8a8; border: 1px solid rgba(90,70,40,0.15);
      color: #6b5d45; border-radius: 3px; font-family: 'Courier Prime', monospace;
      transition: all 0.15s;
    }
    .pa-slip-btn.active { background: rgba(45,107,63,0.1); border-color: rgba(45,107,63,0.25); color: #2d6b3f; box-shadow: inset 0 0 0 1px rgba(45,107,63,0.1); }
    .pa-slip-btn:hover { border-color: rgba(90,70,40,0.25); color: #3d3222; }

    /* ─── Estimate ─── */
    .pa-est {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 10px; background: rgba(45,107,63,0.04);
      border: 1px dashed rgba(90,70,40,0.12);
      border-radius: 3px; margin-bottom: 8px;
    }
    .pa-est-label { font-size: 9px; color: #9a8b6e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .pa-est-val { font-family: 'Courier Prime', monospace; font-size: 13px; font-weight: 700; color: #1a1207; }

    /* ─── Position ─── */
    .pa-position {
      background: rgba(45,107,63,0.04);
      border: 2px dashed rgba(90,70,40,0.12);
      border-radius: 4px; padding: 8px 10px; margin-bottom: 8px;
    }
    .pa-pos-head { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
    .pa-pos-sym { font-weight: 700; font-size: 12px; color: #1a1207; }
    .pa-badge { font-size: 7px; font-weight: 700; padding: 1px 5px; border-radius: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
    .pa-badge-moon { background: rgba(139,105,20,0.1); color: #8b6914; border: 1px solid rgba(139,105,20,0.2); }
    .pa-badge-rug { background: rgba(139,32,32,0.1); color: #8b2020; border: 1px solid rgba(139,32,32,0.2); }
    .pa-pnl { margin-left: auto; font-family: 'Courier Prime', monospace; font-weight: 700; font-size: 12px; }
    .pa-profit { color: #2d6b3f; }
    .pa-loss { color: #8b2020; }
    .pa-pos-info { display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 9px; color: #6b5d45; margin-bottom: 6px; }

    /* ─── Sell Grid ─── */
    .pa-sell-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
    .pa-sell-btn {
      background: rgba(139,32,32,0.06);
      border: 2px solid rgba(139,32,32,0.15);
      color: #8b2020; font-size: 9px; font-weight: 700;
      font-family: 'Courier Prime', monospace;
      padding: 5px 2px; border-radius: 3px; cursor: pointer;
      transition: all 0.15s;
    }
    .pa-sell-btn:hover:not(:disabled) { background: rgba(139,32,32,0.12); border-color: rgba(139,32,32,0.3); }
    .pa-sell-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .pa-sell-init-btn {
      background: rgba(139,105,20,0.06);
      border: 2px solid rgba(139,105,20,0.15);
      color: #8b6914; font-size: 8px; font-weight: 700;
      font-family: 'Special Elite', monospace;
      padding: 5px 2px; border-radius: 3px; cursor: pointer;
      letter-spacing: 0.5px; transition: all 0.15s;
      text-transform: uppercase;
    }
    .pa-sell-init-btn:hover:not(:disabled) { background: rgba(139,105,20,0.12); border-color: rgba(139,105,20,0.3); }
    .pa-sell-init-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ─── TPSL Toggle ─── */
    .pa-tpsl-toggle {
      width: 100%; padding: 5px 0; margin-top: 6px;
      font-size: 9px; font-weight: 700; color: #2c5f8a;
      background: rgba(44,95,138,0.04);
      border: 1px dashed rgba(44,95,138,0.15);
      border-radius: 3px; cursor: pointer;
      font-family: 'Special Elite', monospace; transition: all 0.15s;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .pa-tpsl-toggle:hover { background: rgba(44,95,138,0.08); }
    .pa-tpsl-toggle:disabled { opacity: 0.35; }

    /* ─── TPSL Panel ─── */
    .pa-tpsl-panel {
      margin-top: 6px; padding: 8px;
      background: rgba(90,70,40,0.03);
      border: 1px dashed rgba(90,70,40,0.12);
      border-radius: 3px;
    }
    .pa-tp-grid, .pa-sl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
    .pa-tp-preset, .pa-sl-preset {
      padding: 5px 3px; font-size: 8px; font-weight: 700;
      font-family: 'Courier Prime', monospace; border-radius: 3px;
      cursor: pointer; transition: all 0.15s; text-align: center;
    }
    .pa-tp-preset {
      background: rgba(45,107,63,0.04); border: 1px solid rgba(45,107,63,0.12); color: #2d6b3f;
    }
    .pa-tp-preset:hover { background: rgba(45,107,63,0.1); }
    .pa-sl-preset {
      background: rgba(139,32,32,0.04); border: 1px solid rgba(139,32,32,0.12); color: #8b2020;
    }
    .pa-sl-preset:hover { background: rgba(139,32,32,0.1); }

    /* ─── Empty State ─── */
    .pa-empty {
      text-align: center; padding: 14px 0;
      font-size: 10px; color: #9a8b6e;
      font-style: italic;
    }

    /* ─── Footer ─── */
    .pa-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 6px; border-top: 1px dashed rgba(90,70,40,0.12);
      margin-top: 4px;
    }
    .pa-open-dash {
      font-size: 9px; font-weight: 700; color: #2c5f8a;
      background: none; border: none; cursor: pointer;
      font-family: 'Special Elite', monospace;
      text-decoration: underline; text-underline-offset: 2px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .pa-open-dash:hover { color: #1e4060; }
    .pa-watermark { font-size: 7px; color: #b8a97e; letter-spacing: 1px; text-transform: uppercase; }
  `;
}
