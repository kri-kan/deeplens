# Session: Fix Story Queue Instagram App Direct Launch (Bug #438)

## Overview
- **ADO Bug ID**: 438
- **ADO Task ID**: 439
- **Review Task ID**: 440
- **Branch**: `squad/438-fix-direct-instagram-app-launch` -> merged into `develop`

## Issue
1. When opening Instagram posts, numeric deep links (`instagram://media?id=...`) caused Instagram's story reshare sticker to create broken numeric URLs (`https://www.instagram.com/p/3957543988533504451`) which 404'd on the web.
2. Opening pure `https://www.instagram.com/...` URLs on Android triggered the mobile web browser (Chrome) instead of opening the native Instagram app directly.

## Solution
1. **Direct Android Intent with Package Pinning**:
   Configured Android Intents explicitly targeting `package=com.instagram.android` with the canonical shortcode post/reel URLs (`intent://www.instagram.com/{postType}/{shortcode}/#Intent;package=com.instagram.android;scheme=https;end`).
   This forces Android OS to bypass browser routing and launch the Instagram app immediately.
2. **Canonical Shortcode Preservation**:
   Because the intent payload delivers the alphanumeric shortcode (`/p/{shortcode}/` or `/reel/{shortcode}/`), Instagram retains the canonical shortcode, ensuring story stickers and reshares publish working public links.
3. **Multi-tier Scheme Fallback**:
   - Primary (Android): `intent://...;package=com.instagram.android;scheme=https;end`
   - Secondary (iOS / App): `instagram://{postType}/{shortcode}`
   - Final Fallback: `https://www.instagram.com/{postType}/{shortcode}/`

## Verification
- `npx tsc --noEmit` in `src/vayyari` passed with 0 errors.
- Reload sent to Expo packager via `tmux send-keys -t expo r C-m`.
