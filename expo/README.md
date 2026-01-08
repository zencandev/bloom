# ZenSnap 🪷

**Capture the quiet. Own the week.**

ZenSnap is a mindful video journaling app that limits users to recording exactly **1.5 seconds of video per day**. At the end of every 7 days, the app automatically compiles these snippets into a **"Weekly Zen"** movie, set to calming music.

## ✨ Features

### Core Features (MVP)
- **🌬️ Breath Gatekeeper** - A 3-second breathing ritual unlocks the camera
- **📷 Micro-Capture** - Auto-stops recording at exactly 1.5 seconds  
- **🌱 Zen Grid** - 7-slot weekly grid (Mon-Sun) with blooming animations
- **🎬 Weekly Zen Generator** - Stitches clips into a 10.5-second film
- **🎵 Lo-Fi Audio** - Ambient music overlay on compiled videos
- **💾 Save to Gallery** - Export to device photo library

### Roadmap
- Social sharing (Instagram Stories, TikTok)
- Private Zen Circles (invite-only groups)
- Music library with multiple ambient tracks
- Filter overlays and custom breath timing
- Monthly/Yearly Zen compilations
- Cloud backup and analytics

## 🛠️ Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Navigation**: Expo Router (file-based)
- **Animations**: React Native Reanimated
- **State**: Zustand with async storage
- **Camera**: expo-camera
- **Video**: expo-av
- **Haptics**: expo-haptics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or physical device)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zensnap.git
cd zensnap

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Devices

```bash
# iOS
npm run ios

# Android  
npm run android

# Web (limited functionality)
npm run web
```

## 📁 Project Structure

```
zensnap/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home (Zen Grid)
│   ├── breathe.tsx         # Breath Gatekeeper
│   ├── capture.tsx         # Camera capture
│   ├── preview/[day].tsx   # Day preview
│   ├── generate.tsx        # Weekly Zen generation
│   ├── player.tsx          # Video player
│   └── onboarding.tsx      # First-time experience
├── components/             # Reusable components
├── stores/                 # Zustand stores
│   └── zenStore.ts         # App state
├── constants/              # Theme & constants
│   └── theme.ts            # Design system
├── assets/                 # Static assets
└── app.json                # Expo configuration
```

## 🎨 Design System

### Colors
- **Background**: Deep zen black (#0a0a0a)
- **Sage**: Calming green (#a8b5a0)
- **Cream**: Warm text (#f5f2e8)
- **Gold**: Accent (#d4a574)

### Typography
- Clean sans-serif with wide letter spacing
- Minimal weight variations
- Calm, intentional feel

## 📱 User Flow

1. **Morning/Evening**: User receives notification
2. **The Gate**: 3-second breathing animation
3. **The Capture**: 1.5-second video recording
4. **The Progress**: Zen Grid updates with blooming slot
5. **Sunday Night**: Generate 10.5-second Weekly Zen

## 🔐 Permissions

The app requires:
- **Camera** - To record video clips
- **Microphone** - To capture ambient audio
- **Photo Library** - To save Weekly Zen videos

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with 🧘 by mindful developers
