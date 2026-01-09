import SwiftUI

struct BreatheView: View {
    let dayIndex: Int
    @ObservedObject var store: ZenStore
    @Environment(\.presentationMode) var presentationMode
    
    // Animation State
    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 0.2
    @State private var isHolding = false
    @State private var holdProgress: Double = 0
    @State private var isComplete = false
    
    // Timer for holding
    @State private var timer: Timer?
    @State private var startTime: Date?
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            VStack {
                // Back Button (Custom)
                HStack {
                    Button(action: {
                        store.path.removeLast()
                    }) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 24))
                            .foregroundColor(Theme.Colors.textSecondary)
                    }
                    .padding()
                    Spacer()
                }
                
                Spacer()
                
                // Content Container
                VStack(spacing: 40) {
                    // Instruction
                    VStack(spacing: 12) {
                        Text(isComplete ? "You are centered" : (isHolding ? "Breathe..." : "Breathe with me"))
                            .font(.system(size: 28, weight: .light))
                            .foregroundColor(Theme.Colors.cream)
                            .tracking(1)
                            .animation(.easeInOut, value: isHolding)
                        
                        Text(isComplete ? "✨" : (isHolding ? "Hold to continue" : "Hold to start"))
                            .font(.system(size: 16))
                            .foregroundColor(Theme.Colors.textMuted)
                            .tracking(1)
                            .animation(.easeInOut, value: isHolding)
                    }
                    
                    // Breathing Circles
                    ZStack {
                        // Rings with pulsing opacity
                        ForEach(0..<3) { i in
                            Circle()
                                .stroke(Theme.Colors.sage, lineWidth: 1)
                                .frame(width: 200 + CGFloat(i * 30), height: 200 + CGFloat(i * 30))
                                .opacity(opacity - (Double(i) * 0.05))
                                .scaleEffect(scale)
                        }
                        
                        // Main Interactive Circle
                        Circle()
                            .fill(isHolding ? Theme.Colors.backgroundLight : Theme.Colors.surface)
                            .overlay(
                                Circle()
                                    .stroke(
                                        isHolding ? Theme.Colors.sage.opacity(0.8) : Theme.Colors.sage,
                                        lineWidth: 2
                                    )
                            )
                            .frame(width: 180, height: 180)
                            .scaleEffect(scale)
                            .shadow(
                                color: Theme.Colors.sage.opacity(isHolding ? 0.6 : 0),
                                radius: isHolding ? 30 : 0
                            )
                            // Gestures
                            .simultaneousGesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { _ in
                                        if !isHolding { startHolding() }
                                    }
                                    .onEnded { _ in
                                        stopHolding()
                                    }
                            )
                        
                        // Progress Ring (fills up)
                        if isHolding {
                            Circle()
                                .trim(from: 0, to: holdProgress)
                                .stroke(Theme.Colors.sage, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .frame(width: 170, height: 170)
                                .rotationEffect(.degrees(-90))
                                .animation(.linear(duration: 0.05), value: holdProgress)
                        }
                    }
                    .frame(height: 300)
                }
                
                Spacer()
                
                // Bottom Progress Bar
                VStack(spacing: 12) {
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Theme.Colors.surface)
                            .frame(height: 4)
                        
                        Capsule()
                            .fill(Theme.Colors.sage)
                            .frame(width: max(0, 200 * holdProgress), height: 4)
                            .animation(.linear(duration: 0.05), value: holdProgress)
                    }
                    .frame(width: 200)
                    
                    Text("\(String(format: "%.1f", holdProgress * 3.0))s")
                        .font(.caption)
                        .foregroundColor(Theme.Colors.textMuted)
                        .monospacedDigit()
                }
                .padding(.bottom, 60)
                .opacity(isHolding ? 1 : 0)
                .animation(.easeIn, value: isHolding)
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            startBreathingAnimation()
        }
    }
    
    func startBreathingAnimation() {
        withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
            scale = 1.08
            opacity = 0.35
        }
    }
    
    func startHolding() {
        if isComplete { return }
        isHolding = true
        startTime = Date()
        
        let haptic = UIImpactFeedbackGenerator(style: .medium)
        haptic.impactOccurred()
        
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            guard let start = startTime else { return }
            let elapsed = Date().timeIntervalSince(start)
            holdProgress = min(elapsed / 3.0, 1.0)
            
            if holdProgress >= 1.0 {
                completeBreathing()
            }
        }
    }
    
    func stopHolding() {
        if isComplete { return }
        isHolding = false
        holdProgress = 0
        timer?.invalidate()
        timer = nil
        
        let haptic = UIImpactFeedbackGenerator(style: .light)
        haptic.impactOccurred()
    }
    
    func completeBreathing() {
        timer?.invalidate()
        isComplete = true
        HapticManager.notification(type: .success)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            // Navigate to Capture
            store.path.append(.capture(dayIndex: dayIndex))
            // Reset state for next time
            isHolding = false
            holdProgress = 0
            isComplete = false
        }
    }
}

// Simple Haptics Wrapper
class HapticManager {
    static func notification(type: UINotificationFeedbackGenerator.FeedbackType) {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
    }
}
