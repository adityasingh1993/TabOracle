// Offscreen PDF parsing using pdf.js

if (self && self.pdfjsLib) {
	try {
		pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.js');
	} catch (_) {}
}

async function extractPdfText(url) {
  if (!self.pdfjsLib) throw new Error('pdf.js not loaded');
  const loadingTask = pdfjsLib.getDocument({ url });
  const doc = await loadingTask.promise;
  let text = '';
  const maxPages = Math.min(doc.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(' ');
    text += pageText + '\n\n';
  }
  return text.replace(/\s+/g, ' ').trim();
}

async function extractPdfTextFromData(arrayBuffer) {
  if (!self.pdfjsLib) throw new Error('pdf.js not loaded');
  const uint8 = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8 });
  const doc = await loadingTask.promise;
  let text = '';
  const maxPages = Math.min(doc.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(' ');
    text += pageText + '\n\n';
  }
  return text.replace(/\s+/g, ' ').trim();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg && msg.action === 'offscreenParsePdf' && msg.url) {
        const text = await extractPdfText(msg.url);
        sendResponse({ success: true, content: text, contentLength: text.length });
        return;
      }
      if (msg && msg.action === 'offscreenParsePdfData' && msg.data) {
        const text = await extractPdfTextFromData(msg.data);
        sendResponse({ success: true, content: text, contentLength: text.length });
        return;
      }
      sendResponse({ success: false, error: 'Unknown action' });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  })();
  return true;
});


