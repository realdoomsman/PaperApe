/**
 * Returns the full CSS for the PaperApe Shadow DOM widget.
 * Glassmorphism dark theme, fully self-contained.
 */
export function getWidgetStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .pa-widget {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      width: 320px;
      background: rgba(16, 16, 24, 0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow:
        0 24px 48px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      color: #e0e0e0;
      overflow: hidden;
      user-select: none;
      transition: box-shadow 0.3s ease;
    }

    .pa-widget:hover {
      box-shadow:
        0 24px 48px rgba(0, 0, 0, 0.6),
        0 0 30px rgba(139, 92, 246, 0.15),
        0 0 0 1px rgba(139, 92, 246, 0.2);
    }

    /* ─── Header ─────────────────────────────── */
    .pa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: grab;
    }

    .pa-header:active {
      cursor: grabbing;
    }

    .pa-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pa-logo-icon {
      font-size: 20px;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .pa-logo-text {
      font-weight: 700;
      font-size: 14px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 0.5px;
    }

    .pa-header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pa-balance {
      font-size: 12px;
      font-weight: 600;
      color: #a78bfa;
      background: rgba(139, 92, 246, 0.12);
      padding: 4px 10px;
      border-radius: 8px;
    }

    .pa-minimize {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 10px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .pa-minimize:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }

    /* ─── Body ───────────────────────────────── */
    .pa-body {
      padding: 12px 16px 16px;
    }

    /* ─── Notification ──────────────────────── */
    .pa-notification {
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 10px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .pa-notification-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .pa-notification-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    /* ─── Token Info ─────────────────────────── */
    .pa-token-info {
      margin-bottom: 14px;
    }

    .pa-token-name {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 2px;
    }

    .pa-token-address {
      font-size: 10px;
      color: #666;
      font-family: monospace;
      margin-bottom: 6px;
    }

    .pa-price-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .pa-price {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }

    .pa-price-sol {
      font-size: 11px;
      color: #888;
      font-variant-numeric: tabular-nums;
    }

    /* ─── Sections ───────────────────────────── */
    .pa-section {
      margin-bottom: 12px;
    }

    .pa-section-label {
      font-size: 10px;
      font-weight: 600;
      color: #666;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }

    /* ─── Buy Grid ───────────────────────────── */
    .pa-buy-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }

    .pa-buy-btn {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      padding: 8px 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .pa-buy-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.35), rgba(16, 185, 129, 0.2));
      border-color: rgba(16, 185, 129, 0.6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .pa-buy-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .pa-buy-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ─── Position ───────────────────────────── */
    .pa-position {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }

    .pa-position-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .pa-position-symbol {
      font-weight: 700;
      font-size: 14px;
      color: #fff;
    }

    .pa-moon-badge {
      font-size: 9px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .pa-rug-badge {
      font-size: 9px;
      background: rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .pa-pnl {
      margin-left: auto;
      font-weight: 700;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }

    .pa-profit { color: #34d399; }
    .pa-loss { color: #f87171; }

    .pa-position-details {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #888;
      margin-bottom: 10px;
    }

    /* ─── Sell Grid ───────────────────────────── */
    .pa-sell-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .pa-sell-btn {
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      padding: 7px 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .pa-sell-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.2));
      border-color: rgba(239, 68, 68, 0.6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }

    .pa-sell-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pa-sell-init-btn {
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 10px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      padding: 7px 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
    }

    .pa-sell-init-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.35), rgba(245, 158, 11, 0.2));
      border-color: rgba(245, 158, 11, 0.6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    }

    .pa-sell-init-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ─── Footer ─────────────────────────────── */
    .pa-footer {
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .pa-watermark {
      font-size: 9px;
      color: #444;
      letter-spacing: 0.5px;
    }
  `;
}
