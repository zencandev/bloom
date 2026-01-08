import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useZenStore } from '../stores/zenStore';
import { Colors } from '../constants/theme';

export default function RootLayout() {
    const initializeWeek = useZenStore((state) => state.initializeWeek);

    useEffect(() => {
        initializeWeek();
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
