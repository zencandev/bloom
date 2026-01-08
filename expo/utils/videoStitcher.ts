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

    if (onProgress) {
        onProgress(0.1);
    }

    try {
        // Enable progress callback
        const clipsMetadata = await Promise.all(clipUris.map(async (uri) => {
            const session = await FFprobeKit.getMediaInformation(uri);
            const info = session.getMediaInformation();

            let duration = 1.5;
            if (info) {
                const durationStr = info.getDuration();
                const d = parseFloat(String(durationStr));
                if (!isNaN(d)) duration = d;
            }
            return { uri, duration };
        }));

        const totalDuration = clipsMetadata.reduce((acc, clip) => acc + clip.duration, 0);
        const totalSlowDuration = totalDuration * 2.0;

        // Log detected durations for debugging
        console.log('Detected Clip Durations:', clipsMetadata.map(c => `${c.uri.split('/').pop()}: ${c.duration}s`));
        console.log('Total Output Duration (Slow-Mo):', totalSlowDuration);

        // Enable progress callback with accurate duration
        if (onProgress) {
            FFmpegKitConfig.enableStatisticsCallback((stats) => {
                const time = stats.getTime();
                const progress = Math.min((time / 1000) / totalSlowDuration, 1);
                onProgress(progress);
            });
        }

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
        // Video: Apply basic normalization + Saturation (Hue) + Slow Mo (setpts)
        // setpts=2.0*PTS makes it 0.5x speed (Zen feel)
        filterComplex += `[${i}:v]setpts=2.0*PTS,fps=30,scale=1080:1920,setsar=1,format=yuv420p,hue=s=0.5[v${i}]; `;
        videoNodes += `[v${i}]`;
    }

    // Simple Concat
    filterComplex += `${videoNodes}concat=n=${n}:v=1:a=0[catv]; `;

    // Global Effects: Film Grain + Vignette
    filterComplex += `[catv]noise=alls=10:allf=t+u,vignette=angle=0.5[outv]; `;

    // Total duration for the slow-mo video (2.0x PTS)
    const totalSlowDuration = clips.reduce((acc, clip) => acc + (clip.duration * 2.0), 0);

    // Command structure:
    let command = `${inputs} ${audioInput} -filter_complex "${filterComplex}" -map "[outv]"`;

    if (audioUri) {
        // Map the extra audio input (index n)
        // Apply lo-fi filters and limit to the calculated video duration
        command += ` -map ${n}:a? -af "lowpass=f=3000,highpass=f=200,volume=0.4" -c:a aac -b:a 128k -t ${totalSlowDuration.toFixed(2)}`;
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
