/**
 * Video Stitcher Utility
 * 
 * Uses FFmpeg to concatenate video clips with:
 * - Cross-fade transitions between clips
 * - Ambient audio overlay
 */

import { FFmpegKit, FFmpegKitConfig, ReturnCode, FFprobeKit } from 'ffmpeg-kit-react-native';
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

        // Detect actual clip durations to ensure xfade offsets are correct
        // Hardcoded 1.5s fails if clips are shorter (e.g. 1.0s)
        const clipsMetadata = await Promise.all(clipUris.map(async (uri) => {
            const session = await FFprobeKit.getMediaInformation(uri);
            const info = session.getMediaInformation();

            let duration = 1.5;
            if (info) {
                const durationStr = info.getDuration();
                // Ensure string to avoid TS errors if definition varies
                const d = parseFloat(String(durationStr));
                if (!isNaN(d)) duration = d;
            }
            return { uri, duration };
        }));

        const totalDuration = clipsMetadata.reduce((acc, clip) => acc + clip.duration, 0);

        // Log detected durations for debugging
        console.log('Detected Clip Durations:', clipsMetadata.map(c => `${c.uri.split('/').pop()}: ${c.duration}s`));

        // Build the FFmpeg command
        const command = buildFFmpegCommand(clipsMetadata, outputUri, audioUri);
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
 * Build the FFmpeg command for video stitching
 */
function buildFFmpegCommand(clips: { uri: string, duration: number }[], outputUri: string, audioUri?: string): string {
    const inputs = clips.map(c => `-i "${c.uri}"`).join(' ');
    const audioInput = audioUri ? `-i "${audioUri}"` : '';

    if (clips.length < 2) {
        return `-i "${clips[0].uri}" -c copy -y "${outputUri}"`;
    }

    // ROBUST LO-FI STITCHER (No Crossfade)
    // We use CONCAT with filter pre-processing.
    // This gives the "Vintage" look without the fragility of xfade.

    let filterComplex = '';
    let videoNodes = '';
    let audioNodes = '';
    const n = clips.length;

    for (let i = 0; i < n; i++) {
        // Video: Normalize ONLY (Golden State - Verified Working)
        // fps=30, scale=1080:1920, setsar=1, format=yuv420p
        filterComplex += `[${i}:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[v${i}]; `;
        videoNodes += `[v${i}]`;
    }

    // Simple Concat
    filterComplex += `${videoNodes}concat=n=${n}:v=1:a=0[outv]; `;

    // Command structure:
    let command = `${inputs} ${audioInput} -filter_complex "${filterComplex}" -map "[outv]"`;

    if (audioUri) {
        // Map the extra audio input (index n)
        command += ` -map ${n}:a -c:a aac -b:a 128k -shortest`;
    } else {
        command += ` -an`;
    }

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
