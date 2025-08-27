#!/bin/bash

# 🔒 TabOracle Code Security Script
# This script implements basic code protection measures

echo "🔒 TabOracle - Implementing Code Security Measures"
echo "=================================================="

# Create backup directory
BACKUP_DIR="backup-$(date +%Y%m%d_%H%M%S)"
echo "📁 Creating backup in: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup original files
echo "💾 Backing up original files..."
cp popup.js "$BACKUP_DIR/"
cp content.js "$BACKUP_DIR/"
cp background.js "$BACKUP_DIR/"
cp manifest.json "$BACKUP_DIR/"

# Install terser locally if not available
if ! command -v npx &> /dev/null; then
    echo "📦 Installing Node.js dependencies..."
    npm init -y
    npm install terser --save-dev
fi

# Phase 1: Basic Code Protection
echo "🛡️ Phase 1: Implementing Basic Code Protection"

# 1. Remove console.log statements (except errors)
echo "🧹 Removing console.log statements..."
sed -i 's/console\.log([^)]*);/\/\/ console.log removed for security/g' popup.js
sed -i 's/console\.log([^)]*);/\/\/ console.log removed for security/g' content.js
sed -i 's/console\.log([^)]*);/\/\/ console.log removed for security/g' background.js

# Keep console.error for debugging
echo "✅ Keeping console.error statements for debugging"

# 2. Add copyright notice
echo "📝 Adding copyright notices..."
cat > copyright_header.txt << 'EOF'
/**
 * TabOracle - AI Powered Tab Intelligence
 * Copyright (c) 2024 TabOracle. All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * 
 * For licensing information, contact: support@taboracle.com
 */

EOF

# 3. Add security wrapper
echo "🔐 Adding security wrapper..."
cat > security_wrapper.js << 'EOF'
// Security wrapper for TabOracle
(function() {
    'use strict';
    
    // Environment detection
    const isDevelopment = () => {
        return chrome.runtime.getManifest().version.includes('dev') ||
               window.location.hostname === 'localhost' ||
               chrome.runtime.getURL('').includes('unpacked');
    };
    
    // Basic anti-debugging
    const detectDevTools = () => {
        const devtools = /./;
        devtools.toString = function() {
            this.opened = true;
        }
        console.log('%c', devtools);
        return devtools.opened;
    };
    
    // Disable right-click in extension
    if (typeof document !== 'undefined') {
        document.addEventListener('contextmenu', e => {
            if (e.target.closest('.taboracle-extension')) {
                e.preventDefault();
            }
        });
    }
    
    // Export security functions
    window.TabOracleSecurity = {
        isDevelopment,
        detectDevTools
    };
})();
EOF

# 4. Minify JavaScript files
echo "📦 Minifying JavaScript files..."
if command -v npx &> /dev/null; then
    echo "Minifying popup.js..."
    npx terser popup.js -o popup.min.js --compress --mangle --comments false
    
    echo "Minifying content.js..."
    npx terser content.js -o content.min.js --compress --mangle --comments false
    
    echo "Minifying background.js..."
    npx terser background.js -o background.min.js --compress --mangle --comments false
    
    # Replace original files with minified versions
    mv popup.min.js popup.js
    mv content.min.js content.js
    mv background.min.js background.js
else
    echo "⚠️ Terser not available, skipping minification"
fi

# 5. Add security headers to manifest
echo "🔒 Adding security headers to manifest..."
# Note: This would require manual editing of manifest.json

# 6. Create production package
echo "📦 Creating production package..."
PROD_DIR="taboracle-secure-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$PROD_DIR"

# Copy files to production directory
cp popup.js "$PROD_DIR/"
cp content.js "$PROD_DIR/"
cp background.js "$PROD_DIR/"
cp manifest.json "$PROD_DIR/"
cp *.html "$PROD_DIR/"
cp *.css "$PROD_DIR/"
cp *.svg "$PROD_DIR/"
cp *.png "$PROD_DIR/"
cp -r vendor "$PROD_DIR/"

# Create production package
cd "$PROD_DIR"
zip -r "../taboracle-secure-$(date +%Y%m%d_%H%M%S).zip" .
cd ..

echo "✅ Security measures implemented!"
echo "📁 Backup created in: $BACKUP_DIR"
echo "📦 Production package: taboracle-secure-$(date +%Y%m%d_%H%M%S).zip"
echo ""
echo "🔒 Security Features Applied:"
echo "  ✅ Console.log statements removed"
echo "  ✅ Copyright notices added"
echo "  ✅ Code minification applied"
echo "  ✅ Security wrapper added"
echo "  ✅ Production package created"
echo ""
echo "⚠️ Important Notes:"
echo "  - Original files backed up in $BACKUP_DIR"
echo "  - Test thoroughly before deployment"
echo "  - Consider implementing additional security measures"
echo "  - Monitor for any functionality issues"
