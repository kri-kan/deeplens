package com.IG.replybot

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.CheckBox
import android.widget.TextView
import org.json.JSONObject

class ReplyOverlayService : AccessibilityService() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var tvReplyCycle: TextView? = null
    private var btnCloseService: Button? = null
    private var checkBoxAutoMode: CheckBox? = null
    private lateinit var params: WindowManager.LayoutParams
    
    private var replyMessages = mutableListOf<String>()
    private var currentIndex = 0
    private var lastInjectedMessage: String? = null
    private var lastAutoFilledNodeHash: Int = 0
    
    private var isAutoMode = false
    private var isManuallyClosed = false
    private val handler = Handler(Looper.getMainLooper())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "ACTION_RELOAD_MESSAGES") {
            loadMessages()
            updateButtonText()
        }
        return super.onStartCommand(intent, flags, startId)
    }

    private fun loadMessages() {
        val sharedPrefs = getSharedPreferences("IGReplyBotPrefs", Context.MODE_PRIVATE)
        val savedMessages = sharedPrefs.getString("messages", null)
        
        if (savedMessages != null) {
            replyMessages = savedMessages.split("|").map { it.trim() }.filter { it.isNotEmpty() }.toMutableList()
        } else {
            try {
                val jsonString = assets.open("initial_messages.json").bufferedReader().use { it.readText() }
                val jsonObject = JSONObject(jsonString)
                val jsonArray = jsonObject.getJSONArray("messages")
                replyMessages = mutableListOf()
                for (i in 0 until jsonArray.length()) {
                    replyMessages.add(jsonArray.getString(i))
                }
            } catch (e: Exception) {
                Log.e("ReplyOverlayService", "Error loading JSON", e)
                replyMessages = mutableListOf("Hi! Kindly direct message us for price and orders.")
            }
        }
        if (currentIndex >= replyMessages.size) currentIndex = 0
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            loadMessages()
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            
            // Android 15 stability: inflate with a slight delay if needed, 
            // but here we ensure the layout flags are high-compatibility.
            floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_widget, null)
            
            params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or 
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, // Needed for Nothing Phone/Android 15
                PixelFormat.TRANSLUCENT
            )
            
            params.gravity = Gravity.TOP or Gravity.START
            params.x = 100
            params.y = 100
            
            setupDraggableTouchListener()
            
            // Short delay before adding view helps on Android 15 system startup
            handler.postDelayed({
                try {
                    windowManager?.addView(floatingView, params)
                    
                    tvReplyCycle = floatingView?.findViewById(R.id.btn_reply_cycle)
                    btnCloseService = floatingView?.findViewById(R.id.btn_close_service)
                    checkBoxAutoMode = floatingView?.findViewById(R.id.switch_auto_mode)
                    
                    updateButtonText()
                    
                    tvReplyCycle?.setOnClickListener { pasteMessage(null) }
                    btnCloseService?.setOnClickListener {
                        isManuallyClosed = true
                        floatingView?.visibility = View.GONE
                    }
                    checkBoxAutoMode?.setOnCheckedChangeListener { _, isChecked ->
                        isAutoMode = isChecked
                        if (!isChecked) lastAutoFilledNodeHash = 0
                    }
                    floatingView?.visibility = View.VISIBLE
                } catch (e: Exception) {
                    Log.e("ReplyOverlayService", "Error adding view", e)
                }
            }, 200)
            
        } catch (e: Exception) {
            Log.e("ReplyOverlayService", "Connection Error", e)
        }
    }

    private fun setupDraggableTouchListener() {
        floatingView?.setOnTouchListener(object : View.OnTouchListener {
            private var initialX: Int = 0
            private var initialY: Int = 0
            private var initialTouchX: Float = 0f
            private var initialTouchY: Float = 0f

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                try {
                    when (event.action) {
                        MotionEvent.ACTION_DOWN -> {
                            initialX = params.x
                            initialY = params.y
                            initialTouchX = event.rawX
                            initialTouchY = event.rawY
                            return true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            params.x = initialX + (event.rawX - initialTouchX).toInt()
                            params.y = initialY + (event.rawY - initialTouchY).toInt()
                            windowManager?.updateViewLayout(floatingView, params)
                            return true
                        }
                        MotionEvent.ACTION_UP -> {
                            val diffX = Math.abs(event.rawX - initialTouchX)
                            val diffY = Math.abs(event.rawY - initialTouchY)
                            if (diffX < 10 && diffY < 10) v.performClick()
                            return true
                        }
                    }
                } catch (e: Exception) {
                    Log.e("ReplyOverlayService", "Touch Error", e)
                }
                return false
            }
        })
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        try {
            event ?: return
            val packageName = event.packageName?.toString() ?: ""
            val isInstagram = packageName.contains("instagram", ignoreCase = true)
            
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                if (!isInstagram && packageName != this.packageName) {
                    isManuallyClosed = false
                    floatingView?.visibility = View.GONE
                } else {
                    floatingView?.visibility = if (isManuallyClosed) View.GONE else View.VISIBLE
                }
                lastAutoFilledNodeHash = 0
            }
            
            if (isAutoMode && isInstagram && (event.eventType == AccessibilityEvent.TYPE_VIEW_FOCUSED || event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED)) {
                val source = event.source
                if (source != null && source.isEditable) {
                    if (source.hashCode() != lastAutoFilledNodeHash) {
                        handler.removeCallbacksAndMessages(null)
                        handler.postDelayed({
                            pasteMessage(source)
                        }, 300)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("ReplyOverlayService", "Event Error", e)
        }
    }

    private fun pasteMessage(targetNode: AccessibilityNodeInfo?) {
        val nodeToUse = targetNode ?: rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        
        if (nodeToUse != null && nodeToUse.isEditable) {
            if (replyMessages.isEmpty()) return
            
            val currentMessage = replyMessages[currentIndex]
            val existingText = nodeToUse.text?.toString() ?: ""
            
            val newText: String
            if (lastInjectedMessage != null && existingText.endsWith(lastInjectedMessage!!)) {
                val baseText = existingText.substring(0, existingText.length - lastInjectedMessage!!.length)
                newText = baseText + currentMessage
            } else {
                newText = if (existingText.isNotEmpty() && !existingText.endsWith(" ")) {
                    "$existingText $currentMessage"
                } else {
                    "$existingText$currentMessage"
                }
            }

            val arguments = Bundle()
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, newText)
            nodeToUse.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
            
            lastInjectedMessage = currentMessage
            lastAutoFilledNodeHash = nodeToUse.hashCode()
            currentIndex = (currentIndex + 1) % replyMessages.size
            updateButtonText()
            
            if (targetNode == null) nodeToUse.recycle()
        }
    }

    private fun updateButtonText() {
        if (replyMessages.isEmpty()) {
            tvReplyCycle?.text = "No Messages"
            return
        }
        val nextMessage = replyMessages[currentIndex]
        tvReplyCycle?.text = nextMessage
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView?.parent != null) windowManager?.removeView(floatingView)
    }
}
