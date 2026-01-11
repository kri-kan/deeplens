# IGReplyBot Distribution Guide

This document explains how to generate and distribute the IGReplyBot app for offline use.

## 1. Generating the APK File

To build the app and create an installable file, use the following Gradle commands in the Android Studio terminal:

### **Generate Debug APK (Recommended for Testing)**
This generates an APK that can be installed on any device without production signing.
- **Command:** `./gradlew :app:assembleDebug`
- **Location:** `app/build/outputs/apk/debug/app-debug.apk`

### **Generate Release APK (Production Ready)**
This generates an optimized version of the app.
- **Command:** `./gradlew :app:assembleRelease`
- **Location:** `app/build/outputs/apk/release/app-release-unsigned.apk`
*Note: This version is unsigned. For official Play Store distribution, you would need to configure a signing key.*

## 2. Offline Distribution

Once you have the `.apk` file:
1. **Copy the file** to your computer or phone.
2. **Share it** via:
   - Messaging apps (WhatsApp, Telegram)
   - Email attachments
   - Cloud storage (Google Drive, Dropbox)
   - USB cable or SD card
3. **Installation on Phone:**
   - Tap the file to open it.
   - If prompted, allow **"Install from unknown sources"** in your phone's Security settings.
   - Follow the on-screen instructions to complete the installation.

## 3. Initial Configuration

- **Default Messages:** You can edit the starting list of replies in `app/src/main/assets/initial_messages.json` before building.
- **In-App Management:** Users can add, remove, or edit replies directly within the app under the "Manage Reply Messages" screen. These changes persist across restarts.
