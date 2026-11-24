# 🚀 Zion Digital App - Local Laptop & Command Prompt (CMD) Execution Guide

This guide describes how to run, execute, and configure the **Zion Digital App** on any local computer (Windows Command Prompt, PowerShell, macOS, or Linux) using terminal commands and automated batch scripts.

---

## ⚡ Method 1: Windows 1-Click CMD Launchers (Recommended for Windows CMD)
We provide two dedicated automated batch runners at the project root directory:

1. **`run_cmd.bat`** (Direct Quick Launcher):
   - Double-click `run_cmd.bat` or run `run_cmd.bat` inside CMD.
   - Automatically checks Node.js, restores missing npm dependencies, launches the server, and opens `http://localhost:3000`.

2. **`start_zion_app.bat`** (Interactive Launcher & Diagnostic Tool):
   - Double-click `start_zion_app.bat` or run `start_zion_app.bat` in CMD.
   - Lets you choose between **Developer Mode** (hot-reload) and **Production Mode** (optimized build).

---

## 💻 Method 2: Manual Execution via Windows Command Prompt (CMD)

### Step 1: Open CMD and Navigate to Directory
Open **Command Prompt (CMD)** on your laptop and navigate to the project root folder:
```cmd
cd /d "C:\path\to\ZionDigitalApp"
```
*(Note: The `/d` switch ensures drive letter switching if your project is on drive D:, E:, etc.)*

### Step 2: Install/Verify Package Dependencies
Run the installation command in CMD:
```cmd
npm install
```

### Step 3: Launch in Developer Mode (With Hot Reloading)
To start the app with instant code reload in CMD:
```cmd
npm run dev
```
Then navigate to `http://localhost:3000` in your web browser.

### Step 4: Launch in Production Mode
To compile optimized static bundles and launch the production server in CMD:
```cmd
npm run build
npm run start
```

---

## 🛡️ Pro-Tip: Running CMD as Administrator
Running Command Prompt with elevated administrator privileges is recommended if you plan to share your local web server over a Wi-Fi hotspot:
1. Press `Win + S`, type `cmd`.
2. Right-click **Command Prompt** and select **Run as Administrator**.
3. Navigate and run:
   ```cmd
   cd /d "C:\path\to\ZionDigitalApp"
   npm run dev
   ```

---

## ❓ CMD Troubleshooting
- **Port 3000 already in use?**
  In CMD, check which process is occupying port 3000 and terminate it:
  ```cmd
  netstat -ano | findstr :3000
  taskkill /PID <PID_NUMBER> /F
  ```
- **Node.js command not recognized?**
  Download and install Node.js v18 or higher from [https://nodejs.org](https://nodejs.org) and restart your CMD window.
