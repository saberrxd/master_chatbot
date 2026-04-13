/// ChatBot Platform - Flutter Integration Example
///
/// This example shows how to integrate the ChatBot SDK into a Flutter app.
///
/// Setup:
/// 1. Add to pubspec.yaml:
///    dependencies:
///      http: ^1.2.0
///      web_socket_channel: ^2.4.0
///
/// 2. Copy chatbot_sdk.dart to your lib/ directory
///
/// 3. Import and use as shown below

import 'dart:convert';
import 'chatbot_sdk.dart';

// ==================== CONFIGURATION ====================

const String baseUrl = 'https://your-domain.com';

// ==================== ADMIN EXAMPLE ====================

Future<void> adminExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Login
  await chatbot.adminLogin('admin', 'admin123');
  print('Admin logged in');

  // Get stats
  final stats = await chatbot.getStats();
  print('Total sessions: ${stats['total_sessions']}');

  // Create a question with options
  final question = await chatbot.createQuestion(
    text: 'How can we help you today?',
    options: [
      ChatBotSDK.buildOption(
        'Billing Issues',
        nextQuestionId: 'some-question-id',
      ),
      ChatBotSDK.buildOption(
        'Get a refund',
        answerText: 'To request a refund, please email support@example.com',
      ),
      ChatBotSDK.buildOption(
        'Talk to support',
        isAgentHandoff: true,
      ),
      ChatBotSDK.buildOption(
        'Premium Report (₹499)',
        answerText: 'Here is your premium report...',
        requiresPayment: true,
        paymentAmount: 499,
        paymentGateway: 'razorpay',
      ),
    ],
    isRoot: true,
    platforms: ['Website', 'Android App'],
  );
  print('Created question: ${question['id']}');

  // List all questions
  final questions = await chatbot.getQuestions();
  print('Total questions: ${questions.length}');
}

// ==================== USER CHAT EXAMPLE ====================

Future<void> userChatExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Create session
  final session = await chatbot.createSession(
    userName: 'John Doe',
    userMobile: '9876543210',
    platformName: 'Android App',
    language: 'en',
    email: 'john@example.com',
  );
  final sessionId = session['id'];
  print('Session created: $sessionId');

  // Start chat (get first question)
  final chat = await chatbot.startChat(sessionId);
  print('Bot says: ${chat['question']['text']}');
  print('Options: ${chat['question']['options']}');

  // Select an option
  final optionId = chat['question']['options'][0]['id'];
  final next = await chatbot.selectOption(
    sessionId: sessionId,
    questionId: chat['question']['id'],
    optionId: optionId,
  );
  print('Next: $next');

  // Request live agent
  final agentRequest = await chatbot.requestAgent(sessionId);
  print('Agent requested: $agentRequest');

  // Send a message
  final msg = await chatbot.userSendMessage(sessionId, 'Hello agent!');
  print('Message sent: ${msg['id']}');
}

// ==================== AGENT EXAMPLE ====================

Future<void> agentExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Agent login
  await chatbot.agentLogin('agent1', 'pass123');
  print('Agent logged in');

  // Get sessions
  final sessions = await chatbot.getAgentSessions();
  print('Pending sessions: ${sessions.length}');

  if (sessions.isNotEmpty) {
    final sessionId = sessions[0]['id'];

    // Claim session
    await chatbot.agentJoinSession(sessionId);
    print('Joined session: $sessionId');

    // Get chat history
    final history = await chatbot.getAgentChatHistory(sessionId);
    print('Messages: ${history['messages']?.length ?? 0}');

    // Send message
    await chatbot.agentSendMessage(sessionId, 'Hello! How can I help?');
    print('Message sent');

    // Update languages
    await chatbot.updateAgentLanguages([
      {'code': 'en', 'enabled': true},
      {'code': 'hi', 'enabled': true},
      {'code': 'es', 'enabled': false},
    ]);
    print('Languages updated');
  }
}

// ==================== WEBSOCKET EXAMPLE ====================

Future<void> webSocketExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Create and start a session first
  final session = await chatbot.createSession(
    userName: 'Test User',
    userMobile: '1234567890',
    platformName: 'Website',
  );

  // Connect WebSocket
  final channel = chatbot.connectWebSocket(session['id']);

  // Listen for messages
  channel.stream.listen(
    (message) {
      final data = jsonDecode(message);
      print('WebSocket message: ${data['type']}');

      if (data['type'] == 'new_message') {
        final msg = data['message'];
        print('  From: ${msg['sender']}');
        print('  Text: ${msg['message']}');
        if (msg['file_url'] != null) {
          print('  File: ${msg['file_name']}');
        }
      }
    },
    onError: (error) => print('WebSocket error: $error'),
    onDone: () => print('WebSocket closed'),
  );

  // Keep connection alive for demo
  await Future.delayed(Duration(seconds: 30));
  channel.sink.close();
}

// ==================== MASTER AGENT EXAMPLE ====================

