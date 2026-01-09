import SwiftUI
import Photos

struct HomeView: View {
    @StateObject private var store = ZenStore()
    
    // Layout Constants
    let dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    var body: some View {
        NavigationStack(path: $store.path) {
             ZStack {
                Theme.Colors.background.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 0) {
                        // Header
                        VStack(spacing: 8) {
                            Text("ZenSnap")
                                .font(.system(size: 34, weight: .light))
                                .foregroundColor(Theme.Colors.cream)
                                .tracking(1)
                            
                            Text("CAPTURE THE QUIET")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.Colors.textMuted)
                                .tracking(2)
                        }
                        .padding(.top, 40)
                        .padding(.bottom, 24)
                        
                        // Centered Container for iPad
                        VStack(spacing: 32) {
                            
                            // Grid
                            VStack(spacing: 12) {
                                // Top Row (4 days)
                                HStack(spacing: 12) {
                                    ForEach(0..<4) { index in
                                        DaySlotButton(dayIndex: index, store: store)
                                    }
                                }
                                
                                // Bottom Row (3 days)
                                HStack(spacing: 12) {
                                    ForEach(4..<7) { index in
                                        DaySlotButton(dayIndex: index, store: store)
                                    }
                                }
                            }
                            
                            // Week info & Progress
                            VStack(spacing: 16) {
                                Text("Week 2 · Jan 8-14")
                                    .font(.system(size: 13))
                                    .foregroundColor(Theme.Colors.textSecondary)
                                    .tracking(0.5)
                                
                                // Progress Bar
                                VStack(spacing: 8) {
                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            Capsule()
                                                .fill(Theme.Colors.surface)
                                            
                                            let count = store.currentWeek.clips.count
                                            let width = count == 0 ? 0 : geo.size.width * (CGFloat(count) / 7.0)
                                            
                                            Capsule()
                                                .fill(Theme.Colors.sage)
                                                .frame(width: max(0, width))
                                                .animation(.spring(), value: count)
                                        }
                                    }
                                    .frame(height: 4)
                                    .frame(maxWidth: 200) // Small progress bar
                                    
                                    Text("\(store.currentWeek.clips.count) of 7 moments captured")
                                        .font(.caption)
                                        .foregroundColor(Theme.Colors.textMuted)
                                }
                            }
                            
                            Spacer().frame(height: 20)
                            
                            // Capture Button (Conditional)
                            if !store.currentWeek.isComplete {
                                let isTodayCaptured = store.getClip(for: store.todayIndex) != nil
                                if !isTodayCaptured {
                                    Button(action: {
                                        store.path.append(.breathe(dayIndex: store.todayIndex))
                                    }) {
                                        HStack {
                                            Text("✨ Capture today's moment")
                                                .font(.system(size: 16))
                                                .foregroundColor(Theme.Colors.sage)
                                                .tracking(0.5)
                                        }
                                        .padding()
                                    }
                                }
                            }
                            
                            // 2. Generate Weekly Zen Button
                            if store.currentWeek.clips.count >= 7 {
                                let isGenerated = store.currentWeek.generatedVideoUri != nil
                                
                                Button(action: {
                                    if let uri = store.currentWeek.generatedVideoUri, let url = URL(string: uri) {
                                        store.path.append(.generatedVideo(url: url))
                                    } else {
                                        generateVideo()
                                    }
                                }) {
                                    HStack {
                                        if isGenerating {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        } else {
                                            Image(systemName: isGenerated ? "play.circle.fill" : "film")
                                            Text(isGenerated ? "Watch Week 2 Zen" : "Generate Weekly Zen")
                                        }
                                    }
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(isGenerated ? .black : .black.opacity(0.8))
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Theme.Colors.bloom)
                                    .cornerRadius(12)
                                    .shadow(color: Theme.Colors.bloom.opacity(0.4), radius: 10, x: 0, y: 5)
                                }
                                .disabled(isGenerating)
                            }
                            
                        }
                        .frame(maxWidth: 500) // Fix for iPad layout
                        .padding(.horizontal)
                        
                        Spacer()
                        
                        // History Section
                        if let _ = store.currentWeek.generatedVideoUri {
                             VStack(alignment: .leading, spacing: 16) {
                                 Text("History")
                                     .font(.headline)
                                     .foregroundColor(Theme.Colors.textSecondary)
                                     .padding(.leading)
                                 
                                 Button(action: {
                                     store.path.append(.history)
                                 }) {
                                     HStack {
                                         VStack(alignment: .leading, spacing: 4) {
                                             Text("Week 2 · Jan 2026")
                                                 .font(.system(size: 16, weight: .medium))
                                                 .foregroundColor(Theme.Colors.cream)
                                             Text("7 clips")
                                                 .font(.caption)
                                                 .foregroundColor(Theme.Colors.sage)
                                         }
                                         Spacer()
                                         Image(systemName: "chevron.right")
                                             .foregroundColor(Theme.Colors.textMuted)
                                     }
                                     .padding()
                                     .background(Theme.Colors.surface)
                                     .cornerRadius(12)
                                     .padding(.horizontal)
                                 }
                             }
                             .padding(.bottom, 20)
                        } else {
                            // Old History Button (Hidden if we have the list above, or keep it?)
                            // User asked for "full width row".
                            // Let's keep the history list simpler.
                            EmptyView()
                        }
                    }
                    .padding(.bottom, 20)
                    .frame(minHeight: 600) // Ensure scrollable on small screens
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(for: ZenStore.Route.self) { route in
                switch route {
                case .breathe(let index):
                    BreatheView(dayIndex: index, store: store)
                        .onDisappear {
                            if case .breathe = store.path.last {
                                store.path.removeLast()
                            }
                        }
                case .capture(let index):
                    CaptureView(dayIndex: index, store: store)
                        .onDisappear {
                            if case .capture = store.path.last {
                                store.path.removeLast()
                            }
                        }
                case .preview(let index):
                    PreviewView(dayIndex: index, store: store)
                        .onDisappear {
                            if case .preview = store.path.last {
                                store.path.removeLast()
                            }
                        }
                case .generatedVideo(let url):
                    GeneratedVideoView(url: url, store: store)
                        .onDisappear {
                            if case .generatedVideo = store.path.last {
                                store.path.removeLast()
                            }
                        }
                case .onboarding:
                    OnboardingView(store: store)
                case .history:
                    // Reuse GeneratedVideoView for simplicity for this week
                    if let uri = store.currentWeek.generatedVideoUri, let url = URL(string: uri) {
                        GeneratedVideoView(url: url, store: store)
                    } else {
                        Text("No history yet")
                    }
                case .generate:
                    EmptyView()
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            store.refreshNotifications()
        }
    }
    
    @State private var isGenerating = false
    
    func generateVideo() {
        guard !store.currentWeek.clips.isEmpty else { return }
        isGenerating = true
        
        let sortedClips = store.currentWeek.clips.sorted { $0.dayIndex < $1.dayIndex }
        let urls = sortedClips.compactMap { URL(fileURLWithPath: $0.videoUri) }
        
        VideoStitcher.makeZenVideo(from: urls) { result in
            DispatchQueue.main.async {
                isGenerating = false
                switch result {
                case .success(let url):
                    // Save to store
                    store.currentWeek.generatedVideoUri = url.absoluteString
                    store.path.append(.generatedVideo(url: url))
                case .failure(let error):
                    print("Stitch failed: \(error)")
                }
            }
        }
    }
}

