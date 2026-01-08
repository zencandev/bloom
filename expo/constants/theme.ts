// ZenSnap Design System
// A calming, zen-inspired color palette

export const Colors = {
    // Core palette
    background: '#0a0a0a',
    backgroundLight: '#141414',
    surface: '#1a1a1a',
    surfaceLight: '#242424',

    // Zen accent colors
    sage: '#a8b5a0',
    sageLight: '#c5d1be',
    sageDark: '#7a8b72',

    cream: '#f5f2e8',
    creamDark: '#e5e0d0',

    gold: '#d4a574',
    goldLight: '#e8c5a0',
    goldDark: '#b88a5c',

    // State colors
    bloom: '#8bc49e',
    seed: '#4a4a4a',

    // Text
    textPrimary: '#f5f2e8',
    textSecondary: '#a8a8a8',
    textMuted: '#666666',

    // UI
    error: '#e57373',
    success: '#81c784',

    // Gradients (for use with LinearGradient)
    gradientZen: ['#1a1a1a', '#0a0a0a'],
    gradientBreath: ['#2d3a2d', '#1a2a1a', '#0a0a0a'],
    gradientGold: ['#d4a574', '#b88a5c'],
};

export const Typography = {
    // Font families (system fonts)
    fontFamily: {
        regular: 'System',
        medium: 'System',
        semibold: 'System',
        bold: 'System',
    },

    // Font sizes
    sizes: {
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        '2xl': 28,
        '3xl': 34,
        '4xl': 42,
        hero: 56,
    },

    // Line heights
    lineHeights: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },

    // Letter spacing
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
        wider: 1,
        widest: 2,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
    '6xl': 80,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    glow: {
        shadowColor: '#a8b5a0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const Animation = {
    // Durations
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
        slower: 800,
        breath: 3000,
        capture: 1500,
    },

    // Easing (for use with reanimated)
    easing: {
        smooth: 'ease-in-out',
        bounce: 'ease-out',
    },
};

// Constants for the app logic
export const AppConstants = {
    BREATH_DURATION_MS: 3000,
    CAPTURE_DURATION_MS: 1500,
    DAYS_IN_WEEK: 7,
    WEEKLY_VIDEO_DURATION_MS: 10500, // 7 * 1500
};

export const DayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type DayName = typeof DayNames[number];
