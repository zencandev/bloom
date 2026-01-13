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
    @Published var history: [WeekData]
    @Published var hasCompletedOnboarding: Bool {
        didSet {
            UserDefaults.standard.set(hasCompletedOnboarding, forKey: "hasCompletedOnboarding")
        }
    }
    
    // Navigation State
    @Published var path = [Route]()
    
    private let weekKey = "current_week_data"
    private let historyKey = "week_history_data"
    
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
        
        // Load week data
        if let data = UserDefaults.standard.data(forKey: weekKey),
           let loadedWeek = try? JSONDecoder().decode(WeekData.self, from: data) {
            self.currentWeek = loadedWeek
        } else {
            self.currentWeek = ZenStore.createNewWeek()
        }
        
        // Load history
        if let data = UserDefaults.standard.data(forKey: historyKey),
           let loadedHistory = try? JSONDecoder().decode([WeekData].self, from: data) {
            self.history = loadedHistory
        } else {
            self.history = []
        }
        
        if !hasCompletedOnboarding {
            path = [.onboarding]
        }
        
        rotateWeekIfNecessary()
    }
    
    func completeOnboarding() {
        hasCompletedOnboarding = true
        path.removeAll(where: { $0 == .onboarding })
    }
    
    func addClip(_ clip: DayClip) {
        currentWeek.clips.removeAll { $0.dayIndex == clip.dayIndex }
        currentWeek.clips.append(clip)
        currentWeek.isComplete = currentWeek.clips.count >= 1 // Flexible generation
        saveWeekData()
        refreshNotifications()
    }
    
    func rotateWeekIfNecessary() {
        let freshWeek = ZenStore.createNewWeek()
        if freshWeek.weekId != currentWeek.weekId {
            // New week starts, archive current
            if !currentWeek.clips.isEmpty {
                history.insert(currentWeek, at: 0)
                if history.count > 10 {
                    history = Array(history.prefix(10))
                }
                saveHistory()
            }
            currentWeek = freshWeek
            saveWeekData()
        }
    }
    
    func updateHistory(_ newHistory: [WeekData]) {
        self.history = newHistory
        saveHistory()
    }
    
    private func saveWeekData() {
        if let data = try? JSONEncoder().encode(currentWeek) {
            UserDefaults.standard.set(data, forKey: weekKey)
        }
    }
    
    private func saveHistory() {
        if let data = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(data, forKey: historyKey)
        }
    }
    
    func refreshNotifications() {
        let completedIndices = Set(currentWeek.clips.map { $0.dayIndex })
        NotificationManager.shared.reschedule(completedDayIndices: completedIndices)
    }
    
    func getClip(for dayIndex: Int) -> DayClip? {
        return currentWeek.clips.first(where: { $0.dayIndex == dayIndex })
    }
    
    var todayIndex: Int {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: Date())
        return (weekday + 5) % 7
    }
    
    func isToday(dayIndex: Int) -> Bool {
        return dayIndex == todayIndex
    }
    
    func handleDayPress(dayIndex: Int) {
        if getClip(for: dayIndex) != nil {
            path.append(.preview(dayIndex: dayIndex))
        } else if isToday(dayIndex: dayIndex) {
            path.append(.breathe(dayIndex: dayIndex))
        }
    }
    
    static func createNewWeek() -> WeekData {
        let now = Date()
        let calendar = Calendar.current
        let weekNumber = calendar.component(.weekOfYear, from: now)
        let year = calendar.component(.yearForWeekOfYear, from: now)
        let weekId = "\(year)-W\(String(format: "%02d", weekNumber))"
        
        return WeekData(
            weekId: weekId,
            startDate: now.ISO8601Format(),
            clips: [],
            isComplete: false,
            generatedVideoUri: nil
        )
    }
}
