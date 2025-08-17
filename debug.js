// Debug script for TabOracle
console.log('🔍 TabOracle Debug Script Loaded');

// Test basic Chrome API availability
try {
    console.log('✅ Chrome runtime available:', !!chrome.runtime);
    console.log('✅ Chrome tabs available:', !!chrome.tabs);
    console.log('✅ Chrome storage available:', !!chrome.storage);
    console.log('✅ Chrome scripting available:', !!chrome.scripting);
} catch (error) {
    console.error('❌ Chrome API error:', error);
}

// Test message passing
try {
    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Message passing error:', chrome.runtime.lastError);
        } else {
            console.log('✅ Message passing working:', response);
        }
    });
} catch (error) {
    console.error('❌ Message passing failed:', error);
}

// Test storage
try {
    chrome.storage.local.get(['allTabs'], (result) => {
        console.log('✅ Storage access working:', result);
    });
} catch (error) {
    console.error('❌ Storage access failed:', error);
}

console.log('🔍 TabOracle Debug Complete');
