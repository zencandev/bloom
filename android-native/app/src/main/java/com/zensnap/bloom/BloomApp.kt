package com.zensnap.bloom

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class BloomApp : Application() {
    
    companion object {
        const val NOTIFICATION_CHANNEL_ID = "bloom_reminders"
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Bloom Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Daily reminders to capture your moment"
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}
