# 🚀 Zion Digital App - Local Laptop & Cloud Ingress Run Guide

This guide describes how to run, execute, and configure the **Zion Digital App** on any local laptop (Windows, macOS, or Linux) using the command prompt/terminal, ensuring complete synchronization with the live Cloud Firestore database and remote networks.

---

## ⚡ Windows 1-Click Startup Launcher (Recommended for Windows)
We have included a custom automate runner `start_zion_app.bat` at the root folder. You do not need to run commands manually!
1. Simply double-click `start_zion_app.bat` inside your file explorer.
2. It will check if you have Node.js, install dependencies automatically on its first run, let you select between developer or production execution, and open `http://localhost:3000` in your browser.

---

## 📋 Prerequisites
Ensure your laptop has the following software installed:
1. **Node.js** (v18 or newer recommended) — [Download from nodejs.org](https://nodejs.org)
2. **NPM** (comes pre-packed with Node.js)
3. **Git** (optional, for version control)

---

## 🛠️ Step 1: Extract and Initialize the Project Files
1. Download or export the Zion Digital App project zip folder.
2. Extract the ZIP files to a dedicated workspace folder on your laptop (e.g., `C:\ZionDigitalApp` or `~/ZionDigitalApp`).
3. Open your laptop's **Command Prompt** (cmd on Windows) or **Terminal** (macOS/Linux).
4. Navigate to your project folder:
   ```cmd
   cd /d "C:\ZionDigitalApp"
   ```
   *(Note: The `/d` flag is required in CMD if you are changing across drives, e.g., from C: to D:)*

---

## 📦 Step 2: Install Package Dependencies
To install all required modules (React, Express, Tailwind CSS, Lucide Icons, etc.), run the standard installation command:
```bash
npm install
```
*Note: Ensure you have an active internet connection for this first install so npm can securely pull package assets.*

---

## ⚙️ Step 3: Configure Your Environmental Parameters
Create a file named `.env` in the root folder of your project to store any secure credentials. You can copy the structure from `.env.example`:
```env
# Local Environment Configuration
NODE_ENV=development
PORT=3000
```

---

## 🚀 Step 4: Run the Application Locally via CMD

### 👨‍💻 Method A: Developer Execution Mode (With Hot Reloading)
This runs the app in development mode, enabling live edits and instant code reloading:
```bash
npm run dev
```
Once the dev server is booted, open your browser and navigate to:
```url
http://localhost:3000
```

### 🏢 Method B: Production Build and Run Mode
To build a highly optimized, lightning-fast distribution folder and run it under production conditions:
1. Compile the static frontend assets and bundled backend files:
   ```bash
   npm run build
   ```
2. Start the production-grade application server:
   ```bash
   npm run start
   ```
This will open up and run the app on port `3000`.

---

## 🛡️ Pro-Tip: Running CMD as Administrator
Some advanced local network socket features (such as local tethering mesh tracking) require elevated administrative permissions.
1. Click the **Start Menu**, search for **Command Prompt** or **CMD**.
2. Right-click on it and choose **Run as Administrator**.
3. Navigate to your folder and run the app:
   ```cmd
   cd /d "C:\ZionDigitalApp"
   npm run dev
   ```

---

## 🪐 Step 5: Dual Online/Offline Sync Architecture
Every time this app runs on your laptop, it connects automatically with the live cloud servers and synchronized state pools:

1. **Live Firestore Connection**: When online, your local laptop database transactions (Bible School tests, books, community chats, WiFi hotspot orders) write directly into the shared cloud database in real time.
2. **Graceful Offline Fallback**: If you lose connection or travel to a place without internet/data bundles:
   - Toggle **OFFLINE MODE (NO DATA)** in the top bar.
   - The **Wafula Local AI Engine** intercepts all queries and executes theological searches, document extractions, translation lessons, and mock image generation completely local-first with **ZERO data bundles**.
   - Your local changes are stored securely inside your browser's persistent `indexedDB` cache.
   - As soon as your laptop reconnects to the network, all changes are automatically synced back to the Cloud database!

---

## ❓ Need Assistance?
For help with school curriculums, certified diploma issuances, e-book publication coordination, or local Bungoma WiFi hotspot configurations, open the **Zion Digital Hub** and chat with our friendly local coordinators!
