<?php
/**
 * ============================================================
 * ChatBot Admin SDK - Integration Examples for PHP Admin Panel
 * ============================================================
 * 
 * Copy ChatBotAdminSDK.php into your PHP project and use
 * these examples to integrate chatbot management into
 * your existing admin panel.
 * 
 * API Base URL: https://chatbot-hub-57.preview.emergentagent.com
 * Default Admin: username=admin, password=admin123
 */

require_once __DIR__ . '/ChatBotAdminSDK.php';

// ============================================================
// 1. INITIALIZE & AUTHENTICATE
// ============================================================

$sdk = new ChatBotAdminSDK('https://chatbot-hub-57.preview.emergentagent.com');

// Login and get JWT token
try {
    $auth = $sdk->login('admin', 'admin123');
    echo "Logged in! Token: " . substr($auth['token'], 0, 20) . "...\n";
    
    // IMPORTANT: Store this token in your PHP session for reuse
    // $_SESSION['chatbot_token'] = $auth['token'];
    
} catch (Exception $e) {
    die("Login failed: " . $e->getMessage());
}

// Or set a previously stored token:
// $sdk->setToken($_SESSION['chatbot_token']);


// ============================================================
// 2. DASHBOARD STATS
// ============================================================

echo "\n--- DASHBOARD STATS ---\n";
$stats = $sdk->getStats();
echo "Total Questions: " . $stats['total_questions'] . "\n";
echo "Total Sessions:  " . $stats['total_sessions'] . "\n";
echo "Total Payments:  " . $stats['total_payments'] . "\n";
echo "Paid Payments:   " . $stats['paid_payments'] . "\n";
echo "Total Revenue:   ₹" . $stats['total_revenue'] . "\n";


// ============================================================
// 3. LIST ALL QUESTIONS
// ============================================================

echo "\n--- ALL QUESTIONS ---\n";
$questions = $sdk->getQuestions();
foreach ($questions as $q) {
    $rootLabel = $q['is_root'] ? ' [ROOT]' : '';
    echo "- [{$q['id']}]{$rootLabel} {$q['text']}\n";
    foreach ($q['options'] as $opt) {
        $paid = $opt['requires_payment'] ? " (₹{$opt['payment_amount']} via {$opt['payment_gateway']})" : " (FREE)";
        $type = $opt['is_answer'] ? 'ANSWER' : 'NEXT Q';
        echo "    → [{$type}] {$opt['text']}{$paid}\n";
    }
}


// ============================================================
// 4. CREATE A NEW QUESTION (FREE ANSWERS)
// ============================================================

echo "\n--- CREATE FREE QUESTION ---\n";
$newQuestion = $sdk->createQuestion(
    'What product are you interested in?',      // Question text
    [
        $sdk->buildOption(
            'Product A - Overview',              // Option text
            answerText: 'Product A is our flagship solution for enterprise clients. It includes 24/7 support, custom integrations, and unlimited users.',
        ),
        $sdk->buildOption(
            'Product B - Overview',
            answerText: 'Product B is designed for small businesses. Affordable pricing with all essential features included.',
        ),
    ],
    false,                                       // Not root
    'products'                                   // Category
);
echo "Created question: {$newQuestion['id']}\n";


// ============================================================
// 5. CREATE A PAID QUESTION
// ============================================================

echo "\n--- CREATE PAID QUESTION ---\n";
$paidQuestion = $sdk->createQuestion(
    'Select a premium report:',
    [
        $sdk->buildOption(
            'Market Analysis Report (₹999)',
            answerText: 'PREMIUM: Complete market analysis showing industry trends, competitor analysis, and growth projections for 2026-2027.',
            requiresPayment: true,
            paymentAmount: 999.0,
            paymentGateway: 'cashfree'           // Use Cashfree for this
        ),
        $sdk->buildOption(
            'Financial Audit Report (₹1499)',
            answerText: 'PREMIUM: Detailed financial audit with recommendations for cost optimization, revenue growth, and risk management.',
            requiresPayment: true,
            paymentAmount: 1499.0,
            paymentGateway: 'razorpay'           // Use Razorpay for this
        ),
        $sdk->buildOption(
            'Free Summary',
            answerText: 'Here is a brief summary: Your business is performing well with 15% YoY growth. Contact us for detailed reports.',
        ),
    ],
    false,
    'premium-reports'
);
echo "Created paid question: {$paidQuestion['id']}\n";


