# ChatBot Platform - API Reference

## Base URL
```
https://{YOUR_DOMAIN}/api
```

## Authentication
All admin/agent endpoints require a JWT Bearer token:
```
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

---

## Admin Endpoints

### POST /api/admin/login
Login as admin and get JWT token.
```json
// Request
{"username": "admin", "password": "admin123"}

// Response 200
{"id": "...", "username": "admin", "token": "jwt_token_here"}
```

### GET /api/admin/stats
Get dashboard statistics. Requires admin token.
```json
// Response 200
{
  "total_questions": 5,
  "total_sessions": 42,
  "total_payments": 10,
  "paid_payments": 8,
  "total_revenue": 3992.0
}
```

---

## Question Endpoints

### POST /api/questions
Create a new question. Requires admin token.
```json
// Request
{
  "text": "How can we help you?",
  "is_root": true,
  "platforms": ["Website", "Android App"],
  "options": [
    {
      "text": "General Inquiry",
      "next_question_id": "uuid-of-next-question"
    },
    {
      "text": "Get Premium Report",
      "is_answer": true,
      "answer_text": "Here is your premium report...",
      "requires_payment": true,
      "payment_amount": 499.0,
      "payment_gateway": "razorpay"
    },
    {
      "text": "Talk to Support",
      "is_agent_handoff": true
    }
  ]
}
```

### GET /api/questions
List all questions. Requires admin token.

### GET /api/questions/{question_id}
Get a specific question. Requires admin token.

### PUT /api/questions/{question_id}
Update a question. Requires admin token.

### DELETE /api/questions/{question_id}
Delete a question. Requires admin token.

---

## Chat Endpoints

### POST /api/chat/session
Create a new chat session.
```json
// Request
{
  "user_name": "John Doe",
  "user_mobile": "9876543210",
  "platform_name": "Website",
  "user_email": "john@example.com",
  "language": "en"
}

// Response 200
{"id": "session-uuid", "user_name": "John Doe", ...}
```

### GET /api/chat/start/{session_id}
Start the bot conversation for a session.
```json
// Response 200
{
  "type": "question",
  "message": "How can we help you?",
  "question_id": "q-uuid",
  "options": [{"id": "opt-uuid", "text": "General Inquiry"}]
}
```

### POST /api/chat/select
User selects an option.
```json
// Request
{"session_id": "...", "question_id": "...", "option_id": "..."}

// Response varies by type:
// type: "question" - next question with options
// type: "answer" - answer text
// type: "payment_required" - needs payment
// type: "agent_handoff" - connecting to agent
```

### POST /api/chat/request-agent
Manually request a live agent.
```json
// Request
{"session_id": "..."}

// Response 200
{"message": "Agent requested. Please wait..."}
```

### POST /api/chat/update-language
Update session language preference.
```json
// Request
{"session_id": "...", "language": "hi"}
```

### POST /api/user/send
User sends a free-text message (during agent chat).
```json
// Request
{"session_id": "...", "message": "Hello agent!"}
```

### GET /api/languages
Get list of all supported languages.
```json
// Response 200
[
  {"code": "en", "name": "English", "native_name": "English"},
  {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
  ...
]
```

---

## Agent Endpoints

### POST /api/agents
Create an agent. Requires admin token.
```json
// Request
{
  "username": "agent1",
  "password": "secure123",
  "display_name": "Support Agent",
  "platforms": ["Website", "Android App"],
  "role": "agent"  // or "master_agent"
}
```

### GET /api/agents
List all agents. Requires admin token.

### PUT /api/agents/{agent_id}
Update agent. Requires admin token.
```json
{"display_name": "New Name", "platforms": [...], "role": "master_agent"}
```

### DELETE /api/agents/{agent_id}
Delete agent. Requires admin token.

### POST /api/agent/login
Agent login.
```json
// Request
{"username": "agent1", "password": "secure123"}

// Response 200
{"token": "jwt_token", "agent": {"id": "...", "display_name": "...", "role": "agent", "languages": [...]}}
```

### GET /api/agent/sessions
Get sessions for agent's platforms. Requires agent token.

### GET /api/agent/chat/{session_id}
Get full chat history. Requires agent token.

### POST /api/agent/send
Agent sends message to user. Requires agent token.
```json
{"session_id": "...", "message": "How can I help?"}
```

### POST /api/agent/join-session
Agent claims a session. Requires agent token.
```json
{"session_id": "..."}
```

### PUT /api/agent/languages
Update agent's known languages. Requires agent token.
```json
{"languages": [{"code": "en", "enabled": true}, {"code": "hi", "enabled": true}]}
```

### GET /api/agent/languages
Get agent's language settings. Requires agent token.

---

## Master Agent Endpoints

### GET /api/master/agents
List agents for reassignment. Requires master agent token.

### POST /api/master/reassign-session
Reassign a session to another agent.
```json
{"session_id": "...", "agent_id": "new-agent-uuid"}
```

### POST /api/master/unassign-session
Remove agent from session.
```json
{"session_id": "..."}
```

---

## Payment Endpoints

### POST /api/payment/razorpay/create
Create Razorpay payment order.
```json
{"session_id": "...", "question_id": "...", "option_id": "...", "amount": 499}
```

### POST /api/payment/razorpay/verify
Verify Razorpay payment.
```json
{"razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..."}
```

### POST /api/payment/cashfree/create
Create Cashfree payment order.
```json
{"session_id": "...", "question_id": "...", "option_id": "...", "amount": 499, "customer_name": "...", "customer_email": "...", "customer_phone": "..."}
```

### POST /api/payment/cashfree/verify
Verify Cashfree payment.
```json
{"order_id": "..."}
```

---

## WebSocket

### WSS /api/ws/chat/{session_id}
Connect for real-time chat updates.

**Message Types Received:**
```json
// New message
{"type": "new_message", "message": {"id": "...", "sender": "agent", "message": "Hello!"}}

// Agent joined
{"type": "agent_joined", "agent_name": "Support Agent", "message": "Agent has joined"}

// Agent requested
{"type": "agent_requested", "message": "Connecting to agent..."}
```
