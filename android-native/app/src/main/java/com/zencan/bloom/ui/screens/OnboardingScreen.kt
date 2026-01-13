package com.zencan.bloom.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zencan.bloom.data.ZenStore
import com.zencan.bloom.data.onboardingSteps
import com.zencan.bloom.ui.theme.BloomColors
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    zenStore: ZenStore
) {
    var currentStep by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    
    val step = onboardingSteps[currentStep]
    
    // Animate opacity on step change
    val animatedOpacity by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 600),
        label = "opacity"
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BloomColors.Background)
            .statusBarsPadding()
    ) {
        // Skip Button
        if (currentStep < onboardingSteps.size - 1) {
            TextButton(
                onClick = {
                    scope.launch {
                        zenStore.completeOnboarding()
                        onComplete()
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
            ) {
                Text(
                    text = "Skip",
                    fontSize = 16.sp,
                    color = BloomColors.TextMuted
                )
            }
        }
        
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(1f))
            
            // Content
            Column(
                modifier = Modifier
                    .padding(horizontal = 32.dp)
                    .graphicsLayer { alpha = animatedOpacity },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = step.emoji,
                    fontSize = 80.sp
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(
                    text = step.title,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Light,
                    color = BloomColors.Cream,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = step.subtitle.uppercase(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = BloomColors.Sage,
                    letterSpacing = 2.sp,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = step.description,
                    fontSize = 16.sp,
                    color = BloomColors.TextSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 24.sp
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Dots
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 40.dp)
            ) {
                onboardingSteps.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .size(
                                width = if (index == currentStep) 24.dp else 8.dp,
                                height = 8.dp
                            )
                            .clip(CircleShape)
                            .background(
                                if (index == currentStep) BloomColors.Sage else BloomColors.Surface
                            )
                    )
                }
            }
            
            // Button
            Button(
                onClick = {
                    if (currentStep < onboardingSteps.size - 1) {
                        currentStep++
                    } else {
                        scope.launch {
                            zenStore.completeOnboarding()
                            onComplete()
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp)
                    .padding(bottom = 20.dp)
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BloomColors.Sage
                )
            ) {
                Text(
                    text = if (currentStep == onboardingSteps.size - 1) "Begin Your Journey" else "Continue",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BloomColors.Background
                )
            }
        }
    }
}
