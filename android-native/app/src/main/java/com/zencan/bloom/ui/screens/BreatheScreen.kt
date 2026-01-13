package com.zencan.bloom.ui.screens

import android.os.VibrationEffect
import android.os.Vibrator
import android.view.MotionEvent
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zencan.bloom.ui.theme.BloomColors
import kotlinx.coroutines.delay

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun BreatheScreen(
    dayIndex: Int,
    onBack: () -> Unit,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val vibrator = remember { context.getSystemService(Vibrator::class.java) }
    
    var isHolding by remember { mutableStateOf(false) }
    var holdProgress by remember { mutableFloatStateOf(0f) }
    var isComplete by remember { mutableStateOf(false) }
    
    // Breathing animation
    val infiniteTransition = rememberInfiniteTransition(label = "breathing")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val opacity by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "opacity"
    )
    
    // Progress timer
    LaunchedEffect(isHolding) {
        if (isHolding && !isComplete) {
            val startTime = System.currentTimeMillis()
            while (isHolding && holdProgress < 1f) {
                val elapsed = System.currentTimeMillis() - startTime
                holdProgress = (elapsed / 3000f).coerceIn(0f, 1f)
                
                if (holdProgress >= 1f) {
                    isComplete = true
                    vibrator?.vibrate(
                        VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
                    )
                    delay(500)
                    onComplete()
                }
                delay(16) // ~60fps
            }
        } else if (!isHolding && !isComplete) {
            holdProgress = 0f
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BloomColors.Background)
            .statusBarsPadding()
    ) {
        // Back Button
        IconButton(
            onClick = onBack,
            modifier = Modifier.padding(8.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = BloomColors.TextSecondary,
                modifier = Modifier.size(24.dp)
            )
        }
        
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(0.3f))
            
            // Instructions
            Text(
                text = when {
                    isComplete -> "You are centered"
                    isHolding -> "Breathe..."
                    else -> "Breathe with me"
                },
                fontSize = 28.sp,
                fontWeight = FontWeight.Light,
                color = BloomColors.Cream,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = when {
                    isComplete -> "✨"
                    isHolding -> "Hold to continue"
                    else -> "Hold to start"
                },
                fontSize = 16.sp,
                color = BloomColors.TextMuted,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(40.dp))
            
            // Breathing Circles
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(300.dp)
                    .pointerInteropFilter { event ->
                        when (event.action) {
                            MotionEvent.ACTION_DOWN -> {
                                if (!isComplete) {
                                    isHolding = true
                                    vibrator?.vibrate(
                                        VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                                    )
                                }
                                true
                            }
                            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                                if (!isComplete) {
                                    isHolding = false
                                    vibrator?.vibrate(
                                        VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)
                                    )
                                }
                                true
                            }
                            else -> false
                        }
                    }
            ) {
                // Outer rings
                for (i in 0..2) {
                    val ringSize = (200 + i * 30).dp
                    val ringOpacity = (opacity - i * 0.05f).coerceIn(0f, 1f)
                    
                    Canvas(
                        modifier = Modifier
                            .size(ringSize)
                            .graphicsLayer { scaleX = scale; scaleY = scale }
                    ) {
                        drawCircle(
                            color = BloomColors.Sage.copy(alpha = ringOpacity),
                            style = Stroke(width = 1.dp.toPx())
                        )
                    }
                }
                
                // Main interactive circle
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(180.dp)
                        .graphicsLayer { scaleX = scale; scaleY = scale }
                        .clip(CircleShape)
                        .background(if (isHolding) BloomColors.BackgroundLight else BloomColors.Surface)
                        .then(
                            if (isHolding) {
                                Modifier.shadow(
                                    elevation = 30.dp,
                                    shape = CircleShape,
                                    ambientColor = BloomColors.Sage.copy(alpha = 0.6f),
                                    spotColor = BloomColors.Sage.copy(alpha = 0.6f)
                                )
                            } else Modifier
                        )
                ) {
                    // Border
                    Canvas(modifier = Modifier.matchParentSize()) {
                        drawCircle(
                            color = if (isHolding) BloomColors.Sage.copy(alpha = 0.8f) else BloomColors.Sage,
                            style = Stroke(width = 2.dp.toPx())
                        )
                    }
                }
                
                // Progress ring
                if (isHolding) {
                    Canvas(
                        modifier = Modifier.size(170.dp)
                    ) {
                        drawArc(
                            color = BloomColors.Sage,
                            startAngle = -90f,
                            sweepAngle = holdProgress * 360f,
                            useCenter = false,
                            style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(0.5f))
            
            // Bottom Progress Bar
            if (isHolding) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(bottom = 60.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .width(200.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(BloomColors.Surface)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(holdProgress)
                                .clip(RoundedCornerShape(2.dp))
                                .background(BloomColors.Sage)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Text(
                        text = String.format("%.1fs", holdProgress * 3f),
                        fontSize = 12.sp,
                        color = BloomColors.TextMuted
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(100.dp))
            }
        }
    }
}
