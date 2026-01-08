import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useZenStore } from '../../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius, DayNames } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen() {
    const { day } = useLocalSearchParams<{ day: string }>();
    const dayIndex = parseInt(day || '0', 10);

    const getClipForDay = useZenStore((state) => state.getClipForDay);
    const clip = getClipForDay(dayIndex);

    // Create video player with the new expo-video API
    const player = useVideoPlayer(clip?.videoUri || null, player => {
        player.loop = true;
        player.play();
    });

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handlePlayPause = () => {
        if (!player) return;

        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    if (!clip) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Clip not found</Text>
                <Pressable onPress={handleBack}>
                    <Text style={styles.backLink}>← Go back</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const clipDate = new Date(clip.date);
    const formattedDate = clipDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.header}
            >
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <View style={styles.headerCenter}>
                    <Text style={styles.dayName}>{DayNames[dayIndex]}</Text>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                </View>
                <View style={styles.headerRight} />
            </Animated.View>

            {/* Video Player */}
            <Animated.View
                entering={FadeInUp.delay(100).duration(500)}
                style={styles.videoContainer}
            >
                <Pressable onPress={handlePlayPause} style={styles.videoPressable}>
                    <VideoView
                        player={player}
                        style={styles.video}
                        contentFit="cover"
                        nativeControls={false}
                    />
                </Pressable>
            </Animated.View>

            {/* Info */}
            <Animated.View
                entering={FadeIn.delay(300).duration(400)}
                style={styles.infoContainer}
            >
                <Text style={styles.infoText}>1.5 seconds of presence</Text>
                <Text style={styles.capturedText}>
                    Captured at {clipDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    backButton: {
        padding: Spacing.sm,
        width: 44,
    },
    backButtonText: {
        fontSize: Typography.sizes['2xl'],
        color: Colors.textSecondary,
    },
    headerCenter: {
        alignItems: 'center',
    },
    dayName: {
        fontSize: Typography.sizes.lg,
        fontWeight: '500',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
    },
    dateText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    headerRight: {
        width: 44,
    },
    videoContainer: {
        flex: 1,
        paddingHorizontal: Spacing['2xl'],
        paddingTop: Spacing.xl,
    },
    videoPressable: {
        flex: 1,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
    },
    video: {
        flex: 1,
    },
    infoContainer: {
        alignItems: 'center',
        paddingVertical: Spacing['3xl'],
    },
    infoText: {
        fontSize: Typography.sizes.base,
        color: Colors.sage,
        letterSpacing: Typography.letterSpacing.wide,
    },
    capturedText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
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
