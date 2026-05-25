const CHAINS={SOL:{id:"SOL",name:"Solana",symbol:"SOL",coinGeckoId:"solana",urlPattern:/\/trade\/solana\//,defaultBalance:3,fallbackPrice:190,decimals:2,icon:'<svg width="16" height="16" viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg"><linearGradient id="solana-gradient" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ffa3"/><stop offset="1" stop-color="#dc1fff"/></linearGradient><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#solana-gradient)"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#solana-gradient)"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" fill="url(#solana-gradient)"/></svg>',fallbackSymbol:"◎"},BNB:{id:"BNB",name:"BNB Chain",symbol:"BNB",coinGeckoId:"binancecoin",urlPattern:/\/bsc\/|[?&]chain=bnb/i,defaultBalance:1,fallbackPrice:1100,decimals:4,icon:'<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 511.97 511.97"><defs><style>.cls-1{fill:#f3ba2f}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1-2"><path class="cls-1" d="M156.56 215.14 256 115.71l99.47 99.47 57.86-57.85L256 0 98.71 157.28l57.85 57.85M0 256l57.86-57.87L115.71 256l-57.86 57.83Zm156.56 40.85L256 396.27l99.47-99.47 57.89 57.82L256 512 98.71 354.7l-.08-.09 57.93-57.77M396.27 256l57.85-57.85L512 256l-57.85 57.85Z"/><path class="cls-1" d="M314.66 256 256 197.25l-43.4 43.38-5 5-10.27 10.27-.08.08.08.08L256 314.72l58.7-58.7h-.05"/></g></g></svg>',fallbackSymbol:"⬡"}},ChainUtils={detectChain(e){return CHAINS.BNB.urlPattern.test(e)?"BNB":"SOL"},getChain(e){return CHAINS[e]||CHAINS.SOL},getChainIcon(e){const t=this.getChain(e);return t.icon},formatAmount(e,t,s=!0){const n=this.getChain(t),i=e.toFixed(n.decimals);return s?i+" "+n.symbol:i},getAllChainIds(){return Object.keys(CHAINS)}},ICONS=("undefined"!=typeof window&&(window.CHAINS=CHAINS,window.ChainUtils=ChainUtils),{SOLANA_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.12368 9.36949C3.19298 9.30019 3.28826 9.25977 3.38932 9.25977H12.5541C12.7215 9.25977 12.8053 9.46189 12.6869 9.58027L10.8765 11.3907C10.8072 11.46 10.7119 11.5004 10.6108 11.5004H1.44608C1.27861 11.5004 1.19487 11.2983 1.31326 11.1799L3.12368 9.36949Z" fill="currentColor"></path><path d="M3.12368 2.60972C3.19587 2.54042 3.29115 2.5 3.38932 2.5H12.5541C12.7215 2.5 12.8053 2.70212 12.6869 2.82051L10.8765 4.63093C10.8072 4.70023 10.7119 4.74065 10.6108 4.74065H1.44608C1.27861 4.74065 1.19487 4.53853 1.31326 4.42015L3.12368 2.60972Z" fill="currentColor"></path><path d="M10.8765 5.96714C10.8072 5.89785 10.7119 5.85742 10.6108 5.85742H1.44608C1.27861 5.85742 1.19487 6.05954 1.31326 6.17793L3.12368 7.98835C3.19298 8.05765 3.28826 8.09807 3.38932 8.09807H12.5541C12.7215 8.09807 12.8053 7.89595 12.6869 7.77757L10.8765 5.96714Z" fill="currentColor"></path></svg>',BNB_ICON:'<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 511.97 511.97"><defs><style>.cls-1{fill:#f3ba2f}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1-2"><path class="cls-1" d="M156.56 215.14 256 115.71l99.47 99.47 57.86-57.85L256 0 98.71 157.28l57.85 57.85M0 256l57.86-57.87L115.71 256l-57.86 57.83Zm156.56 40.85L256 396.27l99.47-99.47 57.89 57.82L256 512 98.71 354.7l-.08-.09 57.93-57.77M396.27 256l57.85-57.85L512 256l-57.85 57.85Z"/><path class="cls-1" d="M314.66 256 256 197.25l-43.4 43.38-5 5-10.27 10.27-.08.08.08.08L256 314.72l58.7-58.7h-.05"/></g></g></svg>',SETTINGS_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',SLIPPAGE_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 15L7.66667 14.7333L8.2 11.8667L5.8 10.0667L4.93333 6.26667L3.46667 7.53333L4 10.0667L2.66667 10.3333L2 7.06667L4.96667 4.41667C5.22222 4.19445 5.52511 4.10289 5.87533 4.142C6.22556 4.18111 6.56156 4.26711 6.88333 4.4C7.23889 4.55556 7.60844 4.66667 7.992 4.73333C8.37556 4.8 8.76156 4.80556 9.15 4.75C9.53889 4.69445 9.89733 4.56667 10.2253 4.36667C10.5533 4.16667 10.8671 3.94445 11.1667 3.7L12 4.73333C11.6667 4.98889 11.3222 5.22778 10.9667 5.45C10.6111 5.67222 10.2278 5.84445 9.81667 5.96667C9.45 6.06667 9.08067 6.11956 8.70867 6.12533C8.33667 6.13111 7.96711 6.08933 7.6 6L8.06667 8.06667L10.5333 7.6L14 10.0667L13.2 11.1333L10.3333 9.13334L7.93333 9.6L9.73333 10.9333L9 15ZM5.33333 3.66667C4.96667 3.66667 4.65267 3.536 4.39133 3.27467C4.13 3.01333 3.99956 2.69956 4 2.33333C4 1.96667 4.13067 1.65267 4.392 1.39133C4.65333 1.13 4.96711 0.999557 5.33333 1C5.7 1 6.014 1.13067 6.27533 1.392C6.53667 1.65333 6.66711 1.96711 6.66667 2.33333C6.66667 2.7 6.536 3.014 6.27467 3.27533C6.01333 3.53667 5.69956 3.66711 5.33333 3.66667Z" fill="currentColor"></path></svg>',EXIT_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',PLUS_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',TRASH_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',COPY_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',ARROW_DOWN_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',ARROW_UP_ICON:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>'});window.TRADING_TEMPLATES={SOLANA_ICON:ICONS.SOLANA_ICON,BNB_ICON:ICONS.BNB_ICON,SETTINGS_ICON:ICONS.SETTINGS_ICON,SLIPPAGE_ICON:ICONS.SLIPPAGE_ICON,EXIT_ICON:ICONS.EXIT_ICON,PLUS_ICON:ICONS.PLUS_ICON,TRASH_ICON:ICONS.TRASH_ICON,ARROW_DOWN_ICON:ICONS.ARROW_DOWN_ICON,ARROW_UP_ICON:ICONS.ARROW_UP_ICON,getChainIcon(){const e=window.AppState?.config?.currentChain||"SOL",t="BNB"===e?ICONS.BNB_ICON:ICONS.SOLANA_ICON;return t},DEPOSIT_TEMPLATE:`
        <div class="deposit-modal">
            <div class="deposit-content">
                <div class="deposit-header">
                    <h3>Add Funds</h3>
                    <button class="close-deposit">&times;</button>
                </div>
                <div class="deposit-body">
                    <div class="deposit-input-wrapper">
                        <input type="number" class="deposit-amount" placeholder="0.00" step="0.1" min="0">
                        <span class="solana-icon deposit-icon"></span>
                    </div>
                    <div class="quick-deposit-buttons">
                        <button data-amount="1">+1</button>
                        <button data-amount="3">+3</button>
                        <button data-amount="5">+5</button>
                        <button data-amount="10">+10</button>
                    </div>
                    <button class="deposit-confirm">Confirm Deposit</button>
                    <button class="reset-balance">Reset Balance</button>
                    
                    <div class="stats-divider"></div>
                    
                    <div class="stats-container">
                        <div class="stats-info">
                            <div class="stats-pnl-line">Loading...</div>
                            <div class="stats-trades-line">Loading...</div>
                        </div>
                        <div class="stats-actions">
                            <button class="stats-action-btn copy-trades-link" title="Copy trade data">
                                ${ICONS.COPY_ICON}
                            </button>
                            <button class="stats-action-btn reset-stats-link" title="Reset Stats">
                                ${ICONS.TRASH_ICON}
                            </button>
                        </div>
                    </div>
                    
                    <div class="open-trades-divider"></div>
                    
                    <div class="open-trades-section">
                        <div class="open-trades-header">
                            <h4>Open Trades <span class="current-token-name"></span></h4>
                            <button class="clear-open-trades-btn" title="Clear all open trades">Clear</button>
                        </div>
                        <div class="open-trades-list">
                            <!-- Open trades will be populated dynamically -->
                        </div>
                        <div class="no-open-trades" style="display: none;">
                            <span>No open trades</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,SETTINGS_TEMPLATE:`
        <div class="settings-modal">
            <div class="settings-content">
                <div class="settings-header">
                    <h3>Settings</h3>
                    <button class="close-settings">&times;</button>
                </div>
                <div class="settings-body">
                    <div class="settings-tabs">
                        <button class="tab-button active" data-tab="buy">Buy Settings</button>
                        <button class="tab-button" data-tab="sell">Sell Settings</button>
                    </div>
                    <div class="tab-content active" data-tab="buy">
                        <div class="setting-group">
                            <label title="Higher priority fee = faster execution. This fee is paid in SOL.">BUY PRIORITY FEE</label>
                            <div class="input-with-unit">
                                <input type="number" value="0.01" step="any" min="0" class="priority-fee">
                                <span class="with-icon">
                                    ${ICONS.SOLANA_ICON}
                                    PRIO
                                </span>
                            </div>
                        </div>
                        <div class="setting-group">
                            <label title="Maximum allowed price movement during trade execution">BUY SLIPPAGE LIMIT</label>
                            <div class="input-with-unit">
                                <input type="number" value="30" step="1" min="0" class="slippage">
                                <span class="with-icon">
                                    ${ICONS.SLIPPAGE_ICON}
                                    MAX %
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" data-tab="sell">
                        <div class="setting-group">
                            <label title="Higher priority fee = faster execution. This fee is paid in SOL.">SELL PRIORITY FEE</label>
                            <div class="input-with-unit">
                                <input type="number" value="0.01" step="0.01" min="0" class="priority-fee">
                                <span class="with-icon">
                                    ${ICONS.SOLANA_ICON}
                                    PRIO
                                </span>
                            </div>
                        </div>
                        <div class="setting-group">
                            <label title="Maximum allowed price movement during trade execution">SELL SLIPPAGE LIMIT</label>
                            <div class="input-with-unit">
                                <input type="number" value="30" step="1" min="0" class="slippage">
                                <span class="with-icon">
                                    ${ICONS.SLIPPAGE_ICON}
                                    MAX %
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section general-settings">
                        <div class="setting-group ape-pass-setting">
                            <label class="ape-pass-label" title="Get Ape Pass on mockape.com to unlock extra features.">APE PASS</label>
                            <div class="ape-pass-controls">
                                <input type="text" class="ape-pass-input" placeholder="Enter activation code" autocomplete="one-time-code" spellcheck="false" maxlength="32">
                                <button class="ape-pass-action-btn" data-state="confirm">Confirm</button>
                            </div>
                            <div class="ape-pass-expiry" hidden>Subscription expires: --</div>
                            <div class="ape-pass-message" role="status" hidden></div>
                        </div>
                        <div class="setting-group">
                            <div class="setting-row">
                                <input type="checkbox" id="use-custom-buy-amounts" class="use-custom-buy-amounts">
                                <label for="use-custom-buy-amounts" title="Customize the quick buy button amounts">Use Custom Buy Amounts</label>
                            </div>
                            <div class="custom-buy-amounts-container" style="display: none;">
                                <div class="custom-amounts-grid">
                                    <input type="number" class="custom-amount-input" data-index="0" step="0.1" min="0" placeholder="0.1">
                                    <input type="number" class="custom-amount-input" data-index="1" step="0.1" min="0" placeholder="0.2">
                                    <input type="number" class="custom-amount-input" data-index="2" step="0.1" min="0" placeholder="0.5">
                                    <input type="number" class="custom-amount-input" data-index="3" step="0.1" min="0" placeholder="1">
                                    <input type="number" class="custom-amount-input" data-index="4" step="0.1" min="0" placeholder="3">
                                    <input type="number" class="custom-amount-input" data-index="5" step="0.1" min="0" placeholder="5">
                                    <input type="number" class="custom-amount-input" data-index="6" step="0.1" min="0" placeholder="10">
                                    <input type="number" class="custom-amount-input" data-index="7" step="0.1" min="0" placeholder="20">
                                </div>
                                <div class="setting-description">
                                    Customize quick buy button amounts (SOL/BNB)
                                </div>
                            </div>
                        </div>
                        <div class="setting-group">
                            <div class="setting-row">
                                <input type="checkbox" id="enable-launch-feed-quick-buy" class="launch-feed-quick-buy-toggle">
                                <label for="enable-launch-feed-quick-buy" title="Show Quick Buy buttons on the launch feed using a preset amount">Enable Quick buy</label>
                            </div>
                            <div class="launch-feed-quick-buy-container" style="display: none; padding-left: 14px; border-left: 2px solid var(--border-color, #333);">
                                <div class="setting-row">
                                    <input type="checkbox" id="launch-feed-large-button" class="launch-feed-large-button-toggle">
                                    <label for="launch-feed-large-button" title="Use a large overlay button instead of the small inline button">large buttons</label>
                                </div>
                                <div class="input-with-unit slim-launch-feed-input">
                                    <input type="number" class="launch-feed-quick-buy-amount" step="0.01" min="0" placeholder="0.1">
                                    <span class="with-icon">
                                        SOL/BNB
                                    </span>
                                </div>
                                <div class="setting-description">
                                    Quick buy amount in Solana or BNB
                                </div>
                            </div>
                            <div class="launch-feed-quick-buy-error" role="alert" hidden>
                                Requires Ape Pass to enable this feature.
                            </div>
                        </div>
                        <div class="setting-group">
                            <div class="setting-row">
                                <input type="checkbox" id="use-custom-delay" class="use-custom-delay">
                                <label for="use-custom-delay" title="Override the trade delay with a fixed custom value">Use Custom Execution Delay</label>
                            </div>
                            <div class="custom-delay-input-container" style="display: none;">
                                <div class="slider-container">
                                    <input type="range" min="0" max="5000" value="1000" step="100" class="custom-delay-slider">
                                    <div class="delay-value-display">
                                        <span class="delay-value-text">1.0</span>
                                        <span class="with-icon">sec</span>
                                    </div>
                                </div>
                                <div class="setting-description">
                                    Fixed execution delay (0-5 seconds)
                                </div>
                            </div>
                        </div>
                        <div class="setting-group">
                            <div class="setting-row">
                                <input type="checkbox" id="use-sound-effects" class="use-sound-effects">
                                <label for="use-sound-effects" title="Play a sound effect when trades are executed">Sound Effects</label>
                            </div>
                            <div class="sound-volume-container" style="display: none;">
                                <div class="slider-container">
                                    <input type="range" min="0" max="100" value="50" step="1" class="sound-volume-slider">
                                </div>
                                <div class="setting-description">
                                    Volume level (0-100%)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,EXIT_STRATEGY_ADD_BUTTON:`
        <div class="exit-strategy-add">
            <button class="exit-add-button">
                ${ICONS.PLUS_ICON}
                <span>Add</span>
            </button>
            <div class="exit-strategy-dropdown" style="display: none;">
                <button class="exit-dropdown-item" data-type="stop-loss" title="Exits if price drops to set % below your entry price">
                    <span class="exit-dropdown-arrow">${ICONS.ARROW_DOWN_ICON}</span>
                    <span>Stop Loss</span>
                </button>
                <button class="exit-dropdown-item" data-type="take-profit" title="Exits if price rises to set % above your entry price">
                    <span class="exit-dropdown-arrow">${ICONS.ARROW_UP_ICON}</span>
                    <span>Take Profit</span>
                </button>
                <button class="exit-dropdown-item" data-type="trailing-stop" title="Maintains an exit trigger a set % below the highest price reached">
                    <span class="exit-dropdown-arrow">${ICONS.ARROW_DOWN_ICON}</span>
                    <span>Trailing Stop Loss</span>
                </button>
            </div>
        </div>
    `,EXIT_STRATEGY_ENTRY:e=>`
        <div class="exit-strategy-entry" data-type="${e}">
            <div class="exit-strategy-inputs">
                <div class="exit-input-group">
                    <span class="exit-label-text">${"stop-loss"===e?"SL":"trailing-stop"===e?"TSL":"TP"}</span>
                    <input type="number" class="exit-trigger-input" placeholder="0" min="0" step="1" />
                    <span class="exit-input-unit">%</span>
                </div>
                <div class="exit-input-group">
                    <span class="exit-input-label">Amount</span>
                    <input type="number" class="exit-amount-input" placeholder="0" min="0" max="100" step="1" />
                    <span class="exit-input-unit">%</span>
                </div>
            </div>
            <button class="exit-strategy-remove">
                ${ICONS.TRASH_ICON}
            </button>
        </div>
    `};class DOMManager{constructor(){this.elements=null,this.isDestroyed=!1}static cleanupExistingUI(){try{const e=document.querySelectorAll("#bullx-trading-widget"),t=(e.forEach(e=>{e&&e.parentElement&&e.parentElement.remove()}),document.querySelectorAll(".deposit-modal")),s=(t.forEach(e=>{e&&e.parentElement&&e.parentElement.remove()}),document.querySelectorAll(".settings-modal"));s.forEach(e=>{e&&e.parentElement&&e.parentElement.remove()})}catch(e){}}async initializeMainUI(){if(this.isDestroyed)return null;DOMManager.cleanupExistingUI();try{const e=await fetch(chrome.runtime.getURL("trading-ui.html"));if(this.isDestroyed)return null;const t=await e.text();if(this.isDestroyed)return null;const s=document.createElement("div");return(s.innerHTML=t,this.isDestroyed)?null:(document.body.appendChild(s),this.elements=this._cacheMainElements(),this._createDynamicElements(),this.elements)}catch(e){throw e}}_cacheMainElements(){return{widget:document.getElementById("bullx-trading-widget"),currentPrice:document.getElementById("currentPrice"),positionInfo:document.getElementById("positionInfo"),minimizeButton:document.querySelector(".minimize-button"),widgetContent:document.querySelector(".widget-content"),quickBuyButtons:document.querySelectorAll(".quick-buy-btn"),quickSellButtons:document.querySelectorAll(".quick-sell-btn"),walletBalance:document.createElement("div"),depositModal:null,depositAmount:null,depositIcon:null,quickDepositButtons:[],depositConfirm:null,closeDeposit:null,settingsIcon:null,settingsModal:null,closeSettings:null,tabButtons:[]}}_createDynamicElements(){if(this.elements&&!this.isDestroyed){this.elements.walletBalance.className="wallet-balance";const e=this.elements.widget.querySelector(".wallet-balance"),t=(e&&e.appendChild(this.elements.walletBalance),document.createElement("div")),s=(t.className="settings-icon",t.innerHTML=TRADING_TEMPLATES.SETTINGS_ICON,this.elements.widget.querySelector(".header-controls"));s&&s.appendChild(t),this.elements.settingsIcon=t}}setupDepositModal(){if(this.isDestroyed)return null;const e=document.createElement("div"),t=(e.innerHTML=TRADING_TEMPLATES.DEPOSIT_TEMPLATE,document.body.appendChild(e),{depositModal:e.querySelector(".deposit-modal"),depositAmount:e.querySelector(".deposit-input-wrapper input"),depositIcon:e.querySelector(".deposit-icon"),quickDepositButtons:e.querySelectorAll(".quick-deposit-buttons button"),depositConfirm:e.querySelector(".deposit-confirm"),closeDeposit:e.querySelector(".close-deposit"),openTradesList:e.querySelector(".open-trades-list"),noOpenTrades:e.querySelector(".no-open-trades"),openTradesDivider:e.querySelector(".open-trades-divider"),openTradesSection:e.querySelector(".open-trades-section"),clearOpenTradesBtn:e.querySelector(".clear-open-trades-btn")});return t.depositIcon&&(t.depositIcon.innerHTML=TRADING_TEMPLATES.getChainIcon()),Object.assign(this.elements,t),t}setupSettingsModal(){if(this.isDestroyed)return null;const e=document.createElement("div"),t=(e.innerHTML=TRADING_TEMPLATES.SETTINGS_TEMPLATE,document.body.appendChild(e),{settingsModal:e.querySelector(".settings-modal"),closeSettings:e.querySelector(".close-settings"),tabButtons:e.querySelectorAll(".tab-button"),buyPriorityFee:e.querySelector('[data-tab="buy"] .priority-fee'),sellPriorityFee:e.querySelector('[data-tab="sell"] .priority-fee'),buySlippage:e.querySelector('[data-tab="buy"] .slippage'),sellSlippage:e.querySelector('[data-tab="sell"] .slippage'),apePassInput:e.querySelector(".ape-pass-input"),apePassActionButton:e.querySelector(".ape-pass-action-btn"),apePassExpiry:e.querySelector(".ape-pass-expiry"),apePassMessage:e.querySelector(".ape-pass-message")});return Object.assign(this.elements,t),t}getElements(){return this.elements}updateElements(e){this.elements&&!this.isDestroyed&&Object.assign(this.elements,e)}refreshDynamicElements(){this.elements&&!this.isDestroyed&&(this.elements.quickBuyButtons=document.querySelectorAll(".quick-buy-btn"),this.elements.quickSellButtons=document.querySelectorAll(".quick-sell-btn"))}isInitialized(){return this.elements&&this.elements.widget&&!this.isDestroyed}destroy(){if(this.isDestroyed=!0,this.elements){const e=this.elements.widget,t=(e&&e.parentElement&&e.remove(),this.elements.depositModal),s=(t&&t.parentElement&&t.remove(),this.elements.settingsModal);s&&s.parentElement&&s.remove(),this.elements=null}}getModalElements(){return this.elements?{depositModal:this.elements.depositModal,settingsModal:this.elements.settingsModal,closeDeposit:this.elements.closeDeposit,closeSettings:this.elements.closeSettings}:{}}getButtonElements(){return this.elements?{quickBuyButtons:this.elements.quickBuyButtons,quickSellButtons:this.elements.quickSellButtons,quickDepositButtons:this.elements.quickDepositButtons}:{}}getWidgetElements(){return this.elements?{widget:this.elements.widget,minimizeButton:this.elements.minimizeButton,widgetContent:this.elements.widgetContent,tabButtons:this.elements.tabButtons}:{}}generateBuyButtons(e){if(this.isDestroyed)return null;const s=document.getElementById("buy-buttons-container");return s?(s.innerHTML="",e.forEach(e=>{const t=this.createBuyButtonElement(e);s.appendChild(t)}),this.refreshDynamicElements(),s.querySelectorAll(".quick-buy-btn")):null}createBuyButtonElement(e){const t=document.createElement("button"),s=(t.className="quick-buy-btn",t.setAttribute("data-amount",e.toString()),e<1||Math.floor(e),e.toString()),n=window.AppState?.config?.currentChain||"SOL",i=window.ChainUtils?.getChain(n)||{symbol:"SOL"},a=i.symbol;return t.textContent=s+" "+a,t}getStatsElements(){return this.elements?.depositModal?{statsPreview:this.elements.depositModal.querySelector(".stats-info"),pnlLine:this.elements.depositModal.querySelector(".stats-pnl-line"),tradesLine:this.elements.depositModal.querySelector(".stats-trades-line"),copyTradesLink:this.elements.depositModal.querySelector(".copy-trades-link"),resetStatsLink:this.elements.depositModal.querySelector(".reset-stats-link"),statsLinks:this.elements.depositModal.querySelector(".stats-links")}:{}}getBuyButtonContainer(){return document.getElementById("buy-buttons-container")}clearBuyButtonContainer(){const e=this.getBuyButtonContainer();e&&(e.innerHTML="")}}window.DOMManager=DOMManager;class EventManager{constructor(){this.eventListeners=[],this.buyButtonListeners=[],this.isDestroyed=!1,this.debounceTimers=new Map}addEventListener(e,t,s,n=!1){if(e&&!this.isDestroyed){const i=e=>{this.isDestroyed||s(e)};e.addEventListener(t,i,n),this.eventListeners.push(()=>{e.removeEventListener(t,i,n)})}}setupMainEventListeners(e,n){e&&!this.isDestroyed&&(e.quickSellButtons.forEach(s=>{this.addEventListener(s,"mousedown",e=>{if(e.preventDefault(),e.stopPropagation(),s.classList.contains("sell-init-btn"))n.handleSellInit(s);else{const t=parseInt(s.getAttribute("data-percentage"));n.handleSell(t)}})}),e.minimizeButton&&this.addEventListener(e.minimizeButton,"mousedown",e=>{e.preventDefault(),e.stopPropagation(),n.toggleMinimize()}),this.setupTabListeners(e.tabButtons))}setupTabListeners(n){n&&!this.isDestroyed&&n.forEach(s=>{this.addEventListener(s,"mousedown",e=>{e.preventDefault(),e.stopPropagation();const t=s.getAttribute("data-tab");n.forEach(e=>e.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(e=>e.classList.remove("active")),s.classList.add("active"),document.querySelector(`.tab-content[data-tab="${t}"]`)?.classList.add("active")})})}setupDraggableListeners(v,b,t){if(v&&b&&!this.isDestroyed){let p=!1,h,m,y,g;const e=e=>{if(!e.target.closest("button, input, .settings-icon")){p=!0,h=e.clientX,m=e.clientY;const t=b.getBoundingClientRect();y=t.left,g=t.top,b.style.userSelect="none",document.body.style.userSelect="none"}},s=()=>{if(p&&(p=!1,b.style.userSelect="",document.body.style.userSelect="",t)){const e=b.getBoundingClientRect();t({left:e.left,top:e.top})}},n=e=>{if(p){e.preventDefault();const t=e.clientX-h,s=e.clientY-m,n=y+t,i=g+s,a=v.offsetHeight||30,l=0,o=window.innerWidth-b.offsetWidth,r=0,d=window.innerHeight-a,c=Math.max(l,Math.min(n,o)),u=Math.max(r,Math.min(i,d));b.style.left=c+"px",b.style.top=u+"px"}};this.addEventListener(v,"mousedown",e),this.addEventListener(document,"mousemove",n),this.addEventListener(document,"mouseup",s)}}setupDepositEventListeners(n,t){if(n&&!this.isDestroyed){n.quickDepositButtons.forEach(s=>{this.addEventListener(s,"mousedown",e=>{e.preventDefault(),e.stopPropagation();const t=parseFloat(s.getAttribute("data-amount"));n.depositAmount.value=t})}),this.addEventListener(n.depositConfirm,"click",t.confirmDeposit);const e=n.depositModal.querySelector(".reset-balance"),s=(e&&this.addEventListener(e,"click",t.resetBalance),n.depositModal.querySelector(".toggle-stats")),i=n.depositModal.querySelector(".stats-links");if(s&&i){let e=!1;this.addEventListener(s,"mousedown",async()=>{e=!e,i.style.display=e?"block":"none",s.textContent=e?"▲ Trade Statistics":"▼ Trade Statistics",e&&t.updateStatsPreview&&await t.updateStatsPreview()})}const a=n.depositModal.querySelector(".copy-trades-link"),l=(a&&this.addEventListener(a,"click",t.copyTrades),n.depositModal.querySelector(".reset-stats-link"));l&&this.addEventListener(l,"click",t.resetStats)}}setupSettingsEventListeners(t,e){if(t&&!this.isDestroyed){const s=this.debounce(e,500);["buyPriorityFee","sellPriorityFee","buySlippage","sellSlippage"].forEach(e=>{t[e]&&this.addEventListener(t[e],"change",s)})}}setupBuyButtonListeners(e,n){e&&!this.isDestroyed&&(this.cleanupBuyButtonListeners(),e.forEach(e=>{const t=e.getAttribute("data-amount"),s=e=>{e.preventDefault(),e.stopPropagation(),n&&n(parseFloat(t))};e.addEventListener("mousedown",s),this.buyButtonListeners.push(()=>{e.removeEventListener("mousedown",s)})}))}cleanupBuyButtonListeners(){this.buyButtonListeners.forEach(e=>e()),this.buyButtonListeners=[]}debounce(s,n,e=null){const i=e||s.toString();return(...e)=>{if(!this.isDestroyed){this.debounceTimers.has(i)&&clearTimeout(this.debounceTimers.get(i));const t=setTimeout(()=>{this.isDestroyed||s.apply(this,e),this.debounceTimers.delete(i)},n);this.debounceTimers.set(i,t)}}}createDebouncedMethod(e,t){return this.debounce(e,t,`method_${Date.now()}_`+Math.random())}cleanup(){this.isDestroyed=!0,this.eventListeners.forEach(e=>e()),this.eventListeners=[],this.cleanupBuyButtonListeners(),this.debounceTimers.forEach(e=>clearTimeout(e)),this.debounceTimers.clear()}destroy(){this.cleanup()}isEventManagerDestroyed(){return this.isDestroyed}}window.EventManager=EventManager;class UIController{constructor(e,t){if(!e)throw new Error("Elements are required");this.elements=e,this.wallet=t,this.buyButtons=new Map,this.sellButtons=new Map,this.initializeButtonCache()}initializeButtonCache(){document.querySelectorAll(".quick-buy-btn").forEach(e=>{const t=e.getAttribute("data-amount");t&&this.buyButtons.set(t,e)}),document.querySelectorAll(".quick-sell-btn").forEach(e=>{const t=e.getAttribute("data-percentage");t&&this.sellButtons.set(t,e)})}getBuyButton(e){return this.buyButtons.get(e.toString())}getSellButton(e){return this.sellButtons.get(e.toString())}showLoadingState(e){if(!e)return"";const t=e.innerHTML;return e.classList.add("loading"),e.innerHTML=`<span>${t}</span><div class="loading-dots"><span></span><span></span><span></span></div>`,e.disabled=!0,t}hideLoadingState(e,t){e&&(e.classList.remove("loading"),e.innerHTML=t,e.disabled=!1)}updateWalletDisplay(t=null,s=null){if(this.elements?.walletBalance){const n=t||this.wallet;if(n){const i=window.AppState?.config?.currentChain||"SOL",a=window.ChainUtils?.getChain(i)||{symbol:"SOL",decimals:4,fallbackPrice:190};let e=0;n.balances&&void 0!==n.balances[i]?e=n.balances[i]:"SOL"===i&&void 0!==n.balance&&(e=n.balance);const l=s||window.PriceManager&&window.PriceManager.getPrice(i)||a.fallbackPrice,o=e*l,r=window.TRADING_TEMPLATES?.getChainIcon()||a.fallbackSymbol||"◎";this.elements.walletBalance.innerHTML=`
      ${e.toFixed(a.decimals||2)}&nbsp;
      <span class="chain-icon">${r}</span>
    `,this.elements.walletBalance.title=`$${o.toFixed(2)} USD`,t&&(this.wallet=t)}}}setButtonEnabled(e,t){e&&(e.disabled=!t,t?e.classList.remove("disabled"):e.classList.add("disabled"))}setButtonGroupEnabled(e,t){const s="buy"===e?this.buyButtons:this.sellButtons;s.forEach(e=>{this.setButtonEnabled(e,t)})}showSuccessState(e,t="Success!"){if(e){const s=e.innerHTML,n=e.className;e.innerHTML=t,e.classList.add("success"),setTimeout(()=>{e.innerHTML=s,e.className=n},1500)}}showErrorState(e,t="Error"){if(e){const s=e.innerHTML,n=e.className;e.innerHTML=t,e.classList.add("error"),setTimeout(()=>{e.innerHTML=s,e.className=n},2e3)}}highlightButton(e,t=300){e&&(e.classList.add("highlighted"),setTimeout(()=>{e.classList.remove("highlighted")},t))}updatePriceDisplay(e=null,t=!1){if(this.elements?.currentPrice){const s=this.elements.currentPrice.parentElement;t||!e?(s.style.display="block",this.elements.currentPrice.textContent=t?"Loading...":"Price unavailable",s.classList.toggle("loading",t)):(s.style.display="none",s.classList.remove("loading"))}}togglePositionDisplay(e){this.elements?.positionInfo&&(this.elements.positionInfo.style.display=e?"block":"none")}setTradingActiveState(e){this.elements?.widget&&(e?this.elements.widget.classList.add("trading-active"):this.elements.widget.classList.remove("trading-active"))}refreshButtonCache(){this.buyButtons.clear(),this.sellButtons.clear(),this.initializeButtonCache()}addWidgetClass(e){this.elements?.widget&&e&&this.elements.widget.classList.add(e)}removeWidgetClass(e){this.elements?.widget&&e&&this.elements.widget.classList.remove(e)}destroy(){this.buyButtons.clear(),this.sellButtons.clear(),this.elements=null,this.wallet=null}}"undefined"!=typeof window&&(window.UIController=UIController);