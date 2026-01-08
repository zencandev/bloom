import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { router, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { useZenStore, getDayIndex } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius, DayNames, AppConstants } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const GRID_PADDING = Spacing['2xl'];
const SLOT_GAP = Spacing.md;
const SLOT_SIZE = (width - GRID_PADDING * 2 - SLOT_GAP * 3) / 4;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DaySlotProps {
    dayIndex: number;
    hasClip: boolean;
    isToday: boolean;
    onPress: () => void;
    delay: number;
}

function DaySlot({ dayIndex, hasClip, isToday, onPress, delay }: DaySlotProps) {
    const pulseScale = useSharedValue(1);
    const bloomRotation = useSharedValue(0);

    useEffect(() => {
        if (isToday && !hasClip) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1500 }),
                    withTiming(1, { duration: 1500 })
                ),
                -1,
                true
            );
        }
        if (hasClip) {
            bloomRotation.value = withRepeat(
                withSequence(
                    withTiming(5, { duration: 3000 }),
                    withTiming(-5, { duration: 3000 })
                ),
                -1,
                true
            );
        }
    }, [isToday, hasClip]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: isToday && !hasClip ? pulseScale.value : 1 },
            { rotate: hasClip ? `${bloomRotation.value}deg` : '0deg' },
        ],
    }));

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(500).springify()}
        >
            <AnimatedPressable
                style={[
                    styles.daySlot,
                    isToday && !hasClip && styles.daySlotToday,
                    hasClip && styles.daySlotFilled,
                    animatedStyle,
                ]}
                onPress={handlePress}
            >
                <Text style={[styles.dayName, hasClip && styles.dayNameFilled]}>
                    {DayNames[dayIndex]}
                </Text>
                <View style={styles.slotIconContainer}>
                    {hasClip ? (
                        <Text style={styles.bloomEmoji}>🌸</Text>
                    ) : (
                        <Text style={[styles.seedEmoji, isToday && styles.seedEmojiToday]}>
                            {isToday ? '◉' : '○'}
                        </Text>
                    )}
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

