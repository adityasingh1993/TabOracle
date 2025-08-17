// Popup script for TabOracle
class TabOrganizer {
    constructor() {
        this.tabs = [];
        this.searchInput = document.getElementById('searchInput');
        this.tabsList = document.getElementById('tabsList');
        this.searchResults = document.getElementById('searchResults');
        this.tabCount = document.getElementById('tabCount');
        
        this.init();
    }
    
    init() {
        this.loadTabs();
        this.setupEventListeners();
        this.focusSearchInput();
    }
    
    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
        
        // Global keyboard shortcut listener
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.focusSearchInput();
            }
        });
    }
    
    async loadTabs() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getTabs' });
            this.tabs = response.tabs || [];
            this.renderTabs();
            this.updateTabCount();
        } catch (error) {
            console.error('Error loading tabs:', error);
            this.showError('Failed to load tabs');
        }
    }
    
    renderTabs() {
        if (this.tabs.length === 0) {
            this.tabsList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📱</div>
                    <div>No tabs found</div>
                </div>
            `;
            return;
        }
        
        // Sort tabs by relevance and activity
        const sortedTabs = this.sortTabsByRelevance(this.tabs);
        
        this.tabsList.innerHTML = sortedTabs
            .map(tab => this.createTabElement(tab))
            .join('');
    }
    
    sortTabsByRelevance(tabs) {
        return tabs.sort((a, b) => {
            // Active tab first
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            
            // Pinned tabs next
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            
            // Then by domain relevance
            const aDomain = a.domain || '';
            const bDomain = b.domain || '';
            if (aDomain && !bDomain) return -1;
            if (!aDomain && bDomain) return 1;
            
            return 0;
        });
    }
    
    createTabElement(tab) {
        const isActive = tab.active;
        const isPinned = tab.pinned;
        const favicon = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>';
        const category = this.getCategoryDisplay(tab);
        
        return `
            <div class="tab-item ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <img class="tab-favicon" src="${favicon}" alt="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><rect width=&quot;16&quot; height=&quot;16&quot; fill=&quot;%23ccc&quot;/></svg>'>
                <div class="tab-content">
                    <div class="tab-title">
                        ${this.escapeHtml(tab.title)}
                        ${isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                    </div>
                    <div class="tab-url">${this.escapeHtml(tab.url)}</div>
                    ${category ? `<div class="tab-category">${category}</div>` : ''}
                </div>
                <div class="tab-window">W${tab.windowId}</div>
            </div>
        `;
    }
    
    getCategoryDisplay(tab) {
        if (!tab.domain) return '';
        
        const domain = tab.domain.toLowerCase();
        if (domain.includes('github') || domain.includes('gitlab')) return '💻 Dev';
        if (domain.includes('stackoverflow') || domain.includes('stackexchange')) return '💻 Dev';
        if (domain.includes('docs') || domain.includes('developer')) return '📚 Docs';
        if (domain.includes('mail') || domain.includes('gmail') || domain.includes('outlook')) return '📧 Email';
        if (domain.includes('youtube') || domain.includes('vimeo')) return '🎥 Media';
        if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) return '📰 News';
        if (domain.includes('shopping') || domain.includes('amazon') || domain.includes('ebay')) return '🛒 Shop';
        if (domain.includes('social') || domain.includes('facebook') || domain.includes('twitter')) return '👥 Social';
        
        return '';
    }
    
    handleSearch(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }
        
        this.performSearch(query);
    }
    
    async performSearch(query) {
        try {
            const response = await chrome.runtime.sendMessage({ 
                action: 'searchTabs', 
                query: query 
            });
            
            const results = response.results || [];
            this.displaySearchResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    displaySearchResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <div>No tabs found for "${query}"</div>
                    <div class="search-tips">
                        <div class="tip">💡 Try searching for:</div>
                        <div class="tip">• Website names (e.g., "github", "stackoverflow")</div>
                        <div class="tip">• Content types (e.g., "docs", "email", "news")</div>
                        <div class="tip">• Keywords from tab titles</div>
                        <div class="tip">• Related concepts (e.g., "code" for programming tabs)</div>
                        <div class="tip">• Content from web pages (e.g., "react tutorial", "api documentation")</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Get semantic insights for the query
        this.getSemanticInsights(query).then(insights => {
            this.searchResults.innerHTML = `
                <div class="search-header">
                    <div class="results-count">${results.length} result${results.length !== 1 ? 's' : ''} found</div>
                    <div class="search-query">"${this.escapeHtml(query)}"</div>
                    ${insights ? `<div class="semantic-insights">🧠 ${insights}</div>` : ''}
                    <div class="search-type-indicator">
                        🔍 Searching through: Titles, URLs, and Page Content
                    </div>
                </div>
                ${results.map(tab => this.createSearchResultElement(tab, query)).join('')}
            `;
        });
        
        this.tabsList.style.display = 'none';
        this.searchResults.style.display = 'block';
        
        // Add click listeners to search results
        this.addTabClickListeners(this.searchResults);
    }
    
    async getSemanticInsights(query) {
        try {
            const response = await chrome.runtime.sendMessage({ 
                action: 'getSemanticMatches', 
                query: query 
            });
            
            const matches = response.matches || [];
            if (matches.length === 0) return null;
            
            const topMatches = matches.slice(0, 3);
            const insights = topMatches.map(match => 
                `"${match.word}" (${Math.round(match.similarity * 100)}% similar)`
            ).join(', ');
            
            return `Semantic matches: ${insights}`;
        } catch (error) {
            return null;
        }
    }
    
    createSearchResultElement(tab, query) {
        const favicon = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>';
        const highlightedTitle = this.highlightText(tab.title, query);
        const highlightedUrl = this.highlightText(tab.url, query);
        const category = this.getCategoryDisplay(tab);
        const relevanceScore = tab.searchScore || 0;
        const isPinned = tab.pinned;
        const semanticMatches = tab.semanticMatches || [];
        const contentSimilarity = tab.contentSimilarity || 0;
        const hasContent = tab.context && tab.context.pageContent;
        
        return `
            <div class="tab-result" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <div class="result-header">
                    <div class="result-favicon">
                        <img src="${favicon}" alt="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><rect width=&quot;16&quot; height=&quot;16&quot; fill=&quot;%23ccc&quot;/></svg>'>
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
                        <div class="tab-window">W${tab.windowId}</div>
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
    
    highlightText(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.tabsList.style.display = 'block';
        this.searchResults.style.display = 'none';
        this.focusSearchInput();
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
            console.error('Error activating tab:', error);
        }
    }
    
    updateTabCount() {
        this.tabCount.textContent = `${this.tabs.length} tab${this.tabs.length !== 1 ? 's' : ''}`;
    }
    
    focusSearchInput() {
        this.searchInput.focus();
        this.searchInput.select();
    }
    
    showError(message) {
        this.tabsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Initialize the tab organizer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new TabOrganizer();
    
    // Add click listeners to the initial tabs list
    const tabsList = document.getElementById('tabsList');
    const tabItems = tabsList.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = parseInt(item.dataset.tabId);
            const windowId = parseInt(item.dataset.windowId);
            chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId, 
                windowId: windowId 
            });
            window.close();
        });
    });
});
