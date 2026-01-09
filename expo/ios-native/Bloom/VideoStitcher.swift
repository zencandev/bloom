import AVFoundation
import UIKit
import CoreImage

class VideoStitcher {
    
    enum StitchError: Error {
        case noClips
        case audioNotFound
        case exportFailed
    }
    
    static func makeZenVideo(from clipURLs: [URL], completion: @escaping (Result<URL, Error>) -> Void) {
        Task {
            do {
                let composition = AVMutableComposition()
                
                // Tracks
                guard let compositionVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
                      let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
                    completion(.failure(StitchError.exportFailed))
                    return
                }
                
                var currentTime = CMTime.zero
                var layerInstructions: [AVMutableVideoCompositionLayerInstruction] = []
                var renderSize = CGSize(width: 1080, height: 1920)
                
                // 1. STITCH CLIPS (Slow Mo 0.5x)
                for (index, url) in clipURLs.enumerated() {
                    let asset = AVURLAsset(url: url)
                    let tracks = try await asset.loadTracks(withMediaType: .video)
                    guard let videoTrack = tracks.first else { continue }
                    
                    if index == 0 {
                        renderSize = try await videoTrack.load(.naturalSize)
                    }
                    
                    let duration = try await asset.load(.duration)
                    let range = CMTimeRange(start: .zero, duration: duration)
                    
                    try compositionVideoTrack.insertTimeRange(range, of: videoTrack, at: currentTime)
                    
                    // SLOW MOTION: Scale time range to be 2x longer (0.5x speed)
                    let slowDuration = CMTimeMultiply(duration, multiplier: 2)
                    compositionVideoTrack.scaleTimeRange(CMTimeRange(start: currentTime, duration: duration), toDuration: slowDuration)
                    
                    // Transform Instruction
                    let instruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
                    let transform = try await videoTrack.load(.preferredTransform)
                    instruction.setTransform(transform, at: currentTime)
                    
                    layerInstructions.append(instruction)
                    
                    currentTime = CMTimeAdd(currentTime, slowDuration)
                }
                
                // 2. ADD BACKGROUND MUSIC
                if let audioURL = Bundle.main.url(forResource: "zen-music-yoga", withExtension: "mp3") {
                    let audioAsset = AVURLAsset(url: audioURL)
                    let audioTracks = try await audioAsset.loadTracks(withMediaType: .audio)
                    if let audioTrack = audioTracks.first {
                        // Loop audio to fit video duration
                        var audioTime = CMTime.zero
                        let videoDuration = currentTime
                        let audioAssetDuration = try await audioAsset.load(.duration)
                        
                        while audioTime < videoDuration {
                            let remaining = CMTimeSubtract(videoDuration, audioTime)
                            let chunkDuration = min(remaining, audioAssetDuration)
                            let range = CMTimeRange(start: .zero, duration: chunkDuration)
                            
                            try? compositionAudioTrack.insertTimeRange(range, of: audioTrack, at: audioTime)
                            audioTime = CMTimeAdd(audioTime, chunkDuration)
                        }
                    }
                }
                
                // 3. APPLY VIDEO COMPOSITION (Filters)
                let videoComposition = AVMutableVideoComposition()
                videoComposition.renderSize = renderSize
                videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
                
                let instruction = AVMutableVideoCompositionInstruction()
                instruction.timeRange = CMTimeRange(start: .zero, duration: currentTime)
                instruction.layerInstructions = layerInstructions
                videoComposition.instructions = [instruction]
                
                let filteredComposition = AVVideoComposition(asset: composition) { request in
                    let source = request.sourceImage.clampedToExtent()
                    
                    // 1. Saturation (0.5)
                    let saturationFilter = CIFilter(name: "CIColorControls")!
                    saturationFilter.setValue(source, forKey: kCIInputImageKey)
                    saturationFilter.setValue(0.5, forKey: kCIInputSaturationKey)
                    
                    // 2. Vignette
                    let vignetteFilter = CIFilter(name: "CIVignette")!
                    vignetteFilter.setValue(saturationFilter.outputImage, forKey: kCIInputImageKey)
                    vignetteFilter.setValue(1.0, forKey: kCIInputIntensityKey)
                    vignetteFilter.setValue(2.0, forKey: kCIInputRadiusKey)
                    
                    let output = vignetteFilter.outputImage?.cropped(to: request.sourceImage.extent)
                    
                    request.finish(with: output ?? source, context: nil)
                }
                
                // 4. EXPORT
                let exportURL = FileManager.default.temporaryDirectory.appendingPathComponent("zen_weekly_\(Date().timeIntervalSince1970).mov")
                
                guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
                    completion(.failure(StitchError.exportFailed))
                    return
                }
                
                exportSession.outputURL = exportURL
                exportSession.outputFileType = .mov
                exportSession.videoComposition = filteredComposition
                
                await exportSession.export()
                
                let status = exportSession.status
                let error = exportSession.error
                
                DispatchQueue.main.async {
                    switch status {
                    case .completed:
                        completion(.success(exportURL))
                    case .failed:
                        completion(.failure(error ?? StitchError.exportFailed))
                    default:
                        completion(.failure(StitchError.exportFailed))
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
            }
        }
    }
}
