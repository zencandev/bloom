package com.zencan.bloom.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zencan.bloom.data.WeekData
import com.zencan.bloom.data.ZenStore
import com.zencan.bloom.ui.theme.BloomColors

@Composable
fun HomeScreen(
    zenStore: ZenStore,
    onNavigateToBreathe: (Int) -> Unit,
    onNavigateToPreview: (Int) -> Unit,
    onNavigateToGeneratedVideo: (String?) -> Unit
) {
    val weekData by zenStore.currentWeek.collectAsState()
    val history by zenStore.history.collectAsState()
    val scrollState = rememberScrollState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BloomColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp)
            .statusBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(40.dp))
        
        // Header
        Text(
            text = "Bloom",
            fontSize = 34.sp,
            fontWeight = FontWeight.Light,
            color = BloomColors.Cream,
            letterSpacing = 1.sp
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "CAPTURE THE QUIET",
            fontSize = 13.sp,
            color = BloomColors.TextMuted,
            letterSpacing = 2.sp
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // 7-Day Grid
        DayGrid(
            weekData = weekData,
            zenStore = zenStore,
            onDayClick = { dayIndex ->
                if (zenStore.getClip(dayIndex) != null) {
                    onNavigateToPreview(dayIndex)
                } else if (zenStore.isToday(dayIndex)) {
                    onNavigateToBreathe(dayIndex)
                }
            }
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Week Info & Progress
        Text(
            text = "Week ${weekData.weekId.substringAfter("-W")} · ${zenStore.currentWeekRange()}",
            fontSize = 13.sp,
            color = BloomColors.TextSecondary,
            letterSpacing = 0.5.sp
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Progress Bar
        ProgressSection(clipCount = weekData.clips.size)
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Capture Button (if today not captured and week not complete)
        val isTodayCaptured = zenStore.getClip(zenStore.todayIndex) != null
        if (!weekData.isComplete && !isTodayCaptured) {
            TextButton(
                onClick = { onNavigateToBreathe(zenStore.todayIndex) }
            ) {
                Text(
                    text = "✨ Capture today's moment",
                    fontSize = 16.sp,
                    color = BloomColors.Sage,
                    letterSpacing = 0.5.sp
                )
            }
        }
        
        // Generate Weekly Zen Button
        // Manual generation available only after Sunday's video is captured
        if (zenStore.getClip(6) != null) {
            val isGenerated = weekData.generatedVideoUri != null
            
            Button(
                onClick = { onNavigateToGeneratedVideo(weekData.weekId) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .shadow(
                        elevation = 10.dp,
                        shape = RoundedCornerShape(12.dp),
                        ambientColor = BloomColors.Bloom.copy(alpha = 0.4f),
                        spotColor = BloomColors.Bloom.copy(alpha = 0.4f)
                    ),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BloomColors.Bloom
                )
            ) {
                Text(
                    text = if (isGenerated) "Watch Week ${weekData.weekId.substringAfter("-W")} Zen" else "Generate Weekly Zen",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black.copy(alpha = 0.8f)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        // History Section
        if (history.isNotEmpty()) {
            HistorySection(history, onNavigateToGeneratedVideo)
        }
        
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
private fun DayGrid(
    weekData: WeekData,
    zenStore: ZenStore,
    onDayClick: (Int) -> Unit
) {
    val dayNames = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Top Row (4 days)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            for (index in 0..3) {
                DaySlotButton(
                    dayIndex = index,
                    dayName = dayNames[index],
                    hasClip = zenStore.getClip(index) != null,
                    isToday = zenStore.isToday(index),
                    onClick = { onDayClick(index) }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Bottom Row (3 days)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            for (index in 4..6) {
                DaySlotButton(
                    dayIndex = index,
                    dayName = dayNames[index],
                    hasClip = zenStore.getClip(index) != null,
                    isToday = zenStore.isToday(index),
                    onClick = { onDayClick(index) }
                )
            }
        }
    }
}

@Composable
private fun DaySlotButton(
    dayIndex: Int,
    dayName: String,
    hasClip: Boolean,
    isToday: Boolean,
    onClick: () -> Unit
) {
    // Gentle sway animation for completed days
    val infiniteTransition = rememberInfiniteTransition(label = "sway")
    val rotation by infiniteTransition.animateFloat(
        initialValue = -2f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(dayIndex * 200)
        ),
        label = "rotation"
    )
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = dayName.uppercase(),
            fontSize = 11.sp,
            color = if (hasClip) BloomColors.Sage else BloomColors.TextMuted,
            letterSpacing = 1.sp
        )
        
        Spacer(modifier = Modifier.height(6.dp))
        
        val borderColor = when {
            isToday && !hasClip -> BloomColors.Sage
            hasClip -> BloomColors.Bloom
            else -> BloomColors.SurfaceLight
        }
        val borderWidth = if (isToday || hasClip) 1.5.dp else 1.dp
        
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(72.dp)
                .graphicsLayer {
                    if (hasClip) {
                        rotationZ = rotation
                    }
                }
                .clip(RoundedCornerShape(16.dp))
                .background(if (hasClip) BloomColors.BackgroundLight else BloomColors.Surface)
                .border(borderWidth, borderColor, RoundedCornerShape(16.dp))
                .then(
                    if (hasClip) {
                        Modifier.shadow(
                            elevation = 8.dp,
                            shape = RoundedCornerShape(16.dp),
                            ambientColor = BloomColors.Bloom.copy(alpha = 0.4f),
                            spotColor = BloomColors.Bloom.copy(alpha = 0.4f)
                        )
                    } else Modifier
                )
        ) {
            // Icon
            Text(
                text = when {
                    hasClip -> "🌸"
                    isToday -> "◉"
                    else -> "○"
                },
                fontSize = if (hasClip) 28.sp else 24.sp,
                color = when {
                    hasClip -> Color.Unspecified
                    isToday -> BloomColors.Sage
                    else -> BloomColors.Seed
                }
            )
        }
    }
}

@Composable
private fun ProgressSection(clipCount: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Progress Bar
        Box(
            modifier = Modifier
                .width(200.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(BloomColors.Surface)
        ) {
            val progress = if (clipCount == 0) 0f else clipCount / 7f
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress)
                    .clip(RoundedCornerShape(2.dp))
                    .background(BloomColors.Sage)
            )
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "$clipCount of 7 moments captured",
            fontSize = 12.sp,
            color = BloomColors.TextMuted
        )
    }
}

@Composable
private fun HistorySection(
    history: List<WeekData>,
    onNavigateToGeneratedVideo: (String?) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "History",
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = BloomColors.TextSecondary,
            modifier = Modifier.padding(start = 4.dp)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        history.forEach { week ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .clickable { 
                        onNavigateToGeneratedVideo(week.weekId)
                    },
                colors = CardDefaults.cardColors(containerColor = BloomColors.Surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Week ${week.weekId.substringAfter("-W")}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = BloomColors.Cream
                        )
                        Text(
                            text = "${week.clips.size} clips",
                            fontSize = 12.sp,
                            color = BloomColors.Sage
                        )
                    }
                    if (week.generatedVideoUri != null) {
                        Text(
                            text = "›",
                            fontSize = 20.sp,
                            color = BloomColors.TextMuted
                        )
                    } else {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = BloomColors.TextMuted
                        )
                    }
                }
            }
        }
    }
}
