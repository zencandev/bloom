import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useZenStore } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
    const currentWeek = useZenStore((state) => state.currentWeek);

    // Create video player with the new expo-video API
    const player = useVideoPlayer(currentWeek?.weeklyZenUri || null, player => {
        player.loop = true;
        player.play();
    });

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleReplay = () => {
        if (player) {
            player.replay();
        }
    };

    if (!currentWeek?.weeklyZenUri) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>No Weekly Zen found</Text>
                <Pressable onPress={handleBack}>
                    <Text style={styles.backLink}>← Go back</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Full screen video */}
            <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls={false}
            />

            {/* Overlay controls */}
            <SafeAreaView style={styles.overlay}>
                {/* Header */}
                <Animated.View
                    entering={FadeIn.delay(500).duration(400)}
                    style={styles.header}
                >
                    <Pressable style={styles.closeButton} onPress={handleBack}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </Pressable>
                </Animated.View>

                {/* Bottom info */}
                <Animated.View
                    entering={FadeIn.delay(700).duration(400)}
                    style={styles.bottomContainer}
                >
                    <Text style={styles.title}>Weekly Zen</Text>
                    <Text style={styles.subtitle}>{currentWeek.weekId}</Text>

                    <Pressable style={styles.replayButton} onPress={handleReplay}>
                        <Text style={styles.replayButtonText}>↻ Replay</Text>
                    </Pressable>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    header: {
        padding: Spacing.xl,
        alignItems: 'flex-end',
    },
    closeButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: Typography.sizes.lg,
        color: Colors.cream,
    },
    bottomContainer: {
        padding: Spacing['2xl'],
        paddingBottom: Spacing['3xl'],
        alignItems: 'center',
    },
    title: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: '300',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.cream,
        opacity: 0.8,
        marginTop: Spacing.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    replayButton: {
        marginTop: Spacing.xl,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: BorderRadius.full,
    },
    replayButtonText: {
        fontSize: Typography.sizes.base,
        color: Colors.cream,
    },
    errorText: {
        fontSize: Typography.sizes.lg,
        color: Colors.cream,
        textAlign: 'center',
        marginTop: Spacing['4xl'],
    },
    backLink: {
        fontSize: Typography.sizes.base,
        color: Colors.sage,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});
