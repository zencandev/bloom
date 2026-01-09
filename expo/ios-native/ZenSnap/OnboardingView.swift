import SwiftUI
import AVFoundation

struct OnboardingView: View {
    @ObservedObject var store: ZenStore
    @State private var step = 0
    @State private var opacity = 1.0
    
    let steps = [
        OnboardingStep(emoji: "🪷", title: "Welcome to ZenSnap", subtitle: "Capture the quiet. Own the week.", description: "A mindful way to journal your days through tiny video moments."),
        OnboardingStep(emoji: "🌬️", title: "Breathe First", subtitle: "The gateway to presence", description: "Before capturing, hold the breathing circle for 3 seconds. This moment of calm opens your camera."),
        OnboardingStep(emoji: "📷", title: "1.5 Seconds", subtitle: "Constraint breeds creativity", description: "Your camera records exactly 1.5 seconds. Capture something peaceful—trees, coffee, a pet, the sky."),
        OnboardingStep(emoji: "🎬", title: "Weekly Zen", subtitle: "Your week, cinematically", description: "After 7 days, your clips merge into a 10.5-second film with calming music. A tiny movie of your week.")
    ]
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            VStack {
                // Skip Button
                HStack {
                    Spacer()
                    if step < steps.count - 1 {
                        Button(action: skip) {
                            Text("Skip")
                                .font(.system(size: 16))
                                .foregroundColor(Theme.Colors.textMuted)
                                .padding()
                        }
                    }
                }
                
                Spacer()
                
                // Content
                let current = steps[step]
                VStack(spacing: 24) {
                    Text(current.emoji)
                        .font(.system(size: 80))
                    
                    VStack(spacing: 12) {
                        Text(current.title)
                            .font(.system(size: 32, weight: .light))
                            .foregroundColor(Theme.Colors.cream)
                            .multilineTextAlignment(.center)
                        
                        Text(current.subtitle.uppercased())
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.Colors.sage)
                            .tracking(2)
                            .multilineTextAlignment(.center)
                    }
                    
                    Text(current.description)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                        .padding(.horizontal, 32)
                }
                .opacity(opacity)
                .onAppear {
                    withAnimation(.easeIn(duration: 0.6)) {
                        opacity = 1.0
                    }
                }
                .onChange(of: step) { _, _ in
                    opacity = 0
                    withAnimation(.easeIn(duration: 0.6)) {
                        opacity = 1.0
                    }
                }
                
                Spacer()
                
                // Dots
                HStack(spacing: 8) {
                    ForEach(0..<steps.count, id: \.self) { index in
                        Circle()
                            .fill(index == step ? Theme.Colors.sage : Theme.Colors.surface)
                            .frame(width: index == step ? 24 : 8, height: 8)
                            .animation(.spring(), value: step)
                    }
                }
                .padding(.bottom, 40)
                
                // Button
                Button(action: next) {
                    Text(step == steps.count - 1 ? "Begin Your Journey" : "Continue")
                        .font(.headline)
                        .foregroundColor(Theme.Colors.background)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.Colors.sage)
                        .cornerRadius(16)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 20)
            }
        }
    }
    
    func next() {
        if step < steps.count - 1 {
            withAnimation {
                step += 1
            }
        } else {
            complete()
        }
    }
    
    func skip() {
        complete()
    }
    
    func complete() {
        withAnimation {
            store.completeOnboarding()
        }
    }
}

struct OnboardingStep {
    let emoji: String
    let title: String
    let subtitle: String
    let description: String
}
