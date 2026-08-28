package com.anonymous.vayyari
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    handleShareIntent(intent)
    super.onCreate(null)
  }

  override fun onNewIntent(intent: Intent) {
    handleShareIntent(intent)
    super.onNewIntent(intent)
    setIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action
    val type = intent.type

    val isMedia = type != null && (type.startsWith("image/") || type.startsWith("video/") || type == "*/*")
    if ((Intent.ACTION_SEND == action || Intent.ACTION_SEND_MULTIPLE == action) && isMedia) {
      val rawUris = mutableListOf<Uri>()

      if (Intent.ACTION_SEND == action) {
        val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
        }
        uri?.let { rawUris.add(it) }
      } else if (Intent.ACTION_SEND_MULTIPLE == action) {
        val uriList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
        }
        uriList?.forEach { uri -> rawUris.add(uri) }
      }

      if (rawUris.isNotEmpty()) {
        val sessionId = java.util.UUID.randomUUID().toString()
        val stageDir = java.io.File(cacheDir, "staged_share/$sessionId").apply { mkdirs() }
        val localUris = mutableListOf<String>()

        rawUris.forEachIndexed { index, uri ->
          try {
            val mimeType = contentResolver.getType(uri) ?: type ?: "image/jpeg"
            val extension = when {
              mimeType.contains("png") -> "png"
              mimeType.contains("webp") -> "webp"
              mimeType.contains("gif") -> "gif"
              mimeType.contains("mp4") -> "mp4"
              mimeType.contains("quicktime") || mimeType.contains("mov") -> "mov"
              mimeType.contains("video") -> "mp4"
              else -> "jpg"
            }
            val targetFile = java.io.File(stageDir, "media_${index}.${extension}")
            contentResolver.openInputStream(uri)?.use { inputStream ->
              targetFile.outputStream().use { outputStream ->
                inputStream.copyTo(outputStream)
              }
            }
            localUris.add(Uri.fromFile(targetFile).toString())
          } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to stage shared media stream: $uri", e)
            localUris.add(uri.toString())
          }
        }

        if (localUris.isNotEmpty()) {
          val componentClass = intent.component?.shortClassName ?: ""
          val targetAction = when {
            componentClass.endsWith("ShareOrderActivity") -> "order"
            componentClass.endsWith("ShareProductActivity") -> "product"
            else -> "chooser"
          }
          val encodedUris = localUris.joinToString(",") { Uri.encode(it) }
          val deepLink = "vayyari://share-target?action=$targetAction&sessionId=$sessionId&uris=$encodedUris"
          intent.action = Intent.ACTION_VIEW
          intent.data = Uri.parse(deepLink)
        }
      }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
