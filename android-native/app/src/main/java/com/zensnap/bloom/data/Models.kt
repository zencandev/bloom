package com.zensnap.bloom.data

import kotlinx.serialization.Serializable

@Serializable
data class DayClip(
    val dayIndex: Int,  // 0-6 (Mon-Sun)
    val date: String,
    val videoUri: String,
    val createdAt: Long
)

@Serializable
data class WeekData(
    val weekId: String,
    val startDate: String,
    val clips: List<DayClip> = emptyList(),
    val isComplete: Boolean = false,
    val generatedVideoUri: String? = null
)

// Navigation routes
sealed class Route(val route: String) {
    data object Home : Route("home")
    data object Onboarding : Route("onboarding")
    data class Breathe(val dayIndex: Int) : Route("breathe/{dayIndex}") {
        companion object {
            const val ROUTE = "breathe/{dayIndex}"
            fun createRoute(dayIndex: Int) = "breathe/$dayIndex"
        }
    }
    data class Capture(val dayIndex: Int) : Route("capture/{dayIndex}") {
        companion object {
            const val ROUTE = "capture/{dayIndex}"
            fun createRoute(dayIndex: Int) = "capture/$dayIndex"
        }
    }
    data class Preview(val dayIndex: Int) : Route("preview/{dayIndex}") {
        companion object {
            const val ROUTE = "preview/{dayIndex}"
            fun createRoute(dayIndex: Int) = "preview/$dayIndex"
        }
    }
    data object GeneratedVideo : Route("generated_video")
    data object History : Route("history")
}

// Onboarding step data
data class OnboardingStep(
    val emoji: String,
    val title: String,
    val subtitle: String,
    val description: String
)

val onboardingSteps = listOf(
    OnboardingStep(
        emoji = "🌬️",
        title = "Breathe First",
        subtitle = "The gateway to presence",
        description = "Before capturing, hold the breathing circle for 3 seconds. This moment of calm opens your camera."
    ),
    OnboardingStep(
        emoji = "📷",
        title = "1.5 Seconds",
        subtitle = "Constraint breeds creativity",
        description = "Your camera records exactly 1.5 seconds. Capture something peaceful—trees, coffee, a pet, the sky."
    ),
    OnboardingStep(
        emoji = "🎬",
        title = "Weekly Zen",
        subtitle = "Your week, cinematically",
        description = "After 7 days, your clips merge into a 10.5-second film with calming music. A tiny movie of your week."
    )
)
