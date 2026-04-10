Here is a summary of the steps we took to decouple your Android Virtual Device (AVD) from Android Studio so you can use it with Antigravity and Expo.
## Objective
To run an Android emulator as a standalone process and ensure development tools (Expo/CLI) can communicate with it without Android Studio being open.
------------------------------
## Step 1: Locate the Android SDK
First, we identified where the Android SDK lives on your machine.

* Path: C:\Users\ADMIN\AppData\Local\Android\Sdk
* Note: This contains two critical subfolders: emulator (to start the device) and platform-tools (to connect the app to the device via adb).

## Step 2: Configure System Environment Variables
To run commands from any terminal (including the one in Antigravity), we added the SDK tools to your Windows Path.

   1. Opened Edit the system environment variables from the Start Menu.
   2. Updated the User Path variable with these two entries:
   * C:\Users\ADMIN\AppData\Local\Android\Sdk\emulator
      * C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools
   3. Created a New User Variable named ANDROID_HOME with the value:
   * C:\Users\ADMIN\AppData\Local\Android\Sdk
   
## Step 3: Launch the Emulator via CLI
Instead of using the Android Studio GUI, we used the terminal to start the device.

   1. List Devices: emulator -list-avds (to get the exact name, e.g., Pixel_8_Pro).
   2. Start Device: emulator @Pixel_8_Pro
   * The @ symbol is mandatory before the name.
   
## Step 4: Verify Connection for Expo
To solve the "No Android connected device found" error in Expo, we verified that adb (Android Debug Bridge) could see the running emulator.

   1. With the emulator running, opened a new terminal.
   2. Ran: adb devices
   3. Result: The terminal showed emulator-5554 device, confirming the bridge was active.

## Step 5: Run the Project in Antigravity
With the emulator running independently in the background:

   1. Opened the project in Antigravity.
   2. Ran: npm run android (or npx expo start).
   3. The app now installs and opens on the standalone emulator because the Path and ANDROID_HOME variables are correctly set.

------------------------------
## Summary of Commands for Daily Use

| Action           | Command               |
| ---------------- | --------------------- |
| Start Emulator   | emulator @Pixel_8_Pro |
| Check Connection | adb devices           |
| Run App          | npm run android       |

## Troubleshooting Graphic Performance Errors

This is a graphics rendering error (OpenGL error 0x502, which stands for GL_INVALID_OPERATION). It happens when the emulator tries to use your computer's graphics card (GPU) to draw the Android interface, but there is a mismatch between the emulator's drivers and your PC's drivers.
Even though you see these red lines in the terminal, the emulator often still works. However, if it’s flickering, slow, or showing a black screen, here is how to fix it:

### 1. The "Software Rendering" Fix (Most Reliable)
This tells the emulator to use your CPU instead of your GPU to handle graphics. It’s slower but stops the errors.

* Run the command with the -gpu swiftshader_indirect flag:

`emulator @Pixel_8_Pro -gpu swiftshader_indirect`


### 2. Update Graphics Drivers
If you are on a laptop with both Intel and Nvidia/AMD graphics, the emulator might be getting "confused" about which one to use.

* Update your GPU drivers from the manufacturer's website.
* In Windows Settings > System > Display > Graphics, find emulator.exe and set it to "High Performance".

### 3. Change Graphics Settings in Android Studio
If you prefer a permanent fix without typing extra commands:

   1. Open Android Studio > Device Manager.
   2. Click the Pencil icon (Edit) next to your Pixel_8_Pro.
   3. Click Show Advanced Settings.
   4. Scroll to Graphics and change it from "Automatic" to "Software - GLES 2.0".
   5. Click Finish and try launching from the terminal again.

Quick Check: Is the emulator window actually opening and showing the Android home screen, or is it stuck on a black screen?

---

Would you like to create a desktop shortcut (.bat file) that launches your Pixel 8 Pro with a single click?
