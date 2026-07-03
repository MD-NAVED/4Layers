# 🏠 SmartNest: Production-Ready IoT Home Automation

**FastAPI | PostgreSQL | React Native | MQTT | ESP32**

SmartNest is a complete, highly scalable, full-stack IoT platform designed to manage smart appliances (Lights, Fans, ACs) in real-time. Built with a focus on bulk manufacturing readiness, thread-safe concurrency, and real-time cross-platform synchronization.

---

## ✨ Key Highlights & Features

*   **🔄 True Real-Time Sync:** Mobile App and Web Dashboard share a single source of truth. Schedules created on the dashboard instantly sync to the backend and execute on hardware.
*   **🏭 Flash-Once Firmware Architecture:** Supports bulk manufacturing. ESP32 firmware requires zero hardcoding; devices are provisioned dynamically via BLE and get their UUIDs at runtime.
*   **🛡️ Anti-Hijacking Provisioning:** Hardware MAC addresses are strictly bound to user accounts preventing device theft or cross-account provisioning.
*   **🧵 Async-Safe MQTT Pipeline:** FastAPI async loop is completely isolated from MQTT blocking I/O using ThreadPoolExecutor, preventing server freezes under heavy load.
*   **💀 LWT Auto-Offline Tracking:** Implements MQTT Last Will and Testament. If a device loses power, the backend automatically marks it "Offline" in the database and UI.
*   **📱 Cross-Platform UI:** Material Design 3 (React Native Paper) mobile app with live online/offline status indicators, and a modern React/TypeScript web dashboard.

---

## 🏗️ System Architecture (The Provisioning Flow)

SmartNest uses a secure 3-way handshake for onboarding new hardware:

```text
[ ESP32 Device ]                       [ Mobile App (BLE) ]                      [ FastAPI Backend ]
      |                                       |                                       |
      |-- 1. Broadcasts BLE "SmartNest" ----->|                                       |
      |                                       |-- 2. Sends Wi-Fi Credentials -------->|
      |<-- 3. Receives Wi-Fi -----------------|                                       |
      |                                       |-- 4. Sends Device MAC Address ------>|
      |                                       |<-- 5. Returns Secure Device UUID ----|
      |<-- 6. Receives Device UUID ------------|                                       |
      |                                                                               |
      |-- 7. Connects to Wi-Fi & MQTT Broker (broker.emqx.io) ----------------------->|
      |-- 8. Subscribes to: smartnest/devices/{UUID}/command ------------------------->|
      |-- 9. Publishes state to: smartnest/devices/{UUID}/status -------------------->|
```

**Result:** Device is now registered in PostgreSQL and actively listening for commands.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Python 3.12, FastAPI, Uvicorn | High-performance async REST API |
| **Database** | PostgreSQL 15+, SQLAlchemy ORM | Reliable concurrent data storage |
| **IoT Protocol** | Paho-MQTT (v1), EMQX Cloud | Asynchronous device control & telemetry |
| **Web Dashboard** | React 18, TypeScript, Tailwind CSS | Admin panel, scheduling, analytics |
| **Mobile App** | Expo SDK 51, React Native Paper | Cross-platform user interface |
| **Hardware Comms** | BLE (react-native-ble-plx) | Secure local device provisioning |

---

## 📁 Project Structure

```text
SmartNest/
├── backend/
│   ├── main.py            # FastAPI entry, Lifespan hooks, Scheduled Jobs
│   ├── database.py        # PostgreSQL engine & async session setup
│   ├── mqtt.py            # Thread-safe MQTT client, LWT, JSON validation
│   ├── models.py          # SQLAlchemy schemas (Users, Devices, Schedules, Alerts)
│   ├── schemas.py         # Pydantic request/response models
│   ├── auth.py            # JWT generation & Bcrypt hashing
│   └── routes/
│       ├── users.py       # Register, login, profile APIs
│       └── devices.py     # CRUD, Provisioning API, Control APIs
├── dashboard/             # React + TypeScript Web Admin
│   ├── src/
│   │   ├── App.tsx        # Main dashboard, API polling, Schedule/Alert sync
│   │   └── ...
├── mobile/                # React Native Expo App
│   ├── src/
│   │   ├── api/           # Axios client with JWT interceptors
│   │   ├── screens/       # ProvisioningScreen.js (BLE flow), HomeScreen.js
│   │   └── components/    # DeviceCard.js (Live status dots)
│   └── app.json           # Expo config & Android BLE permissions
├── .env.example           # Environment variables template
└── requirements.txt       # Python dependencies (asyncpg, psycopg2, etc.)
```

---

## ⚡ API Endpoints Overview

### User Routes (`/api/users`)
*   `POST /register` - Create a new account
*   `POST /login` - Get JWT token
*   `GET /me` - Get current user profile

### Device Routes (`/api/devices`)
*   `POST /provision` - Secure provisioning endpoint (Validates MAC ownership)
*   `GET /` - List all user devices with live `is_online` status
*   `POST /{device_id}/control` - Send MQTT command (Optimistic UI)
*   `DELETE /{device_id}` - Remove device

### Schedule & Alert Routes (Synced across Mobile & Dashboard)
*   `GET /api/schedules` - Fetch active automation rules
*   `POST /api/schedules` - Create a new schedule (Fires via Backend Cron)
*   `PATCH /api/schedules/{id}` - Toggle schedule enabled/disabled
*   `DELETE /api/schedules/{id}` - Remove schedule
*   `GET /api/alerts` - Fetch system/device alerts
*   `DELETE /api/alerts/{id}` - Dismiss specific alert
*   `DELETE /api/alerts` - Clear all alerts

---

## 🚀 Local Setup & Installation

### Prerequisites
*   Node.js & npm
*   Python 3.12+
*   PostgreSQL Database running locally or remotely

### 1. Backend Setup
```bash
# Clone the repo
git clone https://github.com/MD-NAVED/SmartNest.git
cd SmartNest

# Setup environment variables
cp .env.example .env
# Edit .env with your PostgreSQL URL and JWT Secret

# Install Python dependencies
pip install -r backend/requirements.txt

# Run database migrations (or let SQLAlchemy create tables on first run)
# Start the FastAPI server
uvicorn backend.main:app --reload
```

### 2. Web Dashboard Setup
```bash
cd dashboard
npm install
npm run dev
```

### 3. Mobile App Setup
```bash
cd mobile
npm install
# Run on physical device (Required for BLE testing)
npx expo start
```

---

## 🤝 Contributing & Hardware Integration

If you are integrating custom hardware (ESP32/ESP8266), please refer to the Hardware Integration Guidelines.

**Key rules for Firmware:**
*   Do not hardcode Device IDs. Read from NVS.
*   Implement BLE provisioning to accept Wi-Fi, MAC, and Device UUID.
*   Use QoS 1 for Command subscriptions and QoS 0 for Status publishing.
*   Implement LWT (`{"status": "OFFLINE"}`) on MQTT connect.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