// ============================================================
// 6. CREATE LINKED QUESTIONS (BRANCHING FLOW)
// ============================================================

echo "\n--- CREATE BRANCHING FLOW ---\n";

// First create the sub-question
$subQuestion = $sdk->createQuestion(
    'Which service tier interests you?',
    [
        $sdk->buildOption(
            'Basic Tier - Free Info',
            answerText: 'Basic tier: ₹499/month, includes core features, email support.',
        ),
        $sdk->buildOption(
            'Premium Tier - Detailed Comparison (₹199)',
            answerText: 'Premium vs Basic detailed comparison: Premium includes API access, priority support, custom branding, advanced analytics, and dedicated account manager.',
            requiresPayment: true,
            paymentAmount: 199.0,
            paymentGateway: 'cashfree'
        ),
    ],
    false,
    'pricing'
);

// Now create a parent question that links to the sub-question
$parentQuestion = $sdk->createQuestion(
    'What would you like to explore?',
    [
        $sdk->buildOption(
            'Service Pricing',
            nextQuestionId: $subQuestion['id']    // Links to sub-question!
        ),
        $sdk->buildOption(
            'Contact Support',
            answerText: 'Please reach us at support@company.com or call +91-9876543210',
        ),
    ],
    false,
    'navigation'
);
echo "Created parent: {$parentQuestion['id']} → child: {$subQuestion['id']}\n";


// ============================================================
// 7. UPDATE A QUESTION
// ============================================================

echo "\n--- UPDATE QUESTION ---\n";
$updated = $sdk->updateQuestion(
    $newQuestion['id'],
    text: 'What product category interests you?',  // Updated text
    category: 'products-v2'                         // Updated category
);
echo "Updated: {$updated['text']}\n";


// ============================================================
// 8. DELETE A QUESTION
// ============================================================

// Uncomment to delete:
// $sdk->deleteQuestion($newQuestion['id']);
// echo "Deleted question: {$newQuestion['id']}\n";


// ============================================================
// 9. VIEW CHAT SESSIONS
// ============================================================

echo "\n--- CHAT SESSIONS ---\n";
$sessions = $sdk->getSessions();
foreach (array_slice($sessions, 0, 5) as $s) {
    echo "- {$s['user_name']} ({$s['user_mobile']}) on {$s['platform_name']} - {$s['status']}\n";
    if ($s['assigned_master']) echo "  Master: {$s['assigned_master']}\n";
    if ($s['assigned_monitor']) echo "  Monitor: {$s['assigned_monitor']}\n";
}


// ============================================================
// 10. VIEW CHAT MESSAGES FOR A SESSION
// ============================================================

if (!empty($sessions)) {
    $firstSession = $sessions[0];
    echo "\n--- MESSAGES FOR SESSION: {$firstSession['user_name']} ---\n";
    $messages = $sdk->getSessionMessages($firstSession['id']);
    foreach ($messages as $msg) {
        $sender = strtoupper($msg['sender']);
        echo "[{$sender}] {$msg['message']}\n";
        if (!empty($msg['options'])) {
            foreach ($msg['options'] as $opt) {
                echo "  → {$opt['text']}\n";
            }
        }
    }
}


// ============================================================
// 11. PROGRAMMATIC CHAT SESSION (Server-to-Server)
// ============================================================

echo "\n--- CREATE CHAT SESSION FROM PHP ---\n";
$session = $sdk->createChatSession(
    userName: 'PHP Admin User',
    userMobile: '9876543210',
    platformName: 'PHP Admin Panel',
    userEmail: 'admin@company.com',
    assignedMaster: 'Master A',
    assignedMonitor: 'Monitor B'
);
echo "Session created: {$session['id']}\n";

// Start chat
$root = $sdk->startChat($session['id']);
echo "Root question: {$root['message']}\n";
foreach ($root['options'] as $opt) {
    echo "  → [{$opt['id']}] {$opt['text']}\n";
}

// Select first option
$firstOption = $root['options'][0];
$result = $sdk->selectOption($session['id'], $root['question_id'], $firstOption['id']);
echo "Result type: {$result['type']}\n";
echo "Response: {$result['message']}\n";


echo "\n✅ All examples completed successfully!\n";
