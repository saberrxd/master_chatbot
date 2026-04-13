<?php
/**
 * ChatBot Admin SDK for PHP
 * 
 * Drop this file into your PHP project and use it to manage
 * the chatbot from your existing PHP admin panel.
 * 
 * Usage:
 *   require_once 'ChatBotAdminSDK.php';
 *   $sdk = new ChatBotAdminSDK('https://your-chatbot-api-url.com');
 *   $sdk->login('admin', 'admin123');
 *   $questions = $sdk->getQuestions();
 */

class ChatBotAdminSDK
{
    private string $baseUrl;
    private ?string $token = null;
    private int $timeout = 30;

    /**
     * Initialize the SDK
     * 
     * @param string $baseUrl  The chatbot API base URL (e.g., https://chatbot-hub-57.preview.emergentagent.com)
     * @param int    $timeout  Request timeout in seconds
     */
    public function __construct(string $baseUrl, int $timeout = 30)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
    }

    // ==================== AUTHENTICATION ====================

    /**
     * Login as admin and store JWT token
     * 
     * @param string $username  Admin username
     * @param string $password  Admin password
     * @return array  ['token' => '...', 'username' => '...']
     * @throws Exception  On auth failure
     */
    public function login(string $username, string $password): array
    {
        $response = $this->request('POST', '/api/admin/login', [
            'username' => $username,
            'password' => $password,
        ], false);

        $this->token = $response['token'];
        return $response;
    }

    /**
     * Set JWT token directly (if you already have one stored)
     * 
     * @param string $token  JWT token
     */
    public function setToken(string $token): void
    {
        $this->token = $token;
    }

    /**
     * Get the current JWT token
     * 
     * @return string|null
     */
    public function getToken(): ?string
    {
        return $this->token;
    }

    /**
     * Check if authenticated
     * 
     * @return bool
     */
    public function isAuthenticated(): bool
    {
        return $this->token !== null;
    }

    // ==================== DASHBOARD STATS ====================

    /**
     * Get admin dashboard statistics
     * 
     * @return array  ['total_questions', 'total_sessions', 'total_payments', 'paid_payments', 'total_revenue']
     */
    public function getStats(): array
    {
        return $this->request('GET', '/api/admin/stats');
    }

    // ==================== QUESTIONS CRUD ====================

    /**
     * Get all questions
     * 
     * @return array  List of questions with options
     */
    public function getQuestions(): array
    {
        return $this->request('GET', '/api/questions');
    }

    /**
     * Get a single question by ID
     * 
     * @param string $questionId  The question UUID
     * @return array  Question data with options
     */
    public function getQuestion(string $questionId): array
    {
        return $this->request('GET', "/api/questions/{$questionId}", null, false);
    }

    /**
     * Create a new question
     * 
     * @param string $text      Question text shown to users
     * @param array  $options   Array of option objects (see buildOption helper)
     * @param bool   $isRoot    Whether this is the first question shown
     * @param string|null $category  Optional category label
     * @return array  Created question data
     * 
     * Example:
     *   $sdk->createQuestion(
     *       'How can I help you?',
     *       [
     *           $sdk->buildOption('General Info', answerText: 'Here is the info...'),
     *           $sdk->buildOption('Premium Report', answerText: 'Premium content...', requiresPayment: true, paymentAmount: 499, paymentGateway: 'cashfree'),
     *           $sdk->buildOption('More Options', nextQuestionId: 'uuid-of-next-question'),
     *       ],
     *       true,
     *       'main'
     *   );
     */
    public function createQuestion(string $text, array $options, bool $isRoot = false, ?string $category = null): array
    {
        return $this->request('POST', '/api/questions', [
            'text' => $text,
            'options' => $options,
            'is_root' => $isRoot,
            'category' => $category,
        ]);
    }

    /**
     * Update an existing question
     * 
     * @param string      $questionId  Question UUID
     * @param string|null $text        New question text (null = no change)
     * @param array|null  $options     New options array (null = no change)
     * @param bool|null   $isRoot      New root status (null = no change)
     * @param string|null $category    New category (null = no change)
     * @return array  Updated question data
     */
    public function updateQuestion(
        string $questionId,
        ?string $text = null,
        ?array $options = null,
        ?bool $isRoot = null,
        ?string $category = null
    ): array {
        $data = [];
        if ($text !== null) $data['text'] = $text;
        if ($options !== null) $data['options'] = $options;
        if ($isRoot !== null) $data['is_root'] = $isRoot;
        if ($category !== null) $data['category'] = $category;

        return $this->request('PUT', "/api/questions/{$questionId}", $data);
    }

    /**
     * Delete a question
     * 
     * @param string $questionId  Question UUID
     * @return array  ['message' => 'Question deleted']
     */
    public function deleteQuestion(string $questionId): array
    {
        return $this->request('DELETE', "/api/questions/{$questionId}");
    }

    // ==================== OPTION BUILDER HELPER ====================

    /**
     * Build an option object for use in createQuestion / updateQuestion
     * 
     * @param string      $text             Option text shown to user
     * @param string|null $nextQuestionId   UUID of next question (for branching)
     * @param bool        $isAnswer         Whether this option shows a final answer
     * @param string|null $answerText       The answer text (required if isAnswer=true)
     * @param bool        $requiresPayment  Whether payment is needed before showing answer
     * @param float|null  $paymentAmount    Payment amount in INR (required if requiresPayment=true)
     * @param string|null $paymentGateway   'razorpay' or 'cashfree' (required if requiresPayment=true)
     * @return array  Option object ready for API
     */
    public function buildOption(
        string $text,
        ?string $nextQuestionId = null,
        bool $isAnswer = false,
        ?string $answerText = null,
        bool $requiresPayment = false,
        ?float $paymentAmount = null,
        ?string $paymentGateway = null
    ): array {
        return [
            'id' => $this->generateUUID(),
            'text' => $text,
            'next_question_id' => $nextQuestionId,
            'is_answer' => $isAnswer || ($answerText !== null),
            'answer_text' => $answerText,
            'requires_payment' => $requiresPayment,
            'payment_amount' => $paymentAmount,
            'payment_gateway' => $requiresPayment ? ($paymentGateway ?? 'razorpay') : null,
        ];
    }

    // ==================== CHAT SESSIONS ====================

    /**
     * Get all chat sessions (admin view)
     * 
     * @return array  List of sessions with user details
     */
    public function getSessions(): array
    {
        return $this->request('GET', '/api/chat/sessions');
    }

    /**
     * Get a single session by ID
     * 
     * @param string $sessionId  Session UUID
     * @return array  Session data
     */
    public function getSession(string $sessionId): array
    {
        return $this->request('GET', "/api/chat/session/{$sessionId}", null, false);
    }

    /**
     * Get chat messages for a session
     * 
     * @param string $sessionId  Session UUID
     * @return array  List of chat messages
     */
    public function getSessionMessages(string $sessionId): array
    {
        return $this->request('GET', "/api/chat/messages/{$sessionId}", null, false);
    }

    // ==================== CHAT SESSION CREATION (SDK-style) ====================

    /**
     * Create a new chat session (same as SDK init)
     * Use this to programmatically start a chat session from your PHP backend
     * 
     * @param string      $userName        User's name (REQUIRED)
     * @param string      $userMobile      User's mobile (REQUIRED)
     * @param string      $platformName    Platform name (REQUIRED)
     * @param string|null $userEmail       User's email
     * @param string|null $channelName     Channel name
     * @param string|null $assignedMaster  Assigned master
     * @param string|null $assignedMonitor Assigned monitor
     * @return array  Session data with 'id' for further chat operations
     */
    public function createChatSession(
        string $userName,
        string $userMobile,
        string $platformName,
        ?string $userEmail = null,
        ?string $channelName = null,
        ?string $assignedMaster = null,
        ?string $assignedMonitor = null
    ): array {
        return $this->request('POST', '/api/chat/session', [
            'user_name' => $userName,
            'user_mobile' => $userMobile,
            'platform_name' => $platformName,
            'user_email' => $userEmail,
            'channel_name' => $channelName,
            'assigned_master' => $assignedMaster,
            'assigned_monitor' => $assignedMonitor,
        ], false);
    }

    /**
     * Start a chat (get root question)
     * 
     * @param string $sessionId  Session UUID
     * @return array  Root question with options
     */
    public function startChat(string $sessionId): array
    {
        return $this->request('GET', "/api/chat/start/{$sessionId}", null, false);
    }

    /**
     * Select a chat option
     * 
     * @param string $sessionId   Session UUID
     * @param string $questionId  Current question UUID
     * @param string $optionId    Selected option UUID
     * @return array  Next question, answer, or payment required
     */
    public function selectOption(string $sessionId, string $questionId, string $optionId): array
    {
        return $this->request('POST', '/api/chat/select', [
            'session_id' => $sessionId,
            'question_id' => $questionId,
            'option_id' => $optionId,
        ], false);
    }

    // ==================== PAYMENT ====================

    /**
     * Create a Razorpay payment order
     * 
     * @param string $sessionId    Session UUID
     * @param string $optionId     Option UUID that requires payment
     * @param string $questionId   Question UUID
     * @param float  $amount       Amount in INR
     * @param string $customerName Customer name
     * @param string $customerEmail Customer email
     * @param string $customerPhone Customer phone
     * @return array  Razorpay order data with order_id, key_id
     */
    public function createRazorpayOrder(
        string $sessionId,
        string $optionId,
        string $questionId,
        float $amount,
        string $customerName = '',
        string $customerEmail = '',
        string $customerPhone = ''
    ): array {
        return $this->request('POST', '/api/payment/razorpay/create', [
            'session_id' => $sessionId,
            'option_id' => $optionId,
            'question_id' => $questionId,
            'gateway' => 'razorpay',
            'amount' => $amount,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'customer_phone' => $customerPhone,
        ], false);
    }

    /**
     * Create a Cashfree payment order
     * 
     * @param string $sessionId    Session UUID
     * @param string $optionId     Option UUID
     * @param string $questionId   Question UUID
     * @param float  $amount       Amount in INR
     * @param string $customerName Customer name
     * @param string $customerEmail Customer email
     * @param string $customerPhone Customer phone
     * @return array  Cashfree order data with payment_session_id
     */
    public function createCashfreeOrder(
        string $sessionId,
        string $optionId,
        string $questionId,
        float $amount,
        string $customerName = '',
        string $customerEmail = '',
        string $customerPhone = ''
    ): array {
        return $this->request('POST', '/api/payment/cashfree/create', [
            'session_id' => $sessionId,
            'option_id' => $optionId,
            'question_id' => $questionId,
            'gateway' => 'cashfree',
            'amount' => $amount,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'customer_phone' => $customerPhone,
        ], false);
    }

    /**
     * Verify a Razorpay payment
     * 
     * @param string $orderId     Razorpay order ID
     * @param string $paymentId   Razorpay payment ID
     * @param string $signature   Razorpay signature
     * @param string $sessionId   Session UUID
     * @param string $optionId    Option UUID
     * @param string $questionId  Question UUID
     * @return array  Verification result with answer if successful
     */
    public function verifyRazorpayPayment(
        string $orderId,
        string $paymentId,
        string $signature,
        string $sessionId,
        string $optionId,
        string $questionId
    ): array {
        return $this->request('POST', '/api/payment/razorpay/verify', [
            'order_id' => $orderId,
            'payment_id' => $paymentId,
            'signature' => $signature,
            'gateway' => 'razorpay',
            'session_id' => $sessionId,
            'option_id' => $optionId,
            'question_id' => $questionId,
        ], false);
    }

    /**
     * Verify a Cashfree payment
     * 
     * @param string $orderId     Cashfree order ID
     * @param string $sessionId   Session UUID
     * @param string $optionId    Option UUID
     * @param string $questionId  Question UUID
     * @return array  Verification result
     */
    public function verifyCashfreePayment(
        string $orderId,
        string $sessionId,
        string $optionId,
        string $questionId
    ): array {
        return $this->request('POST', '/api/payment/cashfree/verify', [
            'order_id' => $orderId,
            'gateway' => 'cashfree',
            'session_id' => $sessionId,
            'option_id' => $optionId,
            'question_id' => $questionId,
        ], false);
    }

    // ==================== INTERNAL HTTP CLIENT ====================

    /**
     * Make an HTTP request to the API
     * 
     * @param string     $method    HTTP method (GET, POST, PUT, DELETE)
     * @param string     $endpoint  API endpoint path
     * @param array|null $data      Request body data
     * @param bool       $auth      Whether to send JWT token
     * @return array  Decoded JSON response
     * @throws Exception  On HTTP or API error
     */
    private function request(string $method, string $endpoint, ?array $data = null, bool $auth = true): array
    {
        $url = $this->baseUrl . $endpoint;

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        if ($auth && $this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        switch (strtoupper($method)) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if ($data !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                if ($data !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL Error: {$error}");
        }

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            $errorMsg = $decoded['detail'] ?? $decoded['message'] ?? "HTTP {$httpCode} error";
            throw new Exception("API Error ({$httpCode}): {$errorMsg}");
        }

        return $decoded;
    }

    /**
     * Generate a UUID v4
     * @return string
     */
    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
