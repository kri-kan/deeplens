# IGReplyBot - Instagram Comment Reply Assistant

An Android accessibility service app that helps you quickly reply to Instagram comments using pre-defined messages.

## 📱 Features

- **Floating Overlay Widget**: Always-on-top widget that appears when using Instagram.
- **Manual Mode**: Click the message snippet to insert the current reply.
- **Auto Mode**: Automatically pastes replies when you focus on an empty Instagram comment input field.
- **Message Rotation**: Cycles through a massive list of 200+ professional messages.
- **Smart Replace**: If you tap again, it replaces the previous bot message with the next one instead of stacking them.
- **In-App Management**: Dedicated screen to add, edit, or remove your reply messages.
- **Draggable Handle**: Move the widget anywhere on your screen.
- **Smart Hide/Show**: Widget automatically hides when you leave Instagram and re-appears when you return.

## 🎮 How to Use

1. **Grant Permissions**: Open the app and follow the on-screen buttons to grant "Overlay Permission" and enable the "Accessibility Service".
2. **Configure Messages**: Go to "Manage Reply Messages" to see your current list. You can edit them here (use the ` | ` symbol to separate messages).
3. **Open Instagram**: The floating widget will appear. 
4. **Manual Paste**: Tap the message text in the widget to paste it into the focused Instagram input.
5. **Auto Mode**: Check the "Auto" box to have the bot paste a message automatically the moment you tap a text field.

## 🏗️ Project Structure

- **`app/src/main/java/.../ReplyOverlayService.kt`**: The core logic for the accessibility service and overlay.
- **`app/src/main/java/.../MessagesActivity.kt`**: The management screen for your reply list.
- **`app/src/main/assets/initial_messages.json`**: The "factory default" list of 200+ messages.
- **`artifacts/`**: Contains the latest generated APK for distribution.

## 🚀 Distribution

To share this app with others:
1. Generate the APK: `./gradlew :app:assembleRelease`
2. Find the file in `artifacts/IGReplyBot-release.apk`.
3. Send this APK file directly to any Android device.

## 🔧 Technical Details

- **Min SDK**: 21 (Android 5.0)
- **Target SDK**: 34 (Android 14)
- **Permissions**: `SYSTEM_ALERT_WINDOW`, `BIND_ACCESSIBILITY_SERVICE`.
- **Theme Stability**: Uses `TYPE_ACCESSIBILITY_OVERLAY` for maximum compatibility with vendor-specific Android skins (Oppo, OnePlus, etc.).

---
*Note: This app is for efficiency. Use responsibly and in accordance with Instagram's community guidelines.*
