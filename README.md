# 🤖 Multi-Platform Master Chatbot Hub

A professional, high-fidelity AI-powered chatbot hub designed for complex decision-tree automation, supporting single-sign-on (SSO) via Laravel Sanctum, real-time agent handoff, and integrated payment gateways.

---

## 🚀 Quick Setup

### 1. Backend (FastAPI)
- **Directory**: `/backend`
- **Setup**:
  1. `cd backend`
  2. `python -m venv venv`
  3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
  4. `pip install -r requirements.txt`
  5. Copy `.env.example` to `.env` and fill in your MongoDB and Payment credentials.
  6. **Run**: `uvicorn server:app --reload`

### 2. Frontend (Expo/React Native)
- **Directory**: `/frontend`
- **Setup**:
  1. `cd frontend`
  2. `npm install`
  3. **Run**: `npx expo start`

---

## 🛠 Integration Points

### 🔑 External Auth (HiTeam / Laravel)
The chatbot is ready to authenticate users from your existing platforms.
- **Logic**: See `backend/server.py` -> `validate_sanctum_token`.
- **Config**: Set `SANCTUM_API_URL` in your `.env`.

### 📊 Sales Dashboard / Stats
Pull data from these endpoints into your existing dashboards:
- **Stats Summary**: `GET /api/admin/stats`
- **Active Sessions**: `GET /api/chat/sessions`
- **Payment Success**: `GET /api/payments`

### 📦 SDKs
Pre-built SDKs for seamless backend-to-backend integration:
- **PHP**: `php-sdk/`
- **JavaScript**: `sdk/chatbot_sdk.js`
- **Flutter/Dart**: `sdk/chatbot_sdk.dart`

---

## 📁 Key Directories
- `backend/`: FastAPI Python server and core logic.
- `frontend/`: Expo mobile and web dashboard.
- `php-sdk/`: Drop-in PHP class for Laravel/PHP integrations.
- `sdk/`: Generic SDKs for JS/Flutter.
- `docs/`: Technical documentation and flowcharts.

---

## 📄 Handover
For technical analysts and developers taking over this repo, please refer to:
👉 **[DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md)**
