# 🚀 Deployment Checklist

## Pre-Deployment Verification

### 1. Apps Script Setup
- [ ] **Code.gs deployed** with correct template literal syntax (backticks fixed)
- [ ] **SECRET constant** set in Apps Script
- [ ] **Web app deployed** with "Anyone" access (NOT "Anyone with Google account")
- [ ] **Webhook URL copied** from deployment
- [ ] **Webhook responds** to GET request with `{"ok":true,"pong":true}`

### 2. Google Sheet Setup
- [ ] **Headers in row 1**: `Timestamp | Platform | Type | Title | URL | ID | Notes`
- [ ] **Sheet name** matches `SHEET_NAME` in Code.gs (default: "Sheet1")
- [ ] **Permissions** allow Apps Script to write

### 3. Chrome Extension Files
- [ ] **manifest.json** includes `https://script.google.com/*` in host_permissions
- [ ] **content.js** has matching SECRET constant
- [ ] **All files present**: manifest.json, content.js, background.js, options.html

## Deployment Steps

### Step 1: Deploy Apps Script
```
1. Go to script.google.com
2. Create new project
3. Replace Code.gs with provided code
4. Save project
5. Deploy > New deployment
6. Type: Web app
7. Execute as: Me
8. Who has access: Anyone
9. Deploy and copy URL
```

### Step 2: Install Extension
```
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension folder
5. Note extension ID for debugging
```

### Step 3: Configure Extension
```
1. Click extension icon
2. Go to Options
3. Enter webhook URL
4. Enter secret key (must match Apps Script)
5. Click "Save Settings"
6. Click "Send Test" - should succeed
```

### Step 4: Verify Installation
```
1. Open test.html in browser
2. Run all tests:
   - Ping test (should pass)
   - Single row test (should add row to sheet)
   - Batch test (should add 2 rows)
   - Duplicate test (should skip duplicate)
   - Invalid signature test (should reject)
```

## Common Issues & Fixes

### ❌ "Forbidden" Error
**Cause**: Apps Script deployment access wrong
**Fix**: Redeploy with "Anyone" access, NOT "Anyone with Google account"

### ❌ CORS Error
**Cause**: Missing script.google.com permission
**Fix**: Check manifest.json has `"https://script.google.com/*"` in host_permissions

### ❌ No Rows Added
**Cause**: Sheet name mismatch or template literal syntax error
**Fix**: 
1. Check `SHEET_NAME` in Code.gs matches actual sheet name
2. Verify template literals use backticks: `${variable}` not ${variable}

### ❌ Extension Not Capturing
**Cause**: Platform detection or DOM observer issues
**Fix**:
1. Check browser console for errors
2. Verify on supported platforms (ChatGPT, Claude, Grok)
3. Wait for page to fully load before navigating

### ❌ Signature Mismatch
**Cause**: SECRET constants don't match between extension and Apps Script
**Fix**: Ensure both use exact same secret string

## Testing Scenarios

### Manual Tests
1. **ChatGPT**: Create new chat, verify row appears in sheet
2. **Claude**: Start new conversation, check for capture
3. **Grok**: Open new chat, confirm logging
4. **Fast Navigation**: Quickly switch between chats, ensure no duplicates
5. **Page Reload**: Refresh pages, verify no duplicate captures

### Automated Tests (test.html)
- Run all 5 tests in sequence
- All should pass for successful deployment
- Check Google Sheet for test rows

## Production Hardening

### Security
- [ ] Change default SECRET to unique value
- [ ] Verify HMAC signatures working properly
- [ ] Test with invalid signatures

### Performance  
- [ ] Monitor batch processing efficiency
- [ ] Check retry queue doesn't grow indefinitely
- [ ] Verify offline/online handling

### Reliability
- [ ] Test with slow network connections
- [ ] Verify duplicate detection working
- [ ] Check local storage persistence

## Monitoring

### Google Sheet
- Monitor for new rows appearing
- Check for duplicate entries
- Verify timestamp accuracy

### Browser Console
- Content script errors: Inspect page > Console
- Extension errors: Right-click extension > Inspect
- Background script: chrome://extensions > Inspect views

### Apps Script Logs
- script.google.com > Project > Executions
- Monitor for errors or failed requests
- Check request frequency and patterns

## Rollback Plan

If issues occur:
1. **Disable extension**: chrome://extensions > toggle off
2. **Revert Apps Script**: Restore previous version
3. **Clear storage**: Extension options > Clear captures/failed queue
4. **Debug systematically**: Use test.html to isolate issues

---

✅ **Success Indicators**:
- Webhook ping test passes
- Test rows appear in Google Sheet
- Extension captures real chats across platforms  
- No JavaScript errors in console
- Duplicate detection prevents repeat entries