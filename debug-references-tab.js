// Debug script for References tab issue
// Run this in the browser console when TabOracle popup is open

console.log('🔍 TabOracle: Debugging References Tab Issue');

// Check if References tab button exists
const referencesTabButton = document.querySelector('[data-tab="referencesTab"]');
console.log('References tab button:', referencesTabButton);

if (referencesTabButton) {
    console.log('✅ References tab button found');
    console.log('Button text:', referencesTabButton.textContent);
    console.log('Button display:', window.getComputedStyle(referencesTabButton).display);
    console.log('Button visibility:', window.getComputedStyle(referencesTabButton).visibility);
} else {
    console.log('❌ References tab button NOT found');
}

// Check if References tab panel exists
const referencesTabPanel = document.getElementById('referencesTab');
console.log('References tab panel:', referencesTabPanel);

if (referencesTabPanel) {
    console.log('✅ References tab panel found');
    console.log('Panel display:', window.getComputedStyle(referencesTabPanel).display);
    console.log('Panel visibility:', window.getComputedStyle(referencesTabPanel).visibility);
} else {
    console.log('❌ References tab panel NOT found');
}

// List all nav tabs
const allNavTabs = document.querySelectorAll('.nav-tab');
console.log('All nav tabs found:', allNavTabs.length);
allNavTabs.forEach((tab, index) => {
    console.log(`  ${index}: ${tab.dataset.tab} - "${tab.textContent.trim()}"`);
});

// List all tab panels
const allTabPanels = document.querySelectorAll('.tab-panel');
console.log('All tab panels found:', allTabPanels.length);
allTabPanels.forEach((panel, index) => {
    console.log(`  ${index}: ${panel.id} - display: ${window.getComputedStyle(panel).display}`);
});

// Try to manually show References tab
if (referencesTabButton && referencesTabPanel) {
    console.log('🔧 Attempting to manually show References tab...');
    
    // Hide all panels
    allTabPanels.forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Show References panel
    referencesTabPanel.style.display = 'flex';
    
    // Update active tab
    allNavTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    referencesTabButton.classList.add('active');
    
    console.log('✅ References tab should now be visible');
} else {
    console.log('❌ Cannot show References tab - missing elements');
}

// Check for any JavaScript errors
console.log('🔍 Checking for JavaScript errors...');
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
});

console.log('🔍 Debug complete. Check the console output above.');
