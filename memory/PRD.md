# ChatBot SDK with Payment Integration - PRD

## Overview
A full-stack chatbot application with admin-managed Q&A decision tree, integrated payment gateways (Razorpay & Cashfree), and SDK-style initialization for easy embedding.

## Tech Stack
- **Frontend:** Expo (React Native) - works on iOS, Android, Web
- **Backend:** Python FastAPI
- **Database:** MongoDB
- **Payments:** Razorpay (test), Cashfree (production)

## Core Features

### 1. SDK-Style Initialization
- Accepts mandatory params: `userName`, `userMobile`, `platformName`
- Accepts optional params: `userEmail`, `channelName`, `assignedMaster`, `assignedMonitor`
- Creates a chat session with all params tracked

### 2. Chatbot (Decision Tree)
- Admin-configured dropdown Q&A flow
- Free answers shown directly
- Paid answers require payment before revealing content
- Options lead to sub-questions or direct answers
- Continues conversation after answering

### 3. Payment Integration
- **Razorpay:** WebView-based checkout (test keys - needs real keys for production)
- **Cashfree:** WebView-based checkout (production keys configured)
- Admin configures which options are paid and the amount
- Gateway selection per option (Razorpay or Cashfree)
- Payment verification before content delivery

### 4. Admin Panel
- **Login:** admin / admin123 (default seeded)
- **Dashboard:** Stats (questions, sessions, payments, revenue)
- **Q&A Manager:** CRUD for questions with options
- **Option Config:** Free/Paid toggle, amount, gateway selection, link to next question
- **Sessions Viewer:** All user sessions with SDK params

## Database Collections
- `admins` - Admin users
- `questions` - Q&A decision tree nodes (with `platforms` field)
- `chat_sessions` - User sessions with SDK params
- `chat_messages` - Chat history per session
- `payments` - Payment records
- `platforms` - Custom platform names added by admin

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/admin/login | No | Admin login |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET/POST/PUT/DELETE | /api/questions | Admin | CRUD questions |
| POST | /api/chat/session | No | Create chat session |
| GET | /api/chat/start/{id} | No | Start chat |
| POST | /api/chat/select | No | Select option |
| GET | /api/chat/messages/{id} | No | Get messages |
| POST | /api/payment/razorpay/create | No | Create Razorpay order |
| POST | /api/payment/razorpay/verify | No | Verify Razorpay payment |
| POST | /api/payment/cashfree/create | No | Create Cashfree order |
| POST | /api/payment/cashfree/verify | No | Verify Cashfree payment |

## Design
- Light theme with Golden Yellow (#F5A623) + White
- Professional, clean UI

## PHP Admin SDK Integration
The `/php-sdk/` directory contains everything needed to integrate the chatbot admin into an existing PHP admin panel:

### Files
- **ChatBotAdminSDK.php** — Drop-in PHP class with all admin API methods
- **examples.php** — Comprehensive usage examples (Q&A CRUD, sessions, payments)
- **README.md** — Full integration guide with API reference

### SDK Methods
- `login()` / `setToken()` / `getToken()` — JWT authentication
- `getStats()` — Dashboard statistics
- `getQuestions()` / `createQuestion()` / `updateQuestion()` / `deleteQuestion()` — Q&A CRUD
- `buildOption()` — Helper to build options (free/paid/branching)
- `getSessions()` / `getSessionMessages()` — View chat sessions
- `createChatSession()` / `startChat()` / `selectOption()` — Server-to-server chat
- `createRazorpayOrder()` / `createCashfreeOrder()` — Payment creation
- `verifyRazorpayPayment()` / `verifyCashfreePayment()` — Payment verification

### API Documentation Endpoint
`GET /api/docs/admin` — Returns complete API docs as JSON (no auth required)
- Mobile-first responsive design
