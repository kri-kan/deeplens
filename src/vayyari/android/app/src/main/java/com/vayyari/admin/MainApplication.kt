package com.vayyari.admin

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    val otaDir = java.io.File(applicationContext.filesDir, "ota")
    val otaBundle = java.io.File(otaDir, "active/bundle.js")
    val statusFile = java.io.File(otaDir, "status.json")

    var bundlePath: String? = null

    if (otaBundle.exists()) {
      var isHealthy = true
      try {
        if (statusFile.exists()) {
          val content = statusFile.readText()
          val json = org.json.JSONObject(content)
          val status = json.optString("status", "stable")
          val bootAttempts = json.optInt("bootAttempts", 0)

          if (status == "failed" || bootAttempts >= 2) {
            android.util.Log.e(
              "VayyariOTA",
              "🚨 Crash loop detected for OTA bundle (attempts: $bootAttempts, status: $status). Purging active OTA bundle and reverting to embedded asset bundle."
            )
            isHealthy = false
            val activeDir = java.io.File(otaDir, "active")
            activeDir.deleteRecursively()
            json.put("status", "crashed_reverted")
            json.put(
              "updatedAt",
              java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
              }.format(java.util.Date())
            )
            statusFile.writeText(json.toString(2))
          } else if (status == "pending_validation") {
            val newAttempts = bootAttempts + 1
            android.util.Log.i(
              "VayyariOTA",
              "OTA bundle in pending_validation state. Incrementing boot attempt counter to $newAttempts."
            )
            json.put("bootAttempts", newAttempts)
            statusFile.writeText(json.toString(2))
          }
        }
      } catch (e: Exception) {
        android.util.Log.w("VayyariOTA", "Failed to parse OTA status file, proceeding with caution", e)
      }

      if (isHealthy && otaBundle.exists()) {
        bundlePath = otaBundle.absolutePath
        android.util.Log.i("VayyariOTA", "Loading active OTA bundle from: $bundlePath")
      }
    }

    if (bundlePath == null) {
      android.util.Log.i("VayyariOTA", "No active/healthy OTA bundle found, loading embedded asset bundle")
    }

    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
      jsBundleFilePath = bundlePath
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
