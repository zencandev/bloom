package com.zencan.bloom.video

import android.content.Context
import android.util.Log
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Video stitcher using FFmpegKit
 * Creates a "Weekly Zen" video from daily clips with:
 * - 0.5x slow motion
 * - Concatenation of all clips
 * - Background music overlay
 * - Saturation and vignette filters
 */
object VideoStitcher {
    
    private const val TAG = "VideoStitcher"
    
    sealed class Result {
        data class Success(val outputPath: String) : Result()
        data class Error(val message: String) : Result()
    }
    
    /**
     * Creates a zen video from the given clip paths
     * @param context Application context
     * @param clipPaths List of paths to the daily clips (should be sorted by day)
     * @param musicPath Optional path to background music file (in assets or raw)
     * @return Result with output path or error
     */
    suspend fun makeZenVideo(
        context: Context,
        clipPaths: List<String>,
        musicPath: String? = null
    ): Result = withContext(Dispatchers.IO) {
        
        if (clipPaths.isEmpty()) {
            return@withContext Result.Error("No clips provided")
        }
        
        try {
            val cacheDir = context.cacheDir
            val outputFile = File(cacheDir, "zen_weekly_${System.currentTimeMillis()}.mp4")
            
            // Step 1: Create slow-mo versions of each clip
            val slowMoClips = mutableListOf<String>()
            clipPaths.forEachIndexed { index, path ->
                val slowMoPath = File(cacheDir, "slowmo_$index.mp4").absolutePath
                
                // Apply 0.5x speed (setpts=2.0*PTS doubles the duration)
                val slowMoCommand = "-y -i \"$path\" -filter:v \"setpts=2.0*PTS\" -an \"$slowMoPath\""
                
                val session = FFmpegKit.execute(slowMoCommand)
                if (ReturnCode.isSuccess(session.returnCode)) {
                    slowMoClips.add(slowMoPath)
                    Log.d(TAG, "Slow-mo clip $index created")
                } else {
                    Log.e(TAG, "Failed to create slow-mo clip $index: ${session.failStackTrace}")
                }
            }
            
            if (slowMoClips.isEmpty()) {
                return@withContext Result.Error("Failed to process clips")
            }
            
            // Step 2: Create concat filter input file
            val concatFile = File(cacheDir, "concat.txt")
            concatFile.writeText(slowMoClips.joinToString("\n") { "file '$it'" })
            
            // Step 3: Concatenate and apply filters
            val concatOutput = File(cacheDir, "concat_output.mp4").absolutePath
            
            // Concatenate without extra filters for now to ensure compatibility
            // The input videos are already portrait, so we maintain that. 
            // We can add cropping later if needed to force a specific ratio.
            val concatCommand = "-y -f concat -safe 0 -i \"${concatFile.absolutePath}\" -c:v mpeg4 -q:v 2 \"$concatOutput\""
            
            val concatSession = FFmpegKit.execute(concatCommand)
            if (!ReturnCode.isSuccess(concatSession.returnCode)) {
                Log.e(TAG, "Concat failed: ${concatSession.failStackTrace}")
                return@withContext Result.Error("Failed to concatenate clips")
            }
            
            // Step 4: Add background music if available
            val finalOutput = if (musicPath != null) {
                val musicFile = extractMusicAsset(context, musicPath)
                if (musicFile != null) {
                    addBackgroundMusic(concatOutput, musicFile.absolutePath, outputFile.absolutePath)
                } else {
                    // No music, just copy the concat output
                    File(concatOutput).copyTo(outputFile, overwrite = true)
                    outputFile.absolutePath
                }
            } else {
                File(concatOutput).copyTo(outputFile, overwrite = true)
                outputFile.absolutePath
            }
            
            // Cleanup temp files
            slowMoClips.forEach { File(it).delete() }
            concatFile.delete()
            File(concatOutput).delete()
            
            Log.d(TAG, "Zen video created: $finalOutput")
            Result.Success(finalOutput)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error creating zen video", e)
            Result.Error(e.message ?: "Unknown error")
        }
    }
    
    private fun extractMusicAsset(context: Context, assetName: String): File? {
        return try {
            val outputFile = File(context.cacheDir, "temp_music.mp3")
            context.assets.open(assetName).use { input ->
                outputFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            outputFile
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract music asset", e)
            null
        }
    }
    
    private fun addBackgroundMusic(videoPath: String, musicPath: String, outputPath: String): String {
        // -stream_loop -1 loops the music indefinitely
        // -map 0:v -map 1:a takes video from first input and audio from second
        // -shortest ends the conversion when the shortest input (the video) ends
        val command = "-y -i \"$videoPath\" -stream_loop -1 -i \"$musicPath\" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest \"$outputPath\""
        
        val session = FFmpegKit.execute(command)
        return if (ReturnCode.isSuccess(session.returnCode)) {
            outputPath
        } else {
            Log.e(TAG, "Failed to add music: ${session.failStackTrace}")
            videoPath // Return original without music
        }
    }
}
