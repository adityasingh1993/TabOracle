(function() {
	'use strict';

	// Guard against multiple loads
	if (window.__TABORACLE_FLOATING_BTN__) return;
	window.__TABORACLE_FLOATING_BTN__ = true;

	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function createFloatingTabOracleButton() {
		if (document.getElementById('taboracle-floating-btn')) return;
		try {
			const floatingBtn = document.createElement('div');
			floatingBtn.id = 'taboracle-floating-btn';
			floatingBtn.innerHTML = `
				<div class="taboracle-main-btn"></div>
				<div class="taboracle-hover-buttons">
					<button class="taboracle-hover-btn summarize-btn" title="Summarize Me">
						<span class="btn-icon">📝</span>
						<span class="btn-label">Summarize Me</span>
					</button>
					<button class="taboracle-hover-btn explain-btn" title="Explain Me">
						<span class="btn-icon">💡</span>
						<span class="btn-label">Explain Me</span>
					</button>
				</div>
			`;

			// Programmatically load icon using data-URI to avoid host page blocking
			const mainBtnEl = floatingBtn.querySelector('.taboracle-main-btn');
			const imgEl = document.createElement('img');
			imgEl.className = 'taboracle-icon';
			imgEl.alt = 'TabOracle';
			mainBtnEl.appendChild(imgEl);

			(async () => {
				async function loadSvgAsDataUri(path) {
					const url = chrome.runtime.getURL(path);
					const resp = await fetch(url);
					if (!resp.ok) throw new Error('HTTP ' + resp.status);
					const text = await resp.text();
					return 'data:image/svg+xml;utf8,' + encodeURIComponent(text);
				}
				try {
					imgEl.src = await loadSvgAsDataUri('taboracle_icon_only (1).svg');
				} catch (_) {
					try {
						imgEl.src = await loadSvgAsDataUri('taboracle_icon_only.svg');
					} catch (_) {
						try {
							imgEl.src = await loadSvgAsDataUri('taboracle_combined.svg');
						} catch (_) {
							imgEl.src = chrome.runtime.getURL('icon128.png');
						}
					}
				}
			})();

			const summaryPanel = document.createElement('div');
			summaryPanel.id = 'taboracle-summary-panel';
			summaryPanel.innerHTML = `
				<div class="summary-panel-header">
					<span class="panel-title">📝 Page Summary</span>
					<button class="close-panel-btn" title="Close">❌</button>
				</div>
				<div class="summary-panel-body">
					<div class="summary-loading" style="display: none;">
						<div class="loading-spinner"></div>
						<div class="loading-text">Generating summary...</div>
					</div>
					<div class="summary-content"></div>
				</div>
			`;

			document.body.appendChild(floatingBtn);
			document.body.appendChild(summaryPanel);

			setupFloatingButtonEvents(floatingBtn, summaryPanel);
			addFloatingButtonStyles();
		} catch (e) {
			console.error('TabOracle: Failed to create floating button', e);
		}
	}

	function setupFloatingButtonEvents(floatingBtn, summaryPanel) {
		const mainBtn = floatingBtn.querySelector('.taboracle-main-btn');
		const hoverButtons = floatingBtn.querySelector('.taboracle-hover-buttons');
		const summarizeBtn = floatingBtn.querySelector('.summarize-btn');
		const explainBtn = floatingBtn.querySelector('.explain-btn');
		const closePanelBtn = summaryPanel.querySelector('.close-panel-btn');

		mainBtn.addEventListener('mouseenter', () => {
			hoverButtons.style.display = 'flex';
			floatingBtn.classList.add('expanded');
		});
		hoverButtons.addEventListener('mouseenter', () => {
			hoverButtons.style.display = 'flex';
			floatingBtn.classList.add('expanded');
		});
		floatingBtn.addEventListener('mouseleave', () => {
			hoverButtons.style.display = 'none';
			floatingBtn.classList.remove('expanded');
		});

		summarizeBtn.addEventListener('click', async (e) => {
			e.preventDefault(); e.stopPropagation();
			await handleSummarizeMe(summaryPanel);
		});
		explainBtn.addEventListener('click', async (e) => {
			e.preventDefault(); e.stopPropagation();
			try {
				if (typeof showExplainMe === 'function') {
					let selectedText = window.getSelection().toString().trim();
					if (!selectedText) {
						// Try PDF overlay
						if (window.tabOraclePDFOverlay && typeof window.tabOraclePDFOverlay.getSelectedText === 'function') {
							selectedText = window.tabOraclePDFOverlay.getSelectedText();
						}
					}
					if (selectedText) {
						showExplainMe(selectedText);
					} else if (typeof showExplainMeError === 'function') {
						showExplainMeError('No text selected', { suggestion: 'Select some text on the page to explain' });
					}
				}
			} catch (err) {
				console.error('TabOracle: Explain Me error', err);
			}
		});
		closePanelBtn.addEventListener('click', () => { summaryPanel.style.display = 'none'; });
		makePanelDraggable(summaryPanel);
	}

	async function handleSummarizeMe(summaryPanel) {
		const loadingEl = summaryPanel.querySelector('.summary-loading');
		const contentEl = summaryPanel.querySelector('.summary-content');
		try {
			summaryPanel.style.display = 'block';
			loadingEl.style.display = 'block';
			contentEl.innerHTML = '';

			const isPDFPage = window.location.href.toLowerCase().includes('.pdf') || document.contentType === 'application/pdf';
			let pageContent = '';
			const pageTitle = document.title || 'Untitled Page';

			if (isPDFPage) {
				pageContent = await extractPDFText();
			} else {
				pageContent = extractPageContent();
			}
			if (!pageContent || pageContent.trim().length < 50) throw new Error('Insufficient content to summarize');

			const summary = await generateAISummary(pageTitle, pageContent);
			loadingEl.style.display = 'none';
			contentEl.innerHTML = `
				<div class="summary-header">
					<h3>${escapeHtml(pageTitle)}</h3>
					<div class="summary-meta">
						<span class="word-count">${summary.wordCount} words</span>
						<span class="reading-time">${summary.readingTime}</span>
					</div>
				</div>
				<div class="summary-text">${escapeHtml(summary.summary)}</div>
				${summary.keyPoints && summary.keyPoints.length ? `
					<div class="summary-key-points">
						<h4>Key Points:</h4>
						<ul>${summary.keyPoints.map(p => `<li>${escapeHtml(String(p))}</li>`).join('')}</ul>
					</div>
				` : ''}
				<div class="summary-disclaimer">⚠️ AI-generated summary. Verify important information.</div>
			`;
		} catch (err) {
			console.error('TabOracle: Summarize error', err);
			loadingEl.style.display = 'none';
			contentEl.innerHTML = `
				<div class="summary-error">
					<div class="error-icon">❌</div>
					<div class="error-message">Failed to generate summary</div>
					<div class="error-details">${escapeHtml(err.message || 'Unknown error')}</div>
				</div>
			`;
		}
	}

	async function extractPDFText() {
		try {
			// Prefer overlay full text if available
			if (window.tabOraclePDFOverlay && typeof window.tabOraclePDFOverlay.getFullText === 'function') {
				const t = await window.tabOraclePDFOverlay.getFullText();
				if (t && t.trim()) return t;
			}

			// Detect effective PDF URL (embedded iframe/embed or Chrome PDF viewer)
			let effectiveUrl = window.location.href;
			try {
				// Embedded PDF elements
				const iframe = document.querySelector('iframe[src*=".pdf"], iframe[type="application/pdf"]');
				const embed = document.querySelector('embed[src*=".pdf"], embed[type="application/pdf"]');
				if (iframe && iframe.src) effectiveUrl = iframe.src;
				else if (embed && embed.src) effectiveUrl = embed.src;

				// Chrome built-in PDF viewer (src/file param)
				const u = new URL(effectiveUrl);
				if (u.protocol === 'chrome-extension:' && /mhjfbmdgcfjbbpaeojofohoefgiehjai/i.test(u.host)) {
					const paramSrc = u.searchParams.get('src') || u.searchParams.get('file');
					if (paramSrc) {
						try { effectiveUrl = decodeURIComponent(paramSrc); } catch (_) { effectiveUrl = paramSrc; }
					}
				}
			} catch (_) {}

			// Ask background to parse
			const resp = await chrome.runtime.sendMessage({ action: 'extractPdfText', url: effectiveUrl });
			if (resp && resp.success && resp.text) return resp.text;
			throw new Error(resp?.error || 'Failed to extract PDF text');
		} catch (e) {
			throw e;
		}
	}

	function extractPageContent() {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = document.body.innerHTML;
		tempDiv.querySelectorAll('script, style, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, .ad, .advertisement').forEach(el => el.remove());
		let content = tempDiv.textContent || tempDiv.innerText || '';
		content = content.replace(/\s+/g, ' ').trim();
		if (content.length > 10000) content = content.substring(0, 10000) + '...';
		return content;
	}

	async function generateAISummary(title, content) {
		const prompt = `Please provide a comprehensive summary of the following content:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 8000)}${content.length > 8000 ? '...' : ''}\n\nPlease provide:\n1. A concise summary (2-3 sentences)\n2. 3-5 key points\n3. Word count\n4. Estimated reading time\n\nFormat the response as JSON:\n{\n  "summary": "Brief summary here",\n  "keyPoints": ["Point 1", "Point 2", "Point 3"],\n  "wordCount": 1234,\n  "readingTime": "5 minutes"\n}`;
		const resp = await chrome.runtime.sendMessage({ action: 'generateAISummary', prompt });
		if (resp && resp.success) {
			return {
				summary: resp.summary,
				keyPoints: resp.keyPoints || [],
				wordCount: resp.wordCount || content.split(/\s+/).length,
				readingTime: resp.readingTime || `${Math.ceil(content.split(/\s+/).length / 200)} minutes`
			};
		}
		// Fallback simple summary
		const words = content.split(/\s+/);
		const wordCount = words.length;
		const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
		const summary = (sentences.slice(0, 3).join(' ').trim()) || `This page titled "${title}" contains ${wordCount} words.`;
		const keyPoints = sentences.slice(3, 8).map(s => s.trim().substring(0, 100) + '...');
		return { summary, keyPoints, wordCount, readingTime: `${Math.ceil(wordCount / 200)} minutes` };
	}

	function makePanelDraggable(panel) {
		let isDragging = false, currentX = 0, currentY = 0, initialX = 0, initialY = 0, xOffset = 0, yOffset = 0;
		const header = panel.querySelector('.summary-panel-header');
		header.style.cursor = 'move';
		header.addEventListener('mousedown', dragStart);
		document.addEventListener('mousemove', drag);
		document.addEventListener('mouseup', dragEnd);
		function dragStart(e) { initialX = e.clientX - xOffset; initialY = e.clientY - yOffset; if (e.target === header || header.contains(e.target)) { isDragging = true; } }
		function drag(e) { if (!isDragging) return; e.preventDefault(); currentX = e.clientX - initialX; currentY = e.clientY - initialY; xOffset = currentX; yOffset = currentY; panel.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`; }
		function dragEnd() { initialX = currentX; initialY = currentY; isDragging = false; }
	}

	function addFloatingButtonStyles() {
		if (document.getElementById('taboracle-floating-styles')) return;
		const style = document.createElement('style');
		style.id = 'taboracle-floating-styles';
		style.textContent = `
			#taboracle-floating-btn { position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; transition: all 0.3s ease; }
			.taboracle-main-btn { width: 72px; height: 72px; background: transparent; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: none; transition: all 0.3s ease; position: relative; z-index: 2147483647; }
			.taboracle-main-btn:hover { transform: scale(1.06); }
			.taboracle-icon { width: 72px; height: 72px; object-fit: contain; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 1px rgba(0,0,0,0.45)); }
			.taboracle-hover-buttons { display: none; flex-direction: column; gap: 12px; margin-bottom: 15px; opacity: 0; transform: translateY(10px); transition: all 0.3s ease; }
			#taboracle-floating-btn.expanded .taboracle-hover-buttons { opacity: 1; transform: translateY(0); }
			.taboracle-hover-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #ffffff; border: 2px solid rgba(139, 92, 246, 0.35); border-radius: 25px; cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #1f2937; box-shadow: 0 6px 16px rgba(139, 92, 246, 0.15); transition: all 0.2s ease; white-space: nowrap; }
			.taboracle-hover-btn:hover { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.06); transform: translateX(-4px); box-shadow: 0 8px 18px rgba(139, 92, 246, 0.25); }
			.summary-panel-header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-top-left-radius: 12px; border-top-right-radius: 12px; }
			#taboracle-summary-panel { position: fixed; top: 100px; right: 30px; width: 400px; max-height: 70vh; background: white; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); z-index: 9999; display: none; flex-direction: column; overflow: hidden; }
			.summary-panel-body { flex: 1; padding: 20px; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
			.loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top: 4px solid #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; }
			@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
			.summary-error { text-align: center; padding: 40px 20px; color: #dc2626; }
		`;
		document.head.appendChild(style);
	}

	function init() {
		try { createFloatingTabOracleButton(); } catch (_) {}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
