import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    FadeInUp,
    runOnJS,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useZenStore } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
    const [step, setStep] = useState(0);
    const completeOnboarding = useZenStore((state) => state.completeOnboarding);

    const circleScale = useSharedValue(1);
    const buttonOpacity = useSharedValue(0);

    const steps = [
        {
            emoji: '🪷',
            title: 'Welcome to ZenSnap',
            subtitle: 'Capture the quiet. Own the week.',
            description: 'A mindful way to journal your days through tiny video moments.',
        },
        {
            emoji: '🌬️',
            title: 'Breathe First',
            subtitle: 'The gateway to presence',
            description: 'Before capturing, hold the breathing circle for 3 seconds. This moment of calm opens your camera.',
        },
        {
            emoji: '📷',
            title: '1.5 Seconds',
            subtitle: 'Constraint breeds creativity',
            description: 'Your camera records exactly 1.5 seconds. Capture something peaceful—trees, coffee, a pet, the sky.',
        },
        {
            emoji: '🎬',
            title: 'Weekly Zen',
            subtitle: 'Your week, cinematically',
            description: 'After 7 days, your clips merge into a 10.5-second film with calming music. A tiny movie of your week.',
        },
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            completeOnboarding();
            router.replace('/');
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        completeOnboarding();
        router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Skip button */}
            {step < steps.length - 1 && (
                <Pressable style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            )}

            {/* Content */}
            <View style={styles.content}>
                <Animated.Text
                    key={`emoji-${step}`}
                    entering={FadeIn.duration(500)}
                    style={styles.emoji}
                >
                    {currentStep.emoji}
                </Animated.Text>

                <Animated.Text
                    key={`title-${step}`}
                    entering={FadeInUp.delay(100).duration(500)}
                    style={styles.title}
                >
                    {currentStep.title}
                </Animated.Text>

                <Animated.Text
                    key={`subtitle-${step}`}
                    entering={FadeInUp.delay(200).duration(500)}
                    style={styles.subtitle}
                >
                    {currentStep.subtitle}
                </Animated.Text>

                <Animated.Text
                    key={`description-${step}`}
                    entering={FadeInUp.delay(300).duration(500)}
                    style={styles.description}
                >
                    {currentStep.description}
                </Animated.Text>
            </View>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
                {steps.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === step && styles.dotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Next/Start button */}
            <Animated.View
                entering={FadeIn.delay(400).duration(500)}
                style={styles.buttonContainer}
            >
                <Pressable style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>
                        {step === steps.length - 1 ? 'Begin Your Journey' : 'Continue'}
                    </Text>
                </Pressable>
            </Animated.View>
        </SafeAreaView>
    );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    skipButton: {
        position: 'absolute',
        top: Spacing['5xl'],
        right: Spacing.xl,
        zIndex: 10,
        padding: Spacing.md,
    },
    skipText: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        letterSpacing: Typography.letterSpacing.wide,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['3xl'],
    },
    emoji: {
        fontSize: 72,
        marginBottom: Spacing['2xl'],
    },
    title: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: '300',
        color: Colors.cream,
        textAlign: 'center',
        letterSpacing: Typography.letterSpacing.wide,
    },
    subtitle: {
        fontSize: Typography.sizes.base,
        color: Colors.sage,
        textAlign: 'center',
        marginTop: Spacing.sm,
        letterSpacing: Typography.letterSpacing.wider,
        textTransform: 'uppercase',
    },
    description: {
        fontSize: Typography.sizes.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xl,
        lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing['2xl'],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.surface,
    },
    dotActive: {
        backgroundColor: Colors.sage,
        width: 24,
    },
    buttonContainer: {
        paddingHorizontal: Spacing['2xl'],
        paddingBottom: Spacing['3xl'],
    },
    nextButton: {
        backgroundColor: Colors.sage,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius['2xl'],
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        color: Colors.background,
        letterSpacing: Typography.letterSpacing.wide,
    },
});
