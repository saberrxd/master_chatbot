# ChatBot Admin SDK - PHP Integration Guide

## Quick Setup (3 Steps)

### Step 1: Copy the SDK file
Copy `ChatBotAdminSDK.php` into your PHP project directory.

### Step 2: Initialize & Login
```php
<?php
require_once 'ChatBotAdminSDK.php';

$sdk = new ChatBotAdminSDK('https://chatbot-hub-57.preview.emergentagent.com');
$sdk->login('admin', 'admin123');

// Store token in session for reuse
session_start();
$_SESSION['chatbot_token'] = $sdk->getToken();
```

### Step 3: Use in your admin pages
```php
<?php
require_once 'ChatBotAdminSDK.php';

session_start();
$sdk = new ChatBotAdminSDK('https://chatbot-hub-57.preview.emergentagent.com');
$sdk->setToken($_SESSION['chatbot_token']);

// Get all questions
$questions = $sdk->getQuestions();
```

---

## Full API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | No | Login, returns JWT token |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | JWT | Get dashboard statistics |

### Questions CRUD
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/questions` | JWT | List all questions |
| GET | `/api/questions/{id}` | No | Get single question |
| POST | `/api/questions` | JWT | Create question |
| PUT | `/api/questions/{id}` | JWT | Update question |
| DELETE | `/api/questions/{id}` | JWT | Delete question |

### Chat Sessions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/sessions` | JWT | List all sessions |
| GET | `/api/chat/session/{id}` | No | Get single session |
| POST | `/api/chat/session` | No | Create session (SDK init) |
| GET | `/api/chat/messages/{id}` | No | Get session messages |

### Chat Flow
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/start/{session_id}` | No | Start chat (get root question) |
| POST | `/api/chat/select` | No | Select an option |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payment/razorpay/create` | No | Create Razorpay order |
| POST | `/api/payment/razorpay/verify` | No | Verify Razorpay payment |
| POST | `/api/payment/cashfree/create` | No | Create Cashfree order |
| POST | `/api/payment/cashfree/verify` | No | Verify Cashfree payment |

### API Docs (JSON)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/docs/admin` | No | Full API docs as JSON |

---

## SDK Methods

### Authentication
```php
$sdk->login('admin', 'password');    // Login & store token
$sdk->setToken('jwt_token');          // Set existing token
$sdk->getToken();                     // Get current token
$sdk->isAuthenticated();              // Check if authenticated
```

### Dashboard
```php
$stats = $sdk->getStats();
// Returns: total_questions, total_sessions, total_payments, paid_payments, total_revenue
```

### Questions
```php
// List
$questions = $sdk->getQuestions();

// Get one
$question = $sdk->getQuestion('uuid');

// Create with FREE options
$q = $sdk->createQuestion('Your question?', [
    $sdk->buildOption('Option 1', answerText: 'Free answer here'),
    $sdk->buildOption('Option 2', answerText: 'Another free answer'),
], isRoot: true, category: 'general');

// Create with PAID options
$q = $sdk->createQuestion('Premium content:', [
    $sdk->buildOption('Report A (₹499)', 
        answerText: 'Premium content...',
        requiresPayment: true, 
        paymentAmount: 499.0, 
        paymentGateway: 'cashfree'
    ),
    $sdk->buildOption('Report B (₹999)', 
        answerText: 'More premium content...',
        requiresPayment: true, 
        paymentAmount: 999.0, 
        paymentGateway: 'razorpay'
    ),
]);

// Create BRANCHING (link to next question)
$sub = $sdk->createQuestion('Sub question?', [...]);
$parent = $sdk->createQuestion('Main question?', [
    $sdk->buildOption('Go to sub', nextQuestionId: $sub['id']),
]);

// Update
$sdk->updateQuestion('uuid', text: 'Updated text', category: 'new-cat');

// Delete
$sdk->deleteQuestion('uuid');
```

### Sessions
```php
$sessions = $sdk->getSessions();
$session = $sdk->getSession('uuid');
$messages = $sdk->getSessionMessages('uuid');
```

### Chat (Server-to-Server)
```php
// Create session
$session = $sdk->createChatSession(
    userName: 'John',
    userMobile: '9876543210',
    platformName: 'PHP Panel',
    assignedMaster: 'Master A',
    assignedMonitor: 'Monitor B'
);

// Start chat
$root = $sdk->startChat($session['id']);

// Select option
$result = $sdk->selectOption($session['id'], $root['question_id'], $optionId);
```

### Payments
```php
// Cashfree
$order = $sdk->createCashfreeOrder($sessionId, $optionId, $questionId, 499.0, 'Name', 'email', 'phone');
$verify = $sdk->verifyCashfreePayment($order['order_id'], $sessionId, $optionId, $questionId);

// Razorpay
$order = $sdk->createRazorpayOrder($sessionId, $optionId, $questionId, 999.0, 'Name', 'email', 'phone');
$verify = $sdk->verifyRazorpayPayment($orderId, $paymentId, $signature, $sessionId, $optionId, $questionId);
```

---

## Integration Example: PHP Admin Page

```php
<?php
// admin_questions.php - Add to your existing PHP admin panel
require_once 'ChatBotAdminSDK.php';
session_start();

$sdk = new ChatBotAdminSDK('https://chatbot-hub-57.preview.emergentagent.com');

// Check if logged in
if (empty($_SESSION['chatbot_token'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
        try {
            $sdk->login($_POST['username'], $_POST['password']);
            $_SESSION['chatbot_token'] = $sdk->getToken();
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
} else {
    $sdk->setToken($_SESSION['chatbot_token']);
}

// Handle actions
if ($sdk->isAuthenticated()) {
    if (isset($_GET['delete'])) {
        $sdk->deleteQuestion($_GET['delete']);
        header('Location: admin_questions.php');
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['create'])) {
        $options = [];
        foreach ($_POST['options'] as $opt) {
            $options[] = $sdk->buildOption(
                $opt['text'],
                answerText: $opt['answer_text'] ?: null,
                requiresPayment: !empty($opt['requires_payment']),
                paymentAmount: $opt['amount'] ? (float)$opt['amount'] : null,
                paymentGateway: $opt['gateway'] ?: null
            );
        }
        $sdk->createQuestion($_POST['question_text'], $options, 
            isRoot: !empty($_POST['is_root']), 
            category: $_POST['category'] ?: null
        );
    }
    
    $questions = $sdk->getQuestions();
    $stats = $sdk->getStats();
}
?>
```

---

## Files Included
- `ChatBotAdminSDK.php` — The PHP SDK class (drop into your project)
- `examples.php` — Comprehensive usage examples
- `README.md` — This integration guide
