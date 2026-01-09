package com.zensnap.bloom.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.zensnap.bloom.data.ZenStore
import com.zensnap.bloom.ui.theme.BloomColors
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun PreviewScreen(
    dayIndex: Int,
    zenStore: ZenStore,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val clip = zenStore.getClip(dayIndex)
    
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            repeatMode = Player.REPEAT_MODE_ONE
        }
    }
    
    DisposableEffect(clip) {
        clip?.let {
            val mediaItem = MediaItem.fromUri("file://${it.videoUri}")
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
        }
        
        onDispose {
            exoPlayer.release()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BloomColors.Background)
    ) {
        // Video Player
        if (clip != null) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No clip found",
                    color = Color.White
                )
            }
        }
        
        // Overlay Controls
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Back button
            IconButton(
                onClick = onBack,
                modifier = Modifier.padding(8.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier
                        .size(24.dp)
                        .shadow(4.dp)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Date display
            clip?.let {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 50.dp)
                ) {
                    Text(
                        text = formatDate(it.date),
                        fontSize = 16.sp,
                        color = BloomColors.Sage
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Text(
                        text = formatTime(it.createdAt),
                        fontSize = 12.sp,
                        color = BloomColors.TextMuted
                    )
                }
            }
        }
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val instant = java.time.Instant.parse(dateString)
        val date = Date.from(instant)
        SimpleDateFormat("MMMM d, yyyy", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        dateString
    }
}

private fun formatTime(timestamp: Long): String {
    return SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(timestamp))
}