export default function HomeScreen() {
    const { currentWeek, hasCompletedOnboarding, getTodayClip, getClipForDay } = useZenStore();
    const todayIndex = getDayIndex();

    // Animation values
    const headerOpacity = useSharedValue(0);
    const buttonScale = useSharedValue(0.9);

    useEffect(() => {
        // Only run animations if we're staying on this screen
        if (!hasCompletedOnboarding) return;

        headerOpacity.value = withTiming(1, { duration: 800 });

        if (currentWeek?.isComplete) {
            buttonScale.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1000 }),
                    withTiming(0.98, { duration: 1000 })
                ),
                -1,
                true
            );
        }
    }, [hasCompletedOnboarding, currentWeek?.isComplete]);

    // Redirect to onboarding if first time (using Redirect component)
    if (!hasCompletedOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const handleDayPress = (dayIndex: number) => {
        const clip = getClipForDay(dayIndex);

        if (clip) {
            // View existing clip
            router.push(`/preview/${dayIndex}`);
        } else {
            // DEV MODE: Allow recording for any day (not just today)
            // In production, this would be: else if (dayIndex === todayIndex)
            router.push({ pathname: '/breathe', params: { testDay: dayIndex.toString() } });
        }
    };

    const handleGeneratePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/generate');
    };

    // Get current week info
    const getWeekLabel = () => {
        if (!currentWeek) return '';
        const date = new Date(currentWeek.startDate);
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        const weekNum = currentWeek.weekId.split('-W')[1];
        return `Week ${parseInt(weekNum)} · ${month} ${year}`;
    };

    const clipsCount = currentWeek?.clips?.length || 0;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Animated.View style={[styles.header, headerAnimatedStyle]}>
                <Animated.Text
                    entering={FadeIn.delay(200).duration(600)}
                    style={styles.logo}
                >
                    ZenSnap
                </Animated.Text>
                <Animated.Text
                    entering={FadeIn.delay(400).duration(600)}
                    style={styles.tagline}
                >
                    Capture the quiet
                </Animated.Text>
            </Animated.View>

            {/* Zen Grid */}
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    {[0, 1, 2, 3].map((dayIndex) => (
                        <DaySlot
                            key={dayIndex}
                            dayIndex={dayIndex}
                            hasClip={!!getClipForDay(dayIndex)}
                            isToday={dayIndex === todayIndex}
                            onPress={() => handleDayPress(dayIndex)}
                            delay={100 + dayIndex * 80}
                        />
                    ))}
                </View>
                <View style={styles.gridRowBottom}>
                    {[4, 5, 6].map((dayIndex) => (
                        <DaySlot
                            key={dayIndex}
                            dayIndex={dayIndex}
                            hasClip={!!getClipForDay(dayIndex)}
                            isToday={dayIndex === todayIndex}
                            onPress={() => handleDayPress(dayIndex)}
                            delay={100 + dayIndex * 80}
                        />
                    ))}
                </View>
            </View>

            {/* Week Label */}
            <Animated.Text
                entering={FadeIn.delay(800).duration(600)}
                style={styles.weekLabel}
            >
                {getWeekLabel()}
            </Animated.Text>

            {/* Progress */}
            <Animated.View
                entering={FadeIn.delay(900).duration(600)}
                style={styles.progressContainer}
            >
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(clipsCount / 7) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {clipsCount} of 7 moments captured
                </Text>
            </Animated.View>

            {/* Generate Button */}
            {currentWeek?.isComplete && (
                <Animated.View
                    entering={FadeInDown.delay(100).duration(600).springify()}
                    style={styles.buttonContainer}
                >
                    <AnimatedPressable
                        style={[styles.generateButton, buttonAnimatedStyle]}
                        onPress={handleGeneratePress}
                    >
                        <Text style={styles.generateButtonText}>🎬 Generate Weekly Zen</Text>
                    </AnimatedPressable>
                </Animated.View>
            )}

            {/* Today's prompt */}
            {!getTodayClip() && (
                <Animated.View
                    entering={FadeIn.delay(1000).duration(600)}
                    style={styles.promptContainer}
                >
                    <Pressable
                        style={styles.promptButton}
                        onPress={() => router.push('/breathe')}
                    >
                        <Text style={styles.promptText}>✨ Capture today's moment</Text>
                    </Pressable>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.xl,
    },
    logo: {
        fontSize: Typography.sizes['3xl'],
        fontWeight: '300',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wider,
    },
    tagline: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
        letterSpacing: Typography.letterSpacing.widest,
        textTransform: 'uppercase',
    },
    gridContainer: {
        paddingHorizontal: GRID_PADDING,
        paddingTop: Spacing['3xl'],
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SLOT_GAP,
        marginBottom: SLOT_GAP,
    },
    gridRowBottom: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SLOT_GAP,
    },
    daySlot: {
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.surfaceLight,
    },
    daySlotToday: {
        borderColor: Colors.sage,
        borderWidth: 2,
    },
    daySlotFilled: {
        backgroundColor: Colors.backgroundLight,
        borderColor: Colors.bloom,
        borderWidth: 1,
    },
    dayName: {
        fontSize: Typography.sizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
        letterSpacing: Typography.letterSpacing.wide,
        textTransform: 'uppercase',
    },
    dayNameFilled: {
        color: Colors.bloom,
    },
    slotIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bloomEmoji: {
        fontSize: 28,
    },
    seedEmoji: {
        fontSize: 24,
        color: Colors.seed,
    },
    seedEmojiToday: {
        color: Colors.sage,
    },
    weekLabel: {
        textAlign: 'center',
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing['3xl'],
        letterSpacing: Typography.letterSpacing.wide,
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing['4xl'],
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.sage,
        borderRadius: BorderRadius.full,
    },
    progressText: {
        fontSize: Typography.sizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
    buttonContainer: {
        paddingHorizontal: Spacing['2xl'],
        marginTop: Spacing['3xl'],
    },
    generateButton: {
        backgroundColor: Colors.gold,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius['2xl'],
        alignItems: 'center',
    },
    generateButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        color: Colors.background,
        letterSpacing: Typography.letterSpacing.wide,
    },
    promptContainer: {
        position: 'absolute',
        bottom: Spacing['4xl'],
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    promptButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    promptText: {
        fontSize: Typography.sizes.base,
        color: Colors.sage,
        letterSpacing: Typography.letterSpacing.wide,
    },
});
