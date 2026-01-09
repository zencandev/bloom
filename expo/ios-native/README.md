# ZenSnap Native iOS Migration

The project files have been generated in this folder. To set up the native iOS project:

1.  **Open Xcode** and create a **New Project**.
2.  Choose **App** (under iOS).
3.  Name it `ZenSnap` and verify the Interface is **SwiftUI** and Language is **Swift**.
4.  Once created, **delete** the default `ContentView.swift` and `ZenSnapApp.swift` files created by Xcode.
5.  **Move** all the Swift files from this folder (`Theme.swift`, `Models.swift`, `HomeView.swift`, `BreatheView.swift`, `CaptureView.swift`, `ZenSnapApp.swift`) into your new Xcode project's folder.
6.  **Drag and drop** them into the Xcode Project Navigator to link them.

## Permissions (Info.plist)

You must add the following keys to your `Info.plist` (or Project Settings -> Info -> Custom iOS Target Properties) to allow Camera and Microphone access:

| Key | Type | Value |
| :--- | :--- | :--- |
| `Privacy - Camera Usage Description` | String | ZenSnap needs camera access to capture your daily zen moments. |
| `Privacy - Microphone Usage Description` | String | ZenSnap needs microphone access to record ambient sounds. |

## Next Steps

*   **Persistence**: The current `ZenStore` in `Models.swift` is a placeholder. You will need to implement `UserDefaults` or `CoreData` saving in the `addClip` function to make data persist across app restarts.
*   **Video Playback**: Implement the `PreviewView` logic using `AVPlayer` to watch recorded clips.
*   **Weekly Generation**: Implement the logic to stitch videos together (using `AVAssetExportSession`).

Enjoy building natively!
