import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useZenStore } from '../stores/zenStore';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions, scheduleDailyNudges, sendTestNotification } from '../utils/notificationService';

export default function RootLayout() {
    const initializeWeek = useZenStore((state) => state.initializeWeek);

    useEffect(() => {
        initializeWeek();

        // Setup notifications
        const setupNotifications = async () => {
            const granted = await requestNotificationPermissions();
            if (granted) {
                const hasClipToday = !!useZenStore.getState().getTodayClip();
                await scheduleDailyNudges(hasClipToday);
                // Trigger a test notification for the user to see immediately (5s delay)
                await sendTestNotification();
            }
        };

        setupNotifications();
    }, []);

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.background },
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen
                    name="breathe"
                    options={{
                        animation: 'fade',
                        gestureEnabled: false,
                    }}
                />
                <Stack.Screen
                    name="capture"
                    options={{
                        animation: 'fade',
                        gestureEnabled: false,
                    }}
                />
                <Stack.Screen name="preview/[day]" />
                <Stack.Screen name="generate" />
                <Stack.Screen name="player" />
            </Stack>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
});
