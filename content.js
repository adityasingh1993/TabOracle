// Content script for TabOracle
(function() {
    'use strict';
    // Prevent multiple injections of this content script (e.g., if also programmatically injected)
    if (window.__TABORACLE_CONTENT_LOADED__) {
        try { console.debug('TabOracle: content.js already initialized, skipping duplicate load'); } catch (_) {}
        return;
    }
    window.__TABORACLE_CONTENT_LOADED__ = true;
    
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
    
    // Explain Me Overlay functionality
    let explainMeOverlay = null;
    let explainMeContent = null;
    let explainMeLoading = null;
    let explainPinned = false;
    let currentExplainRequestId = 0; // prevent stale results overwriting newer ones
    let lastProcessedRequestId = 0; // track the last request that was actually processed

    function createExplainMeOverlay() {
        try {
            console.log('🔍 TabOracle: Creating Explain Me overlay...');
            
            // Guard against duplicate overlays if script runs twice
            const existing = document.getElementById('tab-oracle-explain-overlay');
            if (explainMeOverlay || existing) {
                console.log('🔍 TabOracle: Explain Me overlay already exists');
                explainMeOverlay = existing || explainMeOverlay;
                return;
            }
        
        // Create overlay container with main popup styling
        explainMeOverlay = document.createElement('div');
        explainMeOverlay.id = 'tab-oracle-explain-overlay';
        explainMeOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 999998;
            display: none;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            backdrop-filter: none;
            pointer-events: none; /* allow interacting/scrolling the page beneath */
        `;
        
        // Create content container with main popup styling
        const headerHeight = 44; // keep header height consistent
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            /* Gradient so curved top corners render purple instead of white */
            background: linear-gradient(180deg, #6d28d9 0px, #6d28d9 ${headerHeight}px, rgba(255, 255, 255, 0.95) ${headerHeight}px);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 0;
            width: 800px;
            max-width: 90vw;
            max-height: 85vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0, 0, 0, 0.2);
            border: 0;
            background-clip: padding-box;
            animation: slideInExplain 0.3s ease-out;
            position: relative;
            display: flex;
            flex-direction: column;
            pointer-events: auto; /* panel remains interactive */
        `;
        
        // Create header with new three-column layout styling
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
            color: white;
            padding: 12px 20px;
            position: relative;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4), 0 4px 16px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            overflow: visible;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 20px 20px 0 0;
            margin: 0 0 24px 0;
            height: 44px;
            box-sizing: border-box;
        `;
        
        // Create the TabOracle logo (using SVG icon) - embedded directly in header
        const tabOracleLogo = document.createElement('img');
        const svgUrl = chrome.runtime.getURL('taboracle_combined.svg');
        console.log('TabOracle: Attempting to load SVG from:', svgUrl);
        tabOracleLogo.src = svgUrl;
        tabOracleLogo.alt = 'TabOracle';
        tabOracleLogo.style.cssText = `
            width: 120px;
            height: 40px;
            filter: drop-shadow(0 1px 3px rgba(251, 191, 36, 0.3));
            z-index: 1;
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: block;
            max-width: 100%;
            flex: 0 0 auto;
            margin-right: 8px;
        `;
        
        // Add error handling for SVG loading
        tabOracleLogo.onerror = () => {
            console.error('TabOracle: Failed to load SVG icon:', tabOracleLogo.src);
            // Fallback to text if SVG fails
            tabOracleLogo.style.display = 'none';
            const fallbackText = document.createElement('div');
            fallbackText.textContent = 'TabOracle';
            fallbackText.style.cssText = `
                font-size: 18px;
                color: #fbbf24;
                font-weight: 700;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                letter-spacing: 0.5px;
            `;
            header.appendChild(fallbackText);
        };
        
        // Add load success logging
        tabOracleLogo.onload = () => {
            console.log('TabOracle: SVG icon loaded successfully');
        };
        
        // Create center header section with title and search icon
        const centerHeader = document.createElement('div');
        centerHeader.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            justify-content: center;
            height: 50px;
        `;
        
        // Add search icon
        const searchIcon = document.createElement('div');
        searchIcon.innerHTML = '🔍';
        searchIcon.style.cssText = `
            font-size: 16px;
            color: #fbbf24;
            filter: drop-shadow(0 1px 3px rgba(251, 191, 36, 0.3));
            z-index: 1;
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: searchPulse 2s ease-in-out infinite;
            display: flex;
            align-items: center;
        `;
        
        // Add search icon animation
        const searchAnimationCSS = document.createElement('style');
        searchAnimationCSS.textContent = `
            @keyframes searchPulse {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 1px 3px rgba(251, 191, 36, 0.3)); }
                50% { transform: scale(1.1); filter: drop-shadow(0 2px 6px rgba(251, 191, 36, 0.5)); }
            }
        `;
        document.head.appendChild(searchAnimationCSS);
        
        // Add title text
        const title = document.createElement('h2');
        title.textContent = 'Explain Me';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            z-index: 1;
            position: relative;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            height: 44px;
        `;
        
        // Add shimmer animation
        const shimmerCSS = document.createElement('style');
        shimmerCSS.textContent = `
            @keyframes shimmer {
                0%, 100% { transform: translateX(-100%) rotate(45deg); }
                50% { transform: translateX(100%) rotate(45deg); }
            }
            
            @keyframes slideInExplain {
                0% { 
                    opacity: 0; 
                    transform: translateY(-20px) scale(0.95); 
                }
                100% { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
            
            @keyframes logoGlow {
                0%, 100% { 
                    filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3));
                    transform: scale(1);
                }
                50% { 
                    filter: drop-shadow(0 4px 16px rgba(139, 92, 246, 0.6));
                    transform: scale(1.08);
                }
            }
        `;
        document.head.appendChild(shimmerCSS);
        
        // Create close button (right side)
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            z-index: 1;
        `;
        
        // Add hover effects to close button
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.transform = 'scale(1.1)';
            closeButton.style.color = '#fbbf24';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.color = 'white';
        });
        
        // Add close button functionality with simple debounce
        let closeInProgress = false;
        closeButton.addEventListener('click', () => {
            if (closeInProgress) return;
            closeInProgress = true;
            hideExplainMe();
            setTimeout(() => { closeInProgress = false; }, 250);
        });

        // Create pin button (dock/undock to sidebar)
        const pinButton = document.createElement('button');
        pinButton.title = 'Pin to sidebar';
        pinButton.textContent = '📌';
        pinButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            z-index: 1;
            margin-right: 8px;
            opacity: 0.9;
        `;

        function setExplainPinned(pinned) {
            explainPinned = pinned;
            if (pinned) {
                // Make overlay draggable and position it as a floating panel
                explainMeOverlay.style.background = 'transparent';
                explainMeOverlay.style.alignItems = 'flex-start';
                explainMeOverlay.style.justifyContent = 'flex-end';
                contentContainer.style.position = 'fixed';
                contentContainer.style.top = '20px';
                contentContainer.style.right = '20px';
                contentContainer.style.height = 'calc(100vh - 40px)';
                contentContainer.style.width = '360px';
                contentContainer.style.maxWidth = '360px';
                contentContainer.style.borderRadius = '12px';
                contentContainer.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(139, 92, 246, 0.1)';
                contentContainer.style.cursor = 'move';
                contentContainer.style.userSelect = 'none';
                
                // Add draggable functionality
                makeDraggable(contentContainer);
                
                // Condense header
                header.style.height = '40px';
                header.style.padding = '8px 12px';
                header.style.boxShadow = 'none';
                header.style.background = '#6d28d9';
                header.style.borderRadius = '12px 12px 0 0';
                // Show larger logo in pinned mode for better brand visibility
                tabOracleLogo.style.display = 'block';
                tabOracleLogo.style.width = '120px';
                tabOracleLogo.style.height = '40px';
                // Tighten center header
                centerHeader.style.gap = '8px';
                title.style.fontSize = '18px';
                // Reduce content padding
                contentWrapper.style.padding = '16px';
                // Adjust scroll area height for pinned header
                explainMeContent.style.maxHeight = 'calc(100vh - 40px - 16px - 16px)';
            } else {
                // Restore centered dialog
                explainMeOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
                explainMeOverlay.style.alignItems = 'center';
                explainMeOverlay.style.justifyContent = 'center';
                contentContainer.style.position = 'relative';
                contentContainer.style.top = '';
                contentContainer.style.right = '';
                contentContainer.style.height = '';
                contentContainer.style.width = '800px';
                contentContainer.style.maxWidth = '90vw';
                contentContainer.style.borderRadius = '20px';
                contentContainer.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0, 0, 0, 0.2)';
                contentContainer.style.cursor = 'default';
                contentContainer.style.userSelect = 'auto';
                contentContainer.style.transform = 'none';
                
                // Remove draggable functionality
                removeDraggable(contentContainer);
                
                // Restore header
                header.style.height = '44px';
                header.style.padding = '12px 20px';
                header.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4), 0 4px 16px rgba(0, 0, 0, 0.15)';
                header.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)';
                header.style.borderRadius = '20px 20px 0 0';
                // Show larger logo in unpinned mode for better brand visibility
                tabOracleLogo.style.display = 'block';
                tabOracleLogo.style.width = '140px';
                tabOracleLogo.style.height = '47px';
                centerHeader.style.gap = '12px';
                title.style.fontSize = '18px';
                contentWrapper.style.padding = '32px';
                explainMeContent.style.maxHeight = 'calc(85vh - 100px)';
            }
            pinButton.title = pinned ? 'Unpin from sidebar' : 'Pin to sidebar';
        }

        pinButton.addEventListener('mouseenter', () => {
            pinButton.style.transform = 'scale(1.1)';
            pinButton.style.color = '#fbbf24';
        });
        pinButton.addEventListener('mouseleave', () => {
            pinButton.style.transform = 'scale(1)';
            pinButton.style.color = 'white';
        });
        // Debounce pin toggling to avoid rapid double toggles
        let pinToggleInProgress = false;
        pinButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (pinToggleInProgress) return;
            pinToggleInProgress = true;
            setExplainPinned(!explainPinned);
            setTimeout(() => { pinToggleInProgress = false; }, 250);
        });
        
        // Assemble header
        centerHeader.appendChild(title);
        centerHeader.appendChild(searchIcon);
        
        header.appendChild(tabOracleLogo);
        header.appendChild(centerHeader);
        const rightControls = document.createElement('div');
        rightControls.style.cssText = 'display:flex; align-items:center; gap:6px;';
        rightControls.appendChild(pinButton);
        rightControls.appendChild(closeButton);
        header.appendChild(rightControls);
        
        // Selected text display removed for cleaner UI
        
        // Create loading state with main popup styling
        explainMeLoading = document.createElement('div');
        explainMeLoading.id = 'explain-loading';
        explainMeLoading.style.cssText = `
            display: none;
            text-align: center;
            padding: 40px 20px;
        `;
        
        const loadingSpinner = document.createElement('div');
        loadingSpinner.innerHTML = `
            <img src="${chrome.runtime.getURL('taboracle_icon_only.svg')}" 
                 alt="TabOracle" 
                 style="
                     width: 80px;
                     height: 80px;
                     animation: logoGlow 2s infinite;
                 "
                 onerror="this.style.display='none'; this.parentElement.innerHTML='✨';">
        `;
        loadingSpinner.style.cssText = `
            margin-bottom: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const loadingText = document.createElement('div');
        loadingText.textContent = 'AI is analyzing your text...';
        loadingText.style.cssText = `
            font-size: 18px;
            color: #6d28d9;
            margin-bottom: 8px;
            font-weight: 600;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        `;
        
        const loadingSubtext = document.createElement('div');
        loadingSubtext.textContent = 'This may take a few seconds';
        loadingSubtext.style.cssText = `
            font-size: 14px;
            color: #6b7280;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        `;
        
        explainMeLoading.appendChild(loadingSpinner);
        explainMeLoading.appendChild(loadingText);
        explainMeLoading.appendChild(loadingSubtext);
        
        // Create content area with main popup styling
        explainMeContent = document.createElement('div');
        explainMeContent.id = 'explain-content';
        explainMeContent.style.cssText = `
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            line-height: 1.7;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            color: #374151;
            padding: 0;
            margin: 0;
        `;
        
        // Create content wrapper for proper padding
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            padding: 24px;
            padding-top: 0;
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
        `;
        
        // Add elements to DOM
        contentContainer.appendChild(header);
        contentWrapper.appendChild(explainMeLoading);
        contentWrapper.appendChild(explainMeContent);
        contentContainer.appendChild(contentWrapper);
        explainMeOverlay.appendChild(contentContainer);
        document.body.appendChild(explainMeOverlay);
        
        // Debug: Check if elements were created properly
        console.log('🔍 TabOracle: Overlay created successfully');
        
        // Add event listeners
        // Note: overlay is non-interactive to allow page scrolling; close with X or Escape.
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && explainMeOverlay.style.display !== 'none') {
                hideExplainMe();
            }
        });
        
        console.log('✅ TabOracle: Explain Me overlay created successfully');
    } catch (error) {
        console.error('❌ TabOracle: Error creating Explain Me overlay:', error);
    }
}

    function showExplainMe(selectedText) {
        try {
            console.log('🔍 TabOracle: Showing Explain Me overlay for text:', selectedText ? selectedText.substring(0, 100) + '...' : 'NO TEXT');
            
            if (!explainMeOverlay) {
                console.log('🔍 TabOracle: Creating Explain Me overlay...');
                createExplainMeOverlay();
            }
            
            // Show overlay and clear any previous content
            if (explainMeOverlay) {
                explainMeOverlay.style.display = 'flex';
                console.log('✅ TabOracle: Explain Me overlay displayed');
                
                // Reset explain me state completely
                resetExplainMeState();
                
                // Start AI explanation
                generateExplanation(selectedText);
            } else {
                console.error('❌ TabOracle: explainMeOverlay not available');
            }
        } catch (error) {
            console.error('❌ TabOracle: Error in showExplainMe:', error);
        }
    }



    function hideExplainMe() {
        if (explainMeOverlay) {
            explainMeOverlay.style.display = 'none';
            console.log('🔍 TabOracle: Explain Me overlay hidden');
        }
        // Reset state when hiding
        lastProcessedRequestId = 0;
    }
    
    // Make an element draggable
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        function dragStart(e) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === element || element.contains(e.target)) {
                isDragging = true;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                // Allow dragging anywhere on screen (no viewport constraints)
                setTranslate(currentX, currentY, element);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        // Mouse events
        element.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);

        // Touch events for mobile
        element.addEventListener("touchstart", dragStart, { passive: false });
        document.addEventListener("touchmove", drag, { passive: false });
        document.addEventListener("touchend", dragEnd);

        // Prevent text selection while dragging
        element.addEventListener("selectstart", (e) => e.preventDefault());
    }
    
    // Remove draggable functionality from an element
    function removeDraggable(element) {
        // Remove all event listeners by cloning and replacing the element
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
        
        // Restore the content and styling
        newElement.innerHTML = element.innerHTML;
        newElement.className = element.className;
        newElement.id = element.id;
        
        return newElement;
    }
    
    function resetExplainMeState() {
        // Reset all explain me state variables
        lastProcessedRequestId = 0;
        if (explainMeContent) {
            explainMeContent.innerHTML = '';
            explainMeContent.style.display = 'none';
        }
        if (explainMeLoading) {
            explainMeLoading.style.display = 'none';
        }
        console.log('🔄 TabOracle: Explain Me state reset');
    }

    async function generateExplanation(selectedText) {
        try {
            // Resolve latest selection if none provided
            if (!selectedText || (typeof selectedText === 'string' && selectedText.trim() === '')) {
                try {
                    selectedText = (window.getSelection && window.getSelection().toString()) || '';
                    selectedText = selectedText ? selectedText.trim() : '';
                } catch (_) { selectedText = ''; }
            }

            // Track this request to avoid race conditions
            const requestId = ++currentExplainRequestId;

            // Show loading state and clear previous content
            if (explainMeLoading) {
                explainMeLoading.style.display = 'block';
            }
            if (explainMeContent) {
                explainMeContent.style.display = 'none';
                explainMeContent.innerHTML = '';
                // Force a longer delay to ensure content is cleared and DOM is updated
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Double-check that we're still the current request
            if (requestId !== currentExplainRequestId) {
                console.log('ℹ️ TabOracle: Request superseded during clearing, aborting');
                return;
            }
            
            // Create enhanced prompt for explanation
            const prompt = `You are an expert educator and explainer. Your task is to explain the following text in a clear, comprehensive, and engaging way.

Please provide an explanation with these EXACT section headers:

Summary
A brief overview in simple terms

Key Concepts
Break down the main ideas and concepts

Context
Provide background information if relevant

Examples
Give practical examples or analogies when helpful

Why It Matters
Explain the significance or importance

Text to explain:
"${selectedText}"

IMPORTANT: 
- Use the EXACT section headers: Summary, Key Concepts, Context, Examples, Why It Matters
- Write each section header on its own line (no bullet points for headers)
- Provide clear spacing between sections
- Keep the response clean and readable
- Do not include role prefixes or technical markup`;

            // Try multiple AI approaches (same as popup.js)
            let explanation = null;
            let aiSource = 'None';
            
            // Method 1: Chrome Language Model API
            if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
                try {
                    console.log('🔍 TabOracle: Trying Chrome Language Model API...');
                    const languageModel = await chrome.languageModel.create();
                    const response = await languageModel.prompt(prompt);
                    let rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                    
                    // Clean the response
                    explanation = cleanAIResponse(rawResponse);
                    aiSource = 'Chrome Language Model API';
                    console.log('✅ TabOracle: Successfully used Chrome Language Model API');
                } catch (error) {
                    console.warn('⚠️ TabOracle: Chrome Language Model API failed:', error);
                }
            }
            
            // Method 2: Global LanguageModel
            if (!explanation && typeof LanguageModel !== 'undefined' && LanguageModel.create) {
                try {
                    console.log('🔍 TabOracle: Trying Global LanguageModel...');
                    const languageModel = await LanguageModel.create();
                    const response = await languageModel.prompt(prompt);
                    let rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                    
                    // Clean the response
                    explanation = cleanAIResponse(rawResponse);
                    aiSource = 'Global LanguageModel';
                    console.log('✅ TabOracle: Successfully used Global LanguageModel');
                } catch (error) {
                    console.warn('⚠️ TabOracle: Global LanguageModel failed:', error);
                }
            }
            
            // Method 3: Window LanguageModel
            if (!explanation && typeof window !== 'undefined' && window.LanguageModel && window.LanguageModel.create) {
                try {
                    console.log('🔍 TabOracle: Trying Window LanguageModel...');
                    const languageModel = await window.LanguageModel.create();
                    const response = await languageModel.prompt(prompt);
                    let rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                    
                    // Clean the response
                    explanation = cleanAIResponse(rawResponse);
                    aiSource = 'Window LanguageModel';
                    console.log('✅ TabOracle: Successfully used Window LanguageModel');
                } catch (error) {
                    console.warn('⚠️ TabOracle: Window LanguageModel failed:', error);
                }
            }
            
            // Method 4: GlobalThis LanguageModel
            if (!explanation && typeof globalThis !== 'undefined' && globalThis.LanguageModel && globalThis.LanguageModel.create) {
                try {
                    console.log('🔍 TabOracle: Trying GlobalThis LanguageModel...');
                    const languageModel = await globalThis.LanguageModel.create();
                    const response = await languageModel.prompt(prompt);
                    let rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                    
                    // Clean the response
                    explanation = cleanAIResponse(rawResponse);
                    aiSource = 'GlobalThis LanguageModel';
                    console.log('✅ TabOracle: Successfully used GlobalThis LanguageModel');
                } catch (error) {
                    console.warn('⚠️ TabOracle: GlobalThis LanguageModel failed:', error);
                }
            }
            
            // Method 5: Check if we can access popup's AI through runtime messaging
            if (!explanation) {
                try {
                    console.log('🔍 TabOracle: Trying to use popup AI through runtime messaging...');
                    const response = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: 'generateAIExplanation',
                            prompt: prompt,
                            selectedText: selectedText
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    
                    if (response && response.success && response.explanation) {
                        explanation = cleanAIResponse(response.explanation);
                        aiSource = 'Popup AI (Runtime Messaging)';
                        console.log('✅ TabOracle: Successfully used popup AI through runtime messaging');
                    }
                } catch (error) {
                    console.warn('⚠️ TabOracle: Runtime messaging to popup AI failed:', error);
                }
            }
            
            // Log AI source used
            if (explanation && aiSource !== 'None') {
                console.log(`🎯 TabOracle: AI explanation generated using: ${aiSource}`);
            }
            
            // Fallback: Use intelligent text analysis
            if (!explanation) {
                console.log('🔍 TabOracle: No AI available, using intelligent fallback analysis');
                if (typeof generateFallbackExplanation === 'function') {
                    explanation = generateFallbackExplanation(selectedText);
                    // Add AI status information to fallback (simplified since it's shown in header)
                    explanation += `\n\n**Analysis Method**: This explanation was generated using intelligent text analysis since no AI models were available.`;
                } else {
                    explanation = 'Sorry, I encountered an error while generating the explanation. Please try again.';
                }
            }
            
            // Only display if this is the latest request and we haven't processed it yet
            if (requestId === currentExplainRequestId && requestId > lastProcessedRequestId) {
                console.log('✅ TabOracle: Displaying fresh explanation result (requestId:', requestId, ')');
                lastProcessedRequestId = requestId;
                // Display explanation with AI status
                if (typeof displayExplanation === 'function') {
                    displayExplanation(explanation, aiSource);
                } else {
                    console.error('❌ TabOracle: displayExplanation function not available');
                }
            } else {
                console.log('ℹ️ TabOracle: Stale explain result ignored (requestId:', requestId, 'current:', currentExplainRequestId, 'lastProcessed:', lastProcessedRequestId, ')');
            }
            
        } catch (error) {
            console.error('❌ TabOracle: Explanation generation failed:', error);
            if (typeof displayExplanation === 'function') {
                const errorMessage = `Sorry, I encountered an error while generating the explanation: ${error.message}\n\nPlease try again or check the console for more details.`;
                // Only show error if latest
                if (currentExplainRequestId === (currentExplainRequestId|0)) {
                    displayExplanation(errorMessage, 'None');
                }
            } else {
                console.error('❌ TabOracle: displayExplanation function not available for error display');
            }
        }
    }

    function generateFallbackExplanation(text) {
        // Simple fallback explanation using text analysis
        const words = text.split(/\s+/).filter(w => w.length > 2);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        let explanation = `## Simple Summary\n`;
        explanation += `This text contains ${words.length} words and ${sentences.length} sentences. `;
        
        if (sentences.length > 0) {
            explanation += `Here's what it's about:\n\n`;
            explanation += `**Main Points:**\n`;
            sentences.slice(0, 3).forEach((sentence, index) => {
                explanation += `${index + 1}. ${sentence.trim()}\n`;
            });
        }
        
        explanation += `\n**Content Analysis:**\n`;
        explanation += `• **Length**: ${words.length} words (estimated reading time: ${Math.max(1, Math.ceil(words.length / 200))} minute${words.length > 200 ? 's' : ''})\n`;
        explanation += `• **Complexity**: ${words.length > 100 ? 'Detailed' : 'Brief'} content\n`;
        
        // Try to identify content type
        const lowerText = text.toLowerCase();
        if (lowerText.includes('research') || lowerText.includes('study') || lowerText.includes('paper')) {
            explanation += `• **Type**: Research or academic content\n`;
        } else if (lowerText.includes('documentation') || lowerText.includes('api') || lowerText.includes('guide')) {
            explanation += `• **Type**: Documentation or guide\n`;
        } else if (lowerText.includes('news') || lowerText.includes('article')) {
            explanation += `• **Type**: News or article\n`;
        }
        
        explanation += `\n*Note: This is a basic analysis. For more detailed explanations, try enabling AI features in your browser.*`;
        
        return explanation;
    }

    function displayExplanation(explanation, aiSource = 'None') {
        // Hide loading
        if (explainMeLoading) {
            explainMeLoading.style.display = 'none';
        }
        if (explainMeContent) {
            explainMeContent.style.display = 'block';
            
            // Create unified explanation display
            let displayContent = '';
            
            // Add AI status header with main popup styling
            if (aiSource !== 'None') {
                // Lightweight AI badge with generic label
                displayContent += `
                    <div style="
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 10px;
                        border-radius: 12px;
                        background: rgba(109, 40, 217, 0.08);
                        color: #6d28d9;
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        border: 1px solid rgba(109, 40, 217, 0.15);
                    ">🤖 <span>AI Generated</span></div>
                `;
            } else {
                displayContent += `
                    <div style="
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 10px;
                        border-radius: 12px;
                        background: rgba(245, 158, 11, 0.1);
                        color: #92400e;
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        border: 1px solid rgba(245, 158, 11, 0.25);
                    ">
                        📊 <span>Intelligent Text Analysis</span>
                    </div>
                `;
                
                // Leaner enable instructions
                displayContent += `
                    <div style="
                        background: rgba(109, 40, 217, 0.04);
                        border: 1px dashed rgba(109, 40, 217, 0.25);
                        border-radius: 10px;
                        padding: 12px;
                        margin-bottom: 14px;
                    ">
                        <div style="margin: 0; color: #4b5563; font-size: 12px; line-height: 1.5;">
                            Enable on-device model for AI explanations: chrome://flags/#enable-language-model-api
                        </div>
                    </div>
                `;
            }
            
            // Add the main explanation content
            const formattedExplanation = formatExplanation(explanation);
            displayContent += formattedExplanation;
            // Disclaimer for AI generated explanations
            displayContent += `
                <div style="
                    margin-top: 16px; 
                    padding: 12px 16px;
                    background: rgba(139, 92, 246, 0.05);
                    border: 1px solid rgba(139, 92, 246, 0.15);
                    border-radius: 8px;
                    font-size: 12px; 
                    color: #6b7280;
                    font-style: italic;
                    margin-bottom: 16px;
                ">
                    ⚠️ AI Generated content may be inaccurate. Please verify important information.
                </div>
                
                <!-- Review Request -->
                <div style="
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    margin-top: 16px;
                ">
                    <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">
                        🎉 Enjoying TabOracle?
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                        Help others discover this extension by leaving a review!
                    </div>
                    <button id="explainMeReviewButton" style="
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
                    <button id="explainMeSupportButton" style="
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
            `;
            
            explainMeContent.innerHTML = displayContent;
            
            // Add inline handlers for the buttons
            addInlineHandlers();
        }
    }

    function formatExplanation(text) {
        if (!text || typeof text !== 'string') {
            return '<div style="color: #ef4444; font-style: italic; text-align: center; padding: 20px;">No explanation available.</div>';
        }

        // Clean the text first - remove any garbage characters and normalize
        let cleanedText = text
            // Remove common AI response artifacts
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/^\s*AI:\s*/gi, '') // Remove AI prefixes
            .replace(/^\s*Assistant:\s*/gi, '') // Remove Assistant prefixes
            .replace(/^\s*User:\s*/gi, '') // Remove User prefixes
            .replace(/^\s*Human:\s*/gi, '') // Remove Human prefixes
            .replace(/^\s*Bot:\s*/gi, '') // Remove Bot prefixes
            .replace(/^\s*System:\s*/gi, '') // Remove System prefixes
            .replace(/^\s*[A-Za-z]+:\s*/gi, '') // Remove any other role prefixes
            .replace(/\n\s*[A-Za-z]+:\s*/gi, '\n') // Remove role prefixes in middle of text
            .replace(/^\s*[-*]\s*/gm, '• ') // Convert markdown list markers to bullet points
            .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered list markers
            .replace(/^\s*•\s*/gm, '• ') // Ensure bullet points start properly
            .replace(/^\s*(\d+\.)\s*/gm, '$1 ') // Ensure numbered points start properly
            .trim(); // Remove leading/trailing whitespace

        // Apply enhanced formatting in separate steps to avoid syntax errors
        // Enhanced inline code
        cleanedText = cleanedText.replace(/`([^`]+)`/g, '<code style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08)); padding: 3px 8px; border-radius: 6px; color: #6d28d9; font-family: monospace; font-size: 13px; border: 1px solid rgba(139, 92, 246, 0.2); font-weight: 500;">$1</code>');
        
        // Enhanced bold text
        cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937; font-weight: 700; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.08)); padding: 3px 8px; border-radius: 6px; border-left: 4px solid #8b5cf6; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);">$1</strong>');
        
        // Enhanced italic text
        cleanedText = cleanedText.replace(/\*(.*?)\*/g, '<em style="color: #4b5563; font-style: italic; font-weight: 500;">$1</em>');
        
        // Enhanced key phrases and concepts
        cleanedText = cleanedText.replace(/\b(key concept|main point|important|crucial|essential|critical|primary|fundamental|core|central|key|main|major|significant)\b/gi, '<strong style="color: #1f2937; font-weight: 700; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08)); padding: 4px 10px; border-radius: 8px; border-left: 4px solid #8b5cf6; box-shadow: 0 3px 6px rgba(139, 92, 246, 0.15); display: inline-block; margin: 2px 0;">$1</strong>');
        
        // Enhanced section headers (Summary, Key Concepts, Examples, Context, Why It Matters)
        // Target section headers that are on their own line (without bullet points)
        cleanedText = cleanedText.replace(/^Summary$/gm, '<div style="margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08)); border-radius: 12px; border-left: 5px solid #8b5cf6; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);"><strong style="color: #1f2937; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Summary</strong></div>');
        cleanedText = cleanedText.replace(/^Key Concepts$/gm, '<div style="margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08)); border-radius: 12px; border-left: 5px solid #8b5cf6; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);"><strong style="color: #1f2937; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Key Concepts</strong></div>');
        cleanedText = cleanedText.replace(/^Context$/gm, '<div style="margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08)); border-radius: 12px; border-left: 5px solid #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);"><strong style="color: #1f2937; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Context</strong></div>');
        cleanedText = cleanedText.replace(/^Examples$/gm, '<div style="margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.08)); border-radius: 12px; border-left: 5px solid #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);"><strong style="color: #1f2937; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Examples</strong></div>');
        cleanedText = cleanedText.replace(/^Why It Matters$/gm, '<div style="margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08)); border-radius: 12px; border-left: 5px solid #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);"><strong style="color: #1f2937; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Why It Matters</strong></div>');
        
        // Enhanced technical terms
        cleanedText = cleanedText.replace(/\b(definition|concept|principle|theory|method|technique|approach|strategy|framework|model|system|process|function|algorithm|protocol|standard|specification)\b/gi, '<strong style="color: #1f2937; font-weight: 600; background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.08)); padding: 3px 8px; border-radius: 6px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">$1</strong>');
        
        // Enhanced H3 headings
        cleanedText = cleanedText.replace(/^##\s*(.*?)$/gm, '<h3 style="color: #1f2937; margin: 32px 0 16px 0; font-size: 20px; font-weight: 700; border-bottom: 3px solid rgba(139, 92, 246, 0.25); padding-bottom: 12px; position: relative;"><span style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">$1</span></h3>');
        
        // Enhanced H2 headings
        cleanedText = cleanedText.replace(/^#\s*(.*?)$/gm, '<h2 style="color: #1f2937; margin: 40px 0 20px 0; font-size: 24px; font-weight: 800; position: relative; padding-left: 16px;"><span style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">$1</span><div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 24px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 2px;"></div></h2>');
        
        // Enhanced paragraph breaks
        cleanedText = cleanedText.replace(/\n\s*\n/g, '</p><p style="margin: 24px 0; line-height: 1.8; color: #374151; font-size: 16px; font-weight: 400; letter-spacing: 0.01em;">');
        
        // Enhanced bullet points
        cleanedText = cleanedText.replace(/\n•\s*/g, '</p><p style="margin: 16px 0; line-height: 1.7; color: #374151; font-size: 15px; padding-left: 20px; border-left: 4px solid rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.02); border-radius: 0 8px 8px 0; padding: 12px 16px 12px 20px; position: relative;"><span style="color: #8b5cf6; font-weight: 600; margin-right: 8px;">•</span>');
        
        // Enhanced numbered points
        cleanedText = cleanedText.replace(/\n(\d+\.)\s*/g, '</p><p style="margin: 16px 0; line-height: 1.7; color: #374151; font-size: 15px; padding-left: 20px; border-left: 4px solid rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.02); border-radius: 0 8px 8px 0; padding: 12px 16px 12px 20px; position: relative;"><span style="color: #3b82f6; font-weight: 600; margin-right: 8px;">$1</span>');

        // Wrap in paragraph tags with enhanced styling
        cleanedText = '<p style="margin: 24px 0; line-height: 1.8; color: #374151; font-size: 16px; font-weight: 400; letter-spacing: 0.01em;">' + cleanedText + '</p>';

        // Clean up any empty paragraphs
        cleanedText = cleanedText
            .replace(/<p[^>]*>\s*<\/p>/g, '') // Remove empty paragraphs
            .replace(/<p[^>]*>\s*•\s*<\/p>/g, '') // Remove empty bullet points
            .replace(/<p[^>]*>\s*\d+\.\s*<\/p>/g, ''); // Remove empty numbered points

        // Enhanced container styling with better visual appeal
        return `
            <div style="
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.98));
                backdrop-filter: blur(20px);
                border: 1px solid rgba(139, 92, 246, 0.15);
                border-radius: 16px;
                padding: 32px;
                box-shadow: 
                    0 10px 40px rgba(139, 92, 246, 0.12),
                    0 4px 16px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                max-width: 100%;
                word-wrap: break-word;
                overflow-wrap: break-word;
                position: relative;
            ">
                <!-- Decorative gradient border -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9);
                    border-radius: 16px 16px 0 0;
                "></div>
                
                <!-- Transparent TabOracle logo watermark -->
                <div style="
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    opacity: 0.25;
                    pointer-events: none;
                    z-index: 10;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid rgba(139, 92, 246, 0.1);
                ">
                    <img src="${chrome.runtime.getURL('taboracle_combined.svg')}" 
                         alt="TabOracle" 
                         style="
                             width: 80px;
                             height: 27px;
                             filter: grayscale(100%) brightness(0.5);
                             display: block;
                         "
                         onerror="
                             console.error('Watermark image failed to load, showing text fallback');
                             this.style.display='none';
                             this.nextElementSibling.style.display='block';
                         "
                         onload="console.log('Watermark image loaded successfully');">
                    <!-- Text fallback watermark -->
                    <div style="
                        display: none;
                        font-family: 'Inter', sans-serif;
                        font-size: 12px;
                        font-weight: 600;
                        color: rgba(139, 92, 246, 0.6);
                        text-align: center;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    ">TabOracle</div>
                </div>
                
                ${cleanedText}
            </div>
        `;
    }

    function cleanAIResponse(text) {
        if (!text || typeof text !== 'string') {
            return 'No explanation available.';
        }

        // Remove common AI response artifacts and clean the text
        let cleanedText = text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
            .replace(/^\s*AI:\s*/gi, '') // Remove AI prefixes
            .replace(/^\s*Assistant:\s*/gi, '') // Remove Assistant prefixes
            .replace(/^\s*User:\s*/gi, '') // Remove User prefixes
            .replace(/^\s*Human:\s*/gi, '') // Remove Human prefixes
            .replace(/^\s*Bot:\s*/gi, '') // Remove Bot prefixes
            .replace(/^\s*System:\s*/gi, '') // Remove System prefixes
            .replace(/^\s*[A-Za-z]+:\s*/gi, '') // Remove any other role prefixes
            .replace(/\n\s*[A-Za-z]+:\s*/gi, '\n') // Remove role prefixes in middle of text
            .replace(/^\s*[-*]\s*/gm, '• ') // Convert markdown list markers to bullet points
            .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered list markers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
            .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
            .replace(/^##\s*(.*?)$/gm, '$1') // Remove H3 markers
            .replace(/^#\s*(.*?)$/gm, '$1') // Remove H2 markers
            .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
            .replace(/\n•\s*/g, '\n• ') // Ensure bullet points are properly formatted
            .replace(/\n(\d+\.)\s*/g, '\n$1 ') // Ensure numbered points are properly formatted
            .replace(/^\s*•\s*/gm, '• ') // Ensure bullet points start properly
            .replace(/^\s*(\d+\.)\s*/gm, '$1 ') // Ensure numbered points start properly
            .replace(/[^\w\s•\-\.,!?;:()]/g, '') // Remove any other special characters
            .trim(); // Remove leading/trailing whitespace

        return cleanedText;
    }
    
    // Review and support button functionality for Explain Me
    function setupExplainMeButtons() {
        // Use event delegation to handle dynamically created buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'explainMeReviewButton') {
                handleReviewButtonClick();
            }
            
            if (e.target.id === 'explainMeSupportButton') {
                handleSupportButtonClick();
            }
        });
    }
    
    // Handle review button click
    function handleReviewButtonClick() {
        try {
            const extensionId = chrome.runtime.id;
            const reviewUrl = `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
            chrome.tabs.create({ url: reviewUrl });
            console.log('🎯 TabOracle: User clicked Explain Me review button');
        } catch (error) {
            console.error('❌ TabOracle: Error opening review URL:', error);
            // Fallback: try to open a generic review page
            try {
                window.open('https://chrome.google.com/webstore/detail/taboracle-ai-powered-tab-intelligence/reviews', '_blank');
            } catch (fallbackError) {
                console.error('❌ TabOracle: Fallback also failed:', fallbackError);
            }
        }
    }
    
    // Handle support button click
    function handleSupportButtonClick() {
        try {
            const supportUrl = 'https://buymeacoffee.com/adityas';
            chrome.tabs.create({ url: supportUrl });
            console.log('🎯 TabOracle: User clicked Explain Me support button');
        } catch (error) {
            console.error('❌ TabOracle: Error opening support URL:', error);
            // Fallback: try to open support page in new window
            try {
                window.open(supportUrl, '_blank');
            } catch (fallbackError) {
                console.error('❌ TabOracle: Support fallback also failed:', fallbackError);
            }
        }
    }
    
    // Initialize button functionality
    setupExplainMeButtons();
    
    // Also add inline onclick handlers as backup
    function addInlineHandlers() {
        // This will be called after content is displayed
        setTimeout(() => {
            const reviewBtn = document.getElementById('explainMeReviewButton');
            const supportBtn = document.getElementById('explainMeSupportButton');
            
            if (reviewBtn) {
                reviewBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReviewButtonClick();
                };
            }
            
            if (supportBtn) {
                supportBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSupportButtonClick();
                };
            }
        }, 100);
    }

    // Message listener for Explain Me feature
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('🔍 TabOracle: Message received:', message);
        console.log('🔍 TabOracle: Sender:', sender);
        console.log('🔍 TabOracle: Message type:', typeof message);
        console.log('🔍 TabOracle: Message keys:', Object.keys(message));
        
        if (message.action === 'showExplainMe') {
            try {
                console.log('🔍 TabOracle: Processing Explain Me request...');
                
                // Check if we're on a restricted page (chrome://, about:, etc.)
                const currentUrl = window.location.href;
                const isRestrictedPage = currentUrl.startsWith('chrome://') || 
                                       currentUrl.startsWith('about:') || 
                                       currentUrl.startsWith('chrome-extension://') ||
                                       currentUrl.startsWith('moz-extension://') ||
                                       currentUrl.startsWith('edge://') ||
                                       currentUrl.startsWith('brave://');
                
                if (isRestrictedPage) {
                    console.warn('⚠️ TabOracle: Explain Me not available on restricted page:', currentUrl);
                    sendResponse({ 
                        success: false, 
                        error: 'Explain Me is not available on this type of page (browser settings, extensions, etc.)',
                        isRestrictedPage: true,
                        suggestion: 'Try selecting text on a regular webpage'
                    });
                    return;
                }
                
                console.log('🔍 TabOracle: Message selectedText:', message.selectedText);
                console.log('🔍 TabOracle: Message selectedText type:', typeof message.selectedText);
                console.log('🔍 TabOracle: Message selectedText length:', message.selectedText ? message.selectedText.length : 'undefined');
                console.log('🔍 TabOracle: Message selectedText trimmed:', message.selectedText ? message.selectedText.trim() : 'undefined');
                
                // Check if we're on a PDF page and have PDF overlay
                const isPDFPage = window.location.href.toLowerCase().includes('.pdf') || 
                                 document.contentType === 'application/pdf';
                
                let selectedText = message.selectedText;
                
                if (!selectedText || selectedText.trim() === '') {
                    console.warn('⚠️ TabOracle: No selected text in message, trying to get from page selection');
                    
                    if (isPDFPage && window.tabOraclePDFOverlay) {
                        // Try to get text from PDF overlay first
                        console.log('🔍 TabOracle: PDF page detected, checking PDF overlay for selection');
                        selectedText = window.tabOraclePDFOverlay.getSelectedText();
                        console.log('🔍 TabOracle: PDF overlay selection:', selectedText ? selectedText.substring(0, 100) + '...' : 'NO TEXT');
                    }
                    
                    // Fallback to regular page selection
                    if (!selectedText || selectedText.trim() === '') {
                        selectedText = window.getSelection().toString().trim();
                        console.log('🔍 TabOracle: Got selected text from page:', selectedText ? selectedText.substring(0, 100) + '...' : 'NO TEXT');
                    }
                }
                
                if (selectedText && selectedText.trim() !== '') {
                    console.log('✅ TabOracle: Valid text found, calling showExplainMe');
                    showExplainMe(selectedText);
                    sendResponse({ success: true, textLength: selectedText.length });
                } else {
                    console.error('❌ TabOracle: No text selected on page');
                    
                    // If on PDF page, suggest setting up PDF overlay
                    if (isPDFPage) {
                        console.log('🔍 TabOracle: PDF page detected but no text selected, suggesting PDF overlay setup');
                        sendResponse({ 
                            success: false, 
                            error: 'No text selected on page. PDF text layer may not be active.',
                            isPDFPage: true,
                            suggestion: 'Try setting up PDF text layer overlay'
                        });
                    } else {
                        sendResponse({ success: false, error: 'No text selected on page' });
                    }
                }
            } catch (error) {
                console.error('❌ TabOracle: Error processing Explain Me request:', error);
                sendResponse({ success: false, error: error.message });
            }
        } else if (message.action === 'test') {
            // Simple test message to verify content script is working
            console.log('✅ TabOracle: Content script test message received');
            sendResponse({ success: true, message: 'Content script is working!' });
        } else if (message.action === 'debug') {
            // Debug message to test text display
            console.log('🔍 TabOracle: Debug message received:', message);
            if (message.testText) {
                console.log('🔍 TabOracle: Testing with text:', message.testText);
                showExplainMe(message.testText);
                sendResponse({ success: true, message: 'Debug text displayed' });
            } else {
                sendResponse({ success: false, error: 'No test text provided' });
            }
        } else if (message.action === 'setupPDFTextLayer') {
            // Setup PDF text layer overlay
            console.log('🔍 TabOracle: Setting up PDF text layer overlay...');
            
            // Use async IIFE to handle async operations
            (async () => {
                try {
                    // Check if we're on a PDF page
                    const isPDFPage = window.location.href.toLowerCase().includes('.pdf') || 
                                     document.contentType === 'application/pdf';
                    
                    if (!isPDFPage) {
                        sendResponse({ success: false, error: 'Not a PDF page' });
                        return;
                    }
                    
                    // Check if PDF overlay already exists
                    if (window.tabOraclePDFOverlay) {
                        console.log('✅ TabOracle: PDF overlay already exists');
                        sendResponse({ success: true, message: 'PDF overlay already active' });
                        return;
                    }
                    
                    // Inject PDF.js if not already available
                    if (typeof pdfjsLib === 'undefined') {
                        console.log('🔍 TabOracle: Injecting PDF.js library...');
                        const script = document.createElement('script');
                        script.src = chrome.runtime.getURL('vendor/pdfjs/pdf.min.js');
                        document.head.appendChild(script);
                        
                        // Wait for PDF.js to load
                        await new Promise((resolve) => {
                            script.onload = resolve;
                            setTimeout(resolve, 2000); // Timeout after 2 seconds
                        });
                    }
                    
                    // Inject PDF text layer script
                    if (!document.querySelector('script[src*="pdf-text-layer.js"]')) {
                        console.log('🔍 TabOracle: Injecting PDF text layer script...');
                        const script = document.createElement('script');
                        script.src = chrome.runtime.getURL('pdf-text-layer.js');
                        document.head.appendChild(script);
                        
                        // Wait for script to load and initialize
                        await new Promise((resolve) => {
                            script.onload = () => {
                                setTimeout(() => {
                                    if (window.tabOraclePDFOverlay) {
                                        console.log('✅ TabOracle: PDF overlay initialized successfully');
                                        resolve();
                                    } else {
                                        console.error('❌ TabOracle: PDF overlay failed to initialize');
                                        resolve();
                                    }
                                }, 1000);
                            };
                            setTimeout(resolve, 3000); // Timeout after 3 seconds
                        });
                    }
                    
                    if (window.tabOraclePDFOverlay) {
                        console.log('✅ TabOracle: PDF text layer overlay setup complete');
                        sendResponse({ success: true, message: 'PDF text layer overlay setup complete' });
                    } else {
                        console.error('❌ TabOracle: Failed to setup PDF text layer overlay');
                        sendResponse({ success: false, error: 'Failed to setup PDF text layer overlay' });
                    }
                    
                } catch (error) {
                    console.error('❌ TabOracle: Error setting up PDF text layer overlay:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            
            return true; // Keep message channel open for async response
        }
        
        // Return true to indicate async response
        return true;
    });
    
    // Log that content script is loaded and ready
    console.log('✅ TabOracle: Content script loaded and ready for Explain Me feature');

    function setupEventListeners() {
        // Search input events
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
            searchInput.addEventListener('keydown', handleKeydown);
        }
        
        // Overlay click to close
        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    hideSearch();
                }
            });
        }
        
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
            if (searchResults && searchResults.querySelector) {
                const firstResult = searchResults.querySelector('.tab-result');
                if (firstResult) {
                    firstResult.click();
                }
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
            if (displaySearchResults) {
                displaySearchResults(results, query);
            }
        } catch (error) {
            console.error('Search error:', error);
            if (showError) {
                showError('Failed to search tabs');
            }
        }
    }
    
    function displaySearchResults(results, query) {
        if (!searchResults) {
            console.warn('⚠️ TabOracle: searchResults element not found');
            return;
        }
        
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
            .map(tab => createResultElement ? createResultElement(tab, query) : '')
            .join('');
        
        // Add click listeners
        if (typeof addResultClickListeners === 'function') {
            addResultClickListeners();
        }
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
        if (searchResults) {
            searchResults.innerHTML = '';
        }
    }
    
    function showError(message) {
        if (!searchResults) {
            console.warn('⚠️ TabOracle: searchResults element not found, cannot show error');
            return;
        }
        
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
        
        if (searchOverlay) {
            searchOverlay.style.display = 'flex';
            isVisible = true;
            
            // Focus and select input
            setTimeout(() => {
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }, 100);
        }
    }
    
    function hideSearch() {
        if (searchOverlay) {
            searchOverlay.style.display = 'none';
            isVisible = false;
            clearResults();
            if (searchInput) {
                searchInput.value = '';
            }
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
            @keyframes slideInExplain {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-30px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
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
        } else if (request.action === 'getContent') {
            // Extract content from the current page
            try {
                const content = {
                    title: document.title,
                    content: document.body.innerText || document.body.textContent || '',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                };
                sendResponse({ success: true, content: content });
            } catch (error) {
                console.error('❌ TabOracle: Error extracting content:', error);
                sendResponse({ success: false, error: error.message });
            }
        } else if (request.action === 'test') {
            // Test message to check if content script is loaded
            sendResponse({ success: true, message: 'Content script is responding' });
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
