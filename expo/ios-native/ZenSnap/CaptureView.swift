import SwiftUI
import AVFoundation



struct CaptureView: View {
    let dayIndex: Int
    @ObservedObject var store: ZenStore
    @StateObject private var cameraModel = CameraModel()
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            // Camera Preview
            CameraPreview(session: cameraModel.session)
                .edgesIgnoringSafeArea(.all)
                .overlay(Color.black.opacity(cameraModel.isSessionRunning ? 0 : 1))
            
            // UI Overlay
            VStack {
                // Top Bar (Timer / Rec Indicator)
                if cameraModel.isRecording {
                    HStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 8, height: 8)
                            .opacity(cameraModel.isRecording ? 1 : 0)
                            .animation(.easeInOut(duration: 0.5).repeatForever(), value: cameraModel.isRecording)
                        
                        Text(String(format: "00:%02d", Int(cameraModel.recordedDuration)))
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(20)
                    .padding(.top, 50)
                } else {
                    Spacer().frame(height: 50)
                }
                
                Spacer()
                
                // Bottom Controls
                VStack(spacing: 20) {
                    
                    if !cameraModel.isComplete {
                        // Regular Progress Bar (Filling up to 1.5s)
                        VStack(spacing: 12) {
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.3))
                                    .frame(height: 6)
                                
                                Capsule()
                                    .fill(Theme.Colors.sage)
                                    .frame(width: 280 * CGFloat(cameraModel.progress), height: 6)
                            }
                            .frame(width: 280)
                            
                            Text("Capturing your moment...")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                                .tracking(1)
                        }
                    }
                }
                .padding(.bottom, 60)
            }
            .opacity(cameraModel.isComplete ? 0 : 1)
            
            // Completion Overlay
            if cameraModel.isComplete {
                ZStack {
                    Color.black.opacity(0.85).ignoresSafeArea()
                    
                    VStack(spacing: 24) {
                        Text("✨")
                            .font(.system(size: 64))
                            .scaleEffect(1.2)
                            .animation(.spring(), value: cameraModel.isComplete)
                        
                        Text("Moment Captured")
                            .font(.title2)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                    }
                }
                .transition(.opacity)
                .onAppear {
                    // Navigate back to Home after 1.5s
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        // Pop all the way back to root (reset path)
                        store.path.removeAll()
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            cameraModel.checkPermissions()
            // Auto-start recording after a short delay to allow camera release from transition
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                cameraModel.startRecording()
            }
        }
        .onDisappear {
            cameraModel.stopSession()
        }
        .onChange(of: cameraModel.finalVideoURL) { _, newValue in
            if let url = newValue {
                saveClip(url: url)
            }
        }
    }
    
    func saveClip(url: URL) {
        // Move file (placeholder logic)
        // In real app, move `url` to a persistent ApplicationSupport directory
        let clip = DayClip(
            dayIndex: self.dayIndex,
            date: Date().ISO8601Format(),
            videoUri: url.path,
            createdAt: Date().timeIntervalSince1970
        )
        DispatchQueue.main.async {
            store.addClip(clip)
        }
    }
}

class CameraModel: NSObject, ObservableObject, AVCaptureFileOutputRecordingDelegate {
    @Published var isSessionRunning = false
    @Published var isRecording = false
    @Published var progress: Double = 0
    @Published var recordedDuration: Double = 0
    @Published var isComplete = false
    @Published var finalVideoURL: URL?
    
    let session = AVCaptureSession()
    private let movieOutput = AVCaptureMovieFileOutput()
    private var timer: Timer?
    private let MAX_DURATION: Double = 1.5
    
    func checkPermissions() {
        let videoStatus = AVCaptureDevice.authorizationStatus(for: .video)
        let audioStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        
        if videoStatus == .authorized && audioStatus == .authorized {
            setupCamera()
            return
        }
        
        if videoStatus == .notDetermined {
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted {
                    if audioStatus == .notDetermined {
                        AVCaptureDevice.requestAccess(for: .audio) { _ in
                            DispatchQueue.main.async { self.setupCamera() }
                        }
                    } else {
                        DispatchQueue.main.async { self.setupCamera() }
                    }
                }
            }
        } else if videoStatus == .authorized && audioStatus == .notDetermined {
            AVCaptureDevice.requestAccess(for: .audio) { _ in
                DispatchQueue.main.async { self.setupCamera() }
            }
        }
    }
    
    var isSimulatorOrFailed = false
    
    func setupCamera() {
        session.beginConfiguration()
        session.sessionPreset = .high
        
        let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
        
        if device == nil {
            print("Camera not available (Simulator?)")
            isSimulatorOrFailed = true
            session.commitConfiguration()
            return
        }
        
        guard let input = try? AVCaptureDeviceInput(device: device!) else { return }
        
        if session.canAddInput(input) {
            session.addInput(input)
        }
        
        // Add Audio
        if let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
           session.canAddInput(audioInput) {
            session.addInput(audioInput)
        }
        
        if session.canAddOutput(movieOutput) {
            session.addOutput(movieOutput)
        }
        
        session.commitConfiguration()
        
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.startRunning()
            DispatchQueue.main.async {
                self.isSessionRunning = true
            }
        }
    }
    
    func startRecording() {
        guard !isRecording else { return }
        isRecording = true
        
        // Check for active connections before recording
        let activeConnections = movieOutput.connections.filter { $0.isActive && $0.isEnabled }
        let canRecord = !activeConnections.isEmpty && !isSimulatorOrFailed
        
        if canRecord {
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension("mov")
            movieOutput.startRecording(to: tempURL, recordingDelegate: self)
        } else {
            print("Simulating recording (No camera connection)")
        }
        
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.recordedDuration += 0.05
            self.progress = min(self.recordedDuration / self.MAX_DURATION, 1.0)
            
            if self.recordedDuration >= self.MAX_DURATION {
                self.stopRecording()
            }
        }
    }
    
    func stopRecording() {
        if movieOutput.isRecording {
            movieOutput.stopRecording()
        }
        timer?.invalidate()
        timer = nil
        isRecording = false
        isComplete = true 
        
        // If simulated, trigger completion manually
        // For now, we don't have a valid video URL, so the slot won't fill with a real video
        // But the flow will complete.
        if isSimulatorOrFailed {
             DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                 // Mock URL or handle nil in view
                 print("Recording simulation complete")
             }
        }
    }
    
    func stopSession() {
        session.stopRunning()
    }
    
    // Delegate
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        if let error = error {
            print("Error recording: \(error)")
            return
        }
        DispatchQueue.main.async {
            self.finalVideoURL = outputFileURL
        }
    }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    
    func makeUIView(context: Context) -> PreviewUIView {
        let view = PreviewUIView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }
    
    func updateUIView(_ uiView: PreviewUIView, context: Context) {
        // No-op: The UIView itself handles layout
    }
}

class PreviewUIView: UIView {
    override class var layerClass: AnyClass {
        return AVCaptureVideoPreviewLayer.self
    }
    
    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        return layer as! AVCaptureVideoPreviewLayer
    }
}
