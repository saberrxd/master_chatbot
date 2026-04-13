<?php
/**
 * ChatBot Platform - PHP SDK
 * 
 * Integrate the chatbot admin functionality into your PHP application.
 * 
 * Usage:
 *   require_once 'chatbot_sdk.php';
 *   $sdk = new ChatBotSDK('https://your-domain.com');
 *   $sdk->adminLogin('admin', 'admin123');
 *   $questions = $sdk->getQuestions();
 */

class ChatBotSDK {
    private $baseUrl;
    private $adminToken;
    private $agentToken;

    public function __construct($baseUrl) {
        $this->baseUrl = rtrim($baseUrl, '/') . '/api';
        $this->adminToken = null;
        $this->agentToken = null;
    }

    // ===================== HELPERS =====================

    private function request($method, $path, $body = null, $token = null) {
        $url = $this->baseUrl . $path;
        $headers = ['Content-Type: application/json'];
        if ($token) $headers[] = 'Authorization: Bearer ' . $token;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);
        if ($httpCode >= 400) {
            throw new Exception($data['detail'] ?? "HTTP $httpCode error");
        }
        return $data;
    }

    // ===================== ADMIN =====================

    public function adminLogin($username, $password) {
        $data = $this->request('POST', '/admin/login', [
            'username' => $username,
            'password' => $password
        ]);
        $this->adminToken = $data['token'];
        return $data;
    }

    public function getToken() {
        return $this->adminToken;
    }

    public function getStats() {
        return $this->request('GET', '/admin/stats', null, $this->adminToken);
    }

    // ===================== QUESTIONS =====================

    public function createQuestion($text, $options, $isRoot = false, $platforms = []) {
        return $this->request('POST', '/questions', [
            'text' => $text,
            'options' => $options,
            'is_root' => $isRoot,
            'platforms' => $platforms
        ], $this->adminToken);
    }

    public function getQuestions() {
        return $this->request('GET', '/questions', null, $this->adminToken);
    }

    public function getQuestion($id) {
        return $this->request('GET', "/questions/$id", null, $this->adminToken);
    }

    public function updateQuestion($id, $data) {
        return $this->request('PUT', "/questions/$id", $data, $this->adminToken);
    }

    public function deleteQuestion($id) {
        return $this->request('DELETE', "/questions/$id", null, $this->adminToken);
    }

    /**
     * Build an option array for createQuestion
     */
    public function buildOption($text, $opts = []) {
        return [
            'text' => $text,
            'next_question_id' => $opts['nextQuestionId'] ?? null,
            'is_answer' => isset($opts['answerText']),
            'answer_text' => $opts['answerText'] ?? null,
            'requires_payment' => !empty($opts['requiresPayment']),
            'payment_amount' => $opts['paymentAmount'] ?? null,
            'payment_gateway' => $opts['paymentGateway'] ?? null,
            'is_agent_handoff' => !empty($opts['isAgentHandoff']),
        ];
    }

    // ===================== CHAT =====================

    public function createSession($userName, $userMobile, $platformName, $language = 'en', $email = null) {
        return $this->request('POST', '/chat/session', [
            'user_name' => $userName,
            'user_mobile' => $userMobile,
            'platform_name' => $platformName,
            'language' => $language,
            'user_email' => $email,
        ]);
    }

    public function startChat($sessionId) {
        return $this->request('GET', "/chat/start/$sessionId");
    }

    public function selectOption($sessionId, $questionId, $optionId) {
        return $this->request('POST', '/chat/select', [
            'session_id' => $sessionId,
            'question_id' => $questionId,
            'option_id' => $optionId,
        ]);
    }

    public function requestAgent($sessionId) {
        return $this->request('POST', '/chat/request-agent', ['session_id' => $sessionId]);
    }

    public function getLanguages() {
        return $this->request('GET', '/languages');
    }

    public function updateLanguage($sessionId, $language) {
        return $this->request('POST', '/chat/update-language', [
            'session_id' => $sessionId,
            'language' => $language,
        ]);
    }

    // ===================== AGENTS =====================

    public function createAgent($username, $password, $displayName, $platforms, $role = 'agent') {
        return $this->request('POST', '/agents', [
            'username' => $username,
            'password' => $password,
            'display_name' => $displayName,
            'platforms' => $platforms,
            'role' => $role,
        ], $this->adminToken);
    }

    public function getAgents() {
        return $this->request('GET', '/agents', null, $this->adminToken);
    }

    public function updateAgent($agentId, $data) {
        return $this->request('PUT', "/agents/$agentId", $data, $this->adminToken);
    }

    public function deleteAgent($agentId) {
        return $this->request('DELETE', "/agents/$agentId", null, $this->adminToken);
    }

    public function agentLogin($username, $password) {
        $data = $this->request('POST', '/agent/login', [
            'username' => $username,
            'password' => $password,
        ]);
        $this->agentToken = $data['token'];
        return $data;
    }

    public function getAgentSessions() {
        return $this->request('GET', '/agent/sessions', null, $this->agentToken);
    }

    public function getAgentChat($sessionId) {
        return $this->request('GET', "/agent/chat/$sessionId", null, $this->agentToken);
    }

    public function agentSendMessage($sessionId, $message) {
        return $this->request('POST', '/agent/send', [
            'session_id' => $sessionId,
            'message' => $message,
        ], $this->agentToken);
    }

    public function agentJoinSession($sessionId) {
        return $this->request('POST', '/agent/join-session', [
            'session_id' => $sessionId,
        ], $this->agentToken);
    }

    public function updateAgentLanguages($languages) {
        return $this->request('PUT', '/agent/languages', [
            'languages' => $languages,
        ], $this->agentToken);
    }

    // ===================== MASTER AGENT =====================

    public function getMasterAgents() {
        return $this->request('GET', '/master/agents', null, $this->agentToken);
    }

    public function reassignSession($sessionId, $agentId) {
        return $this->request('POST', '/master/reassign-session', [
            'session_id' => $sessionId,
            'agent_id' => $agentId,
        ], $this->agentToken);
    }

    public function unassignSession($sessionId) {
        return $this->request('POST', '/master/unassign-session', [
            'session_id' => $sessionId,
        ], $this->agentToken);
    }

    // ===================== PAYMENTS =====================

    public function createRazorpayOrder($sessionId, $questionId, $optionId, $amount) {
        return $this->request('POST', '/payment/razorpay/create', [
            'session_id' => $sessionId,
            'question_id' => $questionId,
            'option_id' => $optionId,
            'amount' => $amount,
        ]);
    }

    public function verifyRazorpayPayment($orderId, $paymentId, $signature) {
        return $this->request('POST', '/payment/razorpay/verify', [
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $signature,
        ]);
    }

    // ===================== PG SETTINGS =====================

    public function getPGSettings() {
        return $this->request('GET', '/admin/pg-settings', null, $this->adminToken);
    }

    public function updatePGSettings($settings) {
        return $this->request('PUT', '/admin/pg-settings', $settings, $this->adminToken);
    }
}
