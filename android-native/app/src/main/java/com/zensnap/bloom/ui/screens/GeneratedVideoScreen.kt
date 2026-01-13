package com.zensnap.bloom.ui.screens

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.zensnap.bloom.data.ZenStore
import com.zensnap.bloom.ui.theme.BloomColors
import com.zensnap.bloom.video.VideoStitcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream

@Composable
fun GeneratedVideoScreen(
    zenStore: ZenStore,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val weekData by zenStore.currentWeek.collectAsState()
    
    var isSaving by remember { mutableStateOf(false) }
    var isGenerating by remember { mutableStateOf(false) }
    var generationError by remember { mutableStateOf<String?>(null) }
    
    val videoUri = weekData.generatedVideoUri
    
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            repeatMode = Player.REPEAT_MODE_OFF
        }
    }
    
    // Trigger video generation if not already generated
    LaunchedEffect(weekData.clips.size, videoUri) {
        if (videoUri == null && weekData.clips.isNotEmpty() && !isGenerating) {
            isGenerating = true
            generationError = null
            
            val clipPaths = weekData.clips.sortedBy { it.dayIndex }.map { it.videoUri }
            
            val result = VideoStitcher.makeZenVideo(
                context = context,
                clipPaths = clipPaths,
                musicPath = "zen_music_yoga.mp3"
            )
            
            when (result) {
                is VideoStitcher.Result.Success -> {
                    zenStore.setGeneratedVideo(result.outputPath)
                }
                is VideoStitcher.Result.Error -> {
                    generationError = result.message
                }
            }
            isGenerating = false
        }
    }
    
    // Separate media item loading from player release
    LaunchedEffect(videoUri) {
        videoUri?.let { uri ->
            val mediaItem = MediaItem.fromUri("file://$uri")
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
        }
    }
    
    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when {
            videoUri != null -> {
                // Fullscreen Video Player
                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            player = exoPlayer
                            useController = false
                            // Ensure it fills the screen
                            layoutParams = android.view.ViewGroup.LayoutParams(
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                android.view.ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Transparent Top Close Button
                IconButton(
                    onClick = {
                        exoPlayer.stop()
                        onBack()
                    },
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(16.dp)
                        .size(44.dp)
                        .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                        .align(Alignment.TopStart)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White
                    )
                }

                // Bottom Controls Overlay
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = 20.dp) // Reduced padding to move icons further down
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Replay Icon
                    IconButton(
                        onClick = {
                            exoPlayer.seekTo(0)
                            exoPlayer.play()
                        },
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .size(64.dp)
                            .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Replay",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = "REPLAY",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }


                    // Save Icon (Download Style)
                    IconButton(
                        onClick = {
                            videoUri.let { uri ->
                                scope.launch {
                                    isSaving = true
                                    val success = saveToGallery(context, uri)
                                    isSaving = false
                                    Toast.makeText(
                                        context,
                                        if (success) "Saved to Photos! 🌸" else "Error saving",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        },
                        enabled = !isSaving,
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .size(64.dp)
                            .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "↓",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Light,
                                    color = Color.White,
                                    modifier = Modifier.offset(y = (-2).dp)
                                )
                                Text(
                                    text = "SAVE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
            isGenerating -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = BloomColors.Sage)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Creating your Weekly Zen...", color = Color.White)
                    }
                }
            }
            generationError != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("⚠️", fontSize = 48.sp)
                        Text("Error generating video", color = Color.White)
                        Text(generationError ?: "", color = Color.Gray, fontSize = 12.sp)
                        Button(onClick = onBack, modifier = Modifier.padding(16.dp)) {
                            Text("Go Back")
                        }
                    }
                }
            }
        }
    }

}

private suspend fun saveToGallery(context: android.content.Context, videoPath: String): Boolean {
    return withContext(Dispatchers.IO) {
        try {
            val file = File(videoPath)
            if (!file.exists()) return@withContext false
            
            val contentValues = ContentValues().apply {
                put(MediaStore.Video.Media.DISPLAY_NAME, "Bloom_Week2_${System.currentTimeMillis()}.mp4")
                put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES)
                    put(MediaStore.Video.Media.IS_PENDING, 1)
                }
            }
            
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, contentValues)
                ?: return@withContext false
            
            resolver.openOutputStream(uri)?.use { outputStream ->
                FileInputStream(file).use { inputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentValues.clear()
                contentValues.put(MediaStore.Video.Media.IS_PENDING, 0)
                resolver.update(uri, contentValues, null, null)
            }
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
