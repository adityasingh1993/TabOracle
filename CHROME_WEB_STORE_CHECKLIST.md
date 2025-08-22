# Chrome Web Store Submission Checklist

## Pre-Submission Checklist

### ✅ Extension Files
- [ ] `manifest.json` - Manifest V3 compliant
- [ ] `popup.html`, `popup.css`, `popup.js` - Main interface
- [ ] `background.js` - Service worker
- [ ] `content.js` - Content scripts
- [ ] `offscreen.html`, `offscreen.js` - PDF processing
- [ ] `gemini-manager.js` - AI features
- [ ] All icon files referenced in manifest

### ✅ Store Assets
- [ ] `icon16.png` (16x16 pixels)
- [ ] `icon48.png` (48x48 pixels)
- [ ] `icon128.png` (128x128 pixels)
- [ ] `screenshot-1.png` (1280x800) - Main search interface
- [ ] `screenshot-2.png` (1280x800) - Categories view
- [ ] `screenshot-3.png` (1280x800) - AI search feature
- [ ] `promo-tile-small.png` (440x280) - Optional
- [ ] `promo-tile-large.png` (920x680) - Optional

### ✅ Documentation
- [ ] Privacy Policy (hosted publicly)
- [ ] Terms of Service (hosted publicly)
- [ ] Extension description (from `chrome-web-store-description.txt`)
- [ ] Support information

### ✅ Technical Requirements
- [ ] Extension tested thoroughly
- [ ] No console errors in production
- [ ] All features working as described
- [ ] Permissions justified and minimal
- [ ] Package created without development files

## Store Listing Information

### ✅ Basic Information
- [ ] Extension name: "TabOracle - Intelligent Tab Management"
- [ ] Short description (132 chars max)
- [ ] Detailed description from `chrome-web-store-description.txt`
- [ ] Category: Productivity
- [ ] Language: English

### ✅ Privacy & Legal
- [ ] Privacy policy URL (publicly accessible)
- [ ] Terms of service URL (publicly accessible)
- [ ] Data usage: "Does not collect user data"
- [ ] Data handling: "Does not handle user data"

### ✅ Additional Information
- [ ] Homepage URL (GitHub repo or website)
- [ ] Support URL (where users can get help)
- [ ] Store listing enabled for public access

## Submission Process

### ✅ Developer Account
- [ ] Google Developer account created
- [ ] $5 registration fee paid
- [ ] Account verified

### ✅ Package Upload
- [ ] ZIP package created using `package-for-store.sh`
- [ ] Package uploaded to Chrome Web Store
- [ ] All store assets uploaded
- [ ] All information filled out correctly

### ✅ Review Submission
- [ ] All required fields completed
- [ ] Information reviewed for accuracy
- [ ] Extension submitted for review

## Post-Submission

### ✅ Monitor Review
- [ ] Check dashboard regularly for updates
- [ ] Respond to reviewer questions promptly
- [ ] Be prepared to make changes if requested

### ✅ After Approval
- [ ] Monitor user feedback and ratings
- [ ] Respond to user reviews
- [ ] Plan for future updates

## Common Issues to Avoid

### ❌ Privacy Issues
- [ ] Ensure privacy policy is publicly accessible
- [ ] Verify no data collection statements
- [ ] Check permissions are minimal and justified

### ❌ Functionality Issues
- [ ] Test extension thoroughly before submission
- [ ] Ensure all features work as described
- [ ] Check for any console errors

### ❌ Content Issues
- [ ] Ensure description matches actual functionality
- [ ] Remove any misleading claims
- [ ] Use appropriate category

## Final Verification

### ✅ Before Final Submit
- [ ] All assets created and uploaded
- [ ] Privacy policy hosted and accessible
- [ ] Terms of service hosted and accessible
- [ ] Extension tested thoroughly
- [ ] Package created without development files
- [ ] All descriptions written and proofread
- [ ] Permissions justified and minimal
- [ ] No console errors in production build
- [ ] All features working as described
- [ ] Screenshots show actual functionality

## Quick Commands

### Create Production Package
```bash
chmod +x package-for-store.sh
./package-for-store.sh
```

### Test Extension Locally
```bash
# Load unpacked extension in Chrome
# Go to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the extension directory
```

### Check Package Contents
```bash
unzip -l taboracle-production-*.zip
```

---

**Status**: [ ] Ready for submission
**Last Updated**: $(date)
**Version**: $(grep '"version"' manifest.json | cut -d'"' -f4)
