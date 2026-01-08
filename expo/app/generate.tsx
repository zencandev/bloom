import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import Animated, {
    FadeIn,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useZenStore } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius, DayNames } from '../constants/theme';
import { isFFmpegAvailable, stitchVideos, fallbackStitch, StitchResult } from '../utils/videoStitcher';

const { width } = Dimensions.get('window');

type GenerationState = 'preview' | 'generating' | 'complete' | 'error';

export default function GenerateScreen() {
    const [state, setState] = useState<GenerationState>('preview');
    const [progress, setProgress] = useState(0);
    const [generatedUri, setGeneratedUri] = useState<string | null>(null);

    const currentWeek = useZenStore((state) => state.currentWeek);
    const setWeeklyZenUri = useZenStore((state) => state.setWeeklyZenUri);

    // Animation
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        // Auto-switch to complete if video already exists
        if (currentWeek?.weeklyZenUri) {
            setGeneratedUri(currentWeek.weeklyZenUri);
            setState('complete');
        }

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );
    }, [currentWeek?.weeklyZenUri]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleGenerate = async () => {
        if (!currentWeek?.clips || currentWeek.clips.length < 7) {
            Alert.alert('Not Ready', 'You need 7 clips to generate your Weekly Zen.');
            return;
        }

        setState('generating');
        setProgress(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Sort clips by day index
            const sortedClips = [...currentWeek.clips].sort((a, b) => a.dayIndex - b.dayIndex);
            const clipUris = sortedClips.map(clip => clip.videoUri);

            // Setup output path
            const weeklyDir = `${FileSystem.documentDirectory}zensnap/weekly/`;
            const dirInfo = await FileSystem.getInfoAsync(weeklyDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(weeklyDir, { intermediates: true });
            }
            const outputUri = `${weeklyDir}${currentWeek.weekId}.mp4`;

            // Check if FFmpeg is available
            const ffmpegAvailable = await isFFmpegAvailable();

            let result: StitchResult;

            if (ffmpegAvailable) {
                // Use FFmpeg with Lo-Fi filters
                const audioAsset = Asset.fromModule(require('../assets/audio/zen-music-yoga.mp3'));
                await audioAsset.downloadAsync();
                const audioUri = audioAsset.localUri || audioAsset.uri;

                result = await stitchVideos({
                    clipUris,
                    outputUri,
                    audioUri,
                    onProgress: (progress) => {
                        setProgress(Math.floor(progress * 100));
                    },
                });
            } else {
                // Fallback: simulate progress and copy first clip
                console.log('FFmpeg not available, using fallback');
                for (let i = 0; i <= 100; i += 10) {
                    setProgress(i);
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
                result = await fallbackStitch(clipUris, outputUri);
            }

            if (result.success && result.outputUri) {
                setGeneratedUri(result.outputUri);
                setWeeklyZenUri(result.outputUri);
                setState('complete');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                throw new Error(result.error || 'Generation failed');
            }

        } catch (error) {
            setState('error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleSaveToGallery = async () => {
        if (!generatedUri) return;

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant photo library access to save your Weekly Zen.');
                return;
            }

            await MediaLibrary.saveToLibraryAsync(generatedUri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Saved!', 'Your Weekly Zen has been saved to your photo library.', [
                { text: 'View', onPress: () => router.push('/player') },
                { text: 'Done', onPress: () => router.replace('/') },
            ]);
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save to gallery.');
        }
    };

    const handlePlayPreview = () => {
        if (generatedUri) {
            router.push('/player');
        }
    };

    const handleBack = () => {
        router.back();
    };

    const getWeekLabel = () => {
        if (!currentWeek) return '';
        const weekNum = currentWeek.weekId.split('-W')[1];
        return `Week ${parseInt(weekNum)} Zen`;
    };

    const clips = currentWeek?.clips || [];
    const sortedClips = [...clips].sort((a, b) => a.dayIndex - b.dayIndex);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Weekly Zen</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {state === 'preview' && (
                    <>
                        {/* Week Preview */}
                        <Animated.View
                            entering={FadeIn.duration(500)}
                            style={styles.previewContainer}
                        >
                            <Text style={styles.previewTitle}>Ready for your film?</Text>
                            <Text style={styles.previewSubtitle}>{getWeekLabel()}</Text>

                            {/* Clips preview */}
                            <View style={styles.clipsGrid}>
                                {sortedClips.map((clip, index) => (
                                    <Animated.View
                                        key={clip.dayIndex}
                                        entering={FadeInUp.delay(index * 100).duration(400)}
                                        style={styles.clipPreview}
                                    >
                                        <Text style={styles.clipDay}>{DayNames[clip.dayIndex]}</Text>
                                        <Text style={styles.clipIcon}>🌸</Text>
                                    </Animated.View>
                                ))}
                            </View>

                            <Text style={styles.durationText}>10.5 seconds of presence</Text>
                        </Animated.View>

                        {/* Generate Button */}
                        <Animated.View style={[styles.generateContainer, pulseStyle]}>
                            <Pressable style={styles.generateButton} onPress={handleGenerate}>
                                <Text style={styles.generateButtonText}>🎬 Generate Weekly Zen</Text>
                            </Pressable>
                        </Animated.View>
                    </>
                )}

                {state === 'generating' && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={styles.generatingContainer}
                    >
                        <ActivityIndicator size="large" color={Colors.sage} />
                        <Text style={styles.generatingText}>Creating your Weekly Zen...</Text>

                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{progress}%</Text>

                        <Text style={styles.generatingHint}>
                            Stitching your moments together with ambient music
                        </Text>
                    </Animated.View>
                )}

                {state === 'complete' && (
                    <Animated.View
                        entering={FadeIn.duration(500)}
                        style={styles.completeContainer}
                    >
                        <Text style={styles.completeEmoji}>✨</Text>
                        <Text style={styles.completeTitle}>{getWeekLabel()}</Text>
                        <Text style={styles.completeSubtitle}>
                            Your 21-second film of peace
                        </Text>

                        <View style={styles.actionButtons}>
                            <Pressable style={styles.playButton} onPress={handlePlayPreview}>
                                <Text style={styles.playButtonText}>▶ Watch</Text>
                            </Pressable>

                            <Pressable style={styles.saveButton} onPress={handleSaveToGallery}>
                                <Text style={styles.saveButtonText}>💾 Save to Gallery</Text>
                            </Pressable>
                        </View>

                        <Pressable style={styles.doneButton} onPress={() => router.replace('/')}>
                            <Text style={styles.doneButtonText}>Return Home</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {state === 'error' && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={styles.errorContainer}
                    >
                        <Text style={styles.errorEmoji}>😔</Text>
                        <Text style={styles.errorTitle}>Something went wrong</Text>
                        <Text style={styles.errorSubtitle}>
                            We couldn't generate your Weekly Zen. Please try again.
                        </Text>

                        <Pressable style={styles.retryButton} onPress={() => setState('preview')}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
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
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: '500',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
    },
    headerRight: {
        width: 44,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    previewContainer: {
        alignItems: 'center',
    },
    previewTitle: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: '300',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
    },
    previewSubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    clipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.md,
        marginTop: Spacing['2xl'],
        maxWidth: width * 0.8,
    },
    clipPreview: {
        width: 64,
        height: 64,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clipDay: {
        fontSize: Typography.sizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    clipIcon: {
        fontSize: 20,
    },
    durationText: {
        fontSize: Typography.sizes.base,
        color: Colors.sage,
        marginTop: Spacing['2xl'],
        letterSpacing: Typography.letterSpacing.wide,
    },
    generateContainer: {
        marginTop: Spacing['4xl'],
    },
    generateButton: {
        backgroundColor: Colors.gold,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['3xl'],
        borderRadius: BorderRadius['2xl'],
    },
    generateButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        color: Colors.background,
        letterSpacing: Typography.letterSpacing.wide,
    },
    generatingContainer: {
        alignItems: 'center',
    },
    generatingText: {
        fontSize: Typography.sizes.lg,
        color: Colors.cream,
        marginTop: Spacing.xl,
        letterSpacing: Typography.letterSpacing.wide,
    },
    progressBar: {
        width: width * 0.6,
        height: 4,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        marginTop: Spacing['2xl'],
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.sage,
        borderRadius: BorderRadius.full,
    },
    progressText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.md,
    },
    generatingHint: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing['2xl'],
        textAlign: 'center',
    },
    completeContainer: {
        alignItems: 'center',
    },
    completeEmoji: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    completeTitle: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: '300',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
    },
    completeSubtitle: {
        fontSize: Typography.sizes.base,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing['3xl'],
    },
    playButton: {
        backgroundColor: Colors.sage,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
    },
    playButtonText: {
        fontSize: Typography.sizes.base,
        fontWeight: '600',
        color: Colors.background,
    },
    saveButton: {
        backgroundColor: Colors.gold,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
    },
    saveButtonText: {
        fontSize: Typography.sizes.base,
        fontWeight: '600',
        color: Colors.background,
    },
    doneButton: {
        marginTop: Spacing['2xl'],
        paddingVertical: Spacing.md,
    },
    doneButtonText: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
    },
    errorContainer: {
        alignItems: 'center',
    },
    errorEmoji: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    errorTitle: {
        fontSize: Typography.sizes.xl,
        color: Colors.cream,
    },
    errorSubtitle: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    retryButton: {
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.xl,
        marginTop: Spacing['2xl'],
    },
    retryButtonText: {
        fontSize: Typography.sizes.base,
        color: Colors.cream,
    },
});