Future<void> masterAgentExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Login as master agent
  await chatbot.agentLogin('master_agent', 'master123');
  print('Master agent logged in');

  // Get all agents
  final agents = await chatbot.getMasterAgents();
  print('Agents: ${agents.length}');

  // Reassign a session
  // await chatbot.reassignSession('session-id', 'agent-id');

  // Unassign from session
  // await chatbot.unassignSession('session-id');
}

// ==================== FILE UPLOAD EXAMPLE ====================

Future<void> fileUploadExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Upload a file (requires dart:io File)
  // final file = File('/path/to/document.pdf');
  // final result = await chatbot.uploadFile(file);
  // print('Uploaded: ${result['file_url']}');

  // Send message with file attachment
  // await chatbot.userSendMessage(
  //   'session-id',
  //   'Here is the document',
  //   fileUrl: result['file_url'],
  //   fileName: result['file_name'],
  //   fileType: result['file_type'],
  // );
}

// ==================== PAYMENT EXAMPLE ====================

Future<void> paymentExample() async {
  final chatbot = ChatBotSDK(baseUrl);

  // Create Razorpay order
  // final order = await chatbot.createRazorpayOrder(
  //   sessionId: 'session-id',
  //   amount: 499,
  //   currency: 'INR',
  // );
  // print('Order: ${order['order_id']}');

  // After payment, verify
  // await chatbot.verifyRazorpayPayment(
  //   orderId: order['order_id'],
  //   paymentId: 'payment-id-from-razorpay',
  //   signature: 'signature-from-razorpay',
  //   sessionId: 'session-id',
  // );
}

// ==================== FLUTTER WIDGET EXAMPLE ====================

/// Example Flutter Widget for a simple chat screen
///
/// ```dart
/// import 'package:flutter/material.dart';
/// import 'chatbot_sdk.dart';
///
/// class ChatScreen extends StatefulWidget {
///   final String sessionId;
///   const ChatScreen({Key? key, required this.sessionId}) : super(key: key);
///
///   @override
///   State<ChatScreen> createState() => _ChatScreenState();
/// }
///
/// class _ChatScreenState extends State<ChatScreen> {
///   final chatbot = ChatBotSDK('https://your-domain.com');
///   final _controller = TextEditingController();
///   List<Map<String, dynamic>> messages = [];
///   WebSocketChannel? _channel;
///
///   @override
///   void initState() {
///     super.initState();
///     _connectWebSocket();
///     _loadHistory();
///   }
///
///   void _connectWebSocket() {
///     _channel = chatbot.connectWebSocket(widget.sessionId);
///     _channel!.stream.listen((msg) {
///       final data = jsonDecode(msg);
///       if (data['type'] == 'new_message') {
///         setState(() {
///           messages.add(Map<String, dynamic>.from(data['message']));
///         });
///       }
///     });
///   }
///
///   Future<void> _loadHistory() async {
///     final history = await chatbot.getAgentChatHistory(widget.sessionId);
///     setState(() {
///       messages = List<Map<String, dynamic>>.from(history['messages'] ?? []);
///     });
///   }
///
///   Future<void> _sendMessage() async {
///     final text = _controller.text.trim();
///     if (text.isEmpty) return;
///     _controller.clear();
///     await chatbot.userSendMessage(widget.sessionId, text);
///   }
///
///   @override
///   Widget build(BuildContext context) {
///     return Scaffold(
///       appBar: AppBar(title: Text('Chat')),
///       body: Column(
///         children: [
///           Expanded(
///             child: ListView.builder(
///               itemCount: messages.length,
///               itemBuilder: (ctx, i) {
///                 final msg = messages[i];
///                 final isUser = msg['sender'] == 'user';
///                 return Align(
///                   alignment: isUser
///                       ? Alignment.centerRight
///                       : Alignment.centerLeft,
///                   child: Container(
///                     margin: EdgeInsets.all(8),
///                     padding: EdgeInsets.all(12),
///                     decoration: BoxDecoration(
///                       color: isUser ? Colors.amber : Colors.grey[200],
///                       borderRadius: BorderRadius.circular(12),
///                     ),
///                     child: Text(msg['message'] ?? ''),
///                   ),
///                 );
///               },
///             ),
///           ),
///           Padding(
///             padding: EdgeInsets.all(8),
///             child: Row(
///               children: [
///                 Expanded(
///                   child: TextField(
///                     controller: _controller,
///                     decoration: InputDecoration(
///                       hintText: 'Type a message...',
///                       border: OutlineInputBorder(
///                         borderRadius: BorderRadius.circular(24),
///                       ),
///                     ),
///                   ),
///                 ),
///                 SizedBox(width: 8),
///                 FloatingActionButton(
///                   onPressed: _sendMessage,
///                   child: Icon(Icons.send),
///                   mini: true,
///                 ),
///               ],
///             ),
///           ),
///         ],
///       ),
///     );
///   }
///
///   @override
///   void dispose() {
///     _channel?.sink.close();
///     super.dispose();
///   }
/// }
/// ```

void main() async {
  try {
    await adminExample();
  } on ChatBotException catch (e) {
    print('Error: $e');
  }
}
