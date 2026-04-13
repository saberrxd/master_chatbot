# 👨‍💻 Developer & Analyst Handover Guide

This guide describes the critical API endpoints and authentication logic for developers taking over the project.

## 1. Authentication Logic

### Admin Token (JWT)
The system uses standard JWT for internal admin access.
- **Logic**: `backend/server.py` -> `create_token()` and `verify_token()`.
- **Seeding**: On first run, a default admin is created (`admin` / `admin123`). Change the password in `.env` (`ADMIN_DEFAULT_PASSWORD`).

### Laravel Sanctum Integration (SSO)
The system can validate tokens from a Laravel application (e.g., HiTeam).
- **Critical Logic**: `backend/server.py` -> `validate_sanctum_token(token: str)`.
- **Flow**: It sends the token to `SANCTUM_API_URL/api/user`. If the Laravel API returns 200, the user is authenticated in the chatbot.
- **Roles**: The logic handles role-mapping (e.g., assigning "admin" or "agent" status based on Laravel's response).

---

## 2. API Endpoints to Monitor

### Content & Logic
- `GET /api/questions`: Lists all decision tree flows.
- `POST /api/questions/bulk-upload`: Endpoint for Excel/CSV ingestion.

### Sales Dashboard Integration
Use these to populate your "Hi team" or external dashboards:
- `GET /api/admin/stats`: Summary of sessions, revenue, and payments.
- `GET /api/chat/sessions`: Detailed history of user interactions.

### Live Agent Handoff
- `WS /ws/chat/{session_id}`: Real-time communication between agent and user.
- `GET /api/agent/sessions`: List of users waiting for a live agent.

---

## 3. Tokens & Secrets

All secrets are managed in `.env` (refer to `.env.example` for the structure):

| Key | Purpose |
|-----|---------|
| `JWT_SECRET` | Used for generating internal admin tokens. |
| `SANCTUM_API_URL` | The URL of your Laravel instance for SSO. |
| `RAZORPAY_KEY_*` | Credentials for Razorpay integration. |
| `CASHFREE_*` | Credentials for Cashfree integration. |

---

## 4. Database Structure (MongoDB)
- **`questions`**: The decision tree nodes.
- **`chat_sessions`**: User metadata, platform origin, and current status.
- **`chat_messages`**: Full history of bot, user, and agent messages.
- **`payments`**: Transaction logs for premium content unlocking.

---

## 5. Contact / Management
All frontend admin code is in `/frontend/app/admin/`. 
The core backend router is in `/backend/server.py`.
