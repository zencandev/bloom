package com.zencan.bloom.notifications

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
import com.zencan.bloom.BloomApp
import com.zencan.bloom.MainActivity
import com.zencan.bloom.R
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
    private const val MONDAY_GENERATE_HOUR = 0
    private const val MONDAY_GENERATE_MINUTE = 1
    private const val MONDAY_SUMMARY_HOUR = 9
    
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

        // Daily 9 AM and 5 PM reminders
        scheduleDaily(context, alarmManager, MORNING_HOUR, 0, 100)
        scheduleDaily(context, alarmManager, EVENING_HOUR, 0, 101)
        
        // Monday 12:01 AM generation (End of week)
        scheduleWeekly(context, alarmManager, Calendar.MONDAY, MONDAY_GENERATE_HOUR, MONDAY_GENERATE_MINUTE, 200)
        
        // Monday 9 AM summary (Watch notification)
        scheduleWeekly(context, alarmManager, Calendar.MONDAY, MONDAY_SUMMARY_HOUR, 0, 201)
    }

    private fun scheduleWeekly(
        context: Context,
        alarmManager: AlarmManager,
        dayOfWeek: Int,
        hour: Int,
        minute: Int,
        requestCode: Int
    ) {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.DAY_OF_WEEK, dayOfWeek)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.WEEK_OF_YEAR, 1)
            }
        }
        
        val intent = Intent(context, NotificationReceiver::class.java).apply {
            putExtra("action", if (dayOfWeek == Calendar.SUNDAY) "GENERATE" else "SUMMARY")
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        try {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
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
        val action = intent.getStringExtra("action") ?: "REMINDER"
        val zenStore = com.zencan.bloom.data.ZenStore(context)
        
        val scope = MainScope()
        val pendingResult = goAsync()
        
        scope.launch {
            try {
                zenStore.initialize()
                
                when (action) {
                    "GENERATE" -> {
                        // Monday 12:01 AM: Transition week and generate if clips exist
                        zenStore.rotateWeekIfNecessary()
                        
                        // Check last week in history for generation if missing
                        val lastWeek = zenStore.history.value.firstOrNull()
                        if (lastWeek != null && lastWeek.generatedVideoUri == null && lastWeek.clips.isNotEmpty()) {
                            val result = com.zencan.bloom.video.VideoStitcher.makeZenVideo(
                                context,
                                lastWeek.clips.sortedBy { it.dayIndex }.map { it.videoUri },
                                "zen_music_yoga.mp3"
                            )
                            if (result is com.zencan.bloom.video.VideoStitcher.Result.Success) {
                                // Update the history item with the new URI
                                val updatedHistory = zenStore.history.value.toMutableList()
                                updatedHistory[0] = lastWeek.copy(generatedVideoUri = result.outputPath)
                                // We need a way to save history directly from here or update it in ZenStore
                                zenStore.updateHistory(updatedHistory)
                            }
                        }
                    }
                    "SUMMARY" -> {
                        // Monday 9 AM: Watch notification
                        showSummaryNotification(context)
                    }
                    else -> {
                        // Normal daily reminder
                        if (!zenStore.hasClipForToday()) {
                            showNotification(context)
                        }
                    }
                }
                
                // Reschedule everything
                NotificationScheduler.scheduleReminders(context)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun showSummaryNotification(context: Context) {
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("navigate_to", "history")
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            99,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, com.zencan.bloom.BloomApp.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("Last week is in Bloom 🌸")
            .setContentText("Relive last week's Zen and capture your first moment of this week!")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(200, notification)
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
