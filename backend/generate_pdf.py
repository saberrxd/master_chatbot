#!/usr/bin/env python3
"""Generate ChatBot Hub API Kit PDF"""

from fpdf import FPDF
import os

class APIPdf(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(245, 166, 35)
        self.cell(0, 8, 'ChatBot Hub - API Integration Kit', align='L')
        self.set_draw_color(245, 166, 35)
        self.line(10, 16, 200, 16)
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(17, 24, 39)
        self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(245, 166, 35)
        self.set_line_width(0.8)
        self.line(10, self.get_y(), 80, self.get_y())
        self.set_line_width(0.2)
        self.ln(6)

    def sub_title(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(55, 65, 81)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def sub_sub_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(75, 85, 99)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(75, 85, 99)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bullet(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(75, 85, 99)
        self.cell(0, 5.5, '  - ' + text, new_x="LMARGIN", new_y="NEXT")

    def code_block(self, code):
        self.set_fill_color(31, 41, 55)
        self.set_text_color(167, 243, 208)
        self.set_font('Courier', '', 9)
        lines = code.strip().split('\n')
        y_start = self.get_y()
        block_h = len(lines) * 5 + 8
        if y_start + block_h > 270:
            self.add_page()
        self.rect(10, self.get_y(), 190, block_h, style='F')
        self.set_xy(14, self.get_y() + 4)
        for line in lines:
            self.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
            self.set_x(14)
        self.set_y(self.get_y() + 4)
        self.set_text_color(75, 85, 99)
        self.ln(3)

    def endpoint_row(self, method, path, desc):
        self.set_font('Courier', 'B', 9)
        if 'GET' in method:
            self.set_text_color(16, 185, 129)
        elif 'POST' in method:
            self.set_text_color(59, 130, 246)
        elif 'PUT' in method:
            self.set_text_color(245, 166, 35)
        elif 'DELETE' in method:
            self.set_text_color(239, 68, 68)
        else:
            self.set_text_color(139, 92, 246)
        self.cell(22, 5.5, method)
        self.set_text_color(17, 24, 39)
        self.set_font('Courier', '', 9)
        self.cell(80, 5.5, path)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(107, 114, 128)
        self.cell(0, 5.5, desc, new_x="LMARGIN", new_y="NEXT")


def generate_pdf():
    pdf = APIPdf()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ===== COVER PAGE =====
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font('Helvetica', 'B', 32)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(0, 15, 'ChatBot Hub', align='C', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('Helvetica', '', 18)
    pdf.set_text_color(245, 166, 35)
    pdf.cell(0, 12, 'API Integration Kit', align='C', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_font('Helvetica', '', 12)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(0, 8, 'Complete documentation for integrating the ChatBot platform', align='C', new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, 'into your applications using REST API, JavaScript, PHP, or Flutter SDKs.', align='C', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)

    # Stats
    stats = [('20+', 'Languages'), ('3', 'SDKs'), ('30+', 'API Endpoints'), ('2', 'Payment Gateways')]
    pdf.set_font('Helvetica', 'B', 14)
    x = 25
    for val, label in stats:
        pdf.set_xy(x, pdf.get_y())
        pdf.set_text_color(245, 166, 35)
        pdf.cell(40, 8, val, align='C')
        x += 42
    pdf.ln(10)
    x = 25
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(150, 150, 150)
    for val, label in stats:
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(40, 6, label, align='C')
        x += 42
    pdf.ln(20)

    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 8, 'Supports: JWT Authentication | Laravel Sanctum | WebSocket Real-time Chat', align='C', new_x="LMARGIN", new_y="NEXT")

    # ===== TABLE OF CONTENTS =====
    pdf.add_page()
    pdf.section_title('Table of Contents')
    toc = [
        '1. Platform Overview',
        '2. Authentication (JWT + Sanctum)',
        '3. User Panel',
        '4. Agent Panel',
        '5. Admin Panel',
        '6. API Endpoints Reference',
        '7. JavaScript SDK',
        '8. PHP SDK',
        '9. Flutter/Dart SDK',
        '10. File Upload',
        '11. Bulk CSV/Excel Upload',
        '12. WebSocket Real-time Chat',
        '13. Payment Integration',
    ]
    for item in toc:
        pdf.bullet(item)
    pdf.ln(5)

    # ===== 1. PLATFORM OVERVIEW =====
    pdf.add_page()
    pdf.section_title('1. Platform Overview')
    pdf.body_text(
        'ChatBot Hub is a comprehensive chatbot platform that combines decision-tree Q&A, '
        'live agent chat, payment integration, and multilingual support into one powerful solution. '
        'It provides three distinct panels for different user roles: User, Agent, and Admin.'
    )
    pdf.sub_sub_title('Key Features')
    features = [
        'Decision-tree Q&A flow with branching logic',
        'Live agent chat with WebSocket real-time messaging',
        'Multilingual support (20+ languages)',
        'Payment integration (Razorpay & Cashfree)',
        'Bulk CSV/Excel question upload with platform validation',
        'File & image sharing in chat',
        'Master Agent role for session management',
        'Dual authentication (JWT + Laravel Sanctum)',
        'JavaScript, PHP, and Flutter SDKs',
    ]
    for f in features:
        pdf.bullet(f)
    pdf.ln(3)

    # ===== 2. AUTHENTICATION =====
    pdf.add_page()
    pdf.section_title('2. Authentication')
    pdf.body_text(
        'The platform supports two authentication methods. The system auto-detects '
        'the token format from the Authorization header.'
    )
    pdf.sub_sub_title('JWT Authentication')
    pdf.body_text('Tokens issued by the platform via /api/admin/login or /api/agent/login.')
    pdf.code_block(
        'POST /api/admin/login\n'
        'Content-Type: application/json\n\n'
        '{"username": "admin", "password": "admin123"}\n\n'
        'Response: {"token": "eyJhbGciOiJIUzI1NiI..."}\n\n'
        'Usage:\n'
        'Authorization: Bearer eyJhbGciOiJIUzI1NiI...'
    )
    pdf.sub_sub_title('Laravel Sanctum Authentication')
    pdf.body_text(
        'Tokens from your connected Laravel app. Format: {id}|{token_string}. '
        'Configure via Admin > Sanctum Integration settings.'
    )
    pdf.code_block(
        'Authorization: Bearer 296782|INmFkiyJoayJzZJcdaZ2sy...\n\n'
        'The system detects the pipe (|) character and validates\n'
        'against your Laravel API (GET /api/user).'
    )

    # ===== 3. USER PANEL =====
    pdf.add_page()
    pdf.section_title('3. User Panel')
    pdf.body_text('The end-user facing chat interface. Route: /start-chat -> /chat')
    pdf.sub_sub_title('User Flow')
    steps = [
        '1. Enter name, mobile number & select platform',
        '2. Select preferred language (20+ options)',
        '3. Bot presents decision-tree Q&A',
        '4. User picks options from the tree',
        '5. Payment collected if required (Razorpay/Cashfree)',
        '6. "Was this helpful?" satisfaction check',
        '7. Agent handoff if user is not satisfied or types keywords',
        '8. Real-time live chat with agent (including file sharing)',
    ]
    for s in steps:
        pdf.bullet(s)
    pdf.ln(3)
    pdf.sub_sub_title('User API Endpoints')
    endpoints = [
        ('POST', '/api/chat/session', 'Create a new chat session'),
        ('GET', '/api/chat/start/{id}', 'Start bot flow (get first question)'),
        ('POST', '/api/chat/select', 'Select an option in Q&A'),
        ('POST', '/api/chat/request-agent', 'Request live agent'),
        ('POST', '/api/user/send', 'Send message + file to agent'),
        ('POST', '/api/upload', 'Upload a file'),
        ('GET', '/api/languages', 'Get supported languages'),
        ('WSS', '/api/ws/chat/{id}', 'Real-time WebSocket chat'),
    ]
    for m, p, d in endpoints:
        pdf.endpoint_row(m, p, d)
    pdf.ln(3)
    pdf.sub_sub_title('Create Session Example')
    pdf.code_block(
        'POST /api/chat/session\n'
        'Content-Type: application/json\n\n'
        '{\n'
        '  "user_name": "John Doe",\n'
        '  "user_mobile": "9876543210",\n'
        '  "platform_name": "Website",\n'
        '  "language": "en",\n'
        '  "email": "john@example.com"\n'
        '}'
    )

    # ===== 4. AGENT PANEL =====
    pdf.add_page()
    pdf.section_title('4. Agent Panel')
    pdf.body_text('Agent workspace for handling live chat. Route: /agent/login -> /agent/dashboard')
    pdf.sub_sub_title('Agent Features')
    agent_features = [
        'Secure login (JWT or Sanctum token)',
        'Dashboard with pending & active sessions',
        'Claim/join sessions waiting for an agent',
        'Real-time chat with full history view',
        'File & image sharing with users',
        'Language preference management',
        'Platform-based session filtering',
    ]
    for f in agent_features:
        pdf.bullet(f)
    pdf.ln(3)

    pdf.sub_sub_title('Agent Roles')
    pdf.body_text('Agent: Handles sessions on assigned platforms. Can claim, chat, and send files.')
    pdf.body_text('Master Agent: View all sessions. Reassign/unassign chats between agents.')

    pdf.sub_sub_title('Agent API Endpoints')
    endpoints = [
        ('POST', '/api/agent/login', 'Agent login'),
        ('GET', '/api/agent/sessions', 'Get assigned sessions'),
        ('GET', '/api/agent/chat/{id}', 'Get chat history'),
        ('POST', '/api/agent/join-session', 'Claim a session'),
        ('POST', '/api/agent/send', 'Send message + file'),
        ('PUT', '/api/agent/languages', 'Update known languages'),
        ('GET', '/api/master/agents', 'List all agents (master)'),
        ('POST', '/api/master/reassign-session', 'Reassign session (master)'),
        ('POST', '/api/master/unassign-session', 'Unassign agent (master)'),
    ]
    for m, p, d in endpoints:
        pdf.endpoint_row(m, p, d)

    # ===== 5. ADMIN PANEL =====
    pdf.add_page()
    pdf.section_title('5. Admin Panel')
    pdf.body_text('Full control panel. Route: /admin/login -> /admin/dashboard')
    pdf.sub_sub_title('Admin Features')
    admin_features = [
        'Dashboard with stats (questions, sessions, agents, payments)',
        'Q&A Decision Tree CRUD (create, edit, delete questions + options)',
        'Bulk upload questions via CSV/Excel with platform validation',
        'Visual journey view of the decision tree',
        'Agent management (create, assign platforms & roles)',
        'Payment gateway settings (Razorpay & Cashfree keys)',
        'Sanctum integration settings (connect Laravel auth)',
        'API documentation & SDK downloads',
    ]
    for f in admin_features:
        pdf.bullet(f)
    pdf.ln(3)

    pdf.sub_sub_title('Admin Pages')
    pages = [
        ('/admin/dashboard', 'Dashboard - Stats overview + quick navigation'),
        ('/admin/questions', 'Questions - CRUD for Q&A decision tree'),
        ('/admin/bulk-upload', 'Bulk Upload - Import questions via CSV/Excel'),
        ('/admin/journey', 'View Journey - Visual decision tree flow'),
        ('/admin/agents', 'Agents - Manage agents, platforms, roles'),
        ('/admin/pg-settings', 'Payment Settings - Razorpay & Cashfree keys'),
        ('/admin/sanctum', 'Sanctum - Laravel Sanctum integration'),
        ('/admin/api-docs', 'API Docs - SDKs, guides, and endpoints'),
    ]
    for route, desc in pages:
        pdf.set_font('Courier', '', 9)
        pdf.set_text_color(139, 92, 246)
        pdf.cell(50, 5.5, route)
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(75, 85, 99)
        pdf.cell(0, 5.5, desc, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.sub_sub_title('Admin API Endpoints')
    endpoints = [
        ('POST', '/api/admin/login', 'Admin login'),
        ('GET', '/api/admin/stats', 'Dashboard statistics'),
        ('GET/PUT', '/api/admin/pg-settings', 'Payment gateway config'),
        ('GET/PUT', '/api/admin/sanctum-config', 'Sanctum settings'),
        ('POST', '/api/admin/sanctum-test', 'Test Sanctum connection'),
        ('POST', '/api/questions', 'Create question'),
        ('GET', '/api/questions', 'List all questions'),
        ('PUT', '/api/questions/{id}', 'Update question'),
        ('DELETE', '/api/questions/{id}', 'Delete question'),
        ('POST', '/api/questions/bulk-upload', 'Bulk CSV/Excel import'),
        ('GET', '/api/questions/bulk-template', 'Download CSV template'),
        ('POST', '/api/agents', 'Create agent'),
        ('GET', '/api/agents', 'List agents'),
    ]
    for m, p, d in endpoints:
        pdf.endpoint_row(m, p, d)

    # ===== 6. FULL ENDPOINTS =====
    pdf.add_page()
    pdf.section_title('6. API Endpoints Reference')
    pdf.body_text('Complete list of all API endpoints. Base URL: /api')
    all_endpoints = {
        'Admin': [
            ('POST', '/admin/login', 'Login & get JWT'),
            ('GET', '/admin/stats', 'Dashboard stats'),
            ('GET/PUT', '/admin/pg-settings', 'Payment gateway config'),
            ('GET/PUT', '/admin/sanctum-config', 'Sanctum settings'),
            ('POST', '/admin/sanctum-test', 'Test Sanctum connection'),
        ],
        'Questions': [
            ('POST', '/questions', 'Create question'),
            ('GET', '/questions', 'List all questions'),
            ('PUT', '/questions/{id}', 'Update question'),
            ('DELETE', '/questions/{id}', 'Delete question'),
            ('POST', '/questions/bulk-upload', 'Bulk CSV/Excel upload'),
            ('GET', '/questions/bulk-template', 'Download CSV template'),
        ],
        'Chat': [
            ('POST', '/chat/session', 'Create session'),
            ('GET', '/chat/start/{id}', 'Start bot flow'),
            ('POST', '/chat/select', 'Select option'),
            ('POST', '/chat/request-agent', 'Request agent'),
            ('POST', '/chat/update-language', 'Update language'),
            ('POST', '/user/send', 'User send message + file'),
            ('GET', '/languages', 'Supported languages'),
        ],
        'Files': [
            ('POST', '/upload', 'Upload file (10MB max)'),
            ('GET', '/files/{name}', 'Serve uploaded file'),
        ],
        'Agent': [
            ('POST', '/agent/login', 'Agent login'),
            ('GET', '/agent/sessions', 'Get sessions'),
            ('GET', '/agent/chat/{id}', 'Chat history'),
            ('POST', '/agent/join-session', 'Claim session'),
            ('POST', '/agent/send', 'Send message + file'),
            ('PUT', '/agent/languages', 'Update languages'),
        ],
        'Master Agent': [
            ('GET', '/master/agents', 'List all agents'),
            ('POST', '/master/reassign-session', 'Reassign session'),
            ('POST', '/master/unassign-session', 'Unassign agent'),
        ],
        'Payments': [
            ('POST', '/payment/razorpay/create', 'Create Razorpay order'),
            ('POST', '/payment/razorpay/verify', 'Verify Razorpay payment'),
            ('POST', '/payment/cashfree/create', 'Create Cashfree order'),
            ('POST', '/payment/cashfree/verify', 'Verify Cashfree payment'),
        ],
        'WebSocket': [
            ('WSS', '/ws/chat/{session_id}', 'Real-time chat'),
        ],
    }
    for cat, eps in all_endpoints.items():
        pdf.sub_sub_title(cat)
        for m, p, d in eps:
            pdf.endpoint_row(m, p, d)
        pdf.ln(3)

    # ===== 7. JAVASCRIPT SDK =====
    pdf.add_page()
    pdf.section_title('7. JavaScript SDK')
    pdf.body_text('File: chatbot_sdk.js - Works in browser and Node.js environments.')
    pdf.sub_sub_title('Quick Start')
    pdf.code_block(
        "import ChatBotSDK from './chatbot_sdk.js';\n\n"
        "const sdk = new ChatBotSDK('https://your-domain.com/api');\n\n"
        "// Admin\n"
        "await sdk.adminLogin('admin', 'admin123');\n"
        "const questions = await sdk.getQuestions();\n\n"
        "// User chat\n"
        "const session = await sdk.startSession({\n"
        "  user_name: 'John',\n"
        "  user_mobile: '9876543210',\n"
        "  platform_name: 'Website'\n"
        "});\n"
        "const chat = await sdk.startChat(session.id);"
    )
    pdf.sub_sub_title('Agent Chat')
    pdf.code_block(
        "await sdk.agentLogin('agent1', 'pass123');\n"
        "const sessions = await sdk.getAgentSessions();\n"
        "await sdk.agentJoinSession(sessionId);\n"
        "await sdk.agentSendMessage(sessionId, 'Hello!');"
    )

    # ===== 8. PHP SDK =====
    pdf.add_page()
    pdf.section_title('8. PHP SDK')
    pdf.body_text('File: chatbot_sdk.php - For Laravel, WordPress, and custom PHP apps.')
    pdf.sub_sub_title('Quick Start')
    pdf.code_block(
        "<?php\n"
        "require 'chatbot_sdk.php';\n\n"
        "$sdk = new ChatBotAdminSDK('https://your-domain.com/api');\n"
        "$sdk->login('admin', 'admin123');\n\n"
        "// Create session\n"
        "$session = $sdk->startSession([\n"
        "  'user_name' => 'John',\n"
        "  'user_mobile' => '9876543210',\n"
        "  'platform_name' => 'Website'\n"
        "]);\n\n"
        "// Get questions\n"
        "$questions = $sdk->getQuestions();"
    )

    # ===== 9. FLUTTER SDK =====
    pdf.add_page()
    pdf.section_title('9. Flutter/Dart SDK')
    pdf.body_text('File: chatbot_sdk.dart - For Flutter mobile apps (iOS & Android).')
    pdf.sub_sub_title('Dependencies (pubspec.yaml)')
    pdf.code_block("http: ^1.2.0\nweb_socket_channel: ^2.4.0")
    pdf.sub_sub_title('Quick Start')
    pdf.code_block(
        "import 'chatbot_sdk.dart';\n\n"
        "final chatbot = ChatBotSDK('https://your-domain.com');\n\n"
        "await chatbot.adminLogin('admin', 'admin123');\n"
        "final questions = await chatbot.getQuestions();\n\n"
        "final session = await chatbot.createSession(\n"
        "  userName: 'John',\n"
        "  userMobile: '9876543210',\n"
        "  platformName: 'Android App',\n"
        "  language: 'en',\n"
        ");\n\n"
        "final chat = await chatbot.startChat(session['id']);"
    )
    pdf.sub_sub_title('WebSocket Real-time Chat')
    pdf.code_block(
        "final channel = chatbot.connectWebSocket(sessionId);\n\n"
        "channel.stream.listen((message) {\n"
        "  final data = jsonDecode(message);\n"
        "  if (data['type'] == 'new_message') {\n"
        "    print(data['message']['message']);\n"
        "  }\n"
        "});"
    )

    # ===== 10. FILE UPLOAD =====
    pdf.add_page()
    pdf.section_title('10. File Upload')
    pdf.body_text('Upload files (max 10MB) and share in chat. Supports images, documents, and more.')
    pdf.sub_sub_title('Upload a File')
    pdf.code_block(
        "POST /api/upload\n"
        "Content-Type: multipart/form-data\n\n"
        "Form field: file = <binary data>\n\n"
        "Response:\n"
        '{\n'
        '  "file_url": "/api/files/abc123.pdf",\n'
        '  "file_name": "report.pdf",\n'
        '  "file_type": "application/pdf",\n'
        '  "is_image": false,\n'
        '  "file_size": 102400\n'
        '}'
    )
    pdf.sub_sub_title('Send Message with File')
    pdf.code_block(
        "POST /api/user/send  (or /api/agent/send)\n"
        "Content-Type: application/json\n\n"
        '{\n'
        '  "session_id": "abc-123",\n'
        '  "message": "Here is the document",\n'
        '  "file_url": "/api/files/abc123.pdf",\n'
        '  "file_name": "report.pdf",\n'
        '  "file_type": "application/pdf"\n'
        '}'
    )

    # ===== 11. BULK UPLOAD =====
    pdf.section_title('11. Bulk CSV/Excel Upload')
    pdf.body_text('Import questions in bulk using CSV or XLSX files. Platform validation included.')
    pdf.sub_sub_title('CSV Format (each row = one option)')
    pdf.code_block(
        "question_ref,question_text,is_root,platforms,option_text,\n"
        "is_answer,answer_text,next_question_ref,is_agent_handoff,\n"
        "requires_payment,payment_amount,payment_gateway\n\n"
        'Q1,"How can we help?",yes,"Website,Android",Billing,\n'
        'no,,Q2,no,no,,\n'
        'Q1,"How can we help?",yes,"Website,Android",Talk to agent,\n'
        'no,,,yes,no,,\n'
        'Q2,"Billing issue?",no,"Website",Refund info,\n'
        'yes,"Contact support for refund.",,no,no,,'
    )

    # ===== 12. WEBSOCKET =====
    pdf.add_page()
    pdf.section_title('12. WebSocket Real-time Chat')
    pdf.body_text('Connect via WebSocket for instant message delivery.')
    pdf.code_block(
        "URL: wss://your-domain.com/api/ws/chat/{session_id}\n\n"
        "Message format (received):\n"
        '{\n'
        '  "type": "new_message",\n'
        '  "message": {\n'
        '    "id": "msg-uuid",\n'
        '    "sender": "agent",\n'
        '    "message": "Hello!",\n'
        '    "file_url": null,\n'
        '    "timestamp": "2025-06-15T10:30:00Z"\n'
        '  }\n'
        '}'
    )

    # ===== 13. PAYMENTS =====
    pdf.section_title('13. Payment Integration')
    pdf.body_text('Collect payments in-chat via Razorpay and Cashfree. Configure keys in Admin > Payment Settings.')
    pdf.sub_sub_title('Razorpay Flow')
    pdf.code_block(
        "1. POST /api/payment/razorpay/create\n"
        '   {"session_id": "...", "amount": 499, "currency": "INR"}\n\n'
        "2. Use Razorpay SDK to process payment on client\n\n"
        "3. POST /api/payment/razorpay/verify\n"
        '   {"razorpay_order_id": "...", "razorpay_payment_id": "...",\n'
        '    "razorpay_signature": "...", "session_id": "..."}'
    )
    pdf.sub_sub_title('Cashfree Flow')
    pdf.code_block(
        "1. POST /api/payment/cashfree/create\n"
        '   {"session_id": "...", "amount": 499, "currency": "INR"}\n\n'
        "2. Use Cashfree SDK to process payment on client\n\n"
        "3. POST /api/payment/cashfree/verify\n"
        '   {"order_id": "...", "session_id": "..."}'
    )

    # Save
    output_path = '/app/backend/uploads/ChatBot_Hub_API_Kit.pdf'
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")
    return output_path

if __name__ == '__main__':
    generate_pdf()
