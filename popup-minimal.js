// Minimal popup script for testing
console.log('🔧 TabOracle Minimal: Popup script loaded');

class TabOracleMinimal {
    constructor() {
        this.allTabs = [];
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🔧 TabOracle Minimal: Initializing...');
            await this.loadTabs();
            this.setupEventListeners();
        } catch (error) {
            console.error('🔧 TabOracle Minimal: Initialization error:', error);
            this.showStatus('Error during initialization: ' + error.message, 'error');
        }
    }

    async loadTabs() {
        try {
            console.log('🔧 TabOracle Minimal: Loading tabs...');
            const response = await chrome.runtime.sendMessage({ action: 'getAllTabs' });
            console.log('🔧 TabOracle Minimal: Response:', response);
            
            if (response && response.tabs) {
                this.allTabs = response.tabs;
                this.renderTabs();
                this.showStatus(`Loaded ${this.allTabs.length} tabs successfully`, 'success');
            } else {
                throw new Error('No tabs returned from background script');
            }
        } catch (error) {
            console.error('🔧 TabOracle Minimal: Failed to load tabs:', error);
            this.showStatus('Failed to load tabs: ' + error.message, 'error');
        }
    }

    renderTabs() {
        const tabsList = document.getElementById('tabsList');
        
        if (this.allTabs.length === 0) {
            tabsList.innerHTML = '<div class="status info">No tabs found</div>';
            return;
        }

        tabsList.innerHTML = this.allTabs.map(tab => `
            <div class="tab-item" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
                <img class="tab-favicon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ccc"/></svg>'}" alt="favicon">
                <div class="tab-content">
                    <div class="tab-title">${this.escapeHtml(tab.title || 'No title')}</div>
                    <div class="tab-url">${this.escapeHtml(tab.url || 'No URL')}</div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const tabsList = document.getElementById('tabsList');
        tabsList.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            if (tabItem) {
                const tabId = parseInt(tabItem.dataset.tabId);
                const windowId = parseInt(tabItem.dataset.windowId);
                this.activateTab(tabId, windowId);
            }
        });
    }

    async activateTab(tabId, windowId) {
        try {
            console.log('🔧 TabOracle Minimal: Activating tab', tabId, 'in window', windowId);
            await chrome.tabs.update(tabId, { active: true });
            await chrome.windows.update(windowId, { focused: true });
            window.close();
        } catch (error) {
            console.error('🔧 TabOracle Minimal: Failed to activate tab:', error);
            this.showStatus('Failed to activate tab: ' + error.message, 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TabOracleMinimal();
});