struct GeneratedVideoView: View {
    let url: URL
    @ObservedObject var store: ZenStore
    @State private var player: AVPlayer?
    @State private var saveMessage: AlertMessage?
    @State private var showingAlert = false
    
    struct AlertMessage: Identifiable {
        let id = UUID()
        let text: String
    }
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top Bar
                HStack {
                    Button(action: {
                        store.path.removeLast()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 20))
                            .foregroundColor(Theme.Colors.textSecondary)
                            .padding()
                            .background(Theme.Colors.surface)
                            .clipShape(Circle())
                    }
                    Spacer()
                    Text("Week 2 Zen")
                        .font(.headline)
                        .foregroundColor(Theme.Colors.cream)
                    Spacer()
                    // Balance spacing
                    Color.clear.frame(width: 44, height: 44)
                }
                .padding(.top, 50)
                .padding(.horizontal)
                .padding(.bottom, 20)
                
                // Video Player Container
                GeometryReader { geo in
                    ZStack {
                        Color.black
                        VideoPlayerView(player: player ?? AVPlayer())
                    }
                    .cornerRadius(24)
                    .shadow(color: Theme.Colors.bloom.opacity(0.2), radius: 20, x: 0, y: 10)
                }
                .frame(height: 500) // Fixed height to not be full screen
                .padding(.horizontal)
                
                Spacer()
                
                // Controls Below
                HStack(spacing: 20) {
                    // Replay Button
                    Button(action: {
                        player?.seek(to: .zero)
                        player?.play()
                    }) {
                        VStack(spacing: 8) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 24))
                            Text("Replay")
                                .font(.caption)
                        }
                        .foregroundColor(Theme.Colors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 60)
                        .background(Theme.Colors.surface)
                        .cornerRadius(16)
                    }
                    
                    // Save Button
                    Button(action: {
                        saveToPhotos()
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down")
                            Text("Save to Photos")
                        }
                        .font(.headline)
                        .foregroundColor(Theme.Colors.background)
                        .frame(maxWidth: .infinity)
                        .frame(height: 60)
                        .background(Theme.Colors.sage)
                        .cornerRadius(16)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            self.player = AVPlayer(url: url)
            self.player?.play()
            NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: self.player?.currentItem, queue: .main) { _ in }
        }
        .onDisappear {
            self.player?.pause()
            NotificationCenter.default.removeObserver(self)
        }
        .alert(item: $saveMessage) { message in
            Alert(title: Text("Save Status"), message: Text(message.text), dismissButton: .default(Text("OK")))
        }
    }
    
    func saveToPhotos() {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            if status == .authorized || status == .limited {
                PHPhotoLibrary.shared().performChanges({
                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
                }) { success, error in
                    DispatchQueue.main.async {
                        if success {
                            self.saveMessage = AlertMessage(text: "Video saved to Photos successfully! 🌸")
                        } else if let error = error {
                            self.saveMessage = AlertMessage(text: "Error saving: \(error.localizedDescription)")
                        } else {
                            self.saveMessage = AlertMessage(text: "Unknown error occurred.")
                        }
                        self.showingAlert = true
                    }
                }
            } else {
                DispatchQueue.main.async {
                    self.saveMessage = AlertMessage(text: "Permission denied. Please enable Photos access in Settings.")
                    self.showingAlert = true
                }
            }
        }
    }
}

