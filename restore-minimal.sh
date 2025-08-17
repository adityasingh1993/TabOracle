#!/bin/bash

echo "🔄 TabOracle Minimal Version Restoration Script"
echo "=============================================="
echo ""

echo "⚠️  WARNING: This will restore the minimal version!"
echo ""

echo "📋 Current Status:"
echo "=================="
echo "✅ Full functionality has issues"
echo "✅ Ready to restore minimal version"
echo ""

echo "🔄 RESTORATION STEPS:"
echo "====================="
echo "1. Restore minimal manifest.json"
echo "2. Restore minimal background.js"
echo "3. Test minimal functionality"
echo ""

read -p "Are you ready to restore minimal version? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Restoring minimal version..."
    
    # Restore minimal manifest
    if [ -f "manifest-minimal.json" ]; then
        mv manifest.json manifest-backup.json
        mv manifest-minimal.json manifest.json
        echo "✅ Minimal manifest.json restored"
    else
        echo "❌ manifest-minimal.json not found"
        exit 1
    fi
    
    # Restore minimal background script
    if [ -f "background-minimal.js" ]; then
        mv background.js background-backup.js
        mv background-minimal.js background.js
        echo "✅ Minimal background.js restored"
    else
        echo "❌ background-minimal.js not found"
        exit 1
    fi
    
    echo ""
    echo "🎉 Minimal version restored!"
    echo "📋 Next steps:"
    echo "1. Reload the extension in chrome://extensions/"
    echo "2. Test minimal functionality works"
    echo "3. If minimal works, you can run: ./restore-full.sh"
    
else
    echo "❌ Restoration cancelled"
    echo "You can run this script again when ready"
fi
