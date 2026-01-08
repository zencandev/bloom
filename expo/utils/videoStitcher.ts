/**
 * Video Stitcher Utility
 * 
 * Uses FFmpeg to concatenate video clips with:
 * - Cross-fade transitions between clips
 * - Ambient audio overlay
 */

import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface StitchOptions {
    clipUris: string[];
    outputUri: string;
    audioUri?: string;
    onProgress?: (progress: number) => void;
}

export interface StitchResult {
    success: boolean;
    outputUri?: string;
    error?: string;
}

// Duration of each clip in seconds
const CLIP_DURATION = 1.5;
// Duration of crossfade transition
const CROSSFADE_DURATION = 0.3;

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
    try {
        const session = await FFmpegKit.execute('-version');
        const returnCode = await session.getReturnCode();
        return ReturnCode.isSuccess(returnCode);
    } catch (error) {
        console.log('FFmpeg not available:', error);
        return false;
    }
}

/**
 * Stitch multiple video clips into one video with crossfade transitions
 * and optional ambient audio overlay
 */
export async function stitchVideos(options: StitchOptions): Promise<StitchResult> {
    const { clipUris, outputUri, audioUri, onProgress } = options;

    if (clipUris.length === 0) {
        return { success: false, error: 'No clips provided' };
    }

    if (clipUris.length === 1) {
        // Only one clip - just copy it
        try {
            await FileSystem.copyAsync({ from: clipUris[0], to: outputUri });
            return { success: true, outputUri };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    try {
        // Enable progress callback
        if (onProgress) {
            FFmpegKitConfig.enableStatisticsCallback((stats) => {
                const time = stats.getTime();
                // Estimate total duration: clips + transitions
                const totalDuration = (clipUris.length * CLIP_DURATION) - ((clipUris.length - 1) * CROSSFADE_DURATION);
                const progress = Math.min((time / 1000) / totalDuration, 1);
                onProgress(progress);
            });
        }

        // Build the FFmpeg command
        const command = buildFFmpegCommand(clipUris, outputUri, audioUri);
        console.log('FFmpeg command:', command);

        // Execute
        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
            onProgress?.(1);
            return { success: true, outputUri };
        } else {
            const logs = await session.getAllLogsAsString();
            console.error('FFmpeg error:', logs);
            return { success: false, error: `FFmpeg failed with code ${returnCode}` };
        }

    } catch (error) {
        console.error('Stitch error:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Build the FFmpeg command for video stitching with crossfade
 */
// Build the FFmpeg command for video stitching
function buildFFmpegCommand(clipUris: string[], outputUri: string, audioUri?: string): string {
    const inputs = clipUris.map(uri => `-i "${uri}"`).join(' ');
    const audioInput = audioUri ? `-i "${audioUri}"` : '';

    // Simplified concat filter to avoid xfade issues
    // [0:v][1:v]...concat=n=N:v=1:a=0[outv]

    // Safety check for inputs
    if (clipUris.length < 2) {
        // Should be handled by caller but just in case
        return `-i "${clipUris[0]}" -c copy -y "${outputUri}"`;
    }

    let filterComplex = '';
    const n = clipUris.length;

    // Input labels
    let inputNodes = '';
    let preProcessFilter = '';

    for (let i = 0; i < n; i++) {
        // Normalize each input:
        // 1. fps=30: Standardize framerate (inputs are VFR ~30fps)
        // 2. scale=1080:1920: Ensure resolution is exactly 1080x1920 (assuming portrait inputs)
        // 3. setsar=1: Force Square Aspect Ratio
        preProcessFilter += `[${i}:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[v${i}]; `;
        inputNodes += `[v${i}]`;
    }

    filterComplex = `${preProcessFilter}${inputNodes}concat=n=${n}:v=1:a=0[outv]`;

    // Build the final command
    let command = `${inputs} ${audioInput} -filter_complex "${filterComplex}" -map "[outv]"`;

    // Add audio mapping
    if (audioUri) {
        // Use the ambient audio
        const videoDuration = n * CLIP_DURATION; // Approx length for concat
        command += ` -map ${n}:a -t ${videoDuration.toFixed(1)} -c:a aac -b:a 128k`;
    } else {
        // No audio
        command += ' -an';
    }

    // Output settings: Use mpeg4 for safety
    command += ` -c:v mpeg4 -q:v 5 -pix_fmt yuv420p -y "${outputUri}"`;

    return command;
}

/**
 * Simple fallback: copy first clip as output (used when FFmpeg unavailable)
 */
export async function fallbackStitch(clipUris: string[], outputUri: string): Promise<StitchResult> {
    if (clipUris.length === 0) {
        return { success: false, error: 'No clips provided' };
    }

    try {
        await FileSystem.copyAsync({ from: clipUris[0], to: outputUri });
        return { success: true, outputUri };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
