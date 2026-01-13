package com.zencan.bloom.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.zencan.bloom.data.DayClip
import com.zencan.bloom.data.ZenStore
import com.zencan.bloom.ui.theme.BloomColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.time.Instant

private const val TAG = "CaptureScreen"
private const val MAX_DURATION_MS = 1500L

@Composable
fun CaptureScreen(
    dayIndex: Int,
    zenStore: ZenStore,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    
    var isRecording by remember { mutableStateOf(false) }
    var recordedDuration by remember { mutableLongStateOf(0L) }
    var progress by remember { mutableFloatStateOf(0f) }
    var isComplete by remember { mutableStateOf(false) }
    var cameraReady by remember { mutableStateOf(false) }
    var hasPermission by remember { 
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        ) 
    }
    
    val videoCaptureRef = remember { mutableStateOf<VideoCapture<Recorder>?>(null) }
    val recordingRef = remember { mutableStateOf<Recording?>(null) }
    
    // Permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasPermission = permissions[Manifest.permission.CAMERA] == true
        Log.d(TAG, "Permission result: camera=$hasPermission")
    }
    
    // Request permission on launch
    LaunchedEffect(Unit) {
        if (!hasPermission) {
            Log.d(TAG, "Requesting camera permission")
            permissionLauncher.launch(arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO
            ))
        }
    }
    
    // Start recording after camera is ready
    LaunchedEffect(cameraReady) {
        if (cameraReady && !isRecording && !isComplete) {
            delay(500)
            startRecording(
                context = context,
                videoCapture = videoCaptureRef.value,
                dayIndex = dayIndex,
                onRecordingStarted = { rec -> 
                    recordingRef.value = rec
                    isRecording = true 
                    Log.d(TAG, "Recording started!")
                },
                onRecordingCompleted = { uri ->
                    scope.launch {
                        Log.d(TAG, "Recording completed: $uri")
                        val clip = DayClip(
                            dayIndex = dayIndex,
                            date = Instant.now().toString(),
                            videoUri = uri,
                            createdAt = System.currentTimeMillis()
                        )
                        zenStore.addClip(clip)
                        isComplete = true
                        delay(1500)
                        onComplete()
                    }
                }
            )
        }
    }
    
    // Recording timer
    LaunchedEffect(isRecording) {
        if (isRecording) {
            val startTime = System.currentTimeMillis()
            while (recordedDuration < MAX_DURATION_MS) {
                recordedDuration = System.currentTimeMillis() - startTime
                progress = (recordedDuration.toFloat() / MAX_DURATION_MS).coerceIn(0f, 1f)
                delay(50)
            }
            // Stop recording
            recordingRef.value?.stop()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BloomColors.Background)
    ) {
        // Camera Preview
        if (hasPermission) {
            AndroidView(
                factory = { ctx ->
                    Log.d(TAG, "Creating PreviewView")
                    PreviewView(ctx).apply {
                        implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                        
                        // Initialize camera when view is created
                        post {
                            Log.d(TAG, "PreviewView posted, initializing camera")
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                try {
                                    val cameraProvider = cameraProviderFuture.get()
                                    Log.d(TAG, "Got camera provider")
                                    
                                    val preview = Preview.Builder().build().also {
                                        it.setSurfaceProvider(surfaceProvider)
                                    }
                                    
                                    val recorder = Recorder.Builder()
                                        .setQualitySelector(QualitySelector.from(Quality.HD))
                                        .build()
                                    val videoCapture = VideoCapture.withOutput(recorder)
                                    videoCaptureRef.value = videoCapture
                                    
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        CameraSelector.DEFAULT_FRONT_CAMERA,
                                        preview,
                                        videoCapture
                                    )
                                    
                                    cameraReady = true
                                    Log.d(TAG, "Camera initialized successfully")
                                } catch (e: Exception) {
                                    Log.e(TAG, "Camera binding failed", e)
                                }
                            }, ContextCompat.getMainExecutor(ctx))
                        }
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // No permission - show message
            Box(
                modifier = Modifier.fillMaxSize().background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "📷",
                        fontSize = 48.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Camera permission required",
                        color = Color.White,
                        fontSize = 18.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Please grant camera access",
                        color = BloomColors.TextMuted,
                        fontSize = 14.sp
                    )
                }
            }
        }
        
        // Overlay when camera loading
        AnimatedVisibility(
            visible = hasPermission && !cameraReady && !isComplete,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = BloomColors.Sage)
            }
        }
        
        // Recording UI
        AnimatedVisibility(
            visible = isRecording && !isComplete,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top Bar with timer
                Row(
                    modifier = Modifier
                        .padding(top = 50.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color.Black.copy(alpha = 0.5f))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Blinking red dot
                    val infiniteTransition = rememberInfiniteTransition(label = "blink")
                    val alpha by infiniteTransition.animateFloat(
                        initialValue = 1f,
                        targetValue = 0f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(500),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "alpha"
                    )
                    
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color.Red.copy(alpha = alpha))
                    )
                    
                    Text(
                        text = String.format("00:%02d", (recordedDuration / 1000).toInt()),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontFamily = FontFamily.Monospace
                    )
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                // Bottom Progress
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(bottom = 60.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .width(280.dp)
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color.White.copy(alpha = 0.3f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(progress)
                                .clip(RoundedCornerShape(3.dp))
                                .background(BloomColors.Sage)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Text(
                        text = "Capturing your moment...",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        letterSpacing = 1.sp
                    )
                }
            }
        }
        
        // Completion Overlay
        AnimatedVisibility(
            visible = isComplete,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.85f)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "✨",
                        fontSize = 64.sp
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Text(
                        text = "Moment Captured",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }
            }
        }
    }
}

private fun startRecording(
    context: Context,
    videoCapture: VideoCapture<Recorder>?,
    dayIndex: Int,
    onRecordingStarted: (Recording) -> Unit,
    onRecordingCompleted: (String) -> Unit
) {
    val videoCapture = videoCapture ?: run {
        Log.e(TAG, "VideoCapture is null")
        return
    }
    
    val videoFile = File(context.cacheDir, "day_${dayIndex}_${System.currentTimeMillis()}.mp4")
    val outputOptions = FileOutputOptions.Builder(videoFile).build()
    
    val hasAudioPermission = ContextCompat.checkSelfPermission(
        context, Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED
    
    Log.d(TAG, "Starting recording to ${videoFile.absolutePath}, audio=$hasAudioPermission")
    
    val pendingRecording = if (hasAudioPermission) {
        videoCapture.output.prepareRecording(context, outputOptions).withAudioEnabled()
    } else {
        videoCapture.output.prepareRecording(context, outputOptions)
    }
    
    val recording = pendingRecording.start(ContextCompat.getMainExecutor(context)) { event ->
        when (event) {
            is VideoRecordEvent.Start -> {
                Log.d(TAG, "Recording started")
            }
            is VideoRecordEvent.Finalize -> {
                if (event.hasError()) {
                    Log.e(TAG, "Recording error: ${event.error}")
                } else {
                    Log.d(TAG, "Recording completed: ${videoFile.absolutePath}")
                    onRecordingCompleted(videoFile.absolutePath)
                }
            }
        }
    }
    
    onRecordingStarted(recording)
}
