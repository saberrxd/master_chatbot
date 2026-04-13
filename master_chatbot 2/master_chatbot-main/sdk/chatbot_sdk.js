/**
 * ChatBot Platform - JavaScript SDK
 * 
 * Integrate the chatbot into any web application.
 * 
 * Usage:
 *   const chatbot = new ChatBotSDK('https://your-domain.com');
 *   await chatbot.adminLogin('admin', 'admin123');
 *   const questions = await chatbot.getQuestions();
 */

class ChatBotSDK {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '') + '/api';
    this.adminToken = null;
    this.agentToken = null;
  }

  // ===================== HELPERS =====================

  async _request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
  }

  // ===================== ADMIN =====================

  async adminLogin(username, password) {
    const data = await this._request('POST', '/admin/login', { username, password });
    this.adminToken = data.token;
    return data;
  }

  async getStats() {
    return this._request('GET', '/admin/stats', null, this.adminToken);
  }

  // ===================== QUESTIONS =====================

  async createQuestion(text, options, isRoot = false, platforms = []) {
    return this._request('POST', '/questions', { text, options, is_root: isRoot, platforms }, this.adminToken);
  }

  async getQuestions() {
    return this._request('GET', '/questions', null, this.adminToken);
  }

  async getQuestion(id) {
    return this._request('GET', `/questions/${id}`, null, this.adminToken);
  }

  async updateQuestion(id, data) {
    return this._request('PUT', `/questions/${id}`, data, this.adminToken);
  }

  async deleteQuestion(id) {
    return this._request('DELETE', `/questions/${id}`, null, this.adminToken);
  }

  /**
   * Build an option object for createQuestion
   * @param {string} text - Option text
   * @param {Object} opts - Optional: { nextQuestionId, answerText, requiresPayment, paymentAmount, paymentGateway, isAgentHandoff }
   */
  buildOption(text, opts = {}) {
    return {
      text,
      next_question_id: opts.nextQuestionId || null,
      is_answer: !!opts.answerText,
      answer_text: opts.answerText || null,
      requires_payment: !!opts.requiresPayment,
      payment_amount: opts.paymentAmount || null,
      payment_gateway: opts.paymentGateway || null,
      is_agent_handoff: !!opts.isAgentHandoff,
    };
  }

  // ===================== CHAT =====================

  async createSession(userName, userMobile, platformName, language = 'en', email = null) {
    return this._request('POST', '/chat/session', {
      user_name: userName,
      user_mobile: userMobile,
      platform_name: platformName,
      language,
      user_email: email,
    });
  }

  async startChat(sessionId) {
    return this._request('GET', `/chat/start/${sessionId}`);
  }

  async selectOption(sessionId, questionId, optionId) {
    return this._request('POST', '/chat/select', {
      session_id: sessionId,
      question_id: questionId,
      option_id: optionId,
    });
  }

  async requestAgent(sessionId) {
    return this._request('POST', '/chat/request-agent', { session_id: sessionId });
  }

  async userSendMessage(sessionId, message) {
    return this._request('POST', '/user/send', { session_id: sessionId, message });
  }

  async updateLanguage(sessionId, language) {
    return this._request('POST', '/chat/update-language', { session_id: sessionId, language });
  }

  async getLanguages() {
    return this._request('GET', '/languages');
  }

  // ===================== AGENTS =====================

  async createAgent(username, password, displayName, platforms, role = 'agent') {
    return this._request('POST', '/agents', {
      username, password, display_name: displayName, platforms, role,
    }, this.adminToken);
  }

  async getAgents() {
    return this._request('GET', '/agents', null, this.adminToken);
  }

  async updateAgent(agentId, data) {
    return this._request('PUT', `/agents/${agentId}`, data, this.adminToken);
  }

  async deleteAgent(agentId) {
    return this._request('DELETE', `/agents/${agentId}`, null, this.adminToken);
  }

  async agentLogin(username, password) {
    const data = await this._request('POST', '/agent/login', { username, password });
    this.agentToken = data.token;
    return data;
  }

  async getAgentSessions() {
    return this._request('GET', '/agent/sessions', null, this.agentToken);
  }

  async getAgentChat(sessionId) {
    return this._request('GET', `/agent/chat/${sessionId}`, null, this.agentToken);
  }

  async agentSendMessage(sessionId, message) {
    return this._request('POST', '/agent/send', { session_id: sessionId, message }, this.agentToken);
  }

  async agentJoinSession(sessionId) {
    return this._request('POST', '/agent/join-session', { session_id: sessionId }, this.agentToken);
  }

  async updateAgentLanguages(languages) {
    return this._request('PUT', '/agent/languages', { languages }, this.agentToken);
  }

  // ===================== MASTER AGENT =====================

  async getMasterAgents() {
    return this._request('GET', '/master/agents', null, this.agentToken);
  }

  async reassignSession(sessionId, agentId) {
    return this._request('POST', '/master/reassign-session', {
      session_id: sessionId, agent_id: agentId,
    }, this.agentToken);
  }

  async unassignSession(sessionId) {
    return this._request('POST', '/master/unassign-session', { session_id: sessionId }, this.agentToken);
  }

  // ===================== PAYMENTS =====================

  async createRazorpayOrder(sessionId, questionId, optionId, amount) {
    return this._request('POST', '/payment/razorpay/create', {
      session_id: sessionId, question_id: questionId, option_id: optionId, amount,
    });
  }

  async verifyRazorpayPayment(orderId, paymentId, signature) {
    return this._request('POST', '/payment/razorpay/verify', {
      razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature,
    });
  }

  // ===================== WEBSOCKET =====================

  connectWebSocket(sessionId, onMessage, onOpen = null, onClose = null) {
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl.replace('/api', '')}/api/ws/chat/${sessionId}`);

    ws.onopen = () => { if (onOpen) onOpen(); };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {}
    };
    ws.onclose = () => { if (onClose) onClose(); };
    ws.onerror = () => {};

    return ws;
  }

  // ===================== PG SETTINGS =====================

  async getPGSettings() {
    return this._request('GET', '/admin/pg-settings', null, this.adminToken);
  }

  async updatePGSettings(settings) {
    return this._request('PUT', '/admin/pg-settings', settings, this.adminToken);
  }
}

// Export for Node.js / ES modules
if (typeof module !== 'undefined') module.exports = ChatBotSDK;
if (typeof window !== 'undefined') window.ChatBotSDK = ChatBotSDK;
