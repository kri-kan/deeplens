# Account Session Management UI - Detailed Design

## Overview

This document details the UI workflow for managing Instagram and YouTube account sessions, including initial setup, health monitoring, and re-authorization flows.

---

## UI Location

**Path**: DeepLens WebUI → Competitor Intel → **Settings Tab**

```
Competitor Intel Module
├── Videos Grid
├── SKU Tagging
├── Insights Dashboard
└── Settings ← NEW
    ├── Scraper Accounts (Instagram/YouTube auth)
    ├── Watchlist Management
    └── Configuration
```

---

## 1. Scraper Accounts Section

### Initial State (No Accounts Configured)

```
┌─────────────────────────────────────────────────────────────┐
│  Scraper Accounts                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔐 No scraper accounts configured yet                      │
│                                                              │
│  You need to configure Instagram and YouTube accounts       │
│  to start scraping competitor content.                      │
│                                                              │
│  [➕ Add Instagram Account]  [➕ Add YouTube Account]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Account List View (Configured)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Scraper Accounts                                    [➕ Add Account]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📷 Instagram Account                                                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Username: scraper_deeplens_2026                               │   │
│  │  Status: ✅ Active                                             │   │
│  │  Last Used: 2 hours ago                                        │   │
│  │  Session Expires: ~45 days (estimated)                         │   │
│  │  Health: ████████████████████░░ 90%                           │   │
│  │                                                                 │   │
│  │  Recent Activity:                                              │   │
│  │  • 2h ago: Scraped @competitor1_sarees (25 posts) ✅          │   │
│  │  • 8h ago: Scraped @competitor2_fashion (18 posts) ✅         │   │
│  │  • 14h ago: Scraped @competitor3_boutique (12 posts) ✅       │   │
│  │                                                                 │   │
│  │  [🔄 Test Connection]  [🔐 Re-authenticate]  [🗑️ Remove]     │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ▶ YouTube Account                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Account: deeplens.scraper@gmail.com                           │   │
│  │  Status: ⚠️ Session Expired                                    │   │
│  │  Last Used: 15 days ago                                        │   │
│  │  Health: ████░░░░░░░░░░░░░░░░ 20%                             │   │
│  │                                                                 │   │
│  │  ⚠️ Session expired. Re-authentication required.               │   │
│  │                                                                 │   │
│  │  [🔐 Re-authenticate Now]  [🗑️ Remove]                        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Add Instagram Account Flow

### Step 1: Initial Form

**Modal/Slide-over Panel**:

```
┌───────────────────────────────────────────────────┐
│  Add Instagram Account                        [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ⚠️ Important                                      │
│  Use a dedicated account for scraping, NOT your   │
│  business account. Create a new personal account  │
│  if you don't have one.                           │
│                                                    │
│  Username                                          │
│  [_________________________________]               │
│                                                    │
│  Password                                          │
│  [_________________________________]  👁️           │
│                                                    │
│  ☐ This account has 2FA enabled                   │
│                                                    │
│  [Cancel]                    [Next: Authenticate] │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

### Step 2a: Authentication Flow (No 2FA)

```
┌───────────────────────────────────────────────────┐
│  Authenticating...                            [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ⏳ Connecting to Instagram                       │
│  ████████████████░░░░░░░░░░  65%                 │
│                                                    │
│  Current step: Verifying credentials              │
│                                                    │
│  This may take up to 30 seconds...                │
│                                                    │
└───────────────────────────────────────────────────┘
```

**On Success**:

```
┌───────────────────────────────────────────────────┐
│  Instagram Account Added                      [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ✅ Successfully authenticated!                   │
│                                                    │
│  Account: scraper_deeplens_2026                   │
│  Session saved and ready to use                   │
│                                                    │
│  Next steps:                                       │
│  1. Add competitors to watchlist                  │
│  2. Configure scraping schedule                   │
│  3. Start monitoring                              │
│                                                    │
│  [View Watchlist]              [Close]            │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

### Step 2b: Authentication Flow (With 2FA)

**If 2FA checkbox was checked**:

```
┌───────────────────────────────────────────────────┐
│  Two-Factor Authentication                    [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  Instagram has sent a code to your device.        │
│                                                    │
│  Enter the 6-digit code:                          │
│                                                    │
│  [___] [___] [___] [___] [___] [___]              │
│                                                    │
│  If using an authenticator app:                   │
│  ☐ I have an authenticator app (auto-fill codes) │
│                                                    │
│  TOTP Secret (optional)                           │
│  [_________________________________]               │
│  ℹ️ If you save the secret, future logins will    │
│     be automatic                                   │
│                                                    │
│  [Back]                          [Verify Code]    │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

### Step 2c: Challenge/Checkpoint Flow

**If Instagram shows a challenge**:

```
┌───────────────────────────────────────────────────┐
│  Instagram Security Check                     [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ⚠️ Instagram is asking for additional            │
│     verification (this is normal for new          │
│     accounts or new devices).                     │
│                                                    │
│  Challenge Type: Phone Verification               │
│                                                    │
│  Instagram will send a code to: +91 ****1234      │
│                                                    │
│  [Request Code]                                    │
│                                                    │
│  Enter the code:                                   │
│  [_________________________________]               │
│                                                    │
│  [Verify]                                          │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  Can't receive code?                              │
│  You may need to complete this verification       │
│  manually on your phone first, then try again.    │
│                                                    │
│  [Try Manual Login]              [Cancel]         │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

### Manual Login Fallback

**If automated auth fails**:

```
┌───────────────────────────────────────────────────┐
│  Manual Session Setup                         [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  Automated authentication failed. Please follow   │
│  these steps to manually create a session:        │
│                                                    │
│  1️⃣ Open terminal on this server:                 │
│     ssh user@yourserver                           │
│                                                    │
│  2️⃣ Run this command:                             │
│     ┌──────────────────────────────────────────┐  │
│     │ python -c "                              │  │
│     │ import instaloader                       │  │
│     │ L = instaloader.Instaloader()           │  │
│     │ L.interactive_login('USERNAME')          │  │
│     │ L.save_session_to_file('ig_session')    │  │
│     │ "                                        │  │
│     └──────────────────────────────────────────┘  │
│     [📋 Copy Command]                             │
│                                                    │
│  3️⃣ After completing login, click:                │
│     [✅ I've Completed Manual Login]              │
│                                                    │
│  [Cancel]                                          │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

## 3. Add YouTube Account Flow

### Step 1: Google OAuth Flow

```
┌───────────────────────────────────────────────────┐
│  Add YouTube Account                          [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  YouTube uses Google authentication.              │
│                                                    │
│  Click the button below to sign in with           │
│  your Google account:                             │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │  🔐 Sign in with Google                    │  │
│  │                                             │  │
│  │  This will open Google's login page        │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  ⚠️ Use a dedicated Google account for scraping   │
│     (not your business account)                   │
│                                                    │
│  Permissions needed:                              │
│  • Read public YouTube data                       │
│  • Access public channel information              │
│                                                    │
│  [Cancel]           [Sign in with Google]         │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

### Step 2: OAuth Callback

**Opens in popup/new tab → Google OAuth consent screen**

After user authorizes:

```
┌───────────────────────────────────────────────────┐
│  YouTube Account Added                        [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ✅ Successfully connected!                       │
│                                                    │
│  Account: DeepLens Scraper                        │
│  Email: deeplens.scraper@gmail.com                │
│                                                    │
│  Permissions granted:                             │
│  ✓ Read public YouTube data                       │
│  ✓ Access channel information                     │
│                                                    │
│  Token expires in: 7 days                         │
│  Auto-refresh: Enabled                            │
│                                                    │
│  [Close]                                           │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

## 4. Session Health Monitoring

### Health Dashboard Widget

**Display on main Settings page**:

```
┌─────────────────────────────────────────────────────┐
│  Session Health Overview                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Instagram                                          │
│  Health: ████████████████████░░ 90% ✅             │
│  Last check: 5 minutes ago                          │
│  Status: Working normally                           │
│                                                      │
│  YouTube                                            │
│  Health: ████░░░░░░░░░░░░░░░░ 20% ⚠️              │
│  Last check: 15 days ago                            │
│  Status: Session expired - Re-auth needed           │
│  [Re-authenticate]                                   │
│                                                      │
│  Next automated health check: in 6 hours            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 5. Re-authentication Flows

### Instagram Re-authentication

**When user clicks "Re-authenticate"**:

```
┌───────────────────────────────────────────────────┐
│  Re-authenticate Instagram                    [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  Current account: scraper_deeplens_2026           │
│                                                    │
│  Why re-authenticate?                             │
│  • Session expired (natural after 30-90 days)     │
│  • Instagram requested re-login                   │
│  • Security check required                        │
│                                                    │
│  ○ Quick re-auth (use saved credentials)          │
│     Tries to re-login automatically               │
│                                                    │
│  ○ Full re-auth (enter password again)            │
│     More reliable if quick re-auth fails          │
│                                                    │
│  [Cancel]                          [Continue]     │
│                                                    │
└───────────────────────────────────────────────────┘
```

**Quick Re-auth Flow**:

```
┌───────────────────────────────────────────────────┐
│  Re-authenticating...                         [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ⏳ Attempting quick re-authentication            │
│                                                    │
│  Using saved session data...                      │
│                                                    │
│  This usually takes 10-15 seconds.                │
│                                                    │
│  [Cancel]                                          │
│                                                    │
└───────────────────────────────────────────────────┘
```

**On Success**:

```
┌───────────────────────────────────────────────────┐
│  Re-authentication Successful                 [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ✅ Session refreshed!                            │
│                                                    │
│  Account: scraper_deeplens_2026                   │
│  New session valid for: ~60 days                  │
│                                                    │
│  [Close]                                           │
│                                                    │
└───────────────────────────────────────────────────┘
```

**On Failure** (requires full re-auth):

```
┌───────────────────────────────────────────────────┐
│  Quick Re-auth Failed                         [✕] │
├───────────────────────────────────────────────────┤
│                                                    │
│  ⚠️ Quick re-authentication didn't work.          │
│                                                    │
│  Possible reasons:                                │
│  • Password was changed                           │
│  • Instagram requires manual verification         │
│  • Security check triggered                       │
│                                                    │
│  Please try full re-authentication.               │
│                                                    │
│  [Cancel]              [Full Re-authentication]   │
│                                                    │
└───────────────────────────────────────────────────┘
```

---

## 6. Automated Health Checks & Alerts

### Alert Banner (when session issues detected)

**Displayed at top of Competitor Intel module**:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Action Required: Instagram session expired              │
│                                                              │
│  Your Instagram scraper account needs re-authentication.    │
│  Recent scraping jobs are failing.                          │
│                                                              │
│  [Re-authenticate Now]  [Dismiss for 24h]                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Email Alert (Optional)

**Sent when session health drops below 30%**:

```
Subject: [DeepLens] Instagram session requires re-authentication

Hi,

Your Instagram scraper session health has dropped to 25%.

Recent errors:
- Login required error at 2026-01-18 10:30 AM
- Failed to scrape @competitor1_sarees
- Failed to scrape @competitor2_fashion

Action needed:
Please re-authenticate your Instagram account in the 
DeepLens Competitor Intel settings.

Direct link: https://deeplens.yourdomain.com/competitor-intel/settings

This can be done in under 2 minutes.

Best regards,
DeepLens Monitoring System
```

---

## 7. Backend API Endpoints

### Required Endpoints

```typescript
// Instagram
POST   /api/scraper-accounts/instagram/auth
POST   /api/scraper-accounts/instagram/reauth
POST   /api/scraper-accounts/instagram/test
GET    /api/scraper-accounts/instagram/health
DELETE /api/scraper-accounts/instagram

// YouTube
POST   /api/scraper-accounts/youtube/oauth-init
POST   /api/scraper-accounts/youtube/oauth-callback
POST   /api/scraper-accounts/youtube/test
GET    /api/scraper-accounts/youtube/health
DELETE /api/scraper-accounts/youtube

// General
GET    /api/scraper-accounts/health-overview
POST   /api/scraper-accounts/health-check (manual trigger)
```

---

### Health Check Logic

```python
# Pseudocode for health check
def calculate_health_score(account):
    score = 100
    
    # Check last successful use
    hours_since_used = (now - account.last_used).hours
    if hours_since_used > 168:  # 7 days
        score -= 30
    
    # Check recent failures
    recent_failures = get_failures_last_24h(account)
    score -= (recent_failures * 10)
    
    # Check session age (Instagram sessions expire)
    days_since_auth = (now - account.authenticated_at).days
    if days_since_auth > 60:
        score -= 20
    
    # Test connection (lightweight)
    if not test_connection(account):
        score -= 40
    
    return max(0, min(100, score))
```

---

## 8. Database Schema Additions

### Add accounts table

```sql
CREATE TABLE scraper_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    username VARCHAR(255) NOT NULL,
    
    -- Session data
    session_file_path TEXT,  -- Path to session file
    session_data JSONB,  -- Additional session metadata
    
    -- 2FA settings
    has_2fa BOOLEAN DEFAULT false,
    totp_secret_encrypted TEXT,  -- Encrypted TOTP secret
    
    -- Health tracking
    health_score INT DEFAULT 100,
    last_used_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    last_auth_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'expired', 'failed', 'disabled')
    ),
    
    -- Failure tracking
    consecutive_failures INT DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, username)
);

CREATE INDEX idx_scraper_accounts_platform ON scraper_accounts(platform);
CREATE INDEX idx_scraper_accounts_status ON scraper_accounts(status);
```

---

## 9. Security Considerations

### Password Handling
- ❌ **Never store** passwords in database
- ✅ Use passwords only for initial authentication
- ✅ Store session tokens/cookies (already encrypted by instaloader)

### TOTP Secrets
- ✅ Encrypt TOTP secrets at rest (AES-256)
- ✅ Decrypt only when needed
- ✅ Store in environment variables or secret manager

### Session Files
- ✅ Restrict file permissions (chmod 600)
- ✅ Store in secure directory (not public)
- ✅ Regular rotation (re-auth monthly)

---

## 10. User Experience Enhancements

### Status Indicators

```typescript
// Visual status indicators
const statusConfig = {
  active: {
    color: 'green',
    icon: '✅',
    label: 'Active'
  },
  expired: {
    color: 'orange',
    icon: '⚠️',
    label: 'Session Expired'
  },
  failed: {
    color: 'red',
    icon: '❌',
    label: 'Authentication Failed'
  },
  disabled: {
    color: 'gray',
    icon: '⏸️',
    label: 'Disabled'
  }
};
```

### Progress Indicators

Use real-time updates during authentication:

```
⏳ Connecting to Instagram...
⏳ Verifying credentials...
⏳ Saving session...
✅ Done!
```

### Help Text

Provide inline help for common issues:

```
💡 Tip: If authentication keeps failing, try:
   1. Check username/password are correct
   2. Disable VPN if using one
   3. Try logging in from Instagram app first
   4. Wait 15 minutes and try again
```

---

## 11. Testing Workflow

### Test Connection Button

```
┌───────────────────────────────────────┐
│  Test Connection                      │
├───────────────────────────────────────┤
│                                        │
│  Testing Instagram session...          │
│  ⏳ Fetching account info              │
│                                        │
│  Results:                              │
│  ✅ Successfully connected             │
│  ✅ Can access public profiles         │
│  ✅ Session is valid                   │
│                                        │
│  [Close]                               │
└───────────────────────────────────────┘
```

If test fails:

```
┌───────────────────────────────────────┐
│  Connection Test Failed               │
├───────────────────────────────────────┤
│                                        │
│  ❌ Session is invalid                │
│                                        │
│  Error: LoginRequiredException        │
│                                        │
│  This means your session has expired  │
│  and re-authentication is required.   │
│                                        │
│  [Re-authenticate]        [Close]     │
└───────────────────────────────────────┘
```

---

## 12. Mobile Considerations

Since this is a web UI, ensure mobile responsiveness:

```
Mobile view: Stack vertically
┌─────────────────────┐
│ 📷 Instagram        │
│ ✅ Active           │
│ Health: 90%         │
│ [Test] [Re-auth]    │
└─────────────────────┘

┌─────────────────────┐
│ ▶ YouTube           │
│ ⚠️ Expired          │
│ Health: 20%         │
│ [Re-auth]           │
└─────────────────────┘
```

---

## Summary

This UI plan provides:

✅ **Clear authentication flow** for both Instagram and YouTube  
✅ **Health monitoring** with visual indicators  
✅ **Re-authentication** workflows (quick and full)  
✅ **Manual fallback** for complex cases  
✅ **Automated alerts** when action needed  
✅ **Test connection** functionality  
✅ **Security best practices** (no password storage)  

**Next Steps**:
1. Add to Phase 4 implementation roadmap
2. Create React components for each modal/panel
3. Implement backend API endpoints
4. Add database table for accounts
5. Test with real Instagram/YouTube accounts
