import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDayIndex } from '../stores/zenStore';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

const MESSAGES = [
    "Time for a tiny pause? ✨ Capture your zen moment for today.",
    "The world is busy, but you can be still. 🌸 Record your 1.5s of peace.",
    "Don't forget to plant your daily seed of presence. 🌱",
    "Your weekly film is waiting for today's bloom. 🌼",
    "Take a deep breath and snap a moment of quiet. 🧘‍♂️",
    "How's your heart feeling? Share a glimpse of your zen. ✨",
    "A small moment today, a beautiful memory this weekend. 🎬",
];

const getRandomMessage = () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

/**
 * Request permissions for notifications
 */
export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
}

/**
 * Schedule the two daily nudges: 9 AM and 6 PM
 * These are scheduled to repeat daily.
 * We also check if the user has already added a clip for today.
 */
export async function scheduleDailyNudges(hasClipToday: boolean) {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('zensnap-reminders', {
            name: 'ZenSnap Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#A8B5A0',
        });
    }

    // Clear all previous notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (hasClipToday) {
        console.log('ZenSnap: Clip already captured today. Nudges will resume tomorrow.');
    }

    // Schedule 9:00 AM nudge
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Morning Zen ☀️",
            body: getRandomMessage(),
            // @ts-ignore: channelId is supported on Android
            channelId: 'zensnap-reminders',
        },
        trigger: {
            hour: 9,
            minute: 0,
            repeats: true,
        } as any,
    });

    // Schedule 6:00 PM nudge
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Evening Stillness 🌙",
            body: getRandomMessage(),
            // @ts-ignore: channelId is supported on Android
            channelId: 'zensnap-reminders',
        },
        trigger: {
            hour: 18,
            minute: 0,
            repeats: true,
        } as any,
    });

    console.log('ZenSnap: Reminders scheduled for 9 AM and 6 PM.');
}

/**
 * Cancel notifications (e.g. if user turns off reminders in settings)
 */
export async function cancelAllNudges() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
