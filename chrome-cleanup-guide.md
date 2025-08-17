# 🧹 Chrome Extension System Cleanup Guide

## 🚨 **Problem: Chrome Extension System Corruption**

The `extensionId` error indicates that Chrome's extension management system is corrupted and cannot properly identify extensions.

## 🔧 **Solution: Complete Chrome Cleanup**

### **Phase 1: Extension Removal**
1. **Go to `chrome://extensions/`**
2. **Remove TabOracle completely** (click "Remove" button)
3. **Remove any other problematic extensions**
4. **Close Chrome entirely** (all windows, all processes)

### **Phase 2: Data Cleanup**
1. **Go to `chrome://settings/`**
2. **Search for "Clear browsing data"**
3. **Click "Clear browsing data"**
4. **Select these options:**
   - ✅ **Cookies and other site data**
   - ✅ **Cached images and files**
   - ✅ **Site settings**
   - ✅ **Hosted app data**
   - ✅ **Download history**
5. **Time range: "All time"**
6. **Click "Clear data"**

### **Phase 3: Advanced Cleanup**
1. **Go to `chrome://settings/`**
2. **Click "Advanced" at the bottom**
3. **Scroll to "Reset and clean up"**
4. **Click "Restore settings to their original defaults"**
5. **Click "Reset settings"**

### **Phase 4: Extension System Reset**
1. **Go to `chrome://extensions/`**
2. **Enable "Developer mode"** (toggle in top right)
3. **Click "Load unpacked"**
4. **Select the TabOracle folder**
5. **Check for any error messages**

## 🧪 **Testing the Fix**

### **Test 1: Minimal Version**
1. **Current status**: Minimal version is active
2. **Expected**: Simple tab list without complex features
3. **If it works**: Extension system is fixed
4. **If it fails**: System corruption is severe

### **Test 2: Full Version**
1. **Run**: `./restore-full.sh`
2. **Reload extension** in `chrome://extensions/`
3. **Test**: All features including tabbed interface

## ❌ **If Still Not Working**

### **Option 1: Chrome Profile Reset**
1. **Close Chrome completely**
2. **Navigate to Chrome profile folder:**
   - **Linux**: `~/.config/google-chrome/`
   - **Windows**: `%LOCALAPPDATA%\Google\Chrome\User Data\`
   - **macOS**: `~/Library/Application Support/Google/Chrome/`
3. **Rename the "Default" folder to "Default_backup"**
4. **Reopen Chrome** (creates fresh profile)

### **Option 2: Chrome Reinstall**
1. **Uninstall Chrome completely**
2. **Delete all Chrome data folders**
3. **Download fresh Chrome installer**
4. **Install and test**

## 🔍 **Diagnostic Commands**

### **Check Current Status**
```bash
# See what version is active
ls -la manifest.json background.js popup.html popup.js

# Test minimal version
./test-minimal.sh

# Switch versions
./switch-to-minimal.sh
./restore-full.sh
```

### **Verify File Integrity**
```bash
# Check if files are properly switched
diff manifest.json manifest-minimal.json
diff background.js background-minimal.js
```

## 📋 **Step-by-Step Recovery**

1. **✅ COMPLETED**: Switched to minimal version
2. **🔄 NEXT**: Remove extension from Chrome
3. **🔄 NEXT**: Clear Chrome data
4. **🔄 NEXT**: Load minimal version
5. **🔄 NEXT**: Test basic functionality
6. **🔄 NEXT**: If working, restore full version

## 🎯 **Success Criteria**

- ✅ **No `extensionId` errors** in console
- ✅ **Extension loads** without errors
- ✅ **Basic tab list** displays correctly
- ✅ **Tab switching** works
- ✅ **Full features** work after restoration

## 🚀 **Quick Recovery Commands**

```bash
# If minimal version works, restore full version
./restore-full.sh

# If you need to go back to minimal
./switch-to-minimal.sh

# Test current setup
./test-minimal.sh
```

## 📞 **Need Help?**

If the issue persists after following this guide:
1. **Check Chrome version** (should be latest)
2. **Try incognito mode** (extensions disabled)
3. **Check for conflicting extensions**
4. **Consider Chrome reinstall**

---

**Current Status**: ✅ Minimal version active, ready for testing
**Next Action**: Remove extension from Chrome and reload
