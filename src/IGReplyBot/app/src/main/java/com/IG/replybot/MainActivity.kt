package com.IG.replybot

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var btnOverlayPermission: Button
    private lateinit var btnAccessibilitySettings: Button
    private lateinit var btnManageReplies: Button
    private lateinit var btnOpenAppInfo: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tv_status)
        btnOverlayPermission = findViewById(R.id.btn_overlay_permission)
        btnAccessibilitySettings = findViewById(R.id.btn_accessibility_settings)
        btnManageReplies = findViewById(R.id.btn_manage_replies)
        
        // Dynamic addition of App Info button for Android 13+ side-loaded apps
        btnOpenAppInfo = Button(this).apply {
            text = "Step 0: Allow Restricted Settings"
            setOnClickListener {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
                Toast.makeText(context, "Tap 3-dots at top right -> Allow restricted settings", Toast.LENGTH_LONG).show()
            }
        }
        
        // Add it to the layout programmatically if we're on a modern Android version
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            (findViewById<android.view.ViewGroup>(R.id.main_layout)).addView(btnOpenAppInfo, 0)
        }

        btnOverlayPermission.setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        btnAccessibilitySettings.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
        }

        btnManageReplies.setOnClickListener {
            val intent = Intent(this, MessagesActivity::class.java)
            startActivity(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun updateStatus() {
        val hasOverlayPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }

        val isServiceEnabled = isAccessibilityServiceEnabled(this, ReplyOverlayService::class.java)

        if (!hasOverlayPermission) {
            tvStatus.text = "⚠️ Overlay Permission Required\n\nClick below to grant permission:"
            btnOverlayPermission.isEnabled = true
            btnAccessibilitySettings.isEnabled = false
        } else if (!isServiceEnabled) {
            tvStatus.text = "✅ Overlay Permission Granted\n\n⚠️ Accessibility Service Disabled\n\nClick below to enable it:"
            btnOverlayPermission.isEnabled = false
            btnAccessibilitySettings.isEnabled = true
            btnAccessibilitySettings.text = "Enable Accessibility Service"
        } else {
            tvStatus.text = "✅ Bot is Active!\n\nAccessibility Service is running."
            btnOverlayPermission.isEnabled = false
            btnAccessibilitySettings.isEnabled = true
            btnAccessibilitySettings.text = "Disable Accessibility Service"
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context, service: Class<out AccessibilityService>): Boolean {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC) ?: return false
        for (enabledService in enabledServices) {
            val enabledServiceInfo = enabledService.resolveInfo?.serviceInfo ?: continue
            if (enabledServiceInfo.packageName == context.packageName && enabledServiceInfo.name == service.name) {
                return true
            }
        }
        return false
    }
}
