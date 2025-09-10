(function(){
  function byId(id) { return document.getElementById(id); }
  const openFlags = byId('openFlags');
  const testModel = byId('testModel');
  const copyFlags = byId('copyFlags');
  const flagsUrlEl = byId('flagsUrl');
  const flagsUrl = flagsUrlEl ? flagsUrlEl.textContent : 'chrome://flags/#prompt-api-for-gemini-nano';
  const flagsHint = byId('flagsHint');

  function setHint(text, cls) {
    if (!flagsHint) return;
    flagsHint.textContent = text;
    flagsHint.className = 'hint ' + (cls || '');
  }

  openFlags && openFlags.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ action: 'openFlags' }, (resp) => {
        const le = chrome.runtime.lastError;
        if (le || !resp || !resp.success) {
          setHint('Couldn\'t open chrome://flags automatically. Copy and paste the link into the address bar.', 'warn');
        } else {
          setHint('Opened in a new tab.', 'ok');
        }
      });
    } catch(_) {
      setHint('Couldn\'t open chrome://flags automatically. Copy and paste the link into the address bar.', 'warn');
    }
  });

  copyFlags && copyFlags.addEventListener('click', async () => {
    async function copyModern() { await navigator.clipboard.writeText(flagsUrl); }
    function copyFallback() {
      const ta = document.createElement('textarea');
      ta.value = flagsUrl;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch(_) {}
      document.body.removeChild(ta);
      if (!ok) throw new Error('execCommand failed');
    }
    try {
      if (navigator.clipboard && window.isSecureContext) { await copyModern(); } else { copyFallback(); }
      setHint('Link copied. Paste it into Chrome\'s address bar and press Enter.', 'ok');
    } catch(_) {
      try {
        if (flagsUrlEl) {
          const r = document.createRange(); r.selectNodeContents(flagsUrlEl);
          const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        }
      } catch(_) {}
      setHint('Copy failed. The link is selected—press Ctrl+C to copy.', 'warn');
    }
  });

  testModel && testModel.addEventListener('click', () => {
    try { chrome.action.openPopup(); } catch(_) {}
  });
})();


