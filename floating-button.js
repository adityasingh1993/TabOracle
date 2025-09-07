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

			// Create centered overlay container like Explain Me
			const summaryOverlay = document.createElement('div');
			summaryOverlay.id = 'taboracle-summary-overlay';
			summaryOverlay.style.cssText = `
				position: fixed;
				top: 0; left: 0; right: 0; bottom: 0;
				display: none;
				align-items: center;
				justify-content: center;
				background: rgba(0,0,0,0.7);
				z-index: 2147483646;
				pointer-events: none;
			`;

			const summaryPanel = document.createElement('div');
			summaryPanel.id = 'taboracle-summary-panel';
			summaryPanel.style.cssText = `pointer-events: auto;`;
			summaryPanel.innerHTML = `
				<div class="summary-panel-header">
					<div class="summary-header-left">
						<img src="${chrome.runtime.getURL('taboracle_combined.svg')}" alt="TabOracle" class="summary-brand" onerror="this.style.display='none'" />
					</div>
					<div class="summary-header-center">
						<span class="panel-title">Summarize Me</span>
					</div>
					<div class="summary-header-right">
						<button class="pin-panel-btn" title="Pin">📌</button>
						<button class="close-panel-btn" title="Close">✕</button>
					</div>
				</div>
				<div class="summary-panel-body">
					<div class="summary-loading" style="display: none; text-align: center; padding: 40px 20px;">
						<div class="loading-logo" style="margin-bottom: 16px; display: flex; justify-content: center; align-items: center;">
							<img src="${chrome.runtime.getURL('taboracle_icon_only.svg')}" alt="TabOracle" style="width: 80px; height: 80px; animation: logoGlow 2s infinite;" onerror="this.style.display='none'; this.parentElement.innerHTML='✨';" />
						</div>
						<div class="loading-text" style="font-size: 18px; color: #6d28d9; margin-bottom: 8px; font-weight: 600; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">AI is analyzing your text...</div>
						<div class="loading-subtext" style="font-size: 14px; color: #6b7280; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">This may take a few seconds</div>
					</div>
					<div class="summary-content"></div>
				</div>
			`;

			document.body.appendChild(floatingBtn);
			summaryOverlay.appendChild(summaryPanel);
			document.body.appendChild(summaryOverlay);

			setupFloatingButtonEvents(floatingBtn, summaryPanel);
			addFloatingButtonStyles();
		} catch (e) {
			console.error('TabOracle: Failed to create floating button', e);
		}
	}

	// Prevent overlapping summarize runs that can race the background messaging
	let summarizeInProgress = false;
	let __lastExplainSelection = '';

	function setupFloatingButtonEvents(floatingBtn, summaryPanel) {
		const mainBtn = floatingBtn.querySelector('.taboracle-main-btn');
		const hoverButtons = floatingBtn.querySelector('.taboracle-hover-buttons');
		const summarizeBtn = floatingBtn.querySelector('.summarize-btn');
		const explainBtn = floatingBtn.querySelector('.explain-btn');
		const closePanelBtn = summaryPanel.querySelector('.close-panel-btn');
		const pinPanelBtn = summaryPanel.querySelector('.pin-panel-btn');

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
		// Capture selection BEFORE click steals focus and clears the selection
		explainBtn.addEventListener('mousedown', () => {
			try {
				__lastExplainSelection = (window.getSelection && window.getSelection().toString().trim()) || '';
				if (!__lastExplainSelection && window.tabOraclePDFOverlay && typeof window.tabOraclePDFOverlay.getSelectedText === 'function') {
					__lastExplainSelection = window.tabOraclePDFOverlay.getSelectedText() || '';
				}
			} catch (_) { __lastExplainSelection = ''; }
		});

		explainBtn.addEventListener('click', async (e) => {
			e.preventDefault(); e.stopPropagation();
			try {
				let selectedText = '';
				try { selectedText = (window.getSelection && window.getSelection().toString().trim()) || ''; } catch (_) { selectedText = ''; }
				if (!selectedText && window.tabOraclePDFOverlay && typeof window.tabOraclePDFOverlay.getSelectedText === 'function') {
					selectedText = window.tabOraclePDFOverlay.getSelectedText() || '';
				}
				if (!selectedText && __lastExplainSelection) {
					selectedText = __lastExplainSelection;
				}
				if (selectedText) {
					// Use the existing Explain Me message path handled by content.js
					try {
						chrome.runtime.sendMessage({ action: 'showExplainMe', selectedText });
					} catch (_) {}
				} else {
					// Lightweight toast if no selection
					const note = document.createElement('div');
					note.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#dc2626;color:#fff;padding:12px 16px;border-radius:8px;font-family:Arial, sans-serif;font-size:13px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
					note.textContent = 'No text selected. Select some text and try Explain Me again.';
					document.body.appendChild(note);
					setTimeout(() => { try { note.remove(); } catch (_) {} }, 3000);
				}
			} catch (err) {
				console.error('TabOracle: Explain Me error', err);
			}
		});
		closePanelBtn.addEventListener('click', () => {
			const overlay = document.getElementById('taboracle-summary-overlay');
			if (window.__TABORACLE_SUMMARY_PINNED__) {
				summaryPanel.style.display = 'none';
				window.__TABORACLE_SUMMARY_PINNED__ = false;
			} else if (overlay) {
				overlay.style.display = 'none';
			}
		});
		if (pinPanelBtn) {
			pinPanelBtn.addEventListener('click', (e) => {
				e.preventDefault(); e.stopPropagation();
				const overlay = document.getElementById('taboracle-summary-overlay');
				setSummaryPinned(overlay, summaryPanel, !window.__TABORACLE_SUMMARY_PINNED__);
			});
		}

		// Review and support buttons like Explain Me
		document.addEventListener('click', (e) => {
			const target = e.target;
			if (target && target.id === 'summaryReviewButton') {
				try {
					const extensionId = chrome.runtime.id;
					const reviewUrl = `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
					chrome.tabs.create({ url: reviewUrl });
				} catch (_) {
					try { window.open('https://chrome.google.com/webstore/detail/taboracle-ai-powered-tab-intelligence/reviews', '_blank'); } catch (_) {}
				}
			}
			if (target && target.id === 'summarySupportButton') {
				const supportUrl = 'https://buymeacoffee.com/adityas';
				try { chrome.tabs.create({ url: supportUrl }); } catch (_) { try { window.open(supportUrl, '_blank'); } catch (_) {} }
			}
		});
		makePanelDraggable(summaryPanel);
	}

	async function handleSummarizeMe(summaryPanel) {
		console.log('TabOracle: Handling Summarize Me');
		if (summarizeInProgress) {
			console.log('TabOracle: Summarize already in progress, ignoring click');
			return;
		}
		summarizeInProgress = true;
		const loadingEl = summaryPanel.querySelector('.summary-loading');
		const contentEl = summaryPanel.querySelector('.summary-content');
		try {
			summaryPanel.style.display = 'flex';
			const overlay = document.getElementById('taboracle-summary-overlay');
			if (overlay) overlay.style.display = 'flex';
			// default to centered dialog
			setSummaryPinned(overlay, summaryPanel, false);
			loadingEl.style.display = 'block';
			contentEl.innerHTML = '';

			const isPDFPage = window.location.href.toLowerCase().includes('.pdf') || document.contentType === 'application/pdf';
			console.log('TabOracle: PDF page:', isPDFPage);
			let pageContent = '';
			const pageTitle = (document.title || '').trim();
			console.log('TabOracle: Page titlesss:', pageTitle);
			console.log("====isPDFPage:");
			if (isPDFPage) {
				console.log("====calling pdf extarct function");
				pageContent = await extractPDFText();
				console.log("=====pageContent:", pageContent);
			} else {
				console.log("====calling page content function")
				pageContent = extractPageContent();
			}
			console.log("if else executed", pageContent);
			if (!pageContent || pageContent.trim().length < 50) throw new Error('Insufficient content to summarize');

			const summary = await generateAISummary(pageTitle, pageContent);
			loadingEl.style.display = 'none';
			contentEl.innerHTML = `
				<div class="summary-card">
					<div class="summary-ai-badge">🤖 AI Generated</div>
					${pageTitle ? `<h3 class=\"summary-title\">${escapeHtml(pageTitle)}</h3>` : ''}
					<div class="summary-meta">
						<span class="word-count">${summary.wordCount} words</span>
						<span class="reading-time">${summary.readingTime}</span>
					</div>
					<div class="summary-text">${escapeHtml(summary.summary)}</div>
					${summary.keyPoints && summary.keyPoints.length ? `
						<div class="summary-key-points">
							<h4>Key Points</h4>
							<ul>${summary.keyPoints.map(p => '<li>' + escapeHtml(String(p)) + '</li>').join('')}</ul>
						</div>
					` : ''}
					<div class="summary-disclaimer">⚠️ AI-generated content may be inaccurate. Verify important information.</div>
					<div class="summary-actions">
						<button id="summaryReviewButton" class="review-btn">⭐ Leave a Review</button>
						<button id="summarySupportButton" class="support-btn">☕ Support TabOracle</button>
					</div>
				</div>
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
		} finally {
			summarizeInProgress = false;
		}
	}

	async function extractPDFText() {
		try {
			// Summarizer path: skip PDF text-layer overlay; use background/offscreen first, then local pdf.js fallback

			// Detect effective PDF URL (embedded iframe/embed or Chrome PDF viewer)
			let effectiveUrl = window.location.href;
			console.log('TabOracle: Effective URL in extractPDFText:', effectiveUrl);
			try {
				// Embedded PDF elements
				const iframe = document.querySelector('iframe[src*=".pdf"], iframe[type="application/pdf"]');
				console.log('TabOracle: Iframe:', iframe);
				const embed = document.querySelector('embed[src*=".pdf"], embed[type="application/pdf"]');
				console.log('TabOracle: Embed:', embed);
				// if (iframe && iframe.src) effectiveUrl = iframe.src;
				// else if (embed && embed.src) effectiveUrl = embed.src;

				// Chrome built-in PDF viewer (src/file param)
				console.log('TabOracle: Effective URL just before url:', effectiveUrl);
				const u = new URL(effectiveUrl);
				console.log('TabOracle: URL:', u);
				if (u.protocol === 'chrome-extension:' && /mhjfbmdgcfjbbpaeojofohoefgiehjai/i.test(u.host)) {
					console.log('TabOracle: Chrome extrnsion');
					const paramSrc = u.searchParams.get('src') || u.searchParams.get('file');
					if (paramSrc) {
						try { effectiveUrl = decodeURIComponent(paramSrc); } catch (_) { effectiveUrl = paramSrc; }
					}
				}
			} catch (_) {console.log('TabOracle: Error in extractPDFText:', _);}

			// Ask background to parse (safe messaging with lastError handling)
			try {
				const resp = await new Promise((resolve, reject) => {
					try {
						console.log('TabOracle: Extracting PDF text from', effectiveUrl);
						console.log("sending message to background", effectiveUrl);
						chrome.runtime.sendMessage({ action: 'extractPdfText', url: effectiveUrl }, (r) => {
							console.log("message sent to background");
							const le = chrome.runtime.lastError;
							console.log("lastError:", le);
							if (le) { reject(new Error(le.message)); return; }
							resolve(r);
						});
					} catch (e) {
						console.log("error in extractPDFText:", e);
						reject(e);
					}
				});
				console.log("=====resp:", resp);
				if (resp && resp.success && resp.text) return resp.text;
				throw new Error(resp && resp.error ? resp.error : 'Failed to extract PDF via background');
			} catch (bgErr) {
				// Fallback: parse locally with pdf.js
				await ensurePdfJsLoaded();
				if (typeof pdfjsLib === 'undefined') throw bgErr;
				try {
					try { pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.js'); } catch (_) {}
					let doc = null;
					try {
						// Try direct URL first
						const loadingTask = pdfjsLib.getDocument({ url: effectiveUrl, withCredentials: true });
						doc = await loadingTask.promise;
					} catch (_) {
						// Fallback to fetch as ArrayBuffer
						const r = await fetch(effectiveUrl, { credentials: 'include', mode: 'cors' });
						if (!r.ok) throw new Error('HTTP ' + r.status);
						const buf = await r.arrayBuffer();
						const loadingTask2 = pdfjsLib.getDocument({ data: buf });
						doc = await loadingTask2.promise;
					}
					let text = '';
					const maxPages = Math.min(doc.numPages || 0, 30);
					for (let i = 1; i <= maxPages; i++) {
						const page = await doc.getPage(i);
						const content = await page.getTextContent();
						text += content.items.map(it => it.str).join(' ') + '\n\n';
					}
					return text.replace(/\s+/g, ' ').trim();
				} catch (_) {
					throw bgErr; // surface original background error if local fallback also fails
				}
			}
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
		try {
			const resp = await new Promise((resolve, reject) => {
				try {
					chrome.runtime.sendMessage({ action: 'generateAISummary', prompt }, (r) => {
						const le = chrome.runtime.lastError;
						if (le) { reject(new Error(le.message)); return; }
						resolve(r);
					});
				} catch (e) {
					reject(e);
				}
			});
			if (resp && resp.success) {
				return {
					summary: resp.summary,
					keyPoints: resp.keyPoints || [],
					wordCount: resp.wordCount || content.split(/\s+/).length,
					readingTime: resp.readingTime || `${Math.ceil(content.split(/\s+/).length / 200)} minutes`
				};
			}
		} catch (_) {}
		// Fallback simple summary
		const words = content.split(/\s+/);
		const wordCount = words.length;
		const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
		const summary = (sentences.slice(0, 3).join(' ').trim()) || `This page titled "${title}" contains ${wordCount} words.`;
		const keyPoints = sentences.slice(3, 8).map(s => s.trim().substring(0, 100) + '...');
		return { summary, keyPoints, wordCount, readingTime: `${Math.ceil(wordCount / 200)} minutes` };
	}

	// Helper to ensure pdf.js is available locally in the page
	async function ensurePdfJsLoaded() {
		if (typeof pdfjsLib !== 'undefined') return true;
		try {
			await new Promise((resolve, reject) => {
				const s = document.createElement('script');
				s.src = chrome.runtime.getURL('vendor/pdfjs/pdf.min.js');
				s.onload = resolve;
				s.onerror = () => reject(new Error('Failed to load pdf.js'));
				document.head.appendChild(s);
				setTimeout(resolve, 2000);
			});
			if (typeof pdfjsLib !== 'undefined') {
				try { pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.js'); } catch (_) {}
				return true;
			}
		} catch (_) {}
		return false;
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
			.summary-panel-header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-top-left-radius: 20px; border-top-right-radius: 20px; height: 44px; box-sizing: border-box; }
			.summary-header-left { display: flex; align-items: center; gap: 8px; }
			.summary-brand { width: 100px; height: 32px; filter: drop-shadow(0 1px 3px rgba(251,191,36,0.3)); }
			.summary-header-center { display: flex; align-items: center; justify-content: center; flex: 1; }
			.summary-header-right { display: flex; align-items: center; gap: 6px; }
			.close-panel-btn { background: none; border: none; color: white; font-weight: 700; cursor: pointer; font-size: 14px; }
			.pin-panel-btn { background: none; border: none; color: white; font-weight: 700; cursor: pointer; font-size: 16px; margin-right: 6px; }
			/* Gradient behind header height to avoid white corners like Explain Me */
			#taboracle-summary-panel { position: relative; width: 800px; max-width: 90vw; max-height: 85vh; height: auto; background: linear-gradient(180deg, #6d28d9 0px, #6d28d9 44px, rgba(255,255,255,0.98) 44px); border: 0; background-clip: padding-box; border-radius: 20px; box-shadow: 0 20px 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0,0,0,0.2); z-index: 2147483647; display: none; flex-direction: column; overflow: hidden; }
			/* Pinned header radius matches smaller panel radius */
			#taboracle-summary-panel.pinned .summary-panel-header { border-top-left-radius: 12px; border-top-right-radius: 12px; }
			#taboracle-summary-overlay { overflow: auto; }
			.summary-panel-body { flex: 1 1 auto; min-height: 0; padding: 20px; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
			.loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top: 4px solid #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; }
			@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
			.summary-error { text-align: center; padding: 40px 20px; color: #dc2626; }
			/* Card styling similar to Explain Me */
			.summary-card { background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98)); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(139,92,246,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8); }
			.summary-ai-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 12px; background: rgba(109, 40, 217, 0.08); color: #6d28d9; font-size: 12px; font-weight: 600; margin-bottom: 12px; border: 1px solid rgba(109, 40, 217, 0.15); }
			.summary-title { margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1f2937; }
			.summary-meta { display: flex; gap: 12px; font-size: 12px; color: #6b7280; margin-bottom: 12px; }
			.summary-text { margin: 12px 0; line-height: 1.7; color: #374151; font-size: 15px; }
			.summary-key-points h4 { margin: 16px 0 8px 0; font-size: 14px; color: #1f2937; }
			.summary-key-points ul { margin: 0; padding-left: 18px; }
			.summary-disclaimer { margin-top: 16px; padding: 12px 16px; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 8px; font-size: 12px; color: #6b7280; font-style: italic; }
			.summary-actions { margin-top: 16px; display: flex; gap: 8px; }
			.summary-actions .review-btn { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; }
			.summary-actions .support-btn { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; }
		`;
		document.head.appendChild(style);
	}

	function setSummaryPinned(overlay, panel, pinned) {
		window.__TABORACLE_SUMMARY_PINNED__ = pinned;
		if (!overlay || !panel) return;
		if (pinned) {
			// Switch to pinned sidebar-like panel
			// Re-parent to body so hiding overlay won't hide the panel
			try { if (overlay.contains(panel)) { document.body.appendChild(panel); } } catch (_) {}
			overlay.style.display = 'none';
			panel.style.display = 'flex';
			panel.style.position = 'fixed';
			panel.style.top = '20px';
			panel.style.right = '20px';
			panel.style.left = '';
			panel.style.bottom = '';
			panel.style.width = '360px';
			panel.style.maxWidth = '360px';
			panel.style.maxHeight = 'calc(100vh - 40px)';
			panel.style.borderRadius = '12px';
			try { panel.classList.add('pinned'); } catch (_) {}
			panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(139, 92, 246, 0.1)';
			panel.style.zIndex = '2147483647';
		} else {
			// Centered dialog within overlay
			try { if (!overlay.contains(panel)) { overlay.appendChild(panel); } } catch (_) {}
			overlay.style.display = 'flex';
			panel.style.display = 'flex';
			panel.style.position = 'relative';
			panel.style.top = '';
			panel.style.right = '';
			panel.style.left = '';
			panel.style.bottom = '';
			panel.style.width = '800px';
			panel.style.maxWidth = '90vw';
			panel.style.maxHeight = '85vh';
			panel.style.borderRadius = '20px';
			try { panel.classList.remove('pinned'); } catch (_) {}
			panel.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0,0,0,0.2)';
		}
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
