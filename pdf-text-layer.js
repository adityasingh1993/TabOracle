// PDF Text Layer Overlay for TabOracle
// This script creates a selectable text layer over PDF content

class PDFTextLayerOverlay {
    constructor() {
        this.isActive = false;
        this.pdfDocument = null;
        this.textLayer = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.pdfUrl = null;
        this.overlayContainer = null;
        
        console.log('🔍 TabOracle: PDF Text Layer Overlay initialized');
        this.init();
    }
    
    async init() {
        try {
            // Check if we're on a PDF page
            if (!this.isPDFPage()) {
                console.log('🔍 TabOracle: Not a PDF page, skipping text layer setup');
                return;
            }
            
            console.log('🔍 TabOracle: PDF page detected, setting up text layer overlay');
            
            // Get PDF URL
            this.pdfUrl = window.location.href;
            
            // Create overlay container
            this.createOverlayContainer();
            
            // Load PDF and create text layer
            await this.loadPDF();
            
        } catch (error) {
            console.error('❌ TabOracle: Error initializing PDF text layer overlay:', error);
        }
    }
    
    isPDFPage() {
        // Check if current page is a PDF
        return window.location.href.toLowerCase().includes('.pdf') || 
               document.contentType === 'application/pdf' ||
               document.querySelector('embed[type="application/pdf"]') ||
               document.querySelector('object[type="application/pdf"]');
    }
    
    createOverlayContainer() {
        // Remove existing overlay if any
        const existingOverlay = document.getElementById('tab-oracle-pdf-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create overlay container
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'tab-oracle-pdf-overlay';
        this.overlayContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            pointer-events: none;
            background: transparent;
        `;
        
        // Create text layer container
        this.textLayer = document.createElement('div');
        this.textLayer.id = 'tab-oracle-pdf-text-layer';
        this.textLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: auto;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: transparent;
            overflow: hidden;
        `;
        
        // Add controls
        const controls = this.createControls();
        
        this.overlayContainer.appendChild(this.textLayer);
        this.overlayContainer.appendChild(controls);
        document.body.appendChild(this.overlayContainer);
        
        console.log('✅ TabOracle: PDF overlay container created');
    }
    
    createControls() {
        const controls = document.createElement('div');
        controls.id = 'tab-oracle-pdf-controls';
        controls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            pointer-events: auto;
            z-index: 10000;
        `;
        
        controls.innerHTML = `
            <div style="margin-bottom: 5px;">
                <strong>TabOracle PDF Text Layer</strong>
            </div>
            <div style="margin-bottom: 5px;">
                Page: <span id="current-page">1</span> / <span id="total-pages">1</span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button id="prev-page" style="padding: 2px 8px; background: #4F46E5; color: white; border: none; border-radius: 4px; cursor: pointer;">←</button>
                <button id="next-page" style="padding: 2px 8px; background: #4F46E5; color: white; border: none; border-radius: 4px; cursor: pointer;">→</button>
                <button id="toggle-overlay" style="padding: 2px 8px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Hide</button>
            </div>
        `;
        
        // Add event listeners
        controls.querySelector('#prev-page').addEventListener('click', () => this.previousPage());
        controls.querySelector('#next-page').addEventListener('click', () => this.nextPage());
        controls.querySelector('#toggle-overlay').addEventListener('click', () => this.toggleOverlay());
        
        return controls;
    }
    
    async loadPDF() {
        try {
            console.log('🔍 TabOracle: Loading PDF from URL:', this.pdfUrl);
            
            // Check if pdf.js is available
            if (typeof pdfjsLib === 'undefined') {
                console.error('❌ TabOracle: pdf.js not available');
                this.showError('PDF.js library not available');
                return;
            }
            
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.js');
            
            // Load PDF document
            const loadingTask = pdfjsLib.getDocument(this.pdfUrl);
            this.pdfDocument = await loadingTask.promise;
            
            this.totalPages = this.pdfDocument.numPages;
            console.log('✅ TabOracle: PDF loaded successfully, pages:', this.totalPages);
            
            // Update controls
            document.getElementById('total-pages').textContent = this.totalPages;
            
            // Load first page
            await this.loadPage(1);
            
        } catch (error) {
            console.error('❌ TabOracle: Error loading PDF:', error);
            this.showError('Failed to load PDF: ' + error.message);
        }
    }
    
    async loadPage(pageNumber) {
        try {
            console.log('🔍 TabOracle: Loading page:', pageNumber);
            
            if (!this.pdfDocument) {
                console.error('❌ TabOracle: PDF document not loaded');
                return;
            }
            
            if (pageNumber < 1 || pageNumber > this.totalPages) {
                console.error('❌ TabOracle: Invalid page number:', pageNumber);
                return;
            }
            
            // Get page
            const page = await this.pdfDocument.getPage(pageNumber);
            
            // Get viewport
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate scale to fit page in viewport
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 1.0); // Don't scale up
            
            const scaledViewport = page.getViewport({ scale });
            
            // Clear text layer
            this.textLayer.innerHTML = '';
            
            // Set text layer dimensions
            this.textLayer.style.width = scaledViewport.width + 'px';
            this.textLayer.style.height = scaledViewport.height + 'px';
            this.textLayer.style.transform = `scale(${scale})`;
            this.textLayer.style.transformOrigin = 'top left';
            
            // Get text content
            const textContent = await page.getTextContent();
            
            // Render text layer
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: this.textLayer,
                viewport: scaledViewport,
                textDivs: []
            });
            
            // Update current page
            this.currentPage = pageNumber;
            document.getElementById('current-page').textContent = pageNumber;
            
            console.log('✅ TabOracle: Page loaded successfully');
            
        } catch (error) {
            console.error('❌ TabOracle: Error loading page:', error);
            this.showError('Failed to load page: ' + error.message);
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.loadPage(this.currentPage - 1);
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.loadPage(this.currentPage + 1);
        }
    }
    
    toggleOverlay() {
        const isVisible = this.overlayContainer.style.display !== 'none';
        this.overlayContainer.style.display = isVisible ? 'none' : 'block';
        
        const toggleBtn = document.getElementById('toggle-overlay');
        toggleBtn.textContent = isVisible ? 'Show' : 'Hide';
        
        console.log('🔍 TabOracle: Overlay toggled:', isVisible ? 'hidden' : 'visible');
    }
    
    showError(message) {
        if (this.textLayer) {
            this.textLayer.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    max-width: 300px;
                ">
                    <div style="font-weight: bold; margin-bottom: 10px;">PDF Text Layer Error</div>
                    <div>${message}</div>
                </div>
            `;
        }
    }
    
    // Public method to get selected text
    getSelectedText() {
        const selection = window.getSelection();
        return selection.toString().trim();
    }
    
    // Public method to check if text is selected
    hasSelection() {
        const selection = window.getSelection();
        return selection.toString().trim().length > 0;
    }
}

// Initialize PDF text layer overlay when script loads
console.log('🔍 TabOracle: PDF Text Layer script loading...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tabOraclePDFOverlay = new PDFTextLayerOverlay();
    });
} else {
    window.tabOraclePDFOverlay = new PDFTextLayerOverlay();
}

// Export for external access
window.TabOraclePDFOverlay = PDFTextLayerOverlay;
