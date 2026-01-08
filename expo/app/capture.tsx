import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { useZenStore, getDayIndex } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius, AppConstants } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const CAPTURE_DURATION = AppConstants.CAPTURE_DURATION_MS;

export default function CaptureScreen() {
    // Get testDay param for dev mode - allows saving to any day
    const { testDay } = useLocalSearchParams<{ testDay?: string }>();
    const targetDayIndex = testDay !== undefined ? parseInt(testDay, 10) : getDayIndex();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [permissionsReady, setPermissionsReady] = useState(false);

    const cameraRef = useRef<CameraView>(null);
    const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    const addClip = useZenStore((state) => state.addClip);

    // Animation values
    const borderOpacity = useSharedValue(0.5);
    const progressWidth = useSharedValue(0);

    // Request both permissions
    useEffect(() => {
        const requestPermissions = async () => {
            const camera = await requestCameraPermission();
            const mic = await requestMicPermission();
            if (camera.granted && mic.granted) {
                setPermissionsReady(true);
            }
        };

        if (!cameraPermission?.granted || !micPermission?.granted) {
            requestPermissions();
        } else {
            setPermissionsReady(true);
        }
    }, []);

    // Auto-start recording when screen loads and permissions ready
    useEffect(() => {
        if (permissionsReady && !isRecording && !isComplete) {
            const timer = setTimeout(() => {
                startRecording();
            }, 800); // Brief delay for user to orient

            return () => clearTimeout(timer);
        }
    }, [permissionsReady]);

    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;

        setIsRecording(true);
        startTimeRef.current = Date.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        borderOpacity.value = withTiming(1, { duration: 200 });

        // Progress tracking
        recordingTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min(elapsed / CAPTURE_DURATION, 1);
            setRecordingProgress(progress);
            progressWidth.value = withTiming(progress * 100, { duration: 50 });

            if (progress >= 1) {
                stopRecording();
            }
        }, 50);

        try {
            const video = await cameraRef.current.recordAsync({
                maxDuration: CAPTURE_DURATION / 1000,
            });

            if (video?.uri) {
                await saveClip(video.uri);
            }
        } catch (error) {
            console.error('Recording error:', error);
            handleRecordingError();
        }
    };

    const stopRecording = async () => {
        if (recordingTimer.current) {
            clearInterval(recordingTimer.current);
        }

        if (cameraRef.current && isRecording) {
            try {
                cameraRef.current.stopRecording();
            } catch (e) {
                // Recording may have already stopped
            }
        }

        setIsRecording(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const saveClip = async (uri: string) => {
        try {
            // Use cacheDirectory as it's more reliable on Android
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) {
                throw new Error('No storage directory available');
            }

            const clipsDir = `${baseDir}zensnap/clips/`;

            // Create directory if it doesn't exist
            const dirInfo = await FileSystem.getInfoAsync(clipsDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(clipsDir, { intermediates: true });
            }

            // Save with timestamp - use targetDayIndex for dev mode support
            const timestamp = Date.now();
            const filename = `day_${targetDayIndex}_${timestamp}.mp4`;
            const newUri = `${clipsDir}${filename}`;

            // Copy instead of move for better compatibility
            await FileSystem.copyAsync({
                from: uri,
                to: newUri,
            });

            // Delete the original temp file
            try {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch (e) {
                // Ignore delete errors
            }

            // Add to store - use targetDayIndex for dev mode support
            addClip({
                dayIndex: targetDayIndex,
                date: new Date().toISOString(),
                videoUri: newUri,
                createdAt: timestamp,
            });

            setIsComplete(true);

            // Navigate back to home after brief delay
            setTimeout(() => {
                router.replace('/');
            }, 1200);

        } catch (error) {
            console.error('Error saving clip:', error);
            handleRecordingError();
        }
    };

    const handleRecordingError = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        router.replace('/');
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: `rgba(168, 181, 160, ${borderOpacity.value})`,
    }));

    if (!permissionsReady) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>Permissions needed</Text>
                <Text style={styles.permissionSubtext}>
                    ZenSnap needs camera and microphone access to capture your moments
                </Text>
                <Pressable
                    style={styles.permissionButton}
                    onPress={async () => {
                        const camera = await requestCameraPermission();
                        const mic = await requestMicPermission();
                        if (camera.granted && mic.granted) {
                            setPermissionsReady(true);
                        }
                    }}
                >
                    <Text style={styles.permissionButtonText}>Grant Access</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <Animated.View style={[styles.cameraContainer, borderStyle]}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="back"
                    mode="video"
                />

                {/* Recording indicator */}
                {isRecording && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={styles.recordingIndicator}
                    >
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>REC</Text>
                    </Animated.View>
                )}

                {/* Complete overlay */}
                {isComplete && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={styles.completeOverlay}
                    >
                        <Text style={styles.completeEmoji}>✨</Text>
                        <Text style={styles.completeText}>Moment captured</Text>
                    </Animated.View>
                )}
            </Animated.View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
                <Text style={styles.progressText}>
                    {isRecording
                        ? `${(recordingProgress * 1.5).toFixed(1)}s`
                        : isComplete
                            ? 'Saved'
                            : 'Get ready...'}
                </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
                <Text style={styles.instruction}>
                    {isRecording
                        ? 'Be present...'
                        : isComplete
                            ? 'Beautiful.'
                            : 'Recording will begin shortly'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraContainer: {
        width: width - Spacing['3xl'] * 2,
        height: height * 0.6,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: Colors.sage,
    },
    camera: {
        flex: 1,
    },
    recordingIndicator: {
        position: 'absolute',
        top: Spacing.lg,
        left: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginRight: Spacing.sm,
    },
    recordingText: {
        fontSize: Typography.sizes.xs,
        color: Colors.cream,
        fontWeight: '600',
        letterSpacing: Typography.letterSpacing.wider,
    },
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    completeEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    completeText: {
        fontSize: Typography.sizes.lg,
        color: Colors.cream,
        fontWeight: '300',
        letterSpacing: Typography.letterSpacing.wide,
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: Spacing['2xl'],
    },
    progressBar: {
        width: width * 0.6,
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
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        letterSpacing: Typography.letterSpacing.wide,
    },
    instructionContainer: {
        marginTop: Spacing.xl,
    },
    instruction: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        letterSpacing: Typography.letterSpacing.wide,
    },
    permissionText: {
        fontSize: Typography.sizes.lg,
        color: Colors.cream,
        textAlign: 'center',
    },
    permissionSubtext: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
    },
    permissionButton: {
        marginTop: Spacing.xl,
        backgroundColor: Colors.sage,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.xl,
    },
    permissionButtonText: {
        fontSize: Typography.sizes.base,
        fontWeight: '600',
        color: Colors.background,
    },
});
