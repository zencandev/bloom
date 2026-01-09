import Foundation
import UIKit

struct DayClip: Codable, Identifiable {
    var id: String { date }
    let dayIndex: Int // 0-6 (Mon-Sun)
    let date: String
    let videoUri: String
    let createdAt: TimeInterval
}

struct WeekData: Codable {
    let weekId: String
    let startDate: String
    var clips: [DayClip]
    var isComplete: Bool
    var generatedVideoUri: String? // Path to locally stored weekly video
}

class ZenStore: ObservableObject {
    @Published var currentWeek: WeekData
    @Published var hasCompletedOnboarding: Bool {
        didSet {
            UserDefaults.standard.set(hasCompletedOnboarding, forKey: "hasCompletedOnboarding")
        }
    }
    
    // Navigation State
    @Published var path = [Route]()
    
    enum Route: Hashable {
        case breathe(dayIndex: Int)
        case capture(dayIndex: Int)
        case preview(dayIndex: Int)
        case generatedVideo(url: URL)
        case generate
        case history
        case onboarding
    }
    
    init() {
        self.hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
        // Initialize with default or loaded data
        self.currentWeek = WeekData(
            weekId: "2026-W02",
            startDate: Date().ISO8601Format(),
            clips: [],
            isComplete: false,
            generatedVideoUri: nil
        )
        
        if !hasCompletedOnboarding {
            path = [.onboarding]
        }
    }
    
    func completeOnboarding() {
        hasCompletedOnboarding = true
        // Clear onboarding from path
        path.removeAll(where: { $0 == .onboarding })
    }
    
    func addClip(_ clip: DayClip) {
        currentWeek.clips.removeAll { $0.dayIndex == clip.dayIndex }
        currentWeek.clips.append(clip)
        currentWeek.isComplete = currentWeek.clips.count >= 7
        
        // Update notifications
        refreshNotifications()
    }
    
    func refreshNotifications() {
        let completedIndices = Set(currentWeek.clips.map { $0.dayIndex })
        NotificationManager.shared.reschedule(completedDayIndices: completedIndices)
    }
    
    func getClip(for dayIndex: Int) -> DayClip? {
        return currentWeek.clips.first(where: { $0.dayIndex == dayIndex })
    }
    
    // Helper to get today's index (0-6, Mon-Sun)
    var todayIndex: Int {
        let calendar = Calendar.current
        // weekday: 1=Sun, 2=Mon... 7=Sat
        let weekday = calendar.component(.weekday, from: Date())
        // Convert to 0=Mon, ... 6=Sun
        return (weekday + 5) % 7
    }
    
    func isToday(dayIndex: Int) -> Bool {
        return dayIndex == todayIndex
    }
    
    // Core Action Logic using React Native app rules
    func handleDayPress(dayIndex: Int) {
        if getClip(for: dayIndex) != nil {
            // View existing clip
            path.append(.preview(dayIndex: dayIndex))
        } else if isToday(dayIndex: dayIndex) {
            // Only allow capturing for TODAY
            path.append(.breathe(dayIndex: dayIndex))
        }
    }
}
