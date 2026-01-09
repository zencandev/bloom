import SwiftUI

@main
struct BloomApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
                .onAppear {
                    NotificationManager.shared.requestAuthorization()
                    // Initial schedule refresh is handled by Store init? No, store init doesn't know about manager yet or manager doesn't know about store.
                    // But HomeView creates the Store.
                    // Let's rely on HomeView's store to trigger a refresh or do it here.
                    // Accessing the store from App level is hard since it's inside HomeView.
                    // I'll make HomeView trigger the refresh.
                }
        }
    }
}
