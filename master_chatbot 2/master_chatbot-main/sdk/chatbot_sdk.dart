/// ChatBot Platform - Flutter/Dart SDK
///
/// Integrate the chatbot into any Flutter or Dart application.
///
/// Dependencies (add to pubspec.yaml):
///   http: ^1.2.0
///   web_socket_channel: ^2.4.0
///
/// Usage:
///   final chatbot = ChatBotSDK('https://your-domain.com');
///   await chatbot.adminLogin('admin', 'admin123');
///   final questions = await chatbot.getQuestions();

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

class ChatBotSDK {
  final String baseUrl;
  String? _adminToken;
  String? _agentToken;
  late final String _apiUrl;

  ChatBotSDK(String baseUrl)
      : baseUrl = baseUrl.replaceAll(RegExp(r'/$'), '') {
    _apiUrl = '${this.baseUrl}/api';
  }

  // ===================== HELPERS =====================

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final uri = Uri.parse('$_apiUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'PUT':
        response = await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }

    final data = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ChatBotException(
        data['detail']?.toString() ?? 'HTTP ${response.statusCode}',
        response.statusCode,
      );
    }
    return data;
  }

  Future<Map<String, dynamic>> _uploadFile(
    String path,
    File file, {
    String? token,
  }) async {
    final uri = Uri.parse('$_apiUrl$path');
    final request = http.MultipartRequest('POST', uri);
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamResponse = await request.send();
    final response = await http.Response.fromStream(streamResponse);
    final data = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ChatBotException(
        data['detail']?.toString() ?? 'Upload failed',
        response.statusCode,
      );
    }
    return Map<String, dynamic>.from(data);
  }

  // ===================== ADMIN =====================

  /// Login as admin and store the JWT token
  Future<Map<String, dynamic>> adminLogin(String username, String password) async {
    final data = await _request('POST', '/admin/login', body: {
      'username': username,
      'password': password,
    });
    _adminToken = data['token'];
    return Map<String, dynamic>.from(data);
  }

  /// Get admin dashboard statistics
  Future<Map<String, dynamic>> getStats() async {
    return Map<String, dynamic>.from(
      await _request('GET', '/admin/stats', token: _adminToken),
    );
  }

  /// Get payment gateway settings
  Future<Map<String, dynamic>> getPGSettings() async {
    return Map<String, dynamic>.from(
      await _request('GET', '/admin/pg-settings', token: _adminToken),
    );
  }

  /// Update payment gateway settings
  Future<Map<String, dynamic>> updatePGSettings(Map<String, dynamic> settings) async {
    return Map<String, dynamic>.from(
      await _request('PUT', '/admin/pg-settings', body: settings, token: _adminToken),
    );
  }

  // ===================== QUESTIONS =====================

  /// Create a new question with options
  Future<Map<String, dynamic>> createQuestion({
    required String text,
    required List<Map<String, dynamic>> options,
    bool isRoot = false,
    List<String> platforms = const [],
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/questions', body: {
        'text': text,
        'options': options,
        'is_root': isRoot,
        'platforms': platforms,
      }, token: _adminToken),
    );
  }

  /// Get all questions
  Future<List<dynamic>> getQuestions() async {
    final data = await _request('GET', '/questions', token: _adminToken);
    return List<dynamic>.from(data);
  }

  /// Get a specific question by ID
  Future<Map<String, dynamic>> getQuestion(String id) async {
    return Map<String, dynamic>.from(
      await _request('GET', '/questions/$id', token: _adminToken),
    );
  }

  /// Update a question
  Future<Map<String, dynamic>> updateQuestion(String id, Map<String, dynamic> data) async {
    return Map<String, dynamic>.from(
      await _request('PUT', '/questions/$id', body: data, token: _adminToken),
    );
  }

  /// Delete a question
  Future<void> deleteQuestion(String id) async {
    await _request('DELETE', '/questions/$id', token: _adminToken);
  }

  /// Build an option map for createQuestion
  static Map<String, dynamic> buildOption(
    String text, {
    String? nextQuestionId,
    String? answerText,
    bool requiresPayment = false,
    double? paymentAmount,
    String? paymentGateway,
    bool isAgentHandoff = false,
  }) {
    return {
      'text': text,
      'next_question_id': nextQuestionId,
      'is_answer': answerText != null,
      'answer_text': answerText,
      'requires_payment': requiresPayment,
      'payment_amount': paymentAmount,
      'payment_gateway': paymentGateway,
      'is_agent_handoff': isAgentHandoff,
    };
  }

  /// Bulk upload questions from a CSV/Excel file
  Future<Map<String, dynamic>> bulkUploadQuestions(File file) async {
    return _uploadFile('/questions/bulk-upload', file, token: _adminToken);
  }

  // ===================== CHAT SESSION =====================

  /// Create a new chat session
  Future<Map<String, dynamic>> createSession({
    required String userName,
    required String userMobile,
    required String platformName,
    String language = 'en',
    String? email,
    String? channelName,
    String? assignedMaster,
    String? assignedMonitor,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/chat/session', body: {
        'user_name': userName,
        'user_mobile': userMobile,
        'platform_name': platformName,
        'language': language,
        if (email != null) 'email': email,
        if (channelName != null) 'channel_name': channelName,
        if (assignedMaster != null) 'assigned_master': assignedMaster,
        if (assignedMonitor != null) 'assigned_monitor': assignedMonitor,
      }),
    );
  }

  /// Start chat for a session (get first question)
  Future<Map<String, dynamic>> startChat(String sessionId) async {
    return Map<String, dynamic>.from(
      await _request('GET', '/chat/start/$sessionId'),
    );
  }

  /// Select an option in the chat flow
  Future<Map<String, dynamic>> selectOption({
    required String sessionId,
    required String questionId,
    required String optionId,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/chat/select', body: {
        'session_id': sessionId,
        'question_id': questionId,
        'option_id': optionId,
      }),
    );
  }

  /// Request a live agent
  Future<Map<String, dynamic>> requestAgent(String sessionId) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/chat/request-agent', body: {
        'session_id': sessionId,
      }),
    );
  }

  /// Send a message as a user (during live agent chat)
  Future<Map<String, dynamic>> userSendMessage(
    String sessionId,
    String message, {
    String? fileUrl,
    String? fileName,
    String? fileType,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/user/send', body: {
        'session_id': sessionId,
        'message': message,
        if (fileUrl != null) 'file_url': fileUrl,
        if (fileName != null) 'file_name': fileName,
        if (fileType != null) 'file_type': fileType,
      }),
    );
  }

  /// Update session language
  Future<Map<String, dynamic>> updateLanguage(String sessionId, String language) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/chat/update-language', body: {
        'session_id': sessionId,
        'language': language,
      }),
    );
  }

  /// Get supported languages
  Future<List<dynamic>> getLanguages() async {
    final data = await _request('GET', '/languages');
    return List<dynamic>.from(data['languages'] ?? data);
  }

  // ===================== FILE UPLOAD =====================

  /// Upload a file and get the URL
  Future<Map<String, dynamic>> uploadFile(File file) async {
    return _uploadFile('/upload', file);
  }

  // ===================== AGENT =====================

  /// Login as agent and store the JWT token
  Future<Map<String, dynamic>> agentLogin(String username, String password) async {
    final data = await _request('POST', '/agent/login', body: {
      'username': username,
      'password': password,
    });
    _agentToken = data['token'];
    return Map<String, dynamic>.from(data);
  }

  /// Get agent's assigned sessions
  Future<List<dynamic>> getAgentSessions() async {
    final data = await _request('GET', '/agent/sessions', token: _agentToken);
    return List<dynamic>.from(data);
  }

  /// Get chat history for a session
  Future<Map<String, dynamic>> getAgentChatHistory(String sessionId) async {
    return Map<String, dynamic>.from(
      await _request('GET', '/agent/chat/$sessionId', token: _agentToken),
    );
  }

  /// Join/claim a session
  Future<Map<String, dynamic>> agentJoinSession(String sessionId) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/agent/join-session', body: {
        'session_id': sessionId,
      }, token: _agentToken),
    );
  }

  /// Send a message as an agent
  Future<Map<String, dynamic>> agentSendMessage(
    String sessionId,
    String message, {
    String? fileUrl,
    String? fileName,
    String? fileType,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/agent/send', body: {
        'session_id': sessionId,
        'message': message,
        if (fileUrl != null) 'file_url': fileUrl,
        if (fileName != null) 'file_name': fileName,
        if (fileType != null) 'file_type': fileType,
      }, token: _agentToken),
    );
  }

  /// Update agent's known languages
  Future<Map<String, dynamic>> updateAgentLanguages(List<Map<String, dynamic>> languages) async {
    return Map<String, dynamic>.from(
      await _request('PUT', '/agent/languages', body: {
        'languages': languages,
      }, token: _agentToken),
    );
  }

  // ===================== MASTER AGENT =====================

  /// Get list of all agents (master only)
  Future<List<dynamic>> getMasterAgents() async {
    final data = await _request('GET', '/master/agents', token: _agentToken);
    return List<dynamic>.from(data);
  }

  /// Reassign a session to another agent (master only)
  Future<Map<String, dynamic>> reassignSession(String sessionId, String agentId) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/master/reassign-session', body: {
        'session_id': sessionId,
        'agent_id': agentId,
      }, token: _agentToken),
    );
  }

  /// Unassign an agent from a session (master only)
  Future<Map<String, dynamic>> unassignSession(String sessionId) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/master/unassign-session', body: {
        'session_id': sessionId,
      }, token: _agentToken),
    );
  }

  // ===================== PAYMENTS =====================

  /// Create a Razorpay order
  Future<Map<String, dynamic>> createRazorpayOrder({
    required String sessionId,
    required double amount,
    String currency = 'INR',
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/payment/razorpay/create', body: {
        'session_id': sessionId,
        'amount': amount,
        'currency': currency,
      }),
    );
  }

  /// Verify a Razorpay payment
  Future<Map<String, dynamic>> verifyRazorpayPayment({
    required String orderId,
    required String paymentId,
    required String signature,
    required String sessionId,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/payment/razorpay/verify', body: {
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': signature,
        'session_id': sessionId,
      }),
    );
  }

  /// Create a Cashfree order
  Future<Map<String, dynamic>> createCashfreeOrder({
    required String sessionId,
    required double amount,
    String currency = 'INR',
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/payment/cashfree/create', body: {
        'session_id': sessionId,
        'amount': amount,
        'currency': currency,
      }),
    );
  }

  /// Verify a Cashfree payment
  Future<Map<String, dynamic>> verifyCashfreePayment({
    required String orderId,
    required String sessionId,
  }) async {
    return Map<String, dynamic>.from(
      await _request('POST', '/payment/cashfree/verify', body: {
        'order_id': orderId,
        'session_id': sessionId,
      }),
    );
  }

  // ===================== WEBSOCKET =====================

  /// Connect to WebSocket for real-time chat
  ///
  /// Returns a [WebSocketChannel] that you can listen to for messages.
  ///
  /// Example:
  /// ```dart
  /// final channel = chatbot.connectWebSocket(sessionId);
  /// channel.stream.listen((message) {
  ///   final data = jsonDecode(message);
  ///   print('Received: $data');
  /// });
  /// ```
  WebSocketChannel connectWebSocket(String sessionId) {
    final wsUrl = baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://');
    return WebSocketChannel.connect(
      Uri.parse('$wsUrl/api/ws/chat/$sessionId'),
    );
  }
}

// ===================== EXCEPTIONS =====================

class ChatBotException implements Exception {
  final String message;
  final int statusCode;

  ChatBotException(this.message, this.statusCode);

  @override
  String toString() => 'ChatBotException($statusCode): $message';
}
