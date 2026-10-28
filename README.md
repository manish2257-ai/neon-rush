# NEON RUSH 3D

A mobile-first 3D cyberpunk endless runner game powered by Three.js and packaged as a native Android application.

## 🕹️ Gameplay & Features
- **3-Lane High-Speed Running:** Auto-sprint forward through a futuristic neon metropolis.
- **Dynamic Physics & Mechanics:**
  - **Lane Switch:** Seamlessly glide between Left, Center, and Right lanes.
  - **Jump:** Leap over low cyber hurdles and neon energy spikes.
  - **Slide:** Duck and slide underneath high laser grids and beam barriers.
- **Procedural Obstacles & Collectibles:**
  - **Monoliths & Double Monoliths:** Towering columns that require rapid lane switching.
  - **High Barriers:** Suspended laser barricades requiring a slide.
  - **Low Hurdles:** Neon energy fences requiring a jump.
  - **Neon Energy Coins:** Floating spinning 3D coins to collect.
  - **Power-Ups:**
    - 🛡️ **Shield:** Protects from one collision.
    - 🧲 **Coin Magnet:** Draws nearby coins toward the player for 10 seconds.
    - ⚡ **2X Score:** Doubles distance and coin points for 10 seconds.
- **Adaptive Speed Scaling:** Movement speed ramps up from 24 units/s up to 62 units/s as distance increases.
- **Synthwave Audio Engine:** Procedural Web Audio API sound effects and rhythmic cyberpunk bassline (zero external audio file dependencies, 100% offline).
- **Native Haptics:** Vibration feedback on lane switches, jumps, slides, coin collections, and crashes.
- **🎯 Daily Mission System:**
  - Fresh procedural goals generated every 24 hours (e.g., 'Collect 50 coins in a single run', 'Reach 600m distance', 'Perform 10 jumps', 'Slide under 3 laser barriers').
  - In-game real-time HUD toast notification upon completing objectives mid-run.
  - Generous coin bonuses (+100 to +250 🟡) claimable directly from the Daily Missions menu or the Game Over screen.
  - Active notification badge showing available claimable rewards.
  - 24-hour midnight countdown timer with deterministic daily rotation.
- **🛒 Cyber Shop:**
  - Spend earned mission and run coins on custom cosmetic unlocks.
  - **Runner Skins:**
    - ⚡ *Neon Striker* (Default Cyan & Violet)
    - 🥷 *Cyber Phantom* (500 🟡 - Stealth Matte Black & Hot Pink Visor)
    - ☀️ *Solar Flare* (1,000 🟡 - Golden Alloy & Sunburst Plasma Core)
    - ☣️ *Toxic Matrix* (1,500 🟡 - Radioactive Emerald Synthweave)
    - 🌌 *Hyper Void* (2,500 🟡 - Polished Chrome & Ultraviolet Hyperlight)
  - **Thruster Trail FX:**
    - 🔷 *Cyan Pulse* (Default ionic thruster stream)
    - 💖 *Laser Magenta* (400 🟡 - Concentrated photon beam sparks)
    - ✨ *Golden Spark* (800 🟡 - Sparkling golden energy motes)
    - 🟩 *Matrix Code* (1,200 🟡 - Digital green data trail)
    - 🌈 *Prismatic Flux* (2,000 🟡 - Shifting quantum rainbow trail)
  - Full local persistence and dynamic real-time 3D material updates.
- **🏆 Local All-Time Leaderboard (Hall of Fame):**
  - Tracks and saves the Top 5 all-time high scores locally with player Call Signs / names.
  - Automatically detects top 5 qualifying runs upon game over and displays a dedicated Call Sign input dialog.
  - High score table displays custom rank badges (#1 Gold with glowing aura, #2 Silver, #3 Bronze), player Call Sign, run date, final score, and distance reached.
  - Pre-seeded with arcade records to beat on first install.
  - Accessible anytime from both the Main Menu and the Game Over screen.
- **Persistent Local Records:** High score, total coins, unlocked skins/trails, daily missions, and top 5 leaderboard rankings saved in `localStorage` and synchronized with Android `SharedPreferences`.

## 🎮 Controls
- **Touch / Mobile:**
  - **On-Screen Buttons:** Ergonomic thumb buttons for **LEFT**, **RIGHT**, **JUMP**, and **SLIDE**.
  - **Swipe Gestures:**
    - Swipe Left / Right: Change lanes.
    - Swipe Up: Jump.
    - Swipe Down: Slide.
- **Keyboard (Desktop / Testing):**
  - Left / Right Arrow or `A` / `D`: Change lane.
  - Up Arrow, `W`, or `Spacebar`: Jump.
  - Down Arrow or `S`: Slide.
  - `P` or `Escape`: Pause / Resume.

## 📦 Android Packaging & APK Generation

### 1. In AI Studio / Streaming Emulator
The app is pre-configured and already built as an Android APK. The native app loads the local bundled Three.js assets (`file:///android_asset/game/index.html`) inside an edge-to-edge hardware-accelerated WebView with full WebGL performance.

### 2. Standalone Capacitor Packaging
The project includes `capacitor.config.json` and `package.json`. To run or package using Capacitor CLI:
```bash
# Install dependencies
npm install

# Sync web assets to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 3. Generating APKs via Android Studio or Gradle
- **Debug APK:**
  ```bash
  gradle :app:assembleDebug
  # Output: app/build/outputs/apk/debug/app-debug.apk
  ```
- **Signed Release APK:**
  ```bash
  gradle :app:assembleRelease
  # Output: app/build/outputs/apk/release/app-release.apk
  ```
