package com.zensnap.bloom.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Exact color palette from iOS Bloom app
object BloomColors {
    val Background = Color(0xFF1A1A1A)
    val BackgroundLight = Color(0xFF242424)
    val Surface = Color(0xFF2C2C2C)
    val SurfaceLight = Color(0xFF363636)
    val Sage = Color(0xFFFFB7C5)  // Cherry Blossom Pink
    val Bloom = Color(0xFFFFB7C5)
    val Seed = Color(0xFF4A4A4A)
    val Cream = Color(0xFFF9F7F2)
    val TextPrimary = Color(0xFFF5F2E8)
    val TextSecondary = Color(0xFFA8A8A8)
    val TextMuted = Color(0xFF666666)
    val Gold = Color(0xFFD4A574)
}

// Spacing from iOS Theme
object BloomSpacing {
    val sm = 8
    val md = 12
    val lg = 20
    val xl = 24
    val xxl = 32
    val xxxl = 40
}

private val DarkColorScheme = darkColorScheme(
    primary = BloomColors.Sage,
    onPrimary = Color.Black,
    secondary = BloomColors.Bloom,
    tertiary = BloomColors.Gold,
    background = BloomColors.Background,
    surface = BloomColors.Surface,
    onBackground = BloomColors.TextPrimary,
    onSurface = BloomColors.TextPrimary,
    surfaceVariant = BloomColors.SurfaceLight,
    onSurfaceVariant = BloomColors.TextSecondary
)

@Composable
fun BloomTheme(
    darkTheme: Boolean = true, // Always dark
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
