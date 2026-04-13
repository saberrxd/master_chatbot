# ChatBot Platform - Complete Instruction Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Admin Panel](#admin-panel)
4. [Agent System](#agent-system)
5. [User Chat Flow](#user-chat-flow)
6. [Payment Integration](#payment-integration)
7. [Multilingual Support](#multilingual-support)
8. [SDK & Integration](#sdk--integration)
9. [API Reference](#api-reference)

---

## 1. Overview

This is a full-stack AI chatbot platform with:
- **Decision-tree chatbot** with admin-configurable Q&A flows
- **Payment integration** (Razorpay & Cashfree) for premium answers
- **Live agent chat** via WebSocket for real-time human support
- **Master agent** role for chat monitoring and reassignment
- **Multilingual support** with 20+ languages
- **Platform-based targeting** (Website, Mobile App, WhatsApp, etc.)
- **PHP & JavaScript SDKs** for external integration

### Architecture
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React Native (Expo) - works on Web, iOS, Android
- **Real-time**: WebSocket for live agent chat
- **Auth**: JWT-based authentication for Admin and Agents

---

## 2. Getting Started

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Agents**: Created by admin via the Manage Agents screen

### Access Points
- **Home / SDK Init**: `/` - User enters details to start chat
- **Admin Panel**: `/admin/login` - Admin dashboard
- **Agent Portal**: `/agent/login` - Agent dashboard

---

## 3. Admin Panel

### 3.1 Login
- Navigate to `/admin/login`
- Enter admin credentials
- JWT token is stored for session

### 3.2 Dashboard
The admin dashboard provides access to:
- **Manage Questions** - CRUD for Q&A decision tree
- **Add New Question** - Create questions with options
- **View Journey** - Visualize the Q&A flow as a tree + simulate user experience
- **PG Settings** - Manage Razorpay/Cashfree payment credentials
- **Chat Sessions** - View all user chat sessions
- **Payments** - Track payment transactions
- **Manage Agents** - Create/edit/delete chat agents
- **API Documentation** - Integration guides and SDK docs

### 3.3 Managing Questions

#### Creating a Question
1. Go to **Add New Question**
2. Enter the question text
3. Select target platforms (Website, Android, iOS, WhatsApp, etc.)
4. Toggle **Root Question** if this is the first question users see
5. Add options:
   - **Regular Option**: Links to the next question in the tree
   - **Answer Option**: Provides a direct answer (toggle "Is Answer")
   - **Paid Answer**: Toggle "Requires Payment" and set amount + gateway
   - **Agent Handoff**: Toggle "Agent Handoff?" to auto-connect user to an agent

#### Platform Targeting
Questions can be restricted to specific platforms. Users on a specific platform will only see questions targeted to that platform.

### 3.4 PG Credential Management
- Navigate to **PG Settings**
- Configure Razorpay and Cashfree API keys
- Toggle between Test/Production modes
- Enable/disable each gateway
- Set default gateway
- Credentials are masked; OTP verification (via email) required to view

### 3.5 Journey Preview
- **Tree View**: Visual representation of the entire Q&A flow
- **User Simulation**: Step through the chatbot as a user would

---

## 4. Agent System

### 4.1 Agent Roles

| Feature | Agent | Master Agent |
|---------|-------|-------------|
| Chat with users | ✅ | ✅ |
| See platform sessions | ✅ (own platforms) | ✅ (own platforms) |
| Claim sessions | ✅ | ✅ |
| View chat history | ✅ (claimed only) | ✅ (all) |
| Reassign sessions | ❌ | ✅ |
| Unassign agents | ❌ | ✅ |
| Manage questions | ❌ | ❌ |

### 4.2 Creating Agents (Admin)
1. Go to Admin Dashboard → **Manage Agents**
2. Click **+** to add new agent
3. Fill in:
   - Username & Password
   - Display Name
   - Role: **Agent** or **Master Agent**
   - Platforms (which platforms they handle)
4. Click **Create Agent**

### 4.3 Agent Dashboard
- Shows sessions filtered by agent's assigned platforms
- **Waiting** sessions (needs agent) highlighted in yellow
- **My Chats** - sessions claimed by this agent
- **Stats Bar** - Waiting / My Chats / Total counts
- **Language button** - Manage known languages
- Auto-refreshes every 5 seconds

### 4.4 Master Agent Features
Master agents see additional controls on each session:
- **Reassign** - Transfer session to another agent
- **Unassign** - Remove current agent, put session back to waiting
- Purple "MASTER" badge on dashboard

### 4.5 Agent Language Settings
1. Click the **language icon** in the agent dashboard header
2. Toggle ON languages the agent can communicate in
3. Click **Save**
4. Agent will be matched with users who prefer those languages

---

## 5. User Chat Flow

### Step-by-step:
1. **SDK Init Screen** (`/`): User enters Name, Mobile, Platform
2. **Language Selection**: First screen in chat - user picks their preferred language from a grid of 20 languages
3. **Bot Conversation**: Decision-tree Q&A flow based on admin-configured questions
4. **Answer + Satisfaction Check**: After each answer:
   - "Was this answer helpful?"
   - **Yes, helpful!** → continues bot flow
   - **No, connect to agent** → triggers live agent handoff
5. **Agent Handoff** (two methods):
   - **Automatic**: Admin configures an option with "Agent Handoff" toggle
   - **Manual**: User types "connect with agent" (or similar keywords) in the text input
6. **Live Agent Chat**: Real-time messaging via WebSocket
7. **Payment Flow**: For paid answers, user is redirected to payment screen (Razorpay/Cashfree)

### Agent Connection Keywords
Users can type these phrases to request a live agent:
- "connect with agent"
- "talk to agent"
- "human agent"
- "live agent"
- "speak to agent"
- "real person"
- "need agent"

---

## 6. Payment Integration

### Supported Gateways
- **Razorpay**: Key ID + Key Secret
- **Cashfree**: App ID + Secret Key

### Setup
1. Go to Admin → **PG Settings**
2. Enter credentials for each gateway
3. Toggle Test/Prod mode
4. Enable/disable gateways
5. Set default gateway

### Flow
1. User selects a paid option in the chatbot
2. Bot shows payment button with amount and gateway
3. User taps "Pay" → redirected to payment screen
4. Payment processed via selected gateway
5. On success, user receives the paid answer

---

## 7. Multilingual Support

### Supported Languages (20)
English, Hindi (हिन्दी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Urdu (اردو), Spanish (Español), French (Français), Arabic (العربية), Portuguese (Português), German (Deutsch), Japanese (日本語), Chinese (中文), Korean (한국어), Russian (Русский)

### How it Works
1. User enters chat → first screen is language selection grid
2. Selected language is stored in the session
3. Agents see user's language preference in their dashboard
4. Agents can configure which languages they speak
5. Language info is available for agent matching

---

## 8. SDK & Integration

See the separate SDK files:
- **JavaScript SDK**: `/sdk/chatbot_sdk.js`
- **PHP SDK**: `/sdk/chatbot_sdk.php`
- **API Reference**: `/docs/API_REFERENCE.md`

---

## 9. API Reference

### Base URL
`{YOUR_DOMAIN}/api`

### Authentication
All admin/agent endpoints require JWT token in Authorization header:
```
Authorization: Bearer {token}
```

### Key Endpoints

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/login | Admin login |
| GET | /api/admin/stats | Dashboard statistics |
| GET/PUT | /api/admin/pg-settings | PG credential management |

#### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/questions | Create question |
| GET | /api/questions | List all questions |
| GET | /api/questions/{id} | Get question by ID |
| PUT | /api/questions/{id} | Update question |
| DELETE | /api/questions/{id} | Delete question |

#### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/session | Create chat session |
| GET | /api/chat/start/{session_id} | Start bot conversation |
| POST | /api/chat/select | Select an option |
| POST | /api/chat/request-agent | Request live agent |
| POST | /api/chat/update-language | Update session language |
| POST | /api/user/send | User sends message to agent |
| GET | /api/languages | Get supported languages |

#### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/agents | Create agent (admin) |
| GET | /api/agents | List agents (admin) |
| PUT | /api/agents/{id} | Update agent (admin) |
| DELETE | /api/agents/{id} | Delete agent (admin) |
| POST | /api/agent/login | Agent login |
| GET | /api/agent/sessions | Get agent's sessions |
| GET | /api/agent/chat/{session_id} | Get chat history |
| POST | /api/agent/send | Agent sends message |
| POST | /api/agent/join-session | Claim a session |
| PUT | /api/agent/languages | Update agent languages |
| GET | /api/agent/languages | Get agent language settings |

#### Master Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/master/agents | List agents for reassignment |
| POST | /api/master/reassign-session | Reassign session |
| POST | /api/master/unassign-session | Unassign agent |

#### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payment/razorpay/create | Create Razorpay order |
| POST | /api/payment/razorpay/verify | Verify Razorpay payment |
| POST | /api/payment/cashfree/create | Create Cashfree order |
| POST | /api/payment/cashfree/verify | Verify Cashfree payment |

#### WebSocket
| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WSS | /api/ws/chat/{session_id} | Real-time chat |

---

## Support

For technical support or feature requests, contact the system administrator.
