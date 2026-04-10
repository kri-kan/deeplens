# IGReplyBot Distribution Guide

This document explains how to generate, install, and authorize the IGReplyBot app for offline use, especially on modern Android versions (13, 14, and 15).

## 1. Generating the APK File

To build the app, use the following Gradle commands in the Android Studio terminal:

### **Generate Debug APK (Highly Recommended)**
This generates an APK that is automatically signed with a debug key, making it much easier to install on modern phones.
- **Command:** `./gradlew :app:assembleDebug`
- **Location:** `artifacts/IGReplyBot-debug.apk`

### **Generate Release APK**
- **Command:** `./gradlew :app:assembleRelease`
- **Location:** `artifacts/IGReplyBot-release.apk`

---

## 2. Installation & Security Bypass

Modern Android versions have strict security for side-loaded apps. Follow these steps to ensure the app installs and runs correctly.

### **Step A: Disable Google Play Protect (Temporary)**
If the installation is blocked by a "Harmful App" or "Sensitive Information" popup:
1. Open the **Google Play Store**.
2. Tap your **Profile Icon** (top right).
3. Tap **Play Protect**.
4. Tap the **Settings (cog icon)** in the top right.
5. Turn **OFF** both:
   - "Scan apps with Play Protect"
   - "Improve harmful app detection"
6. Try installing the APK again.

### **Step B: Install with "More Details"**
1. Open the APK file.
2. If a popup says **"App blocked"**:
   - Tap on **"More details"** (small dropdown/link).
   - Tap **"Install anyway"**.

---

## 3. Authorizing the App (Android 13, 14, 15)

Once installed, the Accessibility and Overlay settings will be **greyed out** by default. You must perform the "Nothing OS Handshake":

### **Allow Restricted Settings**
1. Open your phone **Settings**.
2. Go to **Apps > All apps** (or Search for "IGReplyBot").
3. Tap on **IGReplyBot** to open its App Info page.
4. Tap the **three dots (⋮)** in the top right corner.
5. Select **"Allow restricted settings"**.
6. Confirm with your PIN or Fingerprint.

### **Optimize Battery (Crucial)**
To prevent the system from killing the bot in the background:
1. In the same **App Info** page, tap **Battery**.
2. Select **"Unrestricted"**.

---

## 4. Usage Instructions

1. **Step 1: Grant Overlay Permission**
   - Open the app and tap "Step 1". Allow the app to "Display over other apps".
2. **Step 2: Enable Accessibility Service**
   - Tap "Step 2". Find **IGReplyBot** in the list and toggle it **ON**.
3. **Open Instagram**
   - The floating widget will appear. Use it to cycle through your 200+ professional replies!
