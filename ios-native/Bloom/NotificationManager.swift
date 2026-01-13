import Foundation
import UserNotifications

class NotificationManager {
    static let shared = NotificationManager()
    
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("Notification permission granted")
                self.scheduleNotifications()
            } else if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }
    
    // Schedule notifications for the next 7 days, respecting existing clips
    func scheduleNotifications() {
        // We will perform this on a background queue to not block UI, 
        // though UNUserNotificationCenter is async usually.
        
        let center = UNUserNotificationCenter.current()
        
        // 1. Cancel all pending requests to ensure a clean slate based on current data
        center.removeAllPendingNotificationRequests()
        
        // 2. Get current store state (Need access to ZenStore, but it's an ObservableObject)
        // Since NotificationManager is a singleton, we might need dependency injection or 
        // just read from UserDefaults if simple, but better to pass the data or have ZenStore call this.
        // For now, let's assume we pass the set of completed day indices.
        // We will refactor `scheduleNotifications` to accept `completedDayIndices`.
    }
    
    func reschedule(completedDayIndices: Set<Int>) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        
        let calendar = Calendar.current
        let today = Date()
        
        // Schedule for the next 7 days
        for i in 0..<7 {
            guard let date = calendar.date(byAdding: .day, value: i, to: today) else { continue }
            
            // Calculate day index (0=Mon, ... 6=Sun)
            let weekday = calendar.component(.weekday, from: date)
            let dayIndex = (weekday + 5) % 7
            
            // If already completed this day (and it's today or past), skip.
            // Actually, if it's tomorrow (i > 0), it can't be completed yet effectively, 
            // unless we had future logic. But standard logic:
            // If i == 0 (Today) and completedDayIndices contains dayIndex -> Skip
            // If i > 0 -> Schedule
            
            if i == 0 && completedDayIndices.contains(dayIndex) {
                 continue
            }
            
            scheduleDaily(for: date, hour: 9, title: "Morning Zen 🌿", body: "Good morning. Take a moment to capture the quiet.")
            scheduleDaily(for: date, hour: 17, title: "Evening Reflection 🌅", body: "The sun is setting. Have you captured your moment today?")
        }
        
        // 3. Schedule Monday 9 AM recap if not yet Monday or if we want it every week
        scheduleMondayRecap()
    }
    
    private func scheduleMondayRecap() {
        let calendar = Calendar.current
        var components = DateComponents()
        components.weekday = 2 // Monday
        components.hour = 9
        components.minute = 0
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        
        let content = UNMutableNotificationContent()
        content.title = "Last week is in Bloom 🌸"
        content.body = "Relive last week's Zen and capture your first moment of this week!"
        content.sound = .default
        content.userInfo = ["navigate_to": "history"]
        
        let request = UNNotificationRequest(identifier: "zen_monday_recap", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }
    
    private func scheduleDaily(for date: Date, hour: Int, title: String, body: String) {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: date)
        components.hour = hour
        components.minute = 0
        components.second = 0
        
        // Ensure the date is in the future
        guard let triggerDate = calendar.date(from: components), triggerDate > Date() else { return }
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let identifier = "zen_\(Int(triggerDate.timeIntervalSince1970))"
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling notification: \(error)")
            }
        }
    }
}
