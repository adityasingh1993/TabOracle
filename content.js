// Content script for TabOracle
(function() {
    'use strict';
    
    let searchOverlay = null;
    let searchInput = null;
    let searchResults = null;
    let isVisible = false;
    
    // Create the search overlay
    function createSearchOverlay() {
        if (searchOverlay) return;
        
        // Create overlay container
        searchOverlay = document.createElement('div');
        searchOverlay.id = 'tab-oracle-overlay';
        searchOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            width: 700px;
            max-width: 90vw;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
        `;
        
        // Create search input
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'TabOracle: Search tabs by context, title, or URL... (Press Esc to close)';
        searchInput.style.cssText = `
            width: 100%;
            padding: 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 18px;
            outline: none;
            transition: border-color 0.2s ease;
        `;
        
        // Create search results container
        searchResults = document.createElement('div');
        searchResults.style.cssText = `
            margin-top: 20px;
            max-height: 500px;
            overflow-y: auto;
        `;
        
        // Add elements to DOM
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchResults);
        searchOverlay.appendChild(searchContainer);
        document.body.appendChild(searchOverlay);
        
        // Add event listeners
        setupEventListeners();
        
        // Add CSS animations
        addCSSAnimations();
    }
    
    function setupEventListeners() {
        // Search input events
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', handleKeydown);
        
        // Overlay click to close
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                hideSearch();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isVisible) {
                hideSearch();
            }
        });
    }
    
    function handleSearch(e) {
        const query = e.target.value.trim();
        if (!query) {
            clearResults();
            return;
        }
        
        performSearch(query);
    }
    
    function handleKeydown(e) {
        if (e.key === 'Enter') {
            // Handle selection of first result
            const firstResult = searchResults.querySelector('.tab-result');
            if (firstResult) {
                firstResult.click();
            }
        }
    }
    
    async function performSearch(query) {
        try {
            const response = await chrome.runtime.sendMessage({ 
                action: 'searchTabs', 
                query: query 
            });
            
            const results = response.results || [];
            displaySearchResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            showError('Failed to search tabs');
        }
    }
    
    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <div style="font-size: 18px; margin-bottom: 16px;">No tabs found for "${query}"</div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: left; border-left: 4px solid #667eea;">
                        <div style="font-weight: 600; margin-bottom: 12px; color: #333;">💡 Try searching for:</div>
                        <div style="margin-bottom: 8px; color: #495057;">• Website names (e.g., "github", "stackoverflow")</div>
                        <div style="margin-bottom: 8px; color: #495057;">• Content types (e.g., "docs", "email", "news")</div>
                        <div style="margin-bottom: 8px; color: #495057;">• Keywords from tab titles</div>
                        <div style="color: #495057;">• Domain names or URLs</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Add search header
        const searchHeader = `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">
                    ${results.length} result${results.length !== 1 ? 's' : ''} found
                </div>
                <div style="font-size: 14px; color: #667eea; font-style: italic;">
                    "${query}"
                </div>
            </div>
        `;
        
        searchResults.innerHTML = searchHeader + results
            .map(tab => createResultElement(tab, query))
            .join('');
        
        // Add click listeners
        addResultClickListeners();
    }
    
    function createResultElement(tab, query) {
        const favicon = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>';
        const highlightedTitle = highlightText(tab.title, query);
        const highlightedUrl = highlightText(tab.url, query);
        const category = getCategoryDisplay(tab);
        const relevanceScore = tab.searchScore || 0;
        const isPinned = tab.pinned;
        
        return `
            <div class="tab-result" data-tab-id="${tab.id}" data-window-id="${tab.windowId}" style="
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                overflow: hidden;
            ">
                <div style="display: flex; align-items: flex-start; padding: 20px; gap: 16px;">
                    <div style="position: relative; flex-shrink: 0;">
                        <img src="${favicon}" alt="favicon" style="
                            width: 24px;
                            height: 24px;
                            border-radius: 4px;
                        " onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><rect width=&quot;16&quot; height=&quot;16&quot; fill=&quot;%23ccc&quot;/></svg>'>
                        ${isPinned ? '<div style="position: absolute; top: -6px; right: -6px; font-size: 12px; background: #ffc107; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">📌</div>' : ''}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-size: 16px;
                            font-weight: 600;
                            color: #333;
                            margin-bottom: 8px;
                            line-height: 1.3;
                        ">${highlightedTitle}</div>
                        <div style="
                            font-size: 13px;
                            color: #666;
                            margin-bottom: 8px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        ">${highlightedUrl}</div>
                        ${category ? `<div style="font-size: 12px; color: #667eea; background: rgba(102, 126, 234, 0.1); padding: 4px 10px; border-radius: 12px; display: inline-block;">${category}</div>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;">
                        <div style="
                            font-size: 13px;
                            font-weight: 600;
                            color: #28a745;
                            background: rgba(40, 167, 69, 0.1);
                            padding: 6px 10px;
                            border-radius: 12px;
                            min-width: 35px;
                            text-align: center;
                        " title="Relevance score">${relevanceScore}</div>
                        
                        <!-- Similarity Scores -->
                        ${createSimilarityScores(tab)}
                        <div style="
                            font-size: 11px;
                            color: #999;
                            background: #e9ecef;
                            padding: 3px 8px;
                            border-radius: 12px;
                        ">${getWindowDisplay(tab)}</div>
                    </div>
                </div>
                ${createContextInfo(tab)}
            </div>
        `;
    }
    
    function createSimilarityScores(tab) {
        const scores = [];
        const context = tab.context || {};
        
        // Content similarity
        if (tab.contentSimilarity > 0) {
            scores.push(`<div style="font-size: 11px; color: #007bff; background: rgba(0, 123, 255, 0.1); padding: 4px 8px; border-radius: 8px; margin: 4px 0; border: 1px solid rgba(0, 123, 255, 0.2);">📄 Content: ${Math.round(tab.contentSimilarity)}%</div>`);
        }
        
        // Semantic matches
        if (tab.semanticMatches && tab.semanticMatches.length > 0) {
            const semanticScore = tab.semanticMatches.reduce((sum, match) => sum + match.similarity, 0);
            scores.push(`<div style="font-size: 11px; color: #6f42c1; background: rgba(111, 66, 193, 0.1); padding: 4px 8px; border-radius: 8px; margin: 4px 0; border: 1px solid rgba(111, 66, 193, 0.2);">🧠 Semantic: ${Math.round(semanticScore * 100)}%</div>`);
        }
        
        // Keywords count
        if (context.keywords && context.keywords.length > 0) {
            scores.push(`<div style="font-size: 11px; color: #fd7e14; background: rgba(253, 126, 20, 0.1); padding: 4px 8px; border-radius: 8px; margin: 4px 0; border: 1px solid rgba(253, 126, 20, 0.2);">🔑 Keywords: ${context.keywords.length}</div>`);
        }
        
        // Content availability
        if (context.pageContent) {
            const contentLength = context.pageContent.length;
            const contentIndicator = contentLength > 1000 ? '📚 Rich Content' : contentLength > 500 ? '📄 Medium Content' : '📝 Basic Content';
            scores.push(`<div style="font-size: 11px; color: #6c757d; background: rgba(108, 117, 125, 0.1); padding: 4px 8px; border-radius: 8px; margin: 4px 0; border: 1px solid rgba(108, 117, 125, 0.2);">${contentIndicator}</div>`);
        }
        
        return scores.length > 0 ? scores.join('') : '';
    }
    
    function createContextInfo(tab) {
        if (!tab.context || !tab.context.keywords || tab.context.keywords.length === 0) {
            return '';
        }
        
        const topKeywords = tab.context.keywords.slice(0, 6);
        return `
            <div style="background: #f8f9fa; padding: 16px 20px; border-top: 1px solid #e9ecef;">
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${topKeywords.map(keyword => `<span style="font-size: 11px; color: #495057; background: #e9ecef; padding: 4px 10px; border-radius: 12px; border: 1px solid #dee2e6;">${keyword}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    function getCategoryDisplay(tab) {
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
    
    function getWindowDisplay(tab) {
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
    
    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return escapeHtml(text).replace(regex, '<span style="background: #fff3cd; padding: 1px 2px; border-radius: 2px;">$1</span>');
    }
    
    function addResultClickListeners() {
        const results = searchResults.querySelectorAll('.tab-result');
        results.forEach(result => {
            result.addEventListener('click', () => {
                const tabId = parseInt(result.dataset.tabId);
                const windowId = parseInt(result.dataset.windowId);
                activateTab(tabId, windowId);
            });
            
            // Hover effects
            result.addEventListener('mouseenter', () => {
                result.style.borderColor = '#667eea';
                result.style.transform = 'translateY(-2px)';
                result.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.2)';
            });
            
            result.addEventListener('mouseleave', () => {
                result.style.borderColor = '#e9ecef';
                result.style.transform = 'translateY(0)';
                result.style.boxShadow = 'none';
            });
        });
    }
    
    async function activateTab(tabId, windowId) {
        try {
            await chrome.runtime.sendMessage({ 
                action: 'activateTab', 
                tabId: tabId, 
                windowId: windowId 
            });
            hideSearch();
        } catch (error) {
            console.error('Error activating tab:', error);
        }
    }
    
    function clearResults() {
        searchResults.innerHTML = '';
    }
    
    function showError(message) {
        searchResults.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }
    
    function showSearch() {
        if (!searchOverlay) {
            createSearchOverlay();
        }
        
        searchOverlay.style.display = 'flex';
        isVisible = true;
        
        // Focus and select input
        setTimeout(() => {
            searchInput.focus();
            searchInput.select();
        }, 100);
    }
    
    function hideSearch() {
        if (searchOverlay) {
            searchOverlay.style.display = 'none';
            isVisible = false;
            clearResults();
            searchInput.value = '';
        }
    }
    
    function addCSSAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'showSearch') {
            showSearch();
            sendResponse({ success: true });
        }
    });
    
    // Global keyboard shortcut listener
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
            showSearch();
        }
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSearchOverlay);
    } else {
        createSearchOverlay();
    }
})();
