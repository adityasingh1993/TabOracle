// Popup script for TabOracle with Tabbed Interface
class TabOraclePopup {
    constructor() {
        this.allTabs = [];
        this.currentTab = 'normal';
        this.initializeElements();
        this.setupEventListeners();
        this.loadTabs();
    }

    initializeElements() {
        // Tab elements
        this.searchTabs = document.querySelectorAll('.search-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        
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
        
        // Footer
        this.tabCount = document.getElementById('tabCount');
    }

    setupEventListeners() {
        // Tab switching
        this.searchTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Normal search
        this.searchInput.addEventListener('input', (e) => this.handleNormalSearch(e.target.value));
        
        // Smart search
        this.smartSearchInput.addEventListener('input', (e) => this.handleSmartSearch(e.target.value));
        
        // Category selection
        this.categoriesGrid.addEventListener('click', (e) => {
            if (e.target.closest('.category-card')) {
                const category = e.target.closest('.category-card').dataset.category;
                this.showCategoryResults(category);
            }
        });
        
        // Debug button
        const debugButton = document.getElementById('debugCategories');
        if (debugButton) {
            debugButton.addEventListener('click', () => this.debugCategories());
        }
    }

    switchTab(tabName) {
        // Update active tab button
        this.searchTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update active tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}SearchTab`);
        });

        this.currentTab = tabName;
        
        // Load appropriate content
        switch(tabName) {
            case 'normal':
                this.loadTabs();
                break;
            case 'category':
                this.loadCategories();
                break;
            case 'smart':
                this.loadSmartSearch();
                break;
        }
    }

    async loadTabs() {
        try {
            console.log('🔍 TabOracle: Loading tabs...');
            const response = await chrome.runtime.sendMessage({ action: 'getAllTabs' });
            console.log('🔍 TabOracle: Response received:', response);
            this.allTabs = response.tabs || [];
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
            const response = await chrome.runtime.sendMessage({ action: 'getAllTabs' });
            console.log('🏷️ TabOracle: Categories response:', response);
            
            this.allTabs = response.tabs || [];
            console.log('🏷️ TabOracle: Tabs loaded for categories:', this.allTabs.length);
            
            // Debug: Log first few tabs to see their structure
            if (this.allTabs.length > 0) {
                console.log('🏷️ TabOracle: Sample tab structure:', this.allTabs[0]);
                console.log('🏷️ TabOracle: Sample tab has title:', this.allTabs[0].title);
                console.log('🏷️ TabOracle: Sample tab has URL:', this.allTabs[0].url);
                console.log('🏷️ TabOracle: Sample tab has context:', this.allTabs[0].context);
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
                <button class="back-button" onclick="this.closest('.category-results').style.display='none'">← Back to Categories</button>
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

        this.categoryResults.style.display = 'block';
        this.addTabClickListeners(this.categoryResults);
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
        const favicon = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>';
        const category = this.getCategoryDisplay(tab);
        
        return `
            <div class="tab-item ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <img class="tab-favicon" src="${favicon}" alt="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><rect width=&quot;16&quot; height=&quot;16&quot; fill=&quot;%23ccc&quot;/></svg>'">
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

    createSearchResultElement(tab, query) {
        const favicon = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>';
        const highlightedTitle = this.highlightText(tab.title, query);
        const highlightedUrl = this.highlightText(tab.url, query);
        const category = this.getCategoryDisplay(tab);
        const relevanceScore = tab.searchScore || 0;
        const isPinned = tab.pinned;
        const contentSimilarity = tab.contentSimilarity || 0;
        const hasContent = tab.context && tab.context.pageContent;
        const semanticMatches = tab.semanticMatches || [];

        return `
            <div class="tab-result" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <div class="result-header">
                    <div class="result-favicon">
                        <img src="${favicon}" alt="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><rect width=&quot;16&quot; height=&quot;16&quot; fill=&quot;%23ccc&quot;/></svg>'">
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
        this.tabCount.textContent = `${this.allTabs.length} tab${this.allTabs.length !== 1 ? 's' : ''}`;
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
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TabOraclePopup();
});
