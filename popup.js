// Popup script for TabOracle with Tabbed Interface
class TabOraclePopup {
    constructor() {
        // Check if we're in extension context
        this.checkExtensionContext();
        
        // Initialize UI elements
        this.searchInput = document.getElementById('searchInput');
        this.tabsList = document.getElementById('tabsList');
        this.searchResults = document.getElementById('searchResults');
        this.tabCounter = document.getElementById('tabCounter');
        this.refreshButton = document.getElementById('refreshButton');
        
        // Initialize tab navigation
        this.searchTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-panel');
        
        // Initialize category elements
        this.categoriesGrid = document.getElementById('categoriesGrid');
        this.categoryResults = document.getElementById('categoryResults');
        
        // Initialize AI elements
        this.aiSearchInput = document.getElementById('aiSearchInput');
        this.aiSearchButton = document.getElementById('aiSearchButton');
        this.aiResults = document.getElementById('aiResults');
        this.aiLoading = document.getElementById('aiLoading');
        
        // Initialize summary elements
        this.summaryInput = document.getElementById('summaryInput');
        this.summaryButton = document.getElementById('summaryButton');
        this.summaryResults = document.getElementById('summaryResults');
        this.summaryLoading = document.getElementById('summaryLoading');
        
        // Initialize additional elements needed for tab switching
        this.initializeElements();
        
        // Debug: Log what elements were found
        console.log('🔍 TabOracle: Constructor initialization complete');
        console.log('🔍 TabOracle: Found elements:', {
            searchTabs: this.searchTabs?.length || 0,
            tabContents: this.tabContents?.length || 0,
            searchInput: !!this.searchInput,
            tabsList: !!this.tabsList,
            categoriesGrid: !!this.categoriesGrid
        });
        
        // Setup event listeners
        this.setupEventListeners();
        this.setupTabRefresh();
        
        // Set default tab and load initial content
        this.currentTab = 'normalSearchTab';
        this.switchTab('normalSearchTab');

        // If a persisted summary exists for the active tab, show it immediately
        (async () => {
            try {
                const activeTab = await new Promise((resolve) => {
                    try { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0])); } catch (_e) { resolve(null); }
                });
                if (activeTab && activeTab.id) {
                    const resp = await chrome.runtime.sendMessage({ action: 'getTabSummary', tabId: activeTab.id });
                    if (resp && resp.success && resp.summary) {
                        // Switch to summary tab and render without requiring another click
                        this.switchTab('pageSummaryTab');
                        this.renderSummary(resp.summary);
                    }
                }
            } catch (_e) {}
        })();
        
        // Debug: Check if tabs were loaded
        console.log('🔍 TabOracle: After switchTab, checking state...');
        console.log('🔍 TabOracle: allTabs length:', this.allTabs?.length || 'undefined');
        console.log('🔍 TabOracle: tabsList display:', this.tabsList?.style.display);
        console.log('🔍 TabOracle: searchResults display:', this.searchResults?.style.display);
        
        // Fix popup height
        this.fixPopupHeight();
        window.addEventListener('resize', () => this.fixPopupHeight());
    }

    checkExtensionContext() {
        console.log('🔍 TabOracle: Checking extension context...');
        console.log('🔍 TabOracle: typeof chrome:', typeof chrome);
        console.log('🔍 TabOracle: chrome object:', chrome);
        
        if (typeof chrome === 'undefined') {
            console.error('❌ TabOracle: chrome object is undefined - not in extension context');
            this.showExtensionContextError();
            return;
        }
        
        if (!chrome.runtime) {
            console.error('❌ TabOracle: chrome.runtime is undefined');
            this.showExtensionContextError();
            return;
        }
        
        if (!chrome.tabs) {
            console.error('❌ TabOracle: chrome.tabs is undefined');
            this.showExtensionContextError();
            return;
        }
        
        console.log('✅ TabOracle: Extension context is available');
        console.log('✅ TabOracle: chrome.runtime available:', !!chrome.runtime);
        console.log('✅ TabOracle: chrome.tabs available:', !!chrome.tabs);
        console.log('✅ TabOracle: chrome.storage available:', !!chrome.storage);
        
        // Test background script connection
        this.testBackgroundConnection();
    }

    showExtensionContextError() {
        const debugResults = document.getElementById('debugResults');
        if (debugResults) {
            debugResults.innerHTML = `
                <div style="color: #ef4444; padding: 20px; text-align: center;">
                    <h3>❌ Extension Context Error</h3>
                    <p>The extension context is not available. This usually means:</p>
                    <ul style="text-align: left; margin: 20px 0;">
                        <li>The extension is not properly installed</li>
                        <li>The extension is disabled</li>
                        <li>There's a manifest error</li>
                        <li>The popup is not running in extension context</li>
                    </ul>
                    <p><strong>Try reloading the extension from chrome://extensions/</strong></p>
                </div>
            `;
        }
        
        // Also show error in main content
        const tabsList = document.getElementById('tabsList');
        if (tabsList) {
            tabsList.innerHTML = `
                <div style="color: #ef4444; padding: 20px; text-align: center;">
                    <h3>❌ Extension Context Error</h3>
                    <p>Cannot access extension APIs. Please reload the extension.</p>
                </div>
            `;
        }
    }

    async testBackgroundConnection() {
        try {
            console.log('🔍 TabOracle: Testing background script connection...');
            
            // Test if background script is responding
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            console.log('✅ TabOracle: Background script connection successful:', response);
            
        } catch (error) {
            console.error('❌ TabOracle: Background script connection failed:', error);
            this.showBackgroundConnectionError();
        }
    }

    showBackgroundConnectionError() {
        const debugResults = document.getElementById('debugResults');
        if (debugResults) {
            debugResults.innerHTML = `
                <div style="color: #f59e0b; padding: 20px; text-align: center;">
                    <h3>⚠️ Background Script Connection Error</h3>
                    <p>The background script is not responding. This could mean:</p>
                    <ul style="text-align: left; margin: 20px 0;">
                        <li>The background script failed to load</li>
                        <li>There's an error in background.js</li>
                        <li>The service worker is not running</li>
                    </ul>
                    <p><strong>Check the browser console for background script errors</strong></p>
                </div>
            `;
        }
    }

    setupTabRefresh() {
        // Refresh tabs when the popup window gains focus
        window.addEventListener('focus', () => {
            console.log('🔄 TabOracle: Popup focused, refreshing tabs...');
            this.loadTabs();
        });
        
        // Also refresh when the popup is shown (alternative approach)
        if (document.visibilityState) {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    console.log('🔄 TabOracle: Popup visible, refreshing tabs...');
                    this.loadTabs();
                }
            });
        }
    }

    async ensureLanguageModelInitialized() {
        if (this.languageModelInitialized) return;
        try {
            console.log('🔍 TabOracle: Checking for language model availability...');
            
            // Check for Chrome Language Model (Gemini Nano)
            if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
                console.log('🔍 TabOracle: Chrome Language Model API available, attempting to initialize...');
                try {
                    this.languageModel = await chrome.languageModel.create();
                    // Test the model with a simple prompt
                    const testResponse = await this.languageModel.prompt('Hello');
                    if (testResponse) {
                        this.languageModelInitialized = true;
                        console.log('✅ TabOracle: Chrome Language Model initialized and tested successfully');
                        return;
                    }
                } catch (modelError) {
                    console.warn('⚠️ TabOracle: Chrome Language Model failed:', modelError);
                    if (modelError.name === 'DOMException') {
                        console.warn('⚠️ TabOracle: DOMException suggests permission or compatibility issue');
                    }
                    // Continue to try other methods
                }
            }
            
            // Check for global LanguageModel (alternative access method)
            if (typeof LanguageModel !== 'undefined' && LanguageModel.create) {
                console.log('🔍 TabOracle: Global LanguageModel available, attempting to initialize...');
                try {
                    this.languageModel = await LanguageModel.create();
                    const testResponse = await this.languageModel.prompt('Hello');
                    if (testResponse) {
                        this.languageModelInitialized = true;
                        console.log('✅ TabOracle: Global LanguageModel initialized and tested successfully');
                        return;
                    }
                } catch (modelError) {
                    console.warn('⚠️ TabOracle: Global LanguageModel failed:', modelError);
                }
            }
            
            // Check for window.LanguageModel (another alternative)
            if (typeof window !== 'undefined' && window.LanguageModel && window.LanguageModel.create) {
                console.log('🔍 TabOracle: Window LanguageModel available, attempting to initialize...');
                try {
                    this.languageModel = await window.LanguageModel.create();
                    const testResponse = await this.languageModel.prompt('Hello');
                    if (testResponse) {
                        this.languageModelInitialized = true;
                        console.log('✅ TabOracle: Window LanguageModel initialized and tested successfully');
                        return;
                    }
                } catch (modelError) {
                    console.warn('⚠️ TabOracle: Window LanguageModel failed:', modelError);
                }
            }
            
            // No language model available
            console.log('⚠️ TabOracle: No working language model available on this system');
            console.log('⚠️ TabOracle: Will use intelligent fallback for summaries');
            this.languageModel = null;
            this.languageModelInitialized = true; // Mark as initialized to avoid repeated checks
            
            // Show notice
            if (this.geminiNotice) {
                this.geminiNotice.style.display = 'flex';
                const noticeText = this.geminiNotice.querySelector('.notice-text');
                if (noticeText) {
                    noticeText.innerHTML = `
                        <strong>AI Features Note:</strong><br>
                        Chrome Language Model (Gemini Nano) is not working on this system.<br>
                        This may be due to:<br>
                        • Windows compatibility issues<br>
                        • Chrome version requirements<br>
                        • API permission issues<br>
                        TabOracle will use intelligent fallback for summaries.
                    `;
                }
            }
            
        } catch (e) {
            console.warn('⚠️ TabOracle: Language model init failed, using fallback', e);
            this.languageModel = null;
            this.languageModelInitialized = true; // Mark as initialized to avoid repeated checks
            if (this.geminiNotice) {
                this.geminiNotice.style.display = 'flex';
                const noticeText = this.geminiNotice.querySelector('.notice-text');
                if (noticeText) {
                    noticeText.innerHTML = `
                        <strong>AI Features Note:</strong><br>
                        Language model initialization failed: ${e.message}<br>
                        TabOracle will use intelligent fallback for summaries.
                    `;
                }
            }
        }
    }

    setSummaryLoading(isLoading, message = 'Generating summary...') {
        if (!this.pageSummaryContent) return;
        if (isLoading) {
            this.pageSummaryContent.classList.add('loading');
            this.pageSummaryContent.innerHTML = `
                <div class="ai-search-loading">
                    <div class="loading-spinner">
                    <img src="${chrome.runtime.getURL('taboracle_icon_only.svg')}" 
                         alt="TabOracle" 
                         style="
                             width: 80px;
                             height: 80px;
                             animation: logoGlow 2s infinite;
                         "
                         onerror="this.style.display='none'; this.parentElement.innerHTML='✨';">
                </div>
                    <div class="loading-text">${this.escapeHtml(message)}</div>
                    <div class="loading-subtext">Please wait while we analyze the page</div>
                </div>
            `;
        } else {
            this.pageSummaryContent.classList.remove('loading');
        }
    }

    async handleTestLanguageModel() {
        console.log('🧪 TabOracle: Starting Test AI...');
        try {
            console.log('🧪 TabOracle: Ensuring language model initialized...');
            await this.ensureLanguageModelInitialized();
            if (!this.languageModel || !this.languageModel.prompt) {
                console.log('⚠️ TabOracle: No AI model available, showing fallback message');
                this.pageSummaryContent.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">🤖</div>
                        <div><strong>AI Features Note</strong></div>
                        <div>Chrome Language Model (Gemini Nano) is not working on this system.</div>
                        <div>TabOracle will use intelligent fallback for summaries.</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            This may be due to Windows compatibility, Chrome version, or API permissions.
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            Try the "Generate Summary" button to see the fallback in action.
                        </div>
                    </div>
                `;
                if (this.geminiNotice) this.geminiNotice.style.display = 'flex';
                return;
            }
            this.setSummaryLoading(true, 'Testing on-device AI...');
            const response = await this.languageModel.prompt('Say "Hello, TabOracle is working!"');
            const text = typeof response === 'string' ? response : (response?.text || response?.response || JSON.stringify(response));
            this.setSummaryLoading(false);
            this.pageSummaryContent.innerHTML = `
                <div class="summary-text">${this.escapeHtml(text)}</div>
            `;
        } catch (error) {
            console.error('❌ TabOracle: Test AI failed:', error);
            this.setSummaryLoading(false);
            
            let errorDetails = error.message;
            if (error.name === 'DOMException') {
                errorDetails = 'Permission or compatibility issue with Chrome Language Model API';
            }
            
            this.pageSummaryContent.innerHTML = `
                <div class="empty-state error">
                    <div class="icon">❌</div>
                    <div><strong>AI Test Failed</strong></div>
                    <div>Error: ${this.escapeHtml(errorDetails)}</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        This is likely due to Chrome Language Model API issues.<br>
                        Try the "Generate Summary" button to use the fallback system.
                    </div>
                </div>
            `;
        }
    }

    async handleGenerateSummary() {
        console.log('📝 TabOracle: Starting Generate Summary...');
        try {
            console.log('📝 TabOracle: Setting loading state...');
            this.setSummaryLoading(true);

            // Get active tab id
            const activeTab = await new Promise((resolve) => {
                try {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0]));
                } catch (_e) { resolve(null); }
            });

            if (!activeTab) {
                this.setSummaryLoading(false);
                this.pageSummaryContent.innerHTML = `<div class="empty-state error">Cannot detect active tab.</div>`;
                return;
            }

            // First, try summarizing with popup AI model (same environment as Test AI)
            let popupSummary = null;
            try {
                // Get page content via background
                let contentResp = await chrome.runtime.sendMessage({ action: 'getPageContent', tabId: activeTab.id });
                if (!contentResp || !contentResp.success) {
                    // Fallback: request background to extract then retry
                    try {
                        await chrome.runtime.sendMessage({ action: 'extractContent', tabId: activeTab.id });
                        contentResp = await chrome.runtime.sendMessage({ action: 'getPageContent', tabId: activeTab.id });
                    } catch (_e) {}
                }
                if (contentResp && contentResp.success) {
                    const pageContent = contentResp.content || '';
                    const pageTitle = activeTab.title || '';
                    const pageUrl = activeTab.url || '';
                    await this.ensureLanguageModelInitialized();
                    if (this.languageModel && this.languageModel.prompt) {
                        const prompt = `Return ONLY valid JSON. Summarize page with keys: summary, mainTopic, keyPoints, contentType, wordCount, estimatedReadingTime, confidence.\nTitle: ${pageTitle}\nURL: ${pageUrl}\nContent: ${pageContent.substring(0, 8000)}`;
                        const response = await this.languageModel.prompt(prompt);
                        const raw = typeof response === 'string' ? response : (response?.text || response?.response || JSON.stringify(response));
                        popupSummary = this.parseAIJsonSafely(raw);
                    }
                    if (!popupSummary) {
                        popupSummary = this.basicFallbackSummary(pageContent, pageTitle);
                    }
                }
            } catch (_e) {}

            if (popupSummary) {
                try { await chrome.runtime.sendMessage({ action: 'setTabSummary', tabId: activeTab.id, summary: popupSummary }); } catch (_e) {}
                this.setSummaryLoading(false);
                this.renderSummary(popupSummary);
                return;
            }

            // If popup AI path didn't produce a summary, start background job and show background message immediately
            try { 
                await chrome.runtime.sendMessage({ action: 'startSummary', tabId: activeTab.id }); 
                this.setSummaryLoading(true, 'Generating in background... You can close this and return later.');
            } catch (_e) {
                this.setSummaryLoading(false);
                this.pageSummaryContent.innerHTML = `<div class="empty-state error">Failed to start background generation.</div>`;
                return;
            }
        } catch (error) {
            console.error('❌ TabOracle: Generate summary failed:', error);
            this.setSummaryLoading(false);
            this.pageSummaryContent.innerHTML = `<div class="empty-state error">Summary failed: ${this.escapeHtml(error.message)}</div>`;
        }
    }

    parseAIJsonSafely(text) {
        if (!text) return null;
        try {
            const match = String(text).match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch (_e) {}
                const cleaned = match[0].replace(/[^\x20-\x7E]/g, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                return JSON.parse(cleaned);
            }
            return JSON.parse(String(text));
        } catch (_e) {
            return null;
        }
    }

    basicFallbackSummary(pageContent, pageTitle) {
        console.log('🔄 TabOracle: Using intelligent fallback summary generation');
        
        const words = (pageContent || '').split(/\s+/).filter(w => w.length > 2);
        const wordCount = words.length;
        const minutes = Math.max(1, Math.ceil(wordCount / 225));
        
        // Extract key information from content
        const sentences = (pageContent || '').split(/[.!?]+/).filter(s => s.trim().length > 10);
        const firstFewSentences = sentences.slice(0, 3).join('. ').trim();
        
        // Try to identify content type
        let contentType = 'webpage';
        const lowerContent = pageContent.toLowerCase();
        if (lowerContent.includes('research') || lowerContent.includes('study') || lowerContent.includes('paper')) {
            contentType = 'research';
        } else if (lowerContent.includes('documentation') || lowerContent.includes('api') || lowerContent.includes('guide')) {
            contentType = 'documentation';
        } else if (lowerContent.includes('news') || lowerContent.includes('article')) {
            contentType = 'article';
        } else if (lowerContent.includes('tutorial') || lowerContent.includes('how to')) {
            contentType = 'tutorial';
        }
        
        // Extract key points (simple approach)
        const keyPoints = [];
        const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'critical'];
        for (let i = 0; i < Math.min(5, sentences.length); i++) {
            const sentence = sentences[i];
            if (importantWords.some(word => sentence.toLowerCase().includes(word))) {
                keyPoints.push(sentence.trim());
            }
        }
        
        // If no key points found, use first few sentences
        if (keyPoints.length === 0 && sentences.length > 0) {
            keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
        }
        const summary = firstFewSentences || `This page titled "${pageTitle || 'Untitled'}" contains ${wordCount} words. Estimated reading time: ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        return {
            summary,
            mainTopic: pageTitle || 'This page',
            keyPoints: keyPoints.slice(0, 5),
            contentType: contentType,
            wordCount,
            estimatedReadingTime: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            confidence: 0.7
        };
    }

    renderSummary(data) {
        if (!this.pageSummaryContent) return;
        if (!data) {
            this.pageSummaryContent.innerHTML = `<div class="empty-state error">No summary available.</div>`;
            return;
        }
        const keyPoints = (data.keyPoints || []).slice(0, 5).map(p => `<li>${this.escapeHtml(String(p))}</li>`).join('');
        const numericWordCount = Number(data.wordCount) || (data.summary ? data.summary.trim().split(/\s+/).length : 0);
        const minutes = numericWordCount ? Math.max(1, Math.ceil(numericWordCount / 225)) : null;
        const metaBits = [];
        if (numericWordCount) metaBits.push(`Words: ${numericWordCount}`);
        if (minutes) metaBits.push(`Read time: ${minutes} min`);
        if (data.contentType) metaBits.push(`Type: ${this.escapeHtml(String(data.contentType))}`);
        if (typeof data.confidence === 'number') metaBits.push(`Confidence: ${Math.round(data.confidence * 100)}%`);
        const metaHtml = metaBits.length ? `<div class="summary-meta">${metaBits.join(' • ')}</div>` : '';

        this.pageSummaryContent.innerHTML = `
            ${metaHtml}
            <div class="summary-text">${this.escapeHtml(data.summary || '')}</div>
            ${keyPoints ? `<div class="ai-result"><div class="ai-result-header"><div class="ai-result-content"><div class="ai-result-title">Key points</div><ul>${keyPoints}</ul></div></div></div>` : ''}
            <div class="ai-disclaimer" style="margin-top: 12px; font-size: 11px; color: #6b7280;">
                ⚠️ AI Generated content may be inaccurate. Verify important information.
            </div>
            <div class="review-request" style="margin-top: 16px; text-align: center;">
                <div style="
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    padding: 16px;
                    margin: 16px 0;
                ">
                    <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
                        🎉 Enjoying TabOracle?
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                        Help others discover this extension by leaving a review!
                    </div>
                    <button id="reviewButton" style="
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 8px 16px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-right: 8px;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ⭐ Leave a Review
                    </button>
                    <button id="supportButton" style="
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 8px 16px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ☕ Support TabOracle
                    </button>
                </div>
            </div>
        `;
    }
    initializeElements() {
        // Tab elements
        this.searchTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-panel');
        
        // Normal search elements
        this.searchInput = document.getElementById('searchInput');
        this.tabsList = document.getElementById('tabsList');
        this.searchResults = document.getElementById('searchResults');
        
        // Category search elements
        this.categoriesGrid = document.getElementById('categoriesGrid');
        this.categoryResults = document.getElementById('categoryResults');
        
        // Smart search elements
        this.smartSearchInput = document.getElementById('smartSearchInput');
        this.smartSearchResults = document.getElementById('smartSearchResults');
        
        // Page summary elements
        this.generateSummaryButton = document.getElementById('generateSummary');
        this.testLanguageModelButton = document.getElementById('testLanguageModel');
        this.pageSummaryContent = document.getElementById('pageSummaryContent');
        
        // Debug: Log button elements
        console.log('🔍 TabOracle: Summary button elements found:', {
            generateSummary: !!this.generateSummaryButton,
            testLanguageModel: !!this.testLanguageModelButton,
            pageSummaryContent: !!this.pageSummaryContent
        });
        
        this.geminiNotice = document.getElementById('geminiNotice');
        this.openFlagsButton = document.getElementById('openFlags');
        this.languageModel = null;
        this.languageModelInitialized = false;
        
        // Footer
        // Header tab counter (container has id tabCounter; numeric span has class counter-text)
        this.tabCountContainer = document.getElementById('tabCounter');
        
        // Refresh button
        this.refreshButton = document.getElementById('refreshButton');
        

    }

    fixPopupHeight() {
        try {
            const targetHeight = Math.max(900, window.innerHeight || 0);
            document.body.style.height = `${targetHeight}px`;
            const app = document.querySelector('.app-container');
            if (app) {
                app.style.height = `${targetHeight}px`;
            }
        } catch (_e) {
            // no-op; best effort sizing
        }
    }

        setupReviewButton() {
        // Function to open Chrome Web Store review page
        const openReviewPage = () => {
            try {
                const extensionId = chrome.runtime.id;
                const reviewUrl = `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
                chrome.tabs.create({ url: reviewUrl });
                console.log('🎯 TabOracle: User clicked review button');
            } catch (error) {
                console.error('❌ TabOracle: Error opening review URL:', error);
                // Fallback: try to open a generic review page
                try {
                    window.open('https://chrome.google.com/webstore/detail/taboracle-ai-powered-tab-intelligence/reviews', '_blank');
                } catch (fallbackError) {
                    console.error('❌ TabOracle: Fallback also failed:', fallbackError);
                }
            }
        };
        
        // Set up review button click handlers
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reviewButton') {
                openReviewPage();
            }
        });
        
        // Also handle Explain Me review button if it exists
        document.addEventListener('click', (e) => {
            if (e.target.id === 'explainMeReviewButton') {
                openReviewPage();
            }
        });
        
        // Handle support button clicks
        document.addEventListener('click', (e) => {
            if (e.target.id === 'supportButton') {
                this.openSupportPage();
            }
        });
 

    }
    
    openSupportPage() {
        // Open Buy Me a Coffee support page
        const supportUrl = 'https://buymeacoffee.com/adityas';
        chrome.tabs.create({ url: supportUrl });
        console.log('🎯 TabOracle: User clicked support button');
    }
    


    setupEventListeners() {
        console.log('🎯 TabOracle: Setting up event listeners...');
        
        // Tab switching
        console.log('🎯 TabOracle: Found', this.searchTabs.length, 'tab elements');
        this.searchTabs.forEach((tab, index) => {
            console.log(`🎯 TabOracle: Binding click to tab ${index}:`, tab.dataset.tab);
            tab.addEventListener('click', () => {
                console.log('🎯 TabOracle: Tab clicked:', tab.dataset.tab);
                this.switchTab(tab.dataset.tab);
            });
        });

        // Normal search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleNormalSearch(e.target.value));
        }
        
        // Smart search
        if (this.smartSearchInput) {
            this.smartSearchInput.addEventListener('input', (e) => this.handleSmartSearch(e.target.value));
            this.smartSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performAISearch(e.target.value);
                }
            });
        }
        
        // AI Search button
        if (this.aiSearchButton) {
            this.aiSearchButton.addEventListener('click', () => {
                const query = this.aiSearchInput?.value || this.smartSearchInput?.value;
                if (query) {
                    this.performAISearch(query);
                }
            });
        }
        
        // Review button functionality
        this.setupReviewButton();
        
        // Category selection
        if (this.categoriesGrid) {
            console.log('🎯 TabOracle: Setting up category click handling...');
            
            // Event delegation approach
            this.categoriesGrid.addEventListener('click', (e) => {
                const categoryCard = e.target.closest('.category-card');
                if (categoryCard) {
                    const category = categoryCard.dataset.category;
                    console.log('🎯 TabOracle: Category clicked via delegation:', category);
                    this.showCategoryResults(category);
                }
            });
            
            // Also add direct event listeners for better compatibility
            this.addCategoryClickListeners();
        }
        
        // Debug button (removed)
        
        // Debug functionality
        this.setupDebugEventListeners();
        
        // Back to categories button (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'backToCategoriesBtn') {
                this.goBackToCategories();
            }
        });
        
        // Refresh button
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => {
                console.log('🔄 TabOracle: Manual refresh requested');
                this.loadTabs();
            });
        }
        
        // Page summary actions
        if (this.testLanguageModelButton) {
            console.log('🔍 TabOracle: Adding click listener to Test AI button');
            
            // Add visual indicator that button is clickable
            this.testLanguageModelButton.style.border = '2px solid #4CAF50';
            this.testLanguageModelButton.title = 'Click to test AI (Debug: Button is clickable)';
            
            // Test if button is actually in DOM and visible
            console.log('🔍 TabOracle: Test AI button properties:', {
                offsetWidth: this.testLanguageModelButton.offsetWidth,
                offsetHeight: this.testLanguageModelButton.offsetHeight,
                style: this.testLanguageModelButton.style.display,
                visible: this.testLanguageModelButton.offsetWidth > 0 && this.testLanguageModelButton.offsetHeight > 0
            });
            
            // Try multiple event listeners for better compatibility
            this.testLanguageModelButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 TabOracle: Test AI button clicked (click event)');
                this.handleTestLanguageModel();
            });
            
            this.testLanguageModelButton.addEventListener('mousedown', (e) => {
                console.log('🔍 TabOracle: Test AI button mousedown');
            });
            
            this.testLanguageModelButton.addEventListener('mouseup', (e) => {
                console.log('🔍 TabOracle: Test AI button mouseup');
            });
            
            // Also try touch events for better compatibility
            this.testLanguageModelButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('🔍 TabOracle: Test AI button touchstart');
                this.handleTestLanguageModel();
            });
            
        } else {
            console.error('❌ TabOracle: Test AI button not found');
        }
        
        // Test background service worker connection
        console.log('🔍 TabOracle: Testing background service worker connection...');
        chrome.runtime.sendMessage({ action: 'ping', data: 'popup-test' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ TabOracle: Background service worker not responding:', chrome.runtime.lastError);
            } else {
                console.log('✅ TabOracle: Background service worker responding:', response);
            }
        });
        if (this.generateSummaryButton) {
            console.log('🔍 TabOracle: Adding click listener to Generate Summary button');
            
            // Add visual indicator that button is clickable
            this.generateSummaryButton.style.border = '2px solid #2196F3';
            this.generateSummaryButton.title = 'Click to generate summary (Debug: Button is clickable)';
            
            // Test if button is actually in DOM and visible
            console.log('🔍 TabOracle: Generate Summary button properties:', {
                offsetWidth: this.generateSummaryButton.offsetWidth,
                offsetHeight: this.generateSummaryButton.offsetHeight,
                style: this.generateSummaryButton.style.display,
                visible: this.generateSummaryButton.offsetWidth > 0 && this.generateSummaryButton.offsetHeight > 0
            });
            
            // Try multiple event listeners for better compatibility
            this.generateSummaryButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 TabOracle: Generate Summary button clicked (click event)');
                this.handleGenerateSummary();
            });
            
            this.generateSummaryButton.addEventListener('mousedown', (e) => {
                console.log('🔍 TabOracle: Generate Summary button mousedown');
            });
            
            this.generateSummaryButton.addEventListener('mouseup', (e) => {
                console.log('🔍 TabOracle: Generate Summary button mouseup');
            });
            
            // Also try touch events for better compatibility
            this.generateSummaryButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('🔍 TabOracle: Generate Summary button touchstart');
                this.handleGenerateSummary();
            });
            
        } else {
            console.error('❌ TabOracle: Generate Summary button not found');
        }
        

        
        if (this.openFlagsButton) {
            this.openFlagsButton.addEventListener('click', () => {
                chrome.tabs.create({ url: 'chrome://flags/#prompt-api-for-gemini-nano' });
            });
        }
        
        console.log('🎯 TabOracle: Event listeners setup complete');
    }

    switchTab(tabName) {
        console.log('🔄 TabOracle: Switching to tab:', tabName);
        
        // Update active tab button
        this.searchTabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            console.log(`🔄 TabOracle: Tab ${tab.dataset.tab} active:`, isActive);
        });

        // Update active tab content
        this.tabContents.forEach(content => {
            const shouldShow = content.id === tabName;
            content.style.display = shouldShow ? 'flex' : 'none';
            console.log(`🔄 TabOracle: Panel ${content.id} display:`, shouldShow ? 'flex' : 'none');
        });

        this.currentTab = tabName;
        // When switching to pageSummaryTab, try to load persisted summary for active tab
        if (tabName === 'pageSummaryTab') {
            (async () => {
                try {
                    const activeTab = await new Promise((resolve) => {
                        try { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0])); } catch (_e) { resolve(null); }
                    });
                    if (activeTab && activeTab.id) {
                        const resp = await chrome.runtime.sendMessage({ action: 'getTabSummary', tabId: activeTab.id });
                        if (resp && resp.success) {
                            if (resp.state === 'ready' && resp.summary) {
                                this.renderSummary(resp.summary);
                            } else if (resp.state === 'in_progress') {
                                this.setSummaryLoading(true, 'Generating in background...');
                                // Light polling to update when it finishes while user is on this tab
                                const start = Date.now();
                                const tick = async () => {
                                    if (Date.now() - start > 15000) return; // stop after 15s
                                    let r = null;
                                    try { r = await chrome.runtime.sendMessage({ action: 'getTabSummary', tabId: activeTab.id }); } catch (_e) {}
                                    if (r && r.success && r.state === 'ready' && r.summary) {
                                        this.setSummaryLoading(false);
                                        this.renderSummary(r.summary);
                                        return;
                                    }
                                    setTimeout(tick, 800);
                                };
                                setTimeout(tick, 800);
                            }
                        }
                    }
                } catch (_e) {}
            })();
        }
        
        // Load appropriate content
        switch(tabName) {
            case 'normalSearchTab':
                console.log('🔄 TabOracle: Loading normal search content');
                // Ensure the all-tabs view is visible by default
                if (this.tabsList) this.tabsList.style.display = 'block';
                if (this.searchResults) this.searchResults.style.display = 'none';
                this.loadTabs();
                break;
            case 'categorySearchTab':
                console.log('🔄 TabOracle: Loading category content');
                this.loadCategories();
                // Force refresh tabs in background script
                this.forceRefreshTabs();
                break;
            case 'smartSearchTab':
                console.log('🔄 TabOracle: Loading smart search content');
                this.loadSmartSearch();
                break;
            case 'pageSummaryTab':
                console.log('🔄 TabOracle: Page summary tab ready');
                this.ensureLanguageModelInitialized();
                break;
            default:
                console.log('🔄 TabOracle: Unknown tab:', tabName);
        }
    }

    async loadTabs() {
        try {
            console.log('🔍 TabOracle: Loading tabs...');
            const response = await chrome.runtime.sendMessage({ action: 'getTabs' });
            console.log('🔍 TabOracle: Response received:', response);
            this.allTabs = (response && response.tabs) ? response.tabs : [];
            console.log('🔍 TabOracle: Tabs loaded:', this.allTabs.length);
            this.renderTabs(this.allTabs);
            this.updateTabCount();
        } catch (error) {
            console.error('❌ TabOracle: Failed to load tabs:', error);
        }
    }

    async loadCategories() {
        try {
            console.log('🏷️ TabOracle: Loading categories...');
            
            // First try to get categories directly from background script
            try {
                const categoriesResponse = await chrome.runtime.sendMessage({ action: 'getCategories' });
                console.log('🏷️ TabOracle: Categories response:', categoriesResponse);
                
                if (categoriesResponse.categories && Object.keys(categoriesResponse.categories).length > 0) {
                    console.log('🏷️ TabOracle: Categories loaded successfully:', Object.keys(categoriesResponse.categories));
                    this.renderCategoriesFromBackground(categoriesResponse.categories);
                    return;
                }
            } catch (error) {
                console.warn('⚠️ TabOracle: Failed to get categories directly, trying tabs approach:', error);
            }
            
            // Fallback: Get tabs and categorize locally
            const response = await chrome.runtime.sendMessage({ action: 'getTabs' });
            console.log('🏷️ TabOracle: Tabs response:', response);
            
            this.allTabs = response.tabs || [];
            console.log('🏷️ TabOracle: Tabs loaded for categories:', this.allTabs.length);
            
            // Debug: Log first few tabs to see their structure
            if (this.allTabs.length > 0) {
                console.log('🏷️ TabOracle: Sample tab structure:', this.allTabs[0]);
                console.log('🏷️ TabOracle: Sample tab has title:', this.allTabs[0].title);
                console.log('🏷️ TabOracle: Sample tab has URL:', this.allTabs[0].url);
            }
            
            if (this.allTabs.length === 0) {
                console.log('🏷️ TabOracle: No tabs found for categorization');
                this.categoriesGrid.innerHTML = '<div class="empty-state">No tabs found to categorize</div>';
                return;
            }
            
            const categories = this.getCategories();
            console.log('🏷️ TabOracle: Categories generated:', categories);
            
            if (categories.length === 0) {
                console.log('🏷️ TabOracle: No categories could be determined');
                this.categoriesGrid.innerHTML = '<div class="empty-state">No categories could be determined from your tabs</div>';
                return;
            }
            
            this.renderCategories();
        } catch (error) {
            console.error('❌ TabOracle: Failed to load categories:', error);
            this.categoriesGrid.innerHTML = '<div class="empty-state error">Error loading categories: ' + error.message + '</div>';
        }
    }

    loadSmartSearch() {
        // Smart search is ready for input
        this.smartSearchInput.focus();
    }
    
    debugCategories() {
        console.log('🔍 TabOracle: Category Debug Information');
        console.log('Total Tabs:', this.allTabs.length);
        console.log('Tabs with Context:', this.allTabs.filter(tab => tab.context && Object.keys(tab.context).length > 0).length);
        console.log('Tabs without Context:', this.allTabs.filter(tab => !tab.context || Object.keys(tab.context).length === 0).length);
        
        // Show sample tabs
        if (this.allTabs.length > 0) {
            console.log('Sample Tabs:');
            this.allTabs.slice(0, 3).forEach((tab, index) => {
                console.log(`Tab ${index + 1}:`, {
                    title: tab.title,
                    url: tab.url,
                    hasContext: !!(tab.context && Object.keys(tab.context).length > 0)
                });
            });
        }
        
        // Show debug info in UI
        const debugInfo = `
            <div class="debug-info">
                <h4>🔍 Category Debug Information</h4>
                <p><strong>Total Tabs:</strong> ${this.allTabs.length}</p>
                <p><strong>Tabs with Context:</strong> ${this.allTabs.filter(tab => tab.context && Object.keys(tab.context).length > 0).length}</p>
                <p><strong>Tabs without Context:</strong> ${this.allTabs.filter(tab => !tab.context || Object.keys(tab.context).length === 0).length}</p>
                <p><strong>Sample Tabs:</strong></p>
                <ul>
                    ${this.allTabs.slice(0, 3).map(tab => `
                        <li><strong>Title:</strong> ${tab.title || 'NO TITLE'} | <strong>URL:</strong> ${tab.url || 'NO URL'} | <strong>Has Context:</strong> ${!!(tab.context && Object.keys(tab.context).length > 0)}</li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        this.categoriesGrid.innerHTML = debugInfo;
    }

    renderTabs(tabs) {
        if (tabs.length === 0) {
            this.tabsList.innerHTML = '<div class="empty-state">No tabs found</div>';
            return;
        }

        this.tabsList.innerHTML = tabs.map(tab => this.createTabElement(tab)).join('');
        this.addTabClickListeners(this.tabsList);
    }

    renderCategories() {
        const categories = this.getCategories();
        this.categoriesGrid.innerHTML = categories.map(category => this.createCategoryCard(category)).join('');
        
        // Add click event listeners to category cards
        this.addCategoryClickListeners();
        
        console.log('🏷️ TabOracle: Categories rendered and click listeners added');
    }

    renderCategoriesFromBackground(categories) {
        console.log('🏷️ TabOracle: Rendering categories from background script:', categories);
        
        if (!categories || Object.keys(categories).length === 0) {
            this.categoriesGrid.innerHTML = '<div class="empty-state">No categories found</div>';
            return;
        }
        
        // Store background categories for use in showCategoryResults
        this.backgroundCategories = categories;
        console.log('🏷️ TabOracle: Stored background categories:', Object.keys(this.backgroundCategories));
        
        // Convert background script categories to UI format, filtering out empty ones
        const categoryCards = Object.entries(categories)
            .filter(([_name, tabs]) => Array.isArray(tabs) && tabs.length > 0)
            .map(([categoryName, tabs]) => {
            console.log(`🏷️ TabOracle: Creating card for category: "${categoryName}" with ${tabs.length} tabs`);
            
            return this.createCategoryCard({
                name: categoryName,
                count: tabs.length,
                tabs: tabs,
                confidence: 1.0,
                keywords: []
            });
        }).join('');
        
        this.categoriesGrid.innerHTML = categoryCards;
        
        // Add click event listeners to category cards
        this.addCategoryClickListeners();
        
        console.log('🏷️ TabOracle: Categories rendered from background script');
    }

    addCategoryClickListeners() {
        console.log('🎯 TabOracle: Adding category click listeners...');
        const categoryCards = this.categoriesGrid.querySelectorAll('.category-card');
        console.log('🎯 TabOracle: Found category cards:', categoryCards.length);
        
        categoryCards.forEach((card, index) => {
            const categoryName = card.getAttribute('data-category');
            console.log(`🎯 TabOracle: Adding click listener to card ${index + 1}:`, categoryName);
            
            // Remove any existing listeners to prevent duplicates
            card.removeEventListener('click', card._categoryClickHandler);
            
            // Create and store the click handler
            card._categoryClickHandler = () => {
                console.log('🏷️ TabOracle: Category clicked:', categoryName);
                console.log('🏷️ TabOracle: Background categories available:', this.backgroundCategories ? Object.keys(this.backgroundCategories) : 'None');
                console.log('🏷️ TabOracle: Category exists in background:', this.backgroundCategories && this.backgroundCategories[categoryName] ? 'Yes' : 'No');
                if (this.backgroundCategories && this.backgroundCategories[categoryName]) {
                    console.log('🏷️ TabOracle: Category tabs count:', this.backgroundCategories[categoryName].length);
                }
                this.showCategoryResults(categoryName);
            };
            
            // Add the click listener
            card.addEventListener('click', card._categoryClickHandler);
            
            // Add visual feedback that the card is clickable
            card.style.cursor = 'pointer';
            card.title = `Click to view ${categoryName} tabs`;
        });
        
        console.log('🎯 TabOracle: Category click listeners added successfully');
    }

    async forceRefreshTabs() {
        try {
            console.log('🔄 TabOracle: Force refreshing tabs...');
            const response = await chrome.runtime.sendMessage({ action: 'forceRefreshTabs' });
            console.log('🔄 TabOracle: Force refresh response:', response);
            
            if (response.success) {
                console.log('✅ TabOracle: Tabs refreshed successfully, count:', response.tabsCount);
                // Reload categories after refresh
                setTimeout(() => {
                    this.loadCategories();
                }, 500);
            } else {
                console.error('❌ TabOracle: Force refresh failed:', response.error);
            }
        } catch (error) {
            console.error('❌ TabOracle: Error during force refresh:', error);
        }
    }

    getCategories() {
        console.log('🏷️ TabOracle: Starting category generation for', this.allTabs.length, 'tabs');
        
        const categoryMap = {};
        let categorizedCount = 0;
        let uncategorizedCount = 0;
        
        // Smart categorization with multiple detection methods
        this.allTabs.forEach((tab, index) => {
            console.log(`🏷️ TabOracle: Processing tab ${index + 1}/${this.allTabs.length}:`, tab.title);
            
            const category = this.getSmartCategory(tab);
            console.log(`🏷️ TabOracle: Tab "${tab.title}" categorized as:`, category);
            
            if (category) {
                if (!categoryMap[category]) {
                    categoryMap[category] = { 
                        name: category, 
                        count: 0, 
                        tabs: [],
                        confidence: 0,
                        keywords: []
                    };
                }
                categoryMap[category].count++;
                categoryMap[category].tabs.push(tab);
                categorizedCount++;
                
                // Calculate confidence and collect keywords
                const tabConfidence = this.calculateCategoryConfidence(tab, category);
                categoryMap[category].confidence = Math.max(categoryMap[category].confidence, tabConfidence);
                
                // Collect relevant keywords
                if (tab.context && tab.context.keywords) {
                    categoryMap[category].keywords.push(...tab.context.keywords);
                }
            } else {
                uncategorizedCount++;
                console.log(`🏷️ TabOracle: Tab "${tab.title}" could not be categorized`);
            }
        });

        console.log('🏷️ TabOracle: Categorization complete:', {
            total: this.allTabs.length,
            categorized: categorizedCount,
            uncategorized: uncategorizedCount,
            categories: Object.keys(categoryMap)
        });

        // Sort categories by count and confidence
        const sortedCategories = Object.values(categoryMap)
            .sort((a, b) => {
                // Primary sort by count
                if (b.count !== a.count) return b.count - a.count;
                // Secondary sort by confidence
                return b.confidence - a.confidence;
            });
            
        console.log('🏷️ TabOracle: Final sorted categories:', sortedCategories);
        return sortedCategories;
    }

    getSmartCategory(tab) {
        console.log(`🏷️ TabOracle: Getting smart category for tab: "${tab.title}"`);
        console.log(`🏷️ TabOracle: Tab URL:`, tab.url);
        console.log(`🏷️ TabOracle: Tab context:`, tab.context);
        
        // Method 1: Domain-based categorization
        const domainCategory = this.getDomainCategory(tab.url);
        console.log(`🏷️ TabOracle: Domain category result:`, domainCategory);
        if (domainCategory) return domainCategory;

        // Method 2: Content-based categorization
        if (tab.context && tab.context.pageContent) {
            const contentCategory = this.getContentCategory(tab.context.pageContent);
            console.log(`🏷️ TabOracle: Content category result:`, contentCategory);
            if (contentCategory) return contentCategory;
        } else {
            console.log(`🏷️ TabOracle: No page content available for content analysis`);
        }

        // Method 3: Title/keyword-based categorization
        const titleCategory = this.getTitleCategory(tab.title, tab.context?.keywords);
        console.log(`🏷️ TabOracle: Title category result:`, titleCategory);
        if (titleCategory) return titleCategory;

        // Method 4: Semantic categorization
        const semanticCategory = this.getSemanticCategory(tab);
        console.log(`🏷️ TabOracle: Semantic category result:`, semanticCategory);
        if (semanticCategory) return semanticCategory;

        // Method 5: Fallback categorization based on URL patterns
        const fallbackCategory = this.getFallbackCategory(tab.url, tab.title);
        console.log(`🏷️ TabOracle: Fallback category result:`, fallbackCategory);
        if (fallbackCategory) return fallbackCategory;

        console.log(`🏷️ TabOracle: No category could be determined for tab: "${tab.title}"`);
        return null;
    }

    getDomainCategory(url) {
        if (!url) return null;
        
        const domain = new URL(url).hostname.toLowerCase();
        
        // Development & Tech
        if (domain.includes('github') || domain.includes('gitlab') || domain.includes('bitbucket')) {
            return '💻 Development';
        }
        if (domain.includes('stackoverflow') || domain.includes('stackexchange') || domain.includes('reddit.com/r/programming')) {
            return '💻 Development';
        }
        if (domain.includes('dev.to') || domain.includes('medium.com') || domain.includes('hashnode.dev')) {
            return '💻 Development';
        }
        if (domain.includes('npmjs.com') || domain.includes('pypi.org') || domain.includes('rubygems.org')) {
            return '💻 Development';
        }

        // Documentation & Learning
        if (domain.includes('docs.') || domain.includes('developer.') || domain.includes('api.') || domain.includes('reference.')) {
            return '📚 Documentation';
        }
        if (domain.includes('w3schools') || domain.includes('mdn') || domain.includes('tutorialspoint')) {
            return '📚 Documentation';
        }
        if (domain.includes('udemy') || domain.includes('coursera') || domain.includes('edx') || domain.includes('freecodecamp')) {
            return '📚 Documentation';
        }

        // Email & Communication
        if (domain.includes('mail.') || domain.includes('gmail') || domain.includes('outlook') || domain.includes('yahoo.com/mail')) {
            return '📧 Email';
        }
        if (domain.includes('slack') || domain.includes('discord') || domain.includes('teams') || domain.includes('zoom')) {
            return '📧 Email';
        }

        // Media & Entertainment
        if (domain.includes('youtube') || domain.includes('vimeo') || domain.includes('dailymotion') || domain.includes('twitch')) {
            return '🎥 Media';
        }
        if (domain.includes('spotify') || domain.includes('apple.com/music') || domain.includes('soundcloud') || domain.includes('deezer')) {
            return '🎥 Media';
        }
        if (domain.includes('netflix') || domain.includes('hulu') || domain.includes('disneyplus') || domain.includes('amazon.com/prime')) {
            return '🎥 Media';
        }

        // News & Information
        if (domain.includes('news.') || domain.includes('bbc') || domain.includes('cnn') || domain.includes('reuters')) {
            return '📰 News';
        }
        if (domain.includes('techcrunch') || domain.includes('theverge') || domain.includes('arstechnica') || domain.includes('wired')) {
            return '📰 News';
        }

        // Shopping & Commerce
        if (domain.includes('amazon') || domain.includes('ebay') || domain.includes('etsy') || domain.includes('shopify')) {
            return '🛒 Shopping';
        }
        if (domain.includes('walmart') || domain.includes('target') || domain.includes('bestbuy') || domain.includes('newegg')) {
            return '🛒 Shopping';
        }

        // Social Media
        if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('instagram') || domain.includes('linkedin')) {
            return '👥 Social';
        }
        if (domain.includes('tiktok') || domain.includes('snapchat') || domain.includes('pinterest') || domain.includes('reddit')) {
            return '👥 Social';
        }

        // Productivity & Tools
        if (domain.includes('notion') || domain.includes('trello') || domain.includes('asana') || domain.includes('monday')) {
            return '⚡ Productivity';
        }
        if (domain.includes('figma') || domain.includes('canva') || domain.includes('adobe') || domain.includes('sketch')) {
            return '⚡ Productivity';
        }

        // Finance & Business
        if (domain.includes('bank') || domain.includes('paypal') || domain.includes('stripe') || domain.includes('square')) {
            return '💰 Finance';
        }
        if (domain.includes('bloomberg') || domain.includes('yahoo.com/finance') || domain.includes('marketwatch') || domain.includes('investing')) {
            return '💰 Finance';
        }

        return null;
    }

    getContentCategory(content) {
        if (!content) return null;
        
        const text = content.toLowerCase();
        
        // Development & Programming
        if (text.includes('function') || text.includes('class') || text.includes('api') || text.includes('database')) {
            return '💻 Development';
        }
        if (text.includes('javascript') || text.includes('python') || text.includes('java') || text.includes('react')) {
            return '💻 Development';
        }

        // Documentation & Learning
        if (text.includes('tutorial') || text.includes('guide') || text.includes('documentation') || text.includes('how to')) {
            return '📚 Documentation';
        }

        // News & Articles
        if (text.includes('article') || text.includes('news') || text.includes('report') || text.includes('breaking')) {
            return '📰 News';
        }

        // Shopping & Products
        if (text.includes('buy') || text.includes('price') || text.includes('product') || text.includes('shopping')) {
            return '🛒 Shopping';
        }

        return null;
    }

    getTitleCategory(title, keywords) {
        if (!title) return null;
        
        const titleLower = title.toLowerCase();
        const allKeywords = keywords ? [...keywords, titleLower] : [titleLower];
        
        // Development
        if (allKeywords.some(k => k.includes('github') || k.includes('stackoverflow') || k.includes('code'))) {
            return '💻 Development';
        }

        // Documentation
        if (allKeywords.some(k => k.includes('docs') || k.includes('guide') || k.includes('tutorial'))) {
            return '📚 Documentation';
        }

        // Email
        if (allKeywords.some(k => k.includes('mail') || k.includes('inbox') || k.includes('gmail'))) {
            return '📧 Email';
        }

        // Media
        if (allKeywords.some(k => k.includes('video') || k.includes('music') || k.includes('youtube'))) {
            return '🎥 Media';
        }

        return null;
    }

    getSemanticCategory(tab) {
        if (!tab.context || !tab.context.keywords) return null;
        
        const keywords = tab.context.keywords.map(k => k.toLowerCase());
        
        // Development keywords
        const devKeywords = ['code', 'programming', 'developer', 'git', 'api', 'framework', 'library', 'software'];
        if (keywords.some(k => devKeywords.some(dev => k.includes(dev)))) {
            return '💻 Development';
        }

        // Documentation keywords
        const docKeywords = ['docs', 'guide', 'tutorial', 'reference', 'manual', 'help', 'readme'];
        if (keywords.some(k => docKeywords.some(doc => k.includes(doc)))) {
            return '📚 Documentation';
        }

        return null;
    }

    calculateCategoryConfidence(tab, category) {
        let confidence = 0;
        
        // Domain confidence (highest)
        if (this.getDomainCategory(tab.url) === category) {
            confidence += 100;
        }
        
        // Content confidence
        if (tab.context && tab.context.pageContent) {
            if (this.getContentCategory(tab.context.pageContent) === category) {
                confidence += 80;
            }
        }
        
        // Title confidence
        if (this.getTitleCategory(tab.title, tab.context?.keywords) === category) {
            confidence += 60;
        }
        
        // Semantic confidence
        if (this.getSemanticCategory(tab) === category) {
            confidence += 40;
        }
        
        return confidence;
    }

    getFallbackCategory(url, title) {
        if (!url) return null;
        
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        
        // Simple pattern matching for common sites
        if (urlLower.includes('google') || urlLower.includes('bing') || urlLower.includes('duckduckgo')) {
            return '🔍 Search';
        }
        
        if (urlLower.includes('github') || urlLower.includes('gitlab') || urlLower.includes('bitbucket')) {
            return '💻 Development';
        }
        
        if (urlLower.includes('stackoverflow') || urlLower.includes('stackexchange')) {
            return '💻 Development';
        }
        
        if (urlLower.includes('youtube') || urlLower.includes('vimeo')) {
            return '🎥 Media';
        }
        
        if (urlLower.includes('gmail') || urlLower.includes('outlook') || urlLower.includes('mail.')) {
            return '📧 Email';
        }
        
        if (urlLower.includes('amazon') || urlLower.includes('ebay')) {
            return '🛒 Shopping';
        }
        
        if (urlLower.includes('facebook') || urlLower.includes('twitter') || urlLower.includes('instagram')) {
            return '👥 Social';
        }
        
        if (urlLower.includes('news') || urlLower.includes('bbc') || urlLower.includes('cnn')) {
            return '📰 News';
        }
        
        // Generic categorization based on common patterns
        if (urlLower.includes('docs.') || urlLower.includes('developer.') || urlLower.includes('api.')) {
            return '📚 Documentation';
        }
        
        if (urlLower.includes('tutorial') || urlLower.includes('guide') || urlLower.includes('learn')) {
            return '📚 Documentation';
        }
        
        if (urlLower.includes('shop') || urlLower.includes('store') || urlLower.includes('buy')) {
            return '🛒 Shopping';
        }
        
        if (urlLower.includes('video') || urlLower.includes('music') || urlLower.includes('stream')) {
            return '🎥 Media';
        }
        
        // If still no match, try to categorize based on title keywords
        if (titleLower.includes('github') || titleLower.includes('stackoverflow') || titleLower.includes('code')) {
            return '💻 Development';
        }
        
        if (titleLower.includes('tutorial') || titleLower.includes('guide') || titleLower.includes('docs')) {
            return '📚 Documentation';
        }
        
        if (titleLower.includes('youtube') || titleLower.includes('video') || titleLower.includes('music')) {
            return '🎥 Media';
        }
        
        if (titleLower.includes('gmail') || titleLower.includes('mail') || titleLower.includes('inbox')) {
            return '📧 Email';
        }
        
        return null;
    }

    createCategoryCard(category) {
        const icon = this.getCategoryIcon(category.name);
        const topKeywords = category.keywords
            .filter((kw, index, arr) => arr.indexOf(kw) === index) // Remove duplicates
            .slice(0, 3); // Top 3 keywords
        
        console.log(`🏷️ TabOracle: Creating category card for: ${category.name} with icon: ${icon}`);
        
        // Add visual indication for empty categories
        const isEmpty = category.count === 0;
        const emptyStyle = isEmpty ? 'opacity: 0.6; filter: grayscale(0.3);' : '';
        const emptyTitle = isEmpty ? ` (Empty - No tabs in this category)` : '';
        
        return `
            <div class="category-card" data-category="${category.name}" style="cursor: pointer; ${emptyStyle}" title="Click to view ${category.name} tabs${emptyTitle}">
                <span class="category-icon">${icon}</span>
                <div class="category-name">${category.name}</div>
                <div class="category-count">${category.count} tabs</div>
                ${isEmpty ? '<div class="category-empty-indicator">📭 Empty</div>' : ''}
                ${topKeywords.length > 0 ? `<div class="category-keywords">${topKeywords.join(', ')}</div>` : ''}
            </div>
        `;
    }

    getCategoryIcon(categoryName) {
        // Direct emoji mapping for categories
        const iconMap = {
            '💻 Development': '💻',
            '👥 Social': '👥',
            '📰 News': '📰',
            '🛒 Shopping': '🛒',
            '⚡ Productivity': '⚡',
            '🎥 Media': '🎥',
            '🔧 Programming': '🔧',
            '📚 Documentation': '📚',
            '🔍 Search': '🔍',
            '🏷️ Other': '🏷️'
        };
        
        // Try to find exact match first
        if (iconMap[categoryName]) {
            return iconMap[categoryName];
        }
        
        // Try to find partial matches
        for (const [key, icon] of Object.entries(iconMap)) {
            if (categoryName.toLowerCase().includes(key.toLowerCase().replace(/[^\w\s]/g, ''))) {
                return icon;
            }
        }
        
        // Return default icon if no match found
        return '🏷️';
    }

    async showCategoryResults(categoryName) {
        console.log('🏷️ TabOracle: Showing results for category:', categoryName);
        
        let category = null;
        
        // First try to find category in background categories
        if (this.backgroundCategories && this.backgroundCategories[categoryName]) {
            console.log('🏷️ TabOracle: Found category in background categories');
            category = {
                name: categoryName,
                count: this.backgroundCategories[categoryName].length,
                tabs: this.backgroundCategories[categoryName],
                keywords: []
            };
        } else {
            // Fallback to local categories
            console.log('🏷️ TabOracle: Category not found in background, trying local categories');
            category = this.getCategories().find(c => c.name === categoryName);
        }
        
        if (!category) {
            console.error('❌ TabOracle: Category not found:', categoryName);
            return;
        }
        
        console.log('🏷️ TabOracle: Category found:', category.name, 'with', category.tabs.length, 'tabs');

        // Handle empty categories
        if (category.tabs.length === 0) {
            this.categoryResults.innerHTML = `
                <div class="category-header">
                    <h3>${category.name} (0 tabs)</h3>
                    <div class="category-stats">
                        <span class="stat-item">📭 No tabs in this category</span>
                    </div>
                    <button class="back-button" id="backToCategoriesBtn">← Back to Categories</button>
                </div>
                
                <div class="empty-state" style="text-align: center; padding: 40px; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <h4>No tabs in ${category.name}</h4>
                    <p>This category doesn't have any tabs yet. Try opening some relevant websites or check other categories.</p>
                </div>
            `;
            
            // Hide categories grid and show results
            this.categoriesGrid.style.display = 'none';
            this.categoryResults.style.display = 'block';
            return;
        }

        const uniqueKeywords = [...new Set(category.keywords)].slice(0, 10); // Top 10 unique keywords

        this.categoryResults.innerHTML = `
            <div class="category-header">
                <h3>${category.name} (${category.count} tabs)</h3>
                <div class="category-stats">
                    <span class="stat-item">🔑 Keywords: ${uniqueKeywords.length}</span>
                    <span class="stat-item">📊 Smart Categorized</span>
                </div>
                <button class="back-button" id="backToCategoriesBtn">← Back to Categories</button>
            </div>
            
            ${uniqueKeywords.length > 0 ? `
                <div class="category-keywords-section">
                    <h4>Top Keywords in this Category:</h4>
                    <div class="keyword-tags">
                        ${uniqueKeywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="tabs-list">
                ${category.tabs.map(tab => this.createTabElement(tab)).join('')}
            </div>
        `;

        // Hide categories grid and show results
        this.categoriesGrid.style.display = 'none';
        this.categoryResults.style.display = 'block';
        console.log('🔄 TabOracle: Categories grid display:', this.categoriesGrid.style.display);
        console.log('🔄 TabOracle: Category results display:', this.categoryResults.style.display);
        console.log('🔄 TabOracle: Category results height:', this.categoryResults.offsetHeight);
        console.log('🔄 TabOracle: Tabs list found:', this.categoryResults.querySelector('.tabs-list'));
        this.addTabClickListeners(this.categoryResults);
    }

    goBackToCategories() {
        console.log('🔄 TabOracle: Going back to categories');
        // Show categories grid and hide results
        this.categoriesGrid.style.display = 'flex';
        this.categoryResults.style.display = 'none';
        console.log('🔄 TabOracle: Categories grid display:', this.categoriesGrid.style.display);
        console.log('🔄 TabOracle: Category results display:', this.categoryResults.style.display);
    }

    handleNormalSearch(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }

        this.performNormalSearch(query);
    }

    async performNormalSearch(query) {
        try {
            console.log('🔍 TabOracle: Performing normal search for:', query);
            const response = await chrome.runtime.sendMessage({ 
                action: 'searchTabs', 
                query: query,
                searchType: 'normal'
            });
            
            console.log('🔍 TabOracle: Normal search response:', response);
            const results = response.results || [];
            console.log('🔍 TabOracle: Normal search results:', results.length);
            this.displayNormalSearchResults(results, query);
        } catch (error) {
            console.error('❌ TabOracle: Normal search error:', error);
        }
    }

    handleSmartSearch(query) {
        if (!query.trim()) {
            this.clearSmartSearch();
            return;
        }

        this.performSmartSearch(query);
    }

    async performSmartSearch(query) {
        try {
            console.log('🧠 TabOracle: Performing smart search for:', query);
            const response = await chrome.runtime.sendMessage({ 
                action: 'searchTabs', 
                query: query,
                searchType: 'smart'
            });
            
            console.log('🧠 TabOracle: Smart search response:', response);
            const results = response.results || [];
            console.log('🧠 TabOracle: Smart search results:', results.length);
            this.displaySmartSearchResults(results, query);
        } catch (error) {
            console.error('❌ TabOracle: Smart search error:', error);
        }
    }

    displayNormalSearchResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <div>No tabs found for "${query}"</div>
                    <div class="search-tips">
                        <div class="tip">💡 Try searching for:</div>
                        <div class="tip">• Website names (e.g., "github", "stackoverflow")</div>
                        <div class="tip">• Tab titles or URLs</div>
                    </div>
                </div>
            `;
            return;
        }

        this.searchResults.innerHTML = `
            <div class="search-header">
                <div class="results-count">${results.length} result${results.length !== 1 ? 's' : ''} found</div>
                <div class="search-query">"${this.escapeHtml(query)}"</div>
                <div class="search-type-indicator">
                    🔍 Normal Search: Titles and URLs
                </div>
            </div>
            ${results.map(tab => this.createSearchResultElement(tab, query)).join('')}
        `;
        
        this.tabsList.style.display = 'none';
        this.searchResults.style.display = 'block';
        this.addTabClickListeners(this.searchResults);
    }

    displaySmartSearchResults(results, query) {
        if (results.length === 0) {
            this.smartSearchResults.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🧠</div>
                    <div>No smart matches found for "${query}"</div>
                    <div class="search-tips">
                        <div class="tip">💡 Smart search includes:</div>
                        <div class="tip">• Semantic understanding (e.g., "code" finds "development")</div>
                        <div class="tip">• Page content analysis</div>
                        <div class="tip">• Concept relationships</div>
                    </div>
                </div>
            `;
            return;
        }

        this.smartSearchResults.innerHTML = `
            <div class="search-header">
                <div class="results-count">${results.length} smart result${results.length !== 1 ? 's' : ''} found</div>
                <div class="search-query">"${this.escapeHtml(query)}"</div>
                <div class="search-type-indicator">
                    🧠 Smart Search: Semantic + Content Analysis
                </div>
            </div>
            ${results.map(tab => this.createSearchResultElement(tab, query)).join('')}
        `;
        
        this.smartSearchResults.style.display = 'block';
        this.addTabClickListeners(this.smartSearchResults);
    }

    clearSearch() {
        this.searchInput.value = '';
        this.tabsList.style.display = 'block';
        this.searchResults.style.display = 'none';
    }

    clearSmartSearch() {
        this.smartSearchInput.value = '';
        this.smartSearchResults.style.display = 'none';
    }

    async performAISearch(query) {
        console.log('🧠 TabOracle: Performing AI search for:', query);
        
        if (!query.trim()) {
            this.showAISearchResults([]);
            return;
        }
        
        // Show loading state
        this.setAISearchLoading(true, 'Analyzing tabs with AI...');
        
        try {
            // Get all tabs with content
            const tabsWithContent = await this.getTabsWithContent();
            
            // Use AI to analyze and rank tabs
            const aiResults = await this.analyzeTabsWithAI(query, tabsWithContent);
            
            // Display results
            this.showAISearchResults(aiResults);
            
        } catch (error) {
            console.error('❌ TabOracle: AI search failed:', error);
            this.showAISearchError('AI search failed. Please try again.');
        } finally {
            this.setAISearchLoading(false);
        }
    }

    async getTabsWithContent() {
        const tabsWithContent = [];
        
        for (const tab of this.allTabs) {
            try {
                // Get tab content from background script
                const response = await chrome.runtime.sendMessage({
                    action: 'getPageContent',
                    tabId: tab.id
                });
                
                if (response && response.success && response.content) {
                    tabsWithContent.push({
                        ...tab,
                        content: response.content
                    });
                } else {
                    // Fallback to just title and URL
                    tabsWithContent.push(tab);
                }
            } catch (error) {
                console.warn('⚠️ TabOracle: Failed to get content for tab:', tab.id, error);
                tabsWithContent.push(tab);
            }
        }
        
        return tabsWithContent;
    }

    async analyzeTabsWithAI(query, tabsWithContent) {
        console.log('🧠 TabOracle: Analyzing', tabsWithContent.length, 'tabs with AI');
        
        // If language model is available, use it
        if (this.languageModel && this.languageModelInitialized) {
            return await this.analyzeWithLanguageModel(query, tabsWithContent);
        } else {
            // Fallback to intelligent keyword analysis
            return this.analyzeWithKeywords(query, tabsWithContent);
        }
    }

    async analyzeWithLanguageModel(query, tabsWithContent) {
        try {
            const prompt = `
                You are a semantic search assistant. Analyze the following tabs for semantic relevance to the query: "${query}"
                
                Consider semantic relationships, not just exact keyword matches:
                - Synonyms and related concepts (e.g., "code" relates to "programming", "development", "software")
                - Contextual understanding (e.g., "bank" in financial context vs. river context)
                - Conceptual relationships (e.g., "social" relates to "facebook", "twitter", "communication")
                - Domain-specific terminology and jargon
                
                For each relevant tab, provide:
                1. Semantic relevance score (0-100) based on conceptual similarity
                2. Detailed explanation of semantic connections and why it's relevant
                3. Key semantic concepts and relationships identified
                4. Confidence level in the semantic match
                
                Tabs to analyze:
                ${tabsWithContent.map((tab, index) => `
                ${index + 1}. Title: ${tab.title}
                   URL: ${tab.url}
                   Content: ${tab.content ? tab.content.substring(0, 800) + '...' : 'No content available'}
                `).join('\n')}
                
                Focus on semantic understanding and conceptual relationships. Return results as JSON array:
                [{
                    "index": 0, 
                    "score": 85, 
                    "explanation": "Semantically relevant because...", 
                    "concepts": ["concept1", "concept2"],
                    "confidence": 0.9,
                    "semantic_relationships": ["relationship1", "relationship2"]
                }]
                
                Only include tabs with semantic relevance score > 30.
            `;
            
            const response = await this.languageModel.prompt(prompt);
            
            if (response && response.text) {
                try {
                    const results = JSON.parse(response.text);
                    return this.processAIResults(results, tabsWithContent);
                } catch (parseError) {
                    console.warn('⚠️ TabOracle: Failed to parse AI response, using fallback');
                    return this.analyzeWithKeywords(query, tabsWithContent);
                }
            } else {
                return this.analyzeWithKeywords(query, tabsWithContent);
            }
            
        } catch (error) {
            console.warn('⚠️ TabOracle: Language model analysis failed, using fallback:', error);
            return this.analyzeWithKeywords(query, tabsWithContent);
        }
    }

    analyzeWithKeywords(query, tabsWithContent) {
        console.log('🧠 TabOracle: Using enhanced semantic analysis for AI search');
        
        // Enhanced semantic understanding with concept mapping
        const semanticQuery = this.enhanceQueryWithSemantics(query);
        const results = [];
        
        for (let i = 0; i < tabsWithContent.length; i++) {
            const tab = tabsWithContent[i];
            const title = tab.title.toLowerCase();
            const url = tab.url.toLowerCase();
            const content = (tab.content || '').toLowerCase();
            
            // Calculate semantic similarity scores
            const semanticScores = this.calculateSemanticSimilarity(semanticQuery, {
                title: title,
                url: url,
                content: content
            });
            
            if (semanticScores.totalScore > 0) {
                results.push({
                    tab: tab,
                    score: semanticScores.totalScore,
                    explanation: semanticScores.explanation,
                    concepts: semanticScores.concepts,
                    matchedWords: semanticScores.matchedWords,
                    semanticMatches: semanticScores.semanticMatches
                });
            }
        }
        
        // Sort by score (highest first)
        results.sort((a, b) => b.score - a.score);
        
        return results;
    }

    enhanceQueryWithSemantics(query) {
        const queryLower = query.toLowerCase();
        
        // Semantic concept mapping
        const conceptMap = {
            // Programming/Development
            'code': ['programming', 'development', 'software', 'coding', 'script', 'function', 'class', 'api', 'sdk'],
            'programming': ['code', 'development', 'software', 'coding', 'script', 'function', 'class', 'api', 'sdk'],
            'development': ['code', 'programming', 'software', 'coding', 'script', 'function', 'class', 'api', 'sdk'],
            
            // Web/Internet
            'web': ['internet', 'website', 'online', 'browser', 'chrome', 'firefox', 'safari'],
            'website': ['web', 'site', 'page', 'online', 'internet', 'browser'],
            'online': ['web', 'internet', 'website', 'browser', 'digital'],
            
            // Social Media
            'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'social media'],
            'facebook': ['social', 'social media', 'fb', 'meta'],
            'twitter': ['social', 'social media', 'tweet', 'x'],
            
            // Shopping/E-commerce
            'shop': ['buy', 'purchase', 'shopping', 'amazon', 'ebay', 'store', 'marketplace'],
            'buy': ['shop', 'purchase', 'shopping', 'amazon', 'ebay', 'store'],
            'amazon': ['shop', 'buy', 'purchase', 'shopping', 'store', 'marketplace'],
            
            // News/Information
            'news': ['article', 'information', 'report', 'story', 'update', 'latest'],
            'article': ['news', 'information', 'report', 'story', 'content'],
            'information': ['news', 'article', 'report', 'data', 'details'],
            
            // Work/Productivity
            'work': ['job', 'career', 'professional', 'business', 'office', 'workplace'],
            'job': ['work', 'career', 'employment', 'professional', 'business'],
            'business': ['work', 'job', 'career', 'professional', 'company', 'enterprise'],
            
            // Entertainment
            'video': ['youtube', 'netflix', 'streaming', 'movie', 'film', 'entertainment'],
            'music': ['spotify', 'apple music', 'audio', 'song', 'playlist', 'entertainment'],
            'game': ['gaming', 'play', 'entertainment', 'fun', 'video game'],
            
            // Education/Learning
            'learn': ['education', 'study', 'course', 'tutorial', 'training', 'knowledge'],
            'study': ['learn', 'education', 'course', 'tutorial', 'training'],
            'course': ['learn', 'study', 'education', 'tutorial', 'training', 'class'],
            
            // Communication
            'email': ['gmail', 'outlook', 'mail', 'message', 'communication'],
            'chat': ['message', 'communication', 'discord', 'slack', 'teams'],
            'message': ['email', 'chat', 'communication', 'gmail', 'outlook'],
            
            // Finance/Money
            'bank': ['finance', 'money', 'account', 'financial', 'banking'],
            'money': ['finance', 'bank', 'financial', 'account', 'payment'],
            'finance': ['bank', 'money', 'financial', 'account', 'investment'],
            
            // Travel
            'travel': ['trip', 'vacation', 'booking', 'hotel', 'flight', 'tourism'],
            'trip': ['travel', 'vacation', 'booking', 'hotel', 'flight'],
            'booking': ['travel', 'trip', 'hotel', 'flight', 'reservation'],
            
            // Health/Fitness
            'health': ['medical', 'fitness', 'exercise', 'wellness', 'doctor'],
            'fitness': ['health', 'exercise', 'workout', 'gym', 'wellness'],
            'exercise': ['health', 'fitness', 'workout', 'gym', 'training']
        };
        
        // Extract base words from query
        const baseWords = queryLower.split(/\s+/).filter(word => word.length > 2);
        const enhancedWords = [...baseWords];
        const semanticConcepts = [];
        
        // Add semantic concepts for each base word
        baseWords.forEach(word => {
            if (conceptMap[word]) {
                enhancedWords.push(...conceptMap[word]);
                semanticConcepts.push({
                    original: word,
                    concepts: conceptMap[word]
                });
            }
        });
        
        // Add common synonyms and related terms
        const synonyms = this.getSynonyms(queryLower);
        enhancedWords.push(...synonyms);
        
        return {
            original: query,
            enhanced: enhancedWords,
            concepts: semanticConcepts,
            synonyms: synonyms
        };
    }

    getSynonyms(word) {
        const synonymMap = {
            'code': ['programming', 'scripting', 'coding'],
            'web': ['internet', 'online', 'digital'],
            'social': ['community', 'network', 'connection'],
            'shop': ['buy', 'purchase', 'store'],
            'news': ['information', 'update', 'report'],
            'work': ['job', 'career', 'business'],
            'video': ['movie', 'film', 'media'],
            'music': ['audio', 'song', 'sound'],
            'game': ['play', 'gaming', 'entertainment'],
            'learn': ['study', 'education', 'training'],
            'email': ['mail', 'message', 'communication'],
            'chat': ['message', 'talk', 'conversation'],
            'bank': ['finance', 'money', 'financial'],
            'travel': ['trip', 'journey', 'vacation'],
            'health': ['medical', 'fitness', 'wellness']
        };
        
        return synonymMap[word] || [];
    }

    calculateSemanticSimilarity(semanticQuery, tabData) {
        let totalScore = 0;
        const matchedWords = [];
        const concepts = [];
        const semanticMatches = [];
        
        // Calculate scores for each enhanced word
        semanticQuery.enhanced.forEach(word => {
            const wordScore = this.calculateWordScore(word, tabData);
            if (wordScore.score > 0) {
                totalScore += wordScore.score;
                if (!matchedWords.includes(word)) {
                    matchedWords.push(word);
                }
                concepts.push(wordScore.concept);
                semanticMatches.push({
                    word: word,
                    score: wordScore.score,
                    type: wordScore.type,
                    context: wordScore.context
                });
            }
        });
        
        // Bonus for semantic concept matches
        semanticQuery.concepts.forEach(concept => {
            const conceptMatches = concept.concepts.filter(c => 
                tabData.title.includes(c) || 
                tabData.url.includes(c) || 
                tabData.content.includes(c)
            );
            if (conceptMatches.length > 0) {
                totalScore += conceptMatches.length * 15; // Bonus for semantic concept matches
                concepts.push(`Semantic concept: ${concept.original} → ${conceptMatches.join(', ')}`);
            }
        });
        
        // Bonus for exact phrase matches
        if (tabData.title.includes(semanticQuery.original.toLowerCase())) {
            totalScore += 50;
            concepts.push('Exact title match');
        }
        
        // Normalize score to 0-100 range
        totalScore = Math.min(100, Math.max(0, totalScore));
        
        return {
            totalScore: totalScore,
            explanation: this.generateSemanticExplanation(semanticQuery, matchedWords, concepts),
            concepts: concepts,
            matchedWords: matchedWords,
            semanticMatches: semanticMatches
        };
    }

    calculateWordScore(word, tabData) {
        let score = 0;
        let type = '';
        let context = '';
        let concept = '';
        
        // Title relevance (highest weight)
        if (tabData.title.includes(word)) {
            score += 35;
            type = 'title';
            context = 'title';
            concept = `Title contains "${word}"`;
        }
        
        // URL relevance
        if (tabData.url.includes(word)) {
            score += 25;
            if (type !== 'title') {
                type = 'url';
                context = 'url';
                concept = `URL contains "${word}"`;
            }
        }
        
        // Content relevance
        if (tabData.content.includes(word)) {
            score += 15;
            if (type !== 'title' && type !== 'url') {
                type = 'content';
                context = 'content';
                concept = `Content contains "${word}"`;
            }
        }
        
        // Domain relevance
        try {
            const domain = new URL(tabData.url).hostname.toLowerCase();
            if (domain.includes(word)) {
                score += 20;
                if (type !== 'title' && type !== 'url' && type !== 'content') {
                    type = 'domain';
                    context = 'domain';
                    concept = `Domain contains "${word}"`;
                }
            }
        } catch (e) {
            // Invalid URL, skip domain check
        }
        
        return { score, type, context, concept };
    }

    generateSemanticExplanation(semanticQuery, matchedWords, concepts) {
        const originalWords = semanticQuery.original.split(/\s+/);
        const semanticMatches = matchedWords.filter(word => 
            !originalWords.includes(word) && semanticQuery.enhanced.includes(word)
        );
        
        let explanation = `Matched ${matchedWords.length} terms`;
        
        if (semanticMatches.length > 0) {
            explanation += ` (including semantic matches: ${semanticMatches.slice(0, 3).join(', ')}${semanticMatches.length > 3 ? '...' : ''})`;
        }
        
        if (concepts.length > 0) {
            explanation += `. Key concepts: ${concepts.slice(0, 3).join(', ')}${concepts.length > 3 ? '...' : ''}`;
        }
        
        return explanation;
    }



    processAIResults(aiResults, tabsWithContent) {
        return aiResults.map(result => {
            const tab = tabsWithContent[result.index];
            return {
                tab: tab,
                score: result.score || 0,
                explanation: result.explanation || 'AI analysis',
                concepts: result.concepts || []
            };
        }).filter(result => result.score > 0);
    }

    setAISearchLoading(isLoading, message = 'Analyzing with AI...') {
        const aiResults = document.getElementById('smartSearchResults');
        if (!aiResults) return;
        
        if (isLoading) {
            aiResults.style.display = 'block';
            aiResults.innerHTML = `
                <div class="ai-search-loading">
                    <div class="loading-spinner">🧠</div>
                    <div class="loading-text">${this.escapeHtml(message)}</div>
                    <div class="loading-subtext">Analyzing tab content and relevance...</div>
                </div>
            `;
        }
    }

    showAISearchResults(results) {
        const aiResults = document.getElementById('smartSearchResults');
        if (!aiResults) return;
        
        aiResults.style.display = 'block';
        
        if (results.length === 0) {
            aiResults.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No relevant tabs found</div>
                    <div class="no-results-subtext">Try different keywords or check your query</div>
                </div>
            `;
            return;
        }
        
        const resultsHtml = results.map((result, index) => {
            const tab = result.tab;
            const scoreColor = result.score >= 80 ? '#4CAF50' : result.score >= 60 ? '#FF9800' : '#2196F3';
            
            return `
                <div class="ai-result-item" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                    <div class="ai-result-header">
                        <div class="ai-result-score" style="background-color: ${scoreColor}">
                            ${result.score}%
                        </div>
                        <div class="ai-result-title">${this.escapeHtml(tab.title)}</div>
                        <div class="ai-result-actions">
                            <button class="ai-result-action" onclick="window.tabOracle.activateTab(${tab.id}, ${tab.windowId})">
                                <span class="action-icon">🔗</span>
                            </button>
                        </div>
                    </div>
                    <div class="ai-result-url">${this.escapeHtml(tab.url)}</div>
                    <div class="ai-result-explanation">
                        <span class="explanation-label">AI Analysis:</span>
                        ${this.escapeHtml(result.explanation)}
                    </div>
                    ${result.concepts && result.concepts.length > 0 ? `
                        <div class="ai-result-concepts">
                            <span class="concepts-label">Key Concepts:</span>
                            ${result.concepts.map(concept => `<span class="concept-tag">${this.escapeHtml(concept)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        aiResults.innerHTML = `
            <div class="ai-results-header">
                <div class="ai-results-count">Found ${results.length} relevant tabs</div>
                <div class="ai-results-info">Ranked by AI relevance</div>
            </div>
            <div class="ai-results-list">
                ${resultsHtml}
            </div>
        `;
    }

    showAISearchError(message) {
        const aiResults = document.getElementById('smartSearchResults');
        if (!aiResults) return;
        
        aiResults.style.display = 'block';
        aiResults.innerHTML = `
            <div class="ai-search-error">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${this.escapeHtml(message)}</div>
                <div class="error-subtext">Try using the regular search instead</div>
            </div>
        `;
    }

    createTabElement(tab) {
        const isActive = tab.active;
        const isPinned = tab.pinned;
        const favicon = this.getFaviconUrl(tab);
        const category = this.getCategoryDisplay(tab);
        
        const faviconHtml = favicon ? 
            `<img class="tab-favicon" src="${favicon}" alt="favicon" onerror="this.style.display='none'; this.parentElement.classList.add('no-favicon');">` : 
            '';
        
        return `
            <div class="tab-item ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''} ${!favicon ? 'no-favicon' : ''}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                ${faviconHtml}
                <div class="tab-content">
                    <div class="tab-title">
                        ${this.escapeHtml(tab.title)}
                        ${isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                    </div>
                    <div class="tab-url">${this.escapeHtml(tab.url)}</div>
                    ${category ? `<div class="tab-category">${category}</div>` : ''}
                </div>
                <div class="tab-window">${this.getWindowDisplay(tab)}</div>
            </div>
        `;
    }

    getFaviconUrl(tab) {
        // Debug logging
        console.log('🔍 TabOracle: Getting favicon for tab:', {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl
        });
        
        // If we have a favicon URL, use it
        if (tab.favIconUrl && tab.favIconUrl.trim() !== '') {
            console.log('✅ TabOracle: Using existing favicon:', tab.favIconUrl);
            return tab.favIconUrl;
        }
        
        // For new tabs or tabs without favicon, try to generate one from the domain
        if (tab.url && tab.url.startsWith('http')) {
            try {
                const url = new URL(tab.url);
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
                console.log('🌐 TabOracle: Using Google favicon service:', faviconUrl);
                return faviconUrl;
            } catch (e) {
                console.warn('⚠️ TabOracle: URL parsing failed:', e);
                // If URL parsing fails, return null
                return null;
            }
        }
        
        // For chrome:// URLs, chrome-extension:// URLs, and new tabs, return null (no favicon)
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url === 'chrome://newtab/')) {
            console.log('🔧 TabOracle: No favicon for system URL:', tab.url);
            return null;
        }
        
        // Default fallback for invalid URLs
        console.log('❓ TabOracle: No favicon available');
        return null;
    }

    getTabPreviewContent(tab) {
        if (!tab.context || !tab.context.pageContent) {
            return null;
        }
        
        // Get a preview of the page content (first 200 characters)
        let content = tab.context.pageContent;
        if (typeof content === 'string') {
            content = content.trim();
            if (content.length > 200) {
                content = content.substring(0, 200) + '...';
            }
            return this.escapeHtml(content);
        }
        
        return null;
    }

    createSearchResultElement(tab, query) {
        const favicon = this.getFaviconUrl(tab);
        const highlightedTitle = this.highlightText(tab.title, query);
        const highlightedUrl = this.highlightText(tab.url, query);
        const category = this.getCategoryDisplay(tab);
        const relevanceScore = tab.searchScore || 0;
        const isPinned = tab.pinned;
        const contentSimilarity = tab.contentSimilarity || 0;
        const hasContent = tab.context && tab.context.pageContent;
        const semanticMatches = tab.semanticMatches || [];

        const faviconHtml = favicon ? 
            `<img src="${favicon}" alt="favicon" onerror="this.style.display='none'; this.parentElement.classList.add('no-favicon');">` : 
            '';

        return `
            <div class="tab-result" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <div class="result-header">
                    <div class="result-favicon ${!favicon ? 'no-favicon' : ''}">
                        ${faviconHtml}
                        ${isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                    </div>
                    <div class="result-content">
                        <div class="result-title">${highlightedTitle}</div>
                        <div class="result-url">${highlightedUrl}</div>
                        ${category ? `<div class="result-category">${category}</div>` : ''}
                        ${semanticMatches.length > 0 ? this.createSemanticMatchDisplay(semanticMatches) : ''}
                        ${hasContent ? this.createContentInfoDisplay(tab.context, query) : ''}
                    </div>
                    <div class="result-meta">
                        <div class="relevance-score" title="Relevance score">${relevanceScore}</div>
                        ${contentSimilarity > 0 ? `<div class="content-similarity" title="Content similarity">📄 ${Math.round(contentSimilarity)}%</div>` : ''}
                        <div class="tab-window">${this.getWindowDisplay(tab)}</div>
                    </div>
                    
                    <!-- Detailed Similarity Breakdown -->
                    <div class="similarity-breakdown">
                        ${this.createSimilarityBreakdown(tab)}
                    </div>
                </div>
                ${this.createContextInfo(tab)}
            </div>
        `;
    }

    createSimilarityBreakdown(tab) {
        const breakdown = [];
        const context = tab.context || {};
        
        // Overall search score
        if (tab.searchScore > 0) {
            breakdown.push(`<span class="score-item total-score">🎯 Total: ${Math.round(tab.searchScore)}</span>`);
        }
        
        // Content similarity
        if (tab.contentSimilarity > 0) {
            breakdown.push(`<span class="score-item content-score">📄 Content: ${Math.round(tab.contentSimilarity)}%</span>`);
        }
        
        // Semantic matches
        if (tab.semanticMatches && tab.semanticMatches.length > 0) {
            const semanticScore = tab.semanticMatches.reduce((sum, match) => sum + match.similarity, 0);
            breakdown.push(`<span class="score-item semantic-score">🧠 Semantic: ${Math.round(semanticScore * 100)}%</span>`);
        }
        
        // Keyword matches
        if (context.keywords && context.keywords.length > 0) {
            const keywordCount = context.keywords.length;
            breakdown.push(`<span class="score-item keyword-score">🔑 Keywords: ${keywordCount}</span>`);
        }
        
        // Category relevance
        if (context.category && context.category !== 'general') {
            breakdown.push(`<span class="score-item category-score">🏷️ ${context.category}</span>`);
        }
        
        // Content availability
        if (context.pageContent) {
            const contentLength = context.pageContent.length;
            const contentIndicator = contentLength > 1000 ? '📚 Rich' : contentLength > 500 ? '📄 Medium' : '📝 Basic';
            breakdown.push(`<span class="score-item content-availability">${contentIndicator}</span>`);
        }
        
        return breakdown.length > 0 ? breakdown.join(' • ') : '';
    }

    createSemanticMatchDisplay(semanticMatches) {
        const topMatches = semanticMatches.slice(0, 3);
        return `
            <div class="semantic-matches">
                <span class="semantic-icon">🧠</span>
                ${topMatches.map(match => 
                    `<span class="semantic-match" title="Semantic similarity: ${Math.round(match.similarity * 100)}%">${match.word}</span>`
                ).join('')}
            </div>
        `;
    }

    createContentInfoDisplay(context, query) {
        if (!context.contentSummary) return '';
        
        const queryWords = query.toLowerCase().split(/\s+/);
        const highlightedSummary = this.highlightText(context.contentSummary, query);
        
        return `
            <div class="content-preview">
                <div class="content-icon">📄</div>
                <div class="content-summary">${highlightedSummary}</div>
                ${context.contentKeywords ? this.createContentKeywordsDisplay(context.contentKeywords, queryWords) : ''}
            </div>
        `;
    }

    createContentKeywordsDisplay(keywords, queryWords) {
        const relevantKeywords = keywords.filter(keyword => 
            queryWords.some(queryWord => 
                keyword.toLowerCase().includes(queryWord.toLowerCase()) ||
                queryWord.toLowerCase().includes(keyword.toLowerCase())
            )
        ).slice(0, 5);
        
        if (relevantKeywords.length === 0) return '';
        
        return `
            <div class="content-keywords">
                <span class="keywords-label">Relevant:</span>
                ${relevantKeywords.map(keyword => `<span class="content-keyword">${keyword}</span>`).join('')}
            </div>
        `;
    }

    createContextInfo(tab) {
        if (!tab.context || !tab.context.keywords || tab.context.keywords.length === 0) {
            return '';
        }
        
        const topKeywords = tab.context.keywords.slice(0, 5);
        return `
            <div class="context-info">
                <div class="context-keywords">
                    ${topKeywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                </div>
            </div>
        `;
    }

    getCategoryDisplay(tab) {
        if (!tab.domain) return '';
        
        const domain = tab.domain.toLowerCase();
        if (domain.includes('github') || domain.includes('gitlab')) return '💻 Development';
        if (domain.includes('stackoverflow') || domain.includes('stackexchange')) return '💻 Development';
        if (domain.includes('docs') || domain.includes('developer')) return '📚 Documentation';
        if (domain.includes('mail') || domain.includes('gmail') || domain.includes('outlook')) return '📧 Email';
        if (domain.includes('youtube') || domain.includes('vimeo')) return '🎥 Media';
        if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) return '📰 News';
        if (domain.includes('shopping') || domain.includes('amazon') || domain.includes('ebay')) return '🛒 Shopping';
        if (domain.includes('social') || domain.includes('facebook') || domain.includes('twitter')) return '👥 Social';
        
        return '';
    }
    
    getWindowDisplay(tab) {
        if (!tab.windowInfo) {
            return `W${tab.windowId}`;
        }
        
        const window = tab.windowInfo;
        
        // If window has a title, use it (truncated if too long)
        if (window.title && window.title !== `Window ${window.id}`) {
            const truncatedTitle = window.title.length > 20 ? window.title.substring(0, 17) + '...' : window.title;
            return truncatedTitle;
        }
        
        // If window has a URL, show the domain
        if (window.url && window.url !== '') {
            try {
                const url = new URL(window.url);
                const domain = url.hostname.replace('www.', '');
                return domain.length > 15 ? domain.substring(0, 12) + '...' : domain;
            } catch (e) {
                // If URL parsing fails, fall back to window ID
                return `W${window.id}`;
            }
        }
        
        // Fallback to window ID
        return `W${window.id}`;
    }

    highlightText(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateTabCount() {
        const n = Array.isArray(this.allTabs) ? this.allTabs.length : 0;
        // Update header counter if present
        if (this.tabCountContainer) {
            const counterText = this.tabCountContainer.querySelector('.counter-text');
            if (counterText) counterText.textContent = `${n}`;
        }
    }

    addTabClickListeners(container) {
        const tabItems = container.querySelectorAll('.tab-result, .tab-item');
        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = parseInt(item.dataset.tabId);
                const windowId = parseInt(item.dataset.windowId);
                this.activateTab(tabId, windowId);
            });
        });
    }

    async activateTab(tabId, windowId) {
        try {
            await chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId, 
                windowId: windowId 
            });
            window.close();
        } catch (error) {
            console.error('Failed to activate tab:', error);
        }
    }

    setupDebugEventListeners() {
        console.log('🐛 TabOracle: Setting up debug event listeners...');
        
        // Debug buttons
        const testPingBtn = document.getElementById('testPing');
        const testGetTabsBtn = document.getElementById('testGetTabs');
        const testGetCategoriesBtn = document.getElementById('testGetCategories');
        const testForceRefreshBtn = document.getElementById('testForceRefresh');
        const testExplainMeBtn = document.getElementById('testExplainMe');
        const testBasicSearchBtn = document.getElementById('testBasicSearch');
        const testCategoryClickBtn = document.getElementById('testCategoryClick');
        const clearDebugResultsBtn = document.getElementById('clearDebugResults');
        
        if (testPingBtn) {
            testPingBtn.addEventListener('click', () => this.testPing());
        }
        
        if (testGetTabsBtn) {
            testGetTabsBtn.addEventListener('click', () => this.testGetTabs());
        }
        
        if (testGetCategoriesBtn) {
            testGetCategoriesBtn.addEventListener('click', () => this.testGetCategories());
        }
        
        if (testForceRefreshBtn) {
            testForceRefreshBtn.addEventListener('click', () => this.testForceRefresh());
        }
        
        if (testExplainMeBtn) {
            testExplainMeBtn.addEventListener('click', () => this.testExplainMe());
        }
        
        const testPDFTextLayerBtn = document.getElementById('testPDFTextLayer');
        if (testPDFTextLayerBtn) {
            testPDFTextLayerBtn.addEventListener('click', () => this.testPDFTextLayer());
        }
        
        if (testBasicSearchBtn) {
            testBasicSearchBtn.addEventListener('click', () => this.testBasicSearch());
        }
        
        if (testCategoryClickBtn) {
            testCategoryClickBtn.addEventListener('click', () => this.testCategoryClick());
        }
        
        if (clearDebugResultsBtn) {
            clearDebugResultsBtn.addEventListener('click', () => this.clearDebugResults());
        }
        
        // Add basic environment test
        this.testBasicEnvironment();
        
        console.log('🐛 TabOracle: Debug event listeners setup complete');
    }

    testBasicEnvironment() {
        console.log('🧪 TabOracle: Testing basic environment...');
        
        const debugResults = document.getElementById('debugResults');
        if (!debugResults) return;
        
        this.logDebug('🧪 Testing basic environment...', 'info');
        
        // Test 1: Check if we're in extension context
        if (typeof chrome === 'undefined') {
            this.logDebug('❌ chrome object is undefined', 'error');
        } else {
            this.logDebug('✅ chrome object is available', 'success');
        }
        
        // Test 2: Check chrome.runtime
        if (typeof chrome !== 'undefined' && !chrome.runtime) {
            this.logDebug('❌ chrome.runtime is undefined', 'error');
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            this.logDebug('✅ chrome.runtime is available', 'success');
        }
        
        // Test 3: Check chrome.tabs
        if (typeof chrome !== 'undefined' && !chrome.tabs) {
            this.logDebug('❌ chrome.tabs is undefined', 'error');
        } else if (typeof chrome !== 'undefined' && chrome.tabs) {
            this.logDebug('✅ chrome.tabs is available', 'success');
        }
        
        // Test 4: Check if we can access extension APIs
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                this.logDebug(`✅ Extension ID: ${chrome.runtime.id}`, 'success');
            } else {
                this.logDebug('❌ Cannot get extension ID', 'error');
            }
        } catch (error) {
            this.logDebug(`❌ Error getting extension ID: ${error.message}`, 'error');
        }
        
        // Test 5: Check if we're in a popup context
        if (window.location.protocol === 'chrome-extension:') {
            this.logDebug('✅ Running in chrome-extension context', 'success');
        } else {
            this.logDebug(`⚠️ Running in ${window.location.protocol} context`, 'warning');
        }
        
        this.logDebug('🧪 Basic environment test complete', 'info');
    }

    // Debug functionality methods
    logDebug(message, type = 'info') {
        const debugResults = document.getElementById('debugResults');
        if (!debugResults) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
        
        debugResults.innerHTML += `<span class="${className}">[${timestamp}] ${message}</span>\n`;
        debugResults.scrollTop = debugResults.scrollHeight;
        
        console.log(`[${timestamp}] ${message}`);
    }

    clearDebugResults() {
        const debugResults = document.getElementById('debugResults');
        if (debugResults) {
            debugResults.innerHTML = '';
        }
    }

    async testPing() {
        try {
            this.logDebug('🔍 Testing ping to background script...');
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            this.logDebug(`✅ Ping successful: ${JSON.stringify(response, null, 2)}`, 'success');
            
        } catch (error) {
            this.logDebug(`❌ Ping failed: ${error.message}`, 'error');
        }
    }

    async testGetTabs() {
        try {
            this.logDebug('🔍 Testing getTabs...');
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response.tabs) {
                this.logDebug(`✅ GetTabs successful: Found ${response.tabs.length} tabs`, 'success');
                if (response.tabs.length > 0) {
                    this.logDebug(`📋 Sample tabs:`, 'info');
                    response.tabs.slice(0, 3).forEach((tab, index) => {
                        this.logDebug(`   ${index + 1}. ${tab.title} (${tab.url})`, 'info');
                    });
                }
            } else {
                this.logDebug(`⚠️ GetTabs response missing tabs: ${JSON.stringify(response)}`, 'warning');
            }
            
        } catch (error) {
            this.logDebug(`❌ GetTabs failed: ${error.message}`, 'error');
        }
    }

    async testGetCategories() {
        try {
            this.logDebug('🔍 Testing getCategories...');
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'getCategories' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response.categories) {
                const categoryCount = Object.keys(response.categories).length;
                this.logDebug(`✅ GetCategories successful: Found ${categoryCount} categories`, 'success');
                
                Object.entries(response.categories).forEach(([category, tabs]) => {
                    this.logDebug(`   📁 ${category}: ${tabs.length} tabs`, 'info');
                });
            } else {
                this.logDebug(`⚠️ GetCategories response missing categories: ${JSON.stringify(response)}`, 'warning');
            }
            
        } catch (error) {
            this.logDebug(`❌ GetCategories failed: ${error.message}`, 'error');
        }
    }

    async testForceRefresh() {
        try {
            this.logDebug('🔍 Testing force refresh...');
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'forceRefreshTabs' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response.success) {
                this.logDebug(`✅ Force refresh successful: ${response.tabsCount} tabs`, 'success');
            } else {
                this.logDebug(`⚠️ Force refresh failed: ${response.error}`, 'warning');
            }
            
        } catch (error) {
            this.logDebug(`❌ Force refresh failed: ${error.message}`, 'error');
        }
    }

    // Test Explain Me functionality
    testExplainMe() {
        try {
            this.logDebug('🧠 Testing Explain Me functionality...');
            
            // Test with sample text
            const testText = "This is a sample text to test the Explain Me feature. It should display properly in the overlay.";
            
            // Send test message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'debug',
                        testText: testText
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            this.logDebug(`❌ Explain Me test failed: ${chrome.runtime.lastError.message}`, 'error');
                        } else if (response && response.success) {
                            this.logDebug(`✅ Explain Me test successful: ${response.message}`, 'success');
                        } else {
                            this.logDebug(`⚠️ Explain Me test response: ${JSON.stringify(response)}`, 'warning');
                        }
                    });
                } else {
                    this.logDebug('❌ No active tab found for Explain Me test', 'error');
                }
            });
            
        } catch (error) {
            this.logDebug(`❌ Explain Me test error: ${error.message}`, 'error');
        }
    }
    
    // Test PDF Text Layer functionality
    async testPDFTextLayer() {
        try {
            this.logDebug('📄 Testing PDF Text Layer functionality...');
            
            // Get active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                this.logDebug('❌ No active tab found for PDF Text Layer test', 'error');
                return;
            }
            
            const activeTab = tabs[0];
            this.logDebug(`📄 Active tab: ${activeTab.title} (${activeTab.url})`);
            
            // Check if it's a PDF page
            const isPDFPage = activeTab.url.toLowerCase().includes('.pdf');
            if (!isPDFPage) {
                this.logDebug('⚠️ Current page is not a PDF. PDF Text Layer only works on PDF pages.', 'warning');
                return;
            }
            
            this.logDebug('📄 PDF page detected, setting up PDF Text Layer...');
            
            // Send message to background script to setup PDF text layer
            chrome.runtime.sendMessage({
                action: 'setupPDFTextLayer',
                tabId: activeTab.id
            }, (response) => {
                if (chrome.runtime.lastError) {
                    this.logDebug(`❌ PDF Text Layer test failed: ${chrome.runtime.lastError.message}`, 'error');
                } else if (response && response.success) {
                    this.logDebug(`✅ PDF Text Layer test successful: ${response.message}`, 'success');
                } else {
                    this.logDebug(`⚠️ PDF Text Layer test response: ${JSON.stringify(response)}`, 'warning');
                }
            });
            
        } catch (error) {
            this.logDebug(`❌ PDF Text Layer test error: ${error.message}`, 'error');
        }
    }

    // Test basic search functionality
    testBasicSearch() {
        try {
            this.logDebug('🔍 Testing basic search functionality...');
            
            // Test 1: Check if search input exists
            if (this.searchInput) {
                this.logDebug('✅ Search input found', 'success');
                this.logDebug(`Search input value: "${this.searchInput.value}"`, 'info');
            } else {
                this.logDebug('❌ Search input not found', 'error');
            }
            
            // Test 2: Check if tabs list exists
            if (this.tabsList) {
                this.logDebug('✅ Tabs list found', 'success');
                this.logDebug(`Tabs list display: ${this.tabsList.style.display}`, 'info');
            } else {
                this.logDebug('❌ Tabs list not found', 'error');
            }
            
            // Test 3: Check if search results exists
            if (this.searchResults) {
                this.logDebug('✅ Search results container found', 'success');
                this.logDebug(`Search results display: ${this.searchResults.style.display}`, 'info');
            } else {
                this.logDebug('❌ Search results container not found', 'error');
            }
            
            // Test 4: Check if allTabs is loaded
            if (this.allTabs && this.allTabs.length > 0) {
                this.logDebug(`✅ Tabs loaded: ${this.allTabs.length} tabs`, 'success');
                this.logDebug(`Sample tab: ${this.allTabs[0].title}`, 'info');
            } else {
                this.logDebug('❌ No tabs loaded', 'error');
            }
            
            // Test 5: Try to perform a simple search
            this.logDebug('🔍 Attempting to perform a simple search...', 'info');
            this.handleNormalSearch('test');
            
        } catch (error) {
            this.logDebug(`❌ Basic search test error: ${error.message}`, 'error');
        }
    }

    // Test category click functionality
    testCategoryClick() {
        try {
            this.logDebug('🏷️ Testing category click functionality...');
            
            // Test 1: Check if categories grid exists
            if (this.categoriesGrid) {
                this.logDebug('✅ Categories grid found', 'success');
                this.logDebug(`Categories grid display: ${this.categoriesGrid.style.display}`, 'info');
            } else {
                this.logDebug('❌ Categories grid not found', 'error');
                return;
            }
            
            // Test 2: Check if category cards exist
            const categoryCards = this.categoriesGrid.querySelectorAll('.category-card');
            if (categoryCards.length > 0) {
                this.logDebug(`✅ Found ${categoryCards.length} category cards`, 'success');
                
                // Test 3: Check first category card structure
                const firstCard = categoryCards[0];
                const categoryName = firstCard.getAttribute('data-category');
                this.logDebug(`First card category: ${categoryName}`, 'info');
                this.logDebug(`First card HTML: ${firstCard.outerHTML.substring(0, 200)}...`, 'info');
                
                // Test 4: Check if click listeners are attached
                const hasClickListeners = firstCard._categoryClickHandler !== undefined;
                this.logDebug(`Click listeners attached: ${hasClickListeners}`, hasClickListeners ? 'success' : 'warning');
                
                // Test 5: Try to simulate a click
                this.logDebug('🔍 Simulating category click...', 'info');
                if (hasClickListeners) {
                    firstCard._categoryClickHandler();
                    this.logDebug('✅ Category click simulated successfully', 'success');
                } else {
                    this.logDebug('⚠️ No click handler found, trying to add one', 'warning');
                    this.addCategoryClickListeners();
                    
                    // Try again after adding listeners
                    setTimeout(() => {
                        const updatedCard = this.categoriesGrid.querySelector('.category-card');
                        if (updatedCard && updatedCard._categoryClickHandler) {
                            this.logDebug('✅ Click handler added, simulating click...', 'success');
                            updatedCard._categoryClickHandler();
                        } else {
                            this.logDebug('❌ Still no click handler after adding', 'error');
                        }
                    }, 100);
                }
            } else {
                this.logDebug('❌ No category cards found', 'error');
                this.logDebug('Categories grid HTML:', this.categoriesGrid.innerHTML.substring(0, 200) + '...', 'info');
            }
            
        } catch (error) {
            this.logDebug(`❌ Category click test error: ${error.message}`, 'error');
        }
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TabOraclePopup();
});