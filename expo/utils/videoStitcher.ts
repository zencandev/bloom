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

    // Simplified concat filter to avoid xfade issues
    // [0:v][1:v]...concat=n=N:v=1:a=0[outv]

    // Safety check for inputs
    if (clips.length < 2) {
        // Should be handled by caller but just in case
        return `-i "${clips[0].uri}" -c copy -y "${outputUri}"`;
    }

    let filterComplex = '';
    const n = clips.length;

    // COMPLEX FILTER CHAIN SYSTEM
    // 1. Normalize Inputs (Resolution, FPS)
    // 2. Apply Lo-Fi Filters (Audio/Video)
    // 3. Apply Crossfade Transitions (Video/Audio)

    let lastVideoLabel = 'v0_norm';
    let lastAudioLabel = 'a0_norm';

    // Step 1: Normalize and Filter Inputs
    for (let i = 0; i < n; i++) {
        // Video: Normalize -> LoFi Adjustments (Saturation/Contrast)
        // Note: We apply noise at the end to be uniform
        filterComplex += `[${i}:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p,eq=saturation=0.7:contrast=1.2[v${i}_norm]; `;
        // Audio: Bandpass filter for Lo-Fi "Telephone" effect + Normalize Format (44.1k, Stereo)
        // Critical: acrossfade requires identical sample rate/channels
        filterComplex += `[${i}:a]lowpass=f=3000,highpass=f=300,volume=1.2,aresample=44100,ac=2[a${i}_norm]; `;
    }

    // Step 2: Build Transition Chain
    if (n === 1) {
        lastVideoLabel = 'v0_norm';
        lastAudioLabel = 'a0_norm';
    } else {
        // Calculate offsets dynamically based on actual duration of PREVIOUS clip
        // Offset for transition between Clip A and Clip B is:
        // (Start of A) + (Duration of A) - (Overlap)
        // But for a chain, it accumulates.

        let currentOffset = 0;
        // First clip duration gives the first offset
        // offset = clips[0].duration - overlap

        // Initial transition: 0 -> 1
        currentOffset = clips[0].duration - CROSSFADE_DURATION;
        if (currentOffset < 0) currentOffset = 0; // Safety

        filterComplex += `[v0_norm][v1_norm]xfade=transition=fade:duration=${CROSSFADE_DURATION}:offset=${currentOffset.toFixed(2)}[v_mix_1]; `;
        filterComplex += `[a0_norm][a1_norm]acrossfade=d=${CROSSFADE_DURATION}:c1=tri:c2=tri[a_mix_1]; `;

        lastVideoLabel = 'v_mix_1';
        lastAudioLabel = 'a_mix_1';

        // Subsequent transitions
        for (let i = 2; i < n; i++) {
            // Add duration of the *previous* clip (clips[i-1]) to the offset
            // Actually, correct formula for chain:
            // Offset N = Offset (N-1) + Duration (N-1) - Overlap? 
            // NO. Offset is absolute time.
            // Start of Clip 0 = 0.
            // Start of Clip 1 = Duration(0) - Overlap.
            // Start of Clip 2 = Start(1) + Duration(1) - Overlap.
            // So: currentOffset += clips[i-1].duration - CROSSFADE_DURATION.

            currentOffset += clips[i - 1].duration - CROSSFADE_DURATION;
            // Safety
            if (currentOffset < 0) currentOffset = 0; // Should not happen if clips > 0.3s

            let nextVideoLabel = `v_mix_${i}`;
            let nextAudioLabel = `a_mix_${i}`;

            filterComplex += `[${lastVideoLabel}][v${i}_norm]xfade=transition=fade:duration=${CROSSFADE_DURATION}:offset=${currentOffset.toFixed(2)}[${nextVideoLabel}]; `;
            filterComplex += `[${lastAudioLabel}][a${i}_norm]acrossfade=d=${CROSSFADE_DURATION}:c1=tri:c2=tri[${nextAudioLabel}]; `;

            lastVideoLabel = nextVideoLabel;
            lastAudioLabel = nextAudioLabel;
        }
    }

    // Step 3: Global Effects (Grain)
    // Apply film grain noise to the final stitched video
    filterComplex += `[${lastVideoLabel}]noise=alls=10:allf=t+u[outv]`;

    // Build the final command
    // Map the final video node [outv] and the final audio node [lastAudioLabel]
    let command = `${inputs} ${audioInput} -filter_complex "${filterComplex}" -map "[outv]" -map "[${lastAudioLabel}]"`;

    // Optional: Ambient Audio Overlay (if provided)
    // If audioUri is present (e.g. music), we need to mix it with the stitched audio
    // But the StitchOptions logic usually implies ambient audio replaces or mixes.
    // Current logic in `stitchVideos` says: "Ambient audio overlay".
    // Use `amix` to mix ambient with dialogue?
    if (audioUri) {
        // const videoDuration = (n * CLIP_DURATION) - ((n - 1) * CROSSFADE_DURATION);
        // We need to load ambient audio as input index `n`
        // Then mix: [lastAudioLabel][n:a]amix=inputs=2:duration=first[outa]
        // We need to append this to filter complex
        // Update command to use new Mix output

        // Removing the previous closing quote to append
        // Hacky string manipulation, better to rebuild
        command = `${inputs} ${audioInput} -filter_complex "${filterComplex}; [${lastAudioLabel}][${n}:a]amix=inputs=2:duration=first[outa]" -map "[outv]" -map "[outa]"`;
    } else {
        // Already mapped [lastAudioLabel]
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