struct DaySlotButton: View {
    let dayIndex: Int
    @ObservedObject var store: ZenStore
    @State private var sway = false
    
    var body: some View {
        let hasClip = store.getClip(for: dayIndex) != nil
        let isToday = store.isToday(dayIndex: dayIndex)
        let dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayIndex]
        
        Button(action: {
            store.handleDayPress(dayIndex: dayIndex)
        }) {
            VStack(spacing: 6) {
                Text(dayName)
                    .font(.system(size: 11))
                    .foregroundColor(hasClip ? Theme.Colors.sage : Theme.Colors.textMuted)
                    .textCase(.uppercase)
                    .tracking(1)
                
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(hasClip ? Theme.Colors.backgroundLight : Theme.Colors.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(
                                    isToday && !hasClip ? Theme.Colors.sage : (hasClip ? Theme.Colors.bloom : Theme.Colors.surfaceLight),
                                    lineWidth: isToday || hasClip ? 1.5 : 1
                                )
                        )
                        .frame(width: 72, height: 72)
                    
                    if hasClip {
                        Text("🌸")
                            .font(.system(size: 28))
                            .shadow(color: Theme.Colors.bloom.opacity(0.6), radius: 8, x: 0, y: 0)
                    } else if isToday {
                        Text("◉")
                            .font(.system(size: 24))
                            .foregroundColor(Theme.Colors.sage)
                    } else {
                        Text("○")
                            .font(.system(size: 24))
                            .foregroundColor(Theme.Colors.seed)
                    }
                }
                .shadow(
                    color: hasClip ? Theme.Colors.bloom.opacity(0.4) : .clear,
                    radius: 8, x: 0, y: 0
                )
                .rotationEffect(.degrees(hasClip && sway ? 2 : -2), anchor: .bottom)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .onAppear {
            if hasClip {
                startSway()
            }
        }
        .onChange(of: hasClip) { _, newValue in
            if newValue {
                startSway()
            }
        }
    }
    
