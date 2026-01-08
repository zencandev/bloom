import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface DayClip {
    dayIndex: number; // 0-6 (Mon-Sun)
    date: string; // ISO date string
    videoUri: string;
    thumbnailUri?: string;
    createdAt: number;
}

export interface WeekData {
    weekId: string; // Format: "2026-W02"
    startDate: string;
    clips: DayClip[];
    weeklyZenUri?: string;
    isComplete: boolean;
}

interface ZenState {
    // Current week data
    currentWeek: WeekData | null;
    pastWeeks: WeekData[];

    // User preferences
    hasCompletedOnboarding: boolean;
    notificationTime: string; // HH:MM format

    // App state
    isFirstLaunch: boolean;

    // Actions
    initializeWeek: () => void;
    addClip: (clip: DayClip) => void;
    getTodayClip: () => DayClip | undefined;
    getClipForDay: (dayIndex: number) => DayClip | undefined;
    setWeeklyZenUri: (uri: string) => void;
    completeOnboarding: () => void;
    archiveCurrentWeek: () => void;
}

// Get the current week ID in ISO format
const getWeekId = (date: Date = new Date()): string => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

// Get Monday of the current week
const getWeekStart = (date: Date = new Date()): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
};

// Get day index (0=Mon, 6=Sun)
export const getDayIndex = (date: Date = new Date()): number => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, Monday (1) to 0
};

export const useZenStore = create<ZenState>()(
    persist(
        (set, get) => ({
            currentWeek: null,
            pastWeeks: [],
            hasCompletedOnboarding: false,
            notificationTime: '08:00',
            isFirstLaunch: true,

            initializeWeek: () => {
                const currentWeekId = getWeekId();
                const state = get();

                // Check if we need to archive the old week and start a new one
                if (state.currentWeek && state.currentWeek.weekId !== currentWeekId) {
                    // Archive the old week
                    set((state) => ({
                        pastWeeks: [...state.pastWeeks, state.currentWeek!],
                        currentWeek: {
                            weekId: currentWeekId,
                            startDate: getWeekStart(),
                            clips: [],
                            isComplete: false,
                        },
                    }));
                } else if (!state.currentWeek) {
                    // First time - create new week
                    set({
                        currentWeek: {
                            weekId: currentWeekId,
                            startDate: getWeekStart(),
                            clips: [],
                            isComplete: false,
                        },
                    });
                }
            },

            addClip: (clip: DayClip) => {
                set((state) => {
                    if (!state.currentWeek) return state;

                    // Remove any existing clip for this day
                    const filteredClips = state.currentWeek.clips.filter(
                        (c) => c.dayIndex !== clip.dayIndex
                    );

                    const newClips = [...filteredClips, clip];
                    const isComplete = newClips.length === 7;

                    return {
                        currentWeek: {
                            ...state.currentWeek,
                            clips: newClips,
                            isComplete,
                        },
                    };
                });
            },

            getTodayClip: () => {
                const state = get();
                const todayIndex = getDayIndex();
                return state.currentWeek?.clips.find((c) => c.dayIndex === todayIndex);
            },

            getClipForDay: (dayIndex: number) => {
                const state = get();
                return state.currentWeek?.clips.find((c) => c.dayIndex === dayIndex);
            },

            setWeeklyZenUri: (uri: string) => {
                set((state) => {
                    if (!state.currentWeek) return state;
                    return {
                        currentWeek: {
                            ...state.currentWeek,
                            weeklyZenUri: uri,
                        },
                    };
                });
            },

            completeOnboarding: () => {
                set({ hasCompletedOnboarding: true, isFirstLaunch: false });
            },

            archiveCurrentWeek: () => {
                set((state) => {
                    if (!state.currentWeek) return state;
                    return {
                        pastWeeks: [...state.pastWeeks, state.currentWeek],
                        currentWeek: {
                            weekId: getWeekId(),
                            startDate: getWeekStart(),
                            clips: [],
                            isComplete: false,
                        },
                    };
                });
            },
        }),
        {
            name: 'zensnap-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
