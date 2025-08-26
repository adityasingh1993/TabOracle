(() => {
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const viewer = document.getElementById('viewer');
  const statusEl = document.getElementById('status');
  const pageNumEl = document.getElementById('pageNum');
  const pageCountEl = document.getElementById('pageCount');
  const selectionPreview = document.getElementById('selectionPreview');
  const openSrcBtn = document.getElementById('openSrc');
  const explainBtn = document.getElementById('explain');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  let pdfDoc = null;
  let currentPage = 1;
  const pageCache = new Map();

  function status(msg) { statusEl.textContent = msg; }

  openSrcBtn.addEventListener('click', () => { if (src) chrome.tabs.create({ url: src }); });
  prevBtn.addEventListener('click', () => goToPage(Math.max(1, currentPage - 1)));
  nextBtn.addEventListener('click', () => goToPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1)));

  document.addEventListener('selectionchange', () => {
    const text = window.getSelection().toString();
    selectionPreview.value = text.trim().slice(0, 200);
  });

  explainBtn.addEventListener('click', async () => {
    const text = window.getSelection().toString().trim();
    if (!text) { status('Select some text first'); return; }
    try {
      status('Generating explanation...');
      const prompt = `Explain the following text clearly and concisely.\n\nText:\n${text}`;
      const resp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'handleAIExplanationRequest', prompt, selectedText: text }, resolve);
      });
      if (resp && resp.success) {
        console.group('🧠 TabOracle PDF Viewer: Explanation');
        console.log(text);
        console.log('—');
        console.log(resp.explanation);
        console.groupEnd();
        status('Explanation logged to console');
      } else {
        status('AI not available. Try again later.');
      }
    } catch (e) {
      status('Explain failed: ' + e.message);
    }
  });

  (async function init() {
    if (!src) { status('No PDF source provided'); return; }
    status('Loading PDF...');
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.js');
      let loaded = false;
      try {
        const loadingTask = pdfjsLib.getDocument({ url: src, withCredentials: true });
        pdfDoc = await loadingTask.promise;
        loaded = true;
      } catch (e) {
        console.warn('⚠️ Direct PDF load failed, trying background fetch:', e.message);
      }
      if (!loaded) {
        const fetched = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: 'fetchPdfAsData', url: src }, resolve);
        });
        if (fetched && fetched.success && fetched.data) {
          const loadingTask2 = pdfjsLib.getDocument({ data: fetched.data });
          pdfDoc = await loadingTask2.promise;
          loaded = true;
        } else {
          throw new Error('Background fetch failed: ' + (fetched?.error || 'unknown error'));
        }
      }
      pageCountEl.textContent = pdfDoc.numPages;
      status('Loaded');
      await renderPage(1);
    } catch (e) {
      status('Failed to load PDF: ' + e.message);
    }
  })();

  async function goToPage(n) { if (n !== currentPage) await renderPage(n); }

  async function renderPage(num) {
    currentPage = num;
    pageNumEl.textContent = num;
    status(`Rendering page ${num}...`);
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });

    let pageEl = pageCache.get(num);
    if (!pageEl) {
      pageEl = document.createElement('div');
      pageEl.className = 'page';
      const canvas = document.createElement('canvas');
      canvas.className = 'canvas-layer';
      const textLayer = document.createElement('div');
      textLayer.className = 'text-layer';
      pageEl.appendChild(canvas);
      pageEl.appendChild(textLayer);
      pageCache.set(num, pageEl);
    }
    pageEl.style.width = viewport.width + 'px';
    pageEl.style.height = viewport.height + 'px';
    viewer.innerHTML = '';
    viewer.appendChild(pageEl);

    const canvas = pageEl.querySelector('.canvas-layer');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const textLayerDiv = pageEl.querySelector('.text-layer');
    textLayerDiv.innerHTML = '';
    const textContent = await page.getTextContent();
    pdfjsLib.renderTextLayer({
      textContent,
      container: textLayerDiv,
      viewport,
      textDivs: []
    });
    status('');
  }
})();