    func startSway() {
        withAnimation(
            Animation.easeInOut(duration: 2.5)
                .repeatForever(autoreverses: true)
                .delay(Double(dayIndex) * 0.2)
        ) {
            sway = true
        }
    }
}

// Fallback preview view
import AVKit

// Fallback preview view
struct PreviewView: View {
    let dayIndex: Int
    @ObservedObject var store: ZenStore
    @State private var player: AVPlayer?
    @State private var looper: AVPlayerLooper?
    @State private var queuePlayer: AVQueuePlayer?
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            if let clip = store.getClip(for: dayIndex) {
                 // Video Player
                 // Ensure valid file URL
                 let url = URL(fileURLWithPath: clip.videoUri)
                 
                 VideoPlayerView(player: player ?? AVPlayer())
                     .edgesIgnoringSafeArea(.all)
                     .onAppear {
                         setupPlayer(url: url)
                     }
                     .onDisappear {
                         player?.pause()
                         player = nil
                     }
            } else {
                Text("No clip found")
                    .foregroundColor(.white)
            }
            
            // Overlays
            VStack {
                HStack {
                    Button(action: {
                        if !store.path.isEmpty {
                            store.path.removeLast()
                        }
                    }) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .padding()
                            .shadow(radius: 4)
                    }
                    Spacer()
                }
                Spacer()
                
                // Date Display
                if let clip = store.getClip(for: dayIndex) {
                    VStack(spacing: 4) {
                        Text(formatDate(clip.date))
                            .font(.headline)
                            .foregroundColor(Theme.Colors.sage)
                        Text(formatTime(clip.createdAt))
                            .font(.caption)
                            .foregroundColor(Theme.Colors.textMuted)
                    }
                    .padding(.bottom, 50)
                }
            }
        }
        .navigationBarHidden(true)
    }
    
    func setupPlayer(url: URL) {
        // Simple looping player
        // Remove existing if any
        self.player?.pause()
        self.player = nil
        
        let item = AVPlayerItem(url: url)
        let newQueuePlayer = AVQueuePlayer(playerItem: item)
        self.looper = AVPlayerLooper(player: newQueuePlayer, templateItem: item)
        self.player = newQueuePlayer
        newQueuePlayer.play()
        self.queuePlayer = newQueuePlayer
    }
    
    func formatDate(_ dateString: String) -> String {
        // dateString is ISO8601
        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: dateString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .long
            return formatter.string(from: date)
        }
        return dateString
    }
    
    func formatTime(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp)
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct VideoPlayerView: UIViewControllerRepresentable {
    let player: AVPlayer
    
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspectFill
        return controller
    }
    
    func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {
        uiViewController.player = player
    }
}
