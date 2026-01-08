import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withRepeat,
    runOnJS,
    Easing,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, AppConstants } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.55;
const RING_COUNT = 3;

export default function BreatheScreen() {
    // Get testDay param for dev mode
    const { testDay } = useLocalSearchParams<{ testDay?: string }>();

    const [isHolding, setIsHolding] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [progress, setProgress] = useState(0);

    const holdProgress = useSharedValue(0);
    const breatheScale = useSharedValue(1);
    const outerRingOpacity = useSharedValue(0.2);
    const middleRingOpacity = useSharedValue(0.15);
    const innerRingOpacity = useSharedValue(0.1);
    const glowIntensity = useSharedValue(0);

    const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTime = useRef<number>(0);

    // Breathing animation
    React.useEffect(() => {
        breatheScale.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        outerRingOpacity.value = withRepeat(
            withSequence(
                withTiming(0.35, { duration: 2000 }),
                withTiming(0.2, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const handleComplete = () => {
        setIsComplete(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate to capture after a brief moment, passing testDay if present
        setTimeout(() => {
            if (testDay) {
                router.replace({ pathname: '/capture', params: { testDay } });
            } else {
                router.replace('/capture');
            }
        }, 500);
    };

    const startHold = () => {
        setIsHolding(true);
        startTime.current = Date.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        glowIntensity.value = withTiming(1, { duration: 300 });

        // Progress tracking
        progressInterval.current = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            const newProgress = Math.min(elapsed / AppConstants.BREATH_DURATION_MS, 1);
            setProgress(newProgress);

            if (newProgress >= 1) {
                if (progressInterval.current) {
                    clearInterval(progressInterval.current);
                }
                handleComplete();
            }
        }, 50);
    };

    const endHold = () => {
        if (isComplete) return;

        setIsHolding(false);
        setProgress(0);

        if (progressInterval.current) {
            clearInterval(progressInterval.current);
        }

        glowIntensity.value = withTiming(0, { duration: 300 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const holdGesture = Gesture.LongPress()
        .minDuration(50)
        .onStart(() => {
            runOnJS(startHold)();
        })
        .onEnd(() => {
            runOnJS(endHold)();
        })
        .onFinalize(() => {
            runOnJS(endHold)();
        });

    const tapGesture = Gesture.Tap()
        .onBegin(() => {
            runOnJS(startHold)();
        })
        .onFinalize(() => {
            runOnJS(endHold)();
        });

    const composedGesture = Gesture.Race(holdGesture, tapGesture);

    const circleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breatheScale.value }],
    }));

    const outerRingStyle = useAnimatedStyle(() => ({
        opacity: outerRingOpacity.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        shadowOpacity: glowIntensity.value * 0.6,
        shadowRadius: glowIntensity.value * 30,
    }));

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Back button */}
            <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            {/* Instructions */}
            <Animated.View
                entering={FadeIn.delay(300).duration(600)}
                style={styles.instructionContainer}
            >
                <Text style={styles.instruction}>
                    {isComplete
                        ? 'You are centered'
                        : isHolding
                            ? 'Breathe...'
                            : 'Breathe with me'}
                </Text>
                <Text style={styles.subInstruction}>
                    {isComplete
                        ? '✨'
                        : isHolding
                            ? 'Hold to continue'
                            : 'Hold the circle'}
                </Text>
            </Animated.View>

            {/* Breathing Circle */}
            <View style={styles.circleContainer}>
                {/* Outer rings */}
                <Animated.View style={[styles.ring, styles.ringOuter, outerRingStyle]} />
                <Animated.View style={[styles.ring, styles.ringMiddle, outerRingStyle]} />
                <Animated.View style={[styles.ring, styles.ringInner, outerRingStyle]} />

                {/* Main circle */}
                <GestureDetector gesture={composedGesture}>
                    <Animated.View
                        style={[
                            styles.mainCircle,
                            circleAnimatedStyle,
                            glowStyle,
                            isHolding && styles.mainCircleActive,
                        ]}
                    >
                        {/* Progress ring */}
                        <View style={styles.progressRing}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        transform: [{ rotate: `${progress * 360}deg` }],
                                        opacity: isHolding ? 1 : 0,
                                    }
                                ]}
                            />
                        </View>

                        {/* Center dot */}
                        <View style={[
                            styles.centerDot,
                            isHolding && styles.centerDotActive,
                        ]} />
                    </Animated.View>
                </GestureDetector>
            </View>

            {/* Progress indicator */}
            <Animated.View
                entering={FadeIn.delay(500).duration(400)}
                style={styles.progressContainer}
            >
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${progress * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {isHolding
                        ? `${(progress * 3).toFixed(1)}s`
                        : '3 seconds'}
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: Spacing['5xl'],
        left: Spacing.xl,
        zIndex: 10,
        padding: Spacing.md,
    },
    backButtonText: {
        fontSize: Typography.sizes['2xl'],
        color: Colors.textSecondary,
    },
    instructionContainer: {
        alignItems: 'center',
        marginTop: height * 0.12,
    },
    instruction: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: '300',
        color: Colors.cream,
        letterSpacing: Typography.letterSpacing.wide,
        textAlign: 'center',
    },
    subInstruction: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
        letterSpacing: Typography.letterSpacing.wide,
    },
    circleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -Spacing['4xl'],
    },
    ring: {
        position: 'absolute',
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.sage,
    },
    ringOuter: {
        width: CIRCLE_SIZE * 1.5,
        height: CIRCLE_SIZE * 1.5,
    },
    ringMiddle: {
        width: CIRCLE_SIZE * 1.3,
        height: CIRCLE_SIZE * 1.3,
    },
    ringInner: {
        width: CIRCLE_SIZE * 1.15,
        height: CIRCLE_SIZE * 1.15,
    },
    mainCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.sage,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.sage,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    },
    mainCircleActive: {
        backgroundColor: Colors.backgroundLight,
        borderColor: Colors.sageLight,
    },
    progressRing: {
        position: 'absolute',
        width: CIRCLE_SIZE - 20,
        height: CIRCLE_SIZE - 20,
        borderRadius: (CIRCLE_SIZE - 20) / 2,
        borderWidth: 3,
        borderColor: 'transparent',
        borderTopColor: Colors.sage,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressFill: {
        width: '100%',
        height: '100%',
    },
    centerDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.sage,
        opacity: 0.6,
    },
    centerDotActive: {
        opacity: 1,
        backgroundColor: Colors.sageLight,
    },
    progressContainer: {
        alignItems: 'center',
        paddingBottom: Spacing['5xl'],
    },
    progressBar: {
        width: width * 0.5,
        height: 3,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.sage,
        borderRadius: BorderRadius.full,
    },
    progressText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.md,
        letterSpacing: Typography.letterSpacing.wide,
    },
});
