package com.zensnap.bloom.notifications

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.zensnap.bloom.BloomApp
import com.zensnap.bloom.MainActivity
import com.zensnap.bloom.R
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import java.util.*

/**
 * Notification manager for daily reminders
 * Schedules morning (9 AM) and evening (5 PM) notifications
 */
object NotificationScheduler {
    
    private const val MORNING_HOUR = 9
    private const val EVENING_HOUR = 17
    
    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }
    
    /**
     * Schedule daily reminders at 9 AM and 5 PM
     */
    fun scheduleReminders(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (!hasNotificationPermission(context)) return

        // Schedule 9 AM
        scheduleDaily(context, alarmManager, 9, 0, 100)
        // Schedule 5 PM
        scheduleDaily(context, alarmManager, 17, 0, 101)
    }

    private fun scheduleDaily(
        context: Context,
        alarmManager: AlarmManager,
        hour: Int,
        minute: Int,
        requestCode: Int
    ) {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            
            // If time is in the past, schedule for tomorrow
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        val intent = Intent(context, NotificationReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

class NotificationReceiver : BroadcastReceiver() {
    
    private val quotes = listOf(
        "Take a deep breath. Capture a moment of peace. 🌸",
        "The present moment is the only one we have. Capture it. ✨",
        "Find beauty in the ordinary. Step into the quiet. 🌿",
        "A moment of mindfulness changes everything. 🧘",
        "Nature doesn't hurry, yet everything is accomplished. 🍃",
        "Your daily zen is waiting to be captured. 📸",
        "Pause. Breathe. Bloom. 🌺",
        "Quiet the mind, and the soul will speak. 🕯️",
        "Every moment is a fresh beginning. Capture yours. 🌅",
        "In the middle of movement, keep stillness inside you. 🌊",
        "Slow down and notice the quiet blooming around you. 🐾",
        "The best time for a deep breath is now. 🌬️",
        "One moment can change your whole day. Capture it. 🎗️",
        "Let your heart bloom with gratitude today. 🌷",
        "Peace begins with a single focused second. 🕊️"
    )

    override fun onReceive(context: Context, intent: Intent) {
        val zenStore = com.zensnap.bloom.data.ZenStore(context)
        
        // Use a coroutine to check the data store
        val scope = MainScope()
        val pendingResult = goAsync()
        
        scope.launch {
            try {
                // Initialize store to load current week data
                zenStore.initialize()
                
                // Only show notification if no clip for today
                if (!zenStore.hasClipForToday()) {
                    showNotification(context)
                }
                
                // Reschedule for next day (to keep it going)
                NotificationScheduler.scheduleReminders(context)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun showNotification(context: Context) {
        val randomQuote = quotes.random()
        
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, BloomApp.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("Time to Bloom 🌸")
            .setContentText(randomQuote)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
