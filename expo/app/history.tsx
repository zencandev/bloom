import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useZenStore, WeekData } from '../stores/zenStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
    const pastWeeks = useZenStore((state) => state.pastWeeks);
    const currentWeek = useZenStore((state) => state.currentWeek);

    // Filter weeks that actually have a generated video
    const availableWeeks = [...pastWeeks];
    if (currentWeek?.weeklyZenUri) {
        availableWeeks.unshift(currentWeek);
    }

    const handleBack = () => {
        router.back();
    };

    const handlePlayVideo = (week: WeekData) => {
        if (!week.weeklyZenUri) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const weekNum = week.weekId.split('-W')[1];
        const title = `Week ${parseInt(weekNum)} Zen`;

        router.push({
            pathname: '/player',
            params: {
                videoUri: week.weeklyZenUri,
                title: title
            }
        });
    };

    const renderItem = ({ item, index }: { item: WeekData; index: number }) => {
        const weekNum = item.weekId.split('-W')[1];
        const date = new Date(item.startDate);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();

        return (
            <Animated.View
                entering={FadeInUp.delay(index * 100).duration(500)}
                style={styles.weekItem}
            >
                <Pressable
                    style={styles.weekButton}
                    onPress={() => handlePlayVideo(item)}
                    disabled={!item.weeklyZenUri}
                >
                    <View style={styles.weekInfo}>
                        <Text style={styles.weekTitle}>Week {parseInt(weekNum)} Zen</Text>
                        <Text style={styles.weekDate}>{month} {year}</Text>
                    </View>

                    {item.weeklyZenUri ? (
                        <View style={styles.playBadge}>
                            <Text style={styles.playIcon}>▶</Text>
                        </View>
                    ) : (
                        <Text style={styles.noVideoText}>No video</Text>
                    )}
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>History</Text>
                <View style={styles.headerRight} />
            </View>

            {availableWeeks.length > 0 ? (
                <FlatList
                    data={availableWeeks}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.weekId}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🍃</Text>
                    <Text style={styles.emptyTitle}>No Zen History Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Complete 7 days of snapshots to create your first Weekly Zen film.
                    </Text>
                    <Pressable style={styles.homeButton} onPress={() => router.replace('/')}>
                        <Text style={styles.homeButtonText}>Start Journey</Text>
                    </Pressable>
                </View>
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
    listContent: {
        padding: Spacing.xl,
        paddingTop: Spacing.md,
    },
    weekItem: {
        marginBottom: Spacing.md,
    },
    weekButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.surfaceLight,
    },
    weekInfo: {
        flex: 1,
    },
    weekTitle: {
        fontSize: Typography.sizes.md,
        color: Colors.cream,
        fontWeight: '500',
        letterSpacing: Typography.letterSpacing.wide,
    },
    weekDate: {
        fontSize: Typography.sizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        textTransform: 'uppercase',
    },
    playBadge: {
        width: 36,
        height: 36,
        backgroundColor: Colors.sage,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIcon: {
        fontSize: 14,
        color: Colors.background,
        marginLeft: 2,
    },
    noVideoText: {
        fontSize: Typography.sizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['4xl'],
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: Spacing.xl,
    },
    emptyTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: '300',
        color: Colors.cream,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: Typography.sizes.base,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.md,
        lineHeight: 22,
    },
    homeButton: {
        marginTop: Spacing['3xl'],
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing['2xl'],
        borderRadius: BorderRadius.full,
    },
    homeButtonText: {
        color: Colors.sage,
        fontWeight: '500',
        letterSpacing: Typography.letterSpacing.wide,
    },
});
