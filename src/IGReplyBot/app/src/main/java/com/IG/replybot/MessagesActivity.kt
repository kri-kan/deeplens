package com.IG.replybot

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class MessagesActivity : AppCompatActivity() {

    private lateinit var etMessages: EditText
    private lateinit var btnSaveMessages: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_messages)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Manage Replies"

        etMessages = findViewById(R.id.et_messages)
        btnSaveMessages = findViewById(R.id.btn_save_messages)

        val sharedPrefs = getSharedPreferences("IGReplyBotPrefs", Context.MODE_PRIVATE)
        val savedMessages = sharedPrefs.getString("messages", null)
        
        if (savedMessages != null) {
            // Display with pipe separator for clarity
            etMessages.setText(savedMessages.split("|").joinToString(" | "))
        } else {
            try {
                val jsonString = assets.open("initial_messages.json").bufferedReader().use { it.readText() }
                val jsonObject = JSONObject(jsonString)
                val jsonArray = jsonObject.getJSONArray("messages")
                val messageList = mutableListOf<String>()
                for (i in 0 until jsonArray.length()) {
                    messageList.add(jsonArray.getString(i))
                }
                etMessages.setText(messageList.joinToString(" | "))
            } catch (e: Exception) {
                Log.e("MessagesActivity", "Error loading JSON", e)
                etMessages.setText("Hi! | Hello!")
            }
        }

        btnSaveMessages.setOnClickListener {
            val rawInput = etMessages.text.toString().trim()
            if (rawInput.isNotEmpty()) {
                // Save using the pipe symbol as the internal separator
                val processedMessages = rawInput.split("|").map { it.trim() }.filter { it.isNotEmpty() }.joinToString("|")
                sharedPrefs.edit().putString("messages", processedMessages).apply()
                
                Toast.makeText(this, "Messages saved and Bot reloaded!", Toast.LENGTH_SHORT).show()
                
                // Trigger reload in service
                val intent = Intent(this, ReplyOverlayService::class.java)
                intent.action = "ACTION_RELOAD_MESSAGES"
                startService(intent)
                
                finish()
            } else {
                Toast.makeText(this, "Please enter some messages", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
