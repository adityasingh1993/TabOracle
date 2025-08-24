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
                this.languageModel = await chrome.languageModel.create();
                this.languageModelInitialized = true;
                console.log('✅ TabOracle: Chrome Language Model initialized successfully');
                return;
            }
            
            // Check for global LanguageModel (alternative access method)
            if (typeof LanguageModel !== 'undefined' && LanguageModel.create) {
                console.log('🔍 TabOracle: Global LanguageModel available, attempting to initialize...');
                this.languageModel = await LanguageModel.create();
                this.languageModelInitialized = true;
                console.log('✅ TabOracle: Global LanguageModel initialized successfully');
                return;
            }
            
            // Check for window.LanguageModel (another alternative)
            if (typeof window !== 'undefined' && window.LanguageModel && window.LanguageModel.create) {
                console.log('🔍 TabOracle: Window LanguageModel available, attempting to initialize...');
                this.languageModel = await window.LanguageModel.create();
                this.languageModelInitialized = true;
                console.log('✅ TabOracle: Window LanguageModel initialized successfully');
                return;
            }
            
            // No language model available
            console.log('⚠️ TabOracle: No language model available on this system (Windows/older Chrome version)');
            console.log('⚠️ TabOracle: Will use intelligent fallback for summaries');
            this.languageModel = null;
            this.languageModelInitialized = true; // Mark as initialized to avoid repeated checks
            
            // Show notice for Windows users
            if (this.geminiNotice) {
                this.geminiNotice.style.display = 'flex';
                // Update notice text for Windows users
                const noticeText = this.geminiNotice.querySelector('.notice-text');
                if (noticeText) {
                    noticeText.innerHTML = `
                        <strong>AI Features Note:</strong><br>
                        Chrome Language Model (Gemini Nano) may not be available on Windows yet.<br>
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
                        Language model initialization failed.<br>
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
                    <div class="loading-spinner">✨</div>
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
                        <div>Chrome Language Model (Gemini Nano) is not available on this system.</div>
                        <div>TabOracle will use intelligent fallback for summaries.</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            This is normal on Windows or older Chrome versions.
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
            this.pageSummaryContent.innerHTML = `<div class="empty-state error">AI test failed: ${this.escapeHtml(error.message)}</div>`;
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

            // Get page content via background (handles chrome:// restrictions and caching)
            let contentResp = await chrome.runtime.sendMessage({ action: 'getPageContent', tabId: activeTab.id });
            if (!contentResp || !contentResp.success) {
                // Fallback: request background to extract then retry
                try {
                    await chrome.runtime.sendMessage({ action: 'extractContent', tabId: activeTab.id });
                    contentResp = await chrome.runtime.sendMessage({ action: 'getPageContent', tabId: activeTab.id });
                } catch (_e) {}
            }
            if (!contentResp || !contentResp.success) {
                this.setSummaryLoading(false);
                this.pageSummaryContent.innerHTML = `<div class="empty-state error">${this.escapeHtml(contentResp?.error || 'Unable to get page content')}</div>`;
                return;
            }

            const pageContent = contentResp.content || '';
            const pageTitle = activeTab.title || '';
            const pageUrl = activeTab.url || '';

            // Try on-device model first
            await this.ensureLanguageModelInitialized();
            let summaryData = null;
            if (this.languageModel && this.languageModel.prompt) {
                const prompt = `Return ONLY valid JSON. Summarize page with keys: summary, mainTopic, keyPoints, contentType, wordCount, estimatedReadingTime, confidence.\nTitle: ${pageTitle}\nURL: ${pageUrl}\nContent: ${pageContent.substring(0, 8000)}`;
                const response = await this.languageModel.prompt(prompt);
                const raw = typeof response === 'string' ? response : (response?.text || response?.response || JSON.stringify(response));
                summaryData = this.parseAIJsonSafely(raw);
            }

            // Fallback if AI not available or parsing failed
            if (!summaryData) {
                summaryData = this.basicFallbackSummary(pageContent, pageTitle);
            }

            this.setSummaryLoading(false);
            this.renderSummary(summaryData);
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
        this.tabCount = document.getElementById('tabCount');
        
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
        }
        
        // Category selection
        if (this.categoriesGrid) {
            this.categoriesGrid.addEventListener('click', (e) => {
                if (e.target.closest('.category-card')) {
                    const category = e.target.closest('.category-card').dataset.category;
                    this.showCategoryResults(category);
                }
            });
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
    }

    renderCategoriesFromBackground(categories) {
        console.log('🏷️ TabOracle: Rendering categories from background script:', categories);
        
        if (!categories || Object.keys(categories).length === 0) {
            this.categoriesGrid.innerHTML = '<div class="empty-state">No categories found</div>';
            return;
        }
        
        // Convert background script categories to UI format
        const categoryCards = Object.entries(categories).map(([categoryName, tabs]) => {
            return this.createCategoryCard({
                name: categoryName,
                count: tabs.length,
                tabs: tabs,
                confidence: 1.0,
                keywords: []
            });
        }).join('');
        
        this.categoriesGrid.innerHTML = categoryCards;
        console.log('🏷️ TabOracle: Categories rendered from background script');
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
        const confidence = Math.round(category.confidence);
        const topKeywords = category.keywords
            .filter((kw, index, arr) => arr.indexOf(kw) === index) // Remove duplicates
            .slice(0, 3); // Top 3 keywords
        
        return `
            <div class="category-card" data-category="${category.name}">
                <span class="category-icon">${icon}</span>
                <div class="category-name">${category.name}</div>
                <div class="category-count">${category.count} tabs</div>
                <div class="category-confidence">Confidence: ${confidence}%</div>
                ${topKeywords.length > 0 ? `<div class="category-keywords">${topKeywords.join(', ')}</div>` : ''}
            </div>
        `;
    }

    getCategoryIcon(categoryName) {
        const iconMap = {
            '💻 Development': '💻',
            '📚 Documentation': '📚',
            '📧 Email': '📧',
            '🎥 Media': '🎥',
            '📰 News': '📰',
            '🛒 Shopping': '🛒',
            '👥 Social': '👥',
            '⚡ Productivity': '⚡',
            '💰 Finance': '💰',
            '🔍 Search': '🔍'
        };
        return iconMap[categoryName] || '🏷️';
    }

    async showCategoryResults(categoryName) {
        const category = this.getCategories().find(c => c.name === categoryName);
        if (!category) return;

        const confidence = Math.round(category.confidence);
        const uniqueKeywords = [...new Set(category.keywords)].slice(0, 10); // Top 10 unique keywords

        this.categoryResults.innerHTML = `
            <div class="category-header">
                <h3>${category.name} (${category.count} tabs)</h3>
                <div class="category-stats">
                    <span class="stat-item">🎯 Confidence: ${confidence}%</span>
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
        this.categoriesGrid.style.display = 'grid';
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
        if (!this.tabCount) return;
        const n = Array.isArray(this.allTabs) ? this.allTabs.length : 0;
        this.tabCount.textContent = `${n} tab${n !== 1 ? 's' : ''}`;
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

}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TabOraclePopup();
});
