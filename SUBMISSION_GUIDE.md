# Bloom Store Submission Guide

This guide provides step-by-step instructions for submitting **Bloom** to the Google Play Store and Apple App Store.

## 1. Prerequisites

*   **Google Play Console Account:** Required for Android submission. ($25 one-time fee)
*   **Apple Developer Program Account:** Required for iOS submission. ($99/year)
*   **Privacy Policy:** A privacy policy URL is required. You can host the `store_assets/PRIVACY_POLICY.md` file on a website, GitHub Gist, or a free hosting service.

## 2. Assets Preparation

All prepared assets are located in the `store_assets/` directory.

### Common Assets
*   **Privacy Policy:** `store_assets/PRIVACY_POLICY.md` (You need to host this online and get a URL).

### Android Assets (`store_assets/android/`)
*   **App Icon:** `icon_512.png` (512x512 px)
*   **Feature Graphic:** `feature_graphic.png` (1024x500 px)
*   **Listing Text:** `listing.txt` (Title, Short & Full Descriptions)
*   **Screenshots:** *See "Generating Screenshots" below.*

### iOS Assets (`store_assets/ios/`)
*   **App Icon:** `icon_1024.png` (1024x1024 px)
*   **Listing Text:** `listing.txt` (Title, Subtitle, Description, Keywords)
*   **Screenshots:** *See "Generating Screenshots" below.*

---

## 3. Generating Screenshots

Since screenshots require the app to be running, you will need to capture these using the Android Emulator and iOS Simulator.

### Required Screenshots
You should capture screenshots of the following screens:
1.  **Home Screen:** Showing the "Daily Bloom" prompt or a list of past moments.
2.  **Capture Screen:** Showing the camera view.
3.  **Breathe Screen:** Showing the breathing exercise interface.
4.  **Recap Screen:** (If available) Showing the weekly summary view.

### Instructions for Android
1.  Open the project in **Android Studio**.
2.  Run the app on an Emulator (e.g., Pixel 6).
3.  Navigate to each screen mentioned above.
4.  Click the "Camera" icon in the Emulator toolbar to take a screenshot.
5.  Save the images to `store_assets/android/screenshots/`.
    *   **Requirement:** At least 2 screenshots. JPEG or 24-bit PNG (no alpha). Min length 320px, Max length 3840px.

### Instructions for iOS
1.  Open `ios-native/Bloom.xcodeproj` in **Xcode**.
2.  Run the app on a Simulator (e.g., iPhone 15 Pro Max).
3.  Navigate to each screen.
4.  Press `Cmd + S` to save a screenshot to the Desktop.
5.  Move the images to `store_assets/ios/screenshots/`.
    *   **Requirement:** At least 3 screenshots for 6.5" Display (iPhone 11 Pro Max/12/13/14 Pro Max) and 5.5" Display (iPhone 8 Plus). Xcode simulators for "iPhone 15 Pro Max" (6.7") and "iPhone 8 Plus" (5.5") are recommended.

---

## 4. Google Play Store Submission

1.  **Create App:**
    *   Log in to [Google Play Console](https://play.google.com/console).
    *   Click **Create app**.
    *   **App Name:** Bloom
    *   **Default Language:** English (United States)
    *   **App or Game:** App
    *   **Free or Paid:** Free
    *   Accept the declarations and click **Create app**.

2.  **Set up your app:**
    *   **Privacy Policy:** Paste the URL of your hosted privacy policy.
    *   **App Access:** Select "All functionality is available without special access".
    *   **Ads:** "No, my app does not contain ads".
    *   **Content Rating:** Fill out the questionnaire (likely "Everyone" or "Low Maturity").
    *   **Target Audience:** 13+ (or 18+).
    *   **News App:** No.
    *   **COVID-19 Contact Tracing:** No.
    *   **Data Safety:** Fill out the form.
        *   Does your app collect or share any user data? **No** (if local only).

3.  **Store Listing:**
    *   Go to **Main store listing**.
    *   **App Name:** Copy from `store_assets/android/listing.txt`.
    *   **Short Description:** Copy from `listing.txt`.
    *   **Full Description:** Copy from `listing.txt`.
    *   **Graphics:** Upload `icon_512.png` and `feature_graphic.png` from `store_assets/android/`.
    *   **Screenshots:** Upload the screenshots you generated.

4.  **Publish:**
    *   Go to **Production**.
    *   **Create new release**.
    *   Upload your Signed App Bundle (`.aab`). *See "Building for Android" below.*
    *   Review and rollout.

### Building for Android
1.  In Android Studio, go to **Build > Generate Signed Bundle / APK**.
2.  Select **Android App Bundle**.
3.  Create a new keystore (keep it safe!).
4.  Select **Release** build variant.
5.  The `.aab` file will be generated in `android-native/app/release/`.

---

## 5. Apple App Store Submission

1.  **Create App:**
    *   Log in to [App Store Connect](https://appstoreconnect.apple.com/).
    *   Click **(+) > New App**.
    *   **Name:** Bloom
    *   **Primary Language:** English (US)
    *   **Bundle ID:** Select the one you created in Apple Developer Portal.
    *   **SKU:** `bloom-ios-001`.
    *   **Full Access:** Select unless restricted.

2.  **App Information:**
    *   **Subtitle:** Copy from `store_assets/ios/listing.txt`.
    *   **Privacy Policy URL:** Paste your hosted URL.

3.  **Pricing and Availability:**
    *   **Price Schedule:** Free.

4.  **App Privacy:**
    *   Click **Get Started**.
    *   "Do you or your third-party partners collect data from this app?" **No**.

5.  **Prepare for Submission (Version 1.0):**
    *   **Screenshots:** Upload the screenshots you generated.
    *   **Promotional Text:** Copy from `listing.txt`.
    *   **Description:** Copy from `listing.txt`.
    *   **Keywords:** Copy from `listing.txt`.
    *   **Support URL:** Your website or email.
    *   **Build:** Select the uploaded build. *See "Building for iOS" below.*

6.  **Submit for Review:**
    *   Answer export compliance questions.
    *   Submit.

### Building for iOS
1.  In Xcode, open `Bloom.xcodeproj`.
2.  Verify **Signing & Capabilities**.
3.  Select **Any iOS Device (arm64)**.
4.  Go to **Product > Archive**.
5.  Click **Distribute App** -> **App Store Connect** -> **Upload**.
