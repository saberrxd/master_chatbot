import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ============ CODE SNIPPETS ============

const JS_QUICK_START =
  '// 1. Include the SDK\n' +
  '<script src="chatbot_sdk.js"></script>\n\n' +
  '// 2. Initialize\n' +
  'const bot = new ChatBotSDK(\'' + '{BASE_URL}' + '\');\n\n' +
  '// 3. Admin: Login + manage questions\n' +
  'await bot.adminLogin(\'admin\', \'admin123\');\n' +
  'const questions = await bot.getQuestions();\n\n' +
  '// 4. User: Create session + start chat\n' +
  'const session = await bot.createSession(\n' +
  '  \'John\', \'9876543210\', \'Website\', \'en\'\n' +
  ');\n' +
  'const chat = await bot.startChat(session.id);';

const JS_AGENT_EXAMPLE =
  '// Agent login\n' +
  'await bot.agentLogin(\'agent1\', \'pass123\');\n\n' +
  '// Get sessions\n' +
  'const sessions = await bot.getAgentSessions();\n\n' +
  '// Claim and chat\n' +
  'await bot.agentJoinSession(sessionId);\n' +
  'await bot.agentSendMessage(sessionId, \'Hello!\');\n\n' +
  '// Real-time WebSocket\n' +
  'const ws = bot.connectWebSocket(sessionId,\n' +
  '  (data) => console.log(\'Message:\', data)\n' +
  ');';

const JS_MASTER_EXAMPLE =
  '// Master agent (after login)\n' +
  'const agents = await bot.getMasterAgents();\n\n' +
  '// Reassign session to another agent\n' +
  'await bot.reassignSession(sessionId, agentId);\n\n' +
  '// Unassign agent from session\n' +
  'await bot.unassignSession(sessionId);';

const PHP_QUICK_START =
  '<?php\n' +
  'require_once \'chatbot_sdk.php\';\n\n' +
  '$sdk = new ChatBotSDK(\'' + '{BASE_URL}' + '\');\n\n' +
  '// Admin login\n' +
  '$sdk->adminLogin(\'admin\', \'admin123\');\n\n' +
  '// Get all questions\n' +
  '$questions = $sdk->getQuestions();\n\n' +
  '// Create a question with agent handoff\n' +
  '$sdk->createQuestion(\'Need help?\', [\n' +
  '  $sdk->buildOption(\'FAQ\', [\n' +
  '    \'answerText\' => \'See our FAQ page\'\n' +
  '  ]),\n' +
  '  $sdk->buildOption(\'Talk to Support\', [\n' +
  '    \'isAgentHandoff\' => true\n' +
  '  ]),\n' +
  '], true, [\'Website\']);\n';

const PHP_AGENT_EXAMPLE =
  '<?php\n' +
  '// Agent login\n' +
  '$sdk->agentLogin(\'agent1\', \'pass123\');\n\n' +
  '// Get sessions\n' +
  '$sessions = $sdk->getAgentSessions();\n\n' +
  '// Claim + send message\n' +
  '$sdk->agentJoinSession($sessionId);\n' +
  '$sdk->agentSendMessage($sessionId, \'Hi!\');\n\n' +
  '// Update agent languages\n' +
  '$sdk->updateAgentLanguages([\n' +
  '  [\'code\' => \'en\', \'enabled\' => true],\n' +
  '  [\'code\' => \'hi\', \'enabled\' => true],\n' +
  ']);\n';

const FLUTTER_QUICK_START =
  'import \'chatbot_sdk.dart\';\n\n' +
  'final chatbot = ChatBotSDK(\n' +
  '  \'' + '{BASE_URL}' + '\'\n' +
  ');\n\n' +
  '// Admin login\n' +
  'await chatbot.adminLogin(\'admin\', \'admin123\');\n\n' +
  '// Get all questions\n' +
  'final questions = await chatbot.getQuestions();\n\n' +
  '// Create a user session\n' +
  'final session = await chatbot.createSession(\n' +
  '  userName: \'John\',\n' +
  '  userMobile: \'9876543210\',\n' +
  '  platformName: \'Android App\',\n' +
  '  language: \'en\',\n' +
  ');\n\n' +
  '// Start chat\n' +
  'final chat = await chatbot.startChat(session[\'id\']);';

const FLUTTER_AGENT_EXAMPLE =
  '// Agent login\n' +
  'await chatbot.agentLogin(\'agent1\', \'pass123\');\n\n' +
  '// Get sessions\n' +
  'final sessions = await chatbot.getAgentSessions();\n\n' +
  '// Claim and chat\n' +
  'await chatbot.agentJoinSession(sessionId);\n' +
  'await chatbot.agentSendMessage(\n' +
  '  sessionId, \'Hello! How can I help?\'\n' +
  ');\n\n' +
  '// Send file attachment\n' +
  'final upload = await chatbot.uploadFile(file);\n' +
  'await chatbot.agentSendMessage(\n' +
  '  sessionId, \'Here is the document\',\n' +
  '  fileUrl: upload[\'file_url\'],\n' +
  '  fileName: upload[\'file_name\'],\n' +
  '  fileType: upload[\'file_type\'],\n' +
  ');';

const FLUTTER_WEBSOCKET_EXAMPLE =
  'import \'dart:convert\';\n\n' +
  '// Connect WebSocket for real-time chat\n' +
  'final channel = chatbot.connectWebSocket(\n' +
  '  sessionId\n' +
  ');\n\n' +
  '// Listen for messages\n' +
  'channel.stream.listen((message) {\n' +
  '  final data = jsonDecode(message);\n' +
  '  if (data[\'type\'] == \'new_message\') {\n' +
  '    print(data[\'message\'][\'message\']);\n' +
  '  }\n' +
  '});\n\n' +
  '// Don\'t forget to close\n' +
  'channel.sink.close();';

const REST_EXAMPLE =
  '# Create Session\n' +
  'POST /api/chat/session\n' +
  '{"user_name": "John", "user_mobile": "999",\n' +
  ' "platform_name": "Website", "language": "en"}\n\n' +
  '# Start Chat\n' +
  'GET /api/chat/start/{session_id}\n\n' +
  '# Select Option\n' +
  'POST /api/chat/select\n' +
  '{"session_id": "...", "question_id": "...",\n' +
  ' "option_id": "..."}\n\n' +
  '# Request Agent\n' +
  'POST /api/chat/request-agent\n' +
  '{"session_id": "..."}\n\n' +
  '# WebSocket (real-time)\n' +
  'wss://{domain}/api/ws/chat/{session_id}';

const ENDPOINTS_TABLE = [
  { cat: 'Admin', endpoints: [
    { m: 'POST', p: '/admin/login', d: 'Login' },
    { m: 'GET', p: '/admin/stats', d: 'Dashboard stats' },
    { m: 'GET/PUT', p: '/admin/pg-settings', d: 'PG credentials' },
    { m: 'GET/PUT', p: '/admin/sanctum-config', d: 'Sanctum settings' },
    { m: 'POST', p: '/admin/sanctum-test', d: 'Test Sanctum' },
  ]},
  { cat: 'Questions', endpoints: [
    { m: 'POST', p: '/questions', d: 'Create question' },
    { m: 'GET', p: '/questions', d: 'List questions' },
    { m: 'PUT', p: '/questions/{id}', d: 'Update' },
    { m: 'DELETE', p: '/questions/{id}', d: 'Delete' },
    { m: 'POST', p: '/questions/bulk-upload', d: 'Bulk CSV/Excel' },
    { m: 'GET', p: '/questions/bulk-template', d: 'CSV template' },
  ]},
  { cat: 'Chat', endpoints: [
    { m: 'POST', p: '/chat/session', d: 'Create session' },
    { m: 'GET', p: '/chat/start/{id}', d: 'Start bot' },
    { m: 'POST', p: '/chat/select', d: 'Select option' },
    { m: 'POST', p: '/chat/request-agent', d: 'Request agent' },
    { m: 'POST', p: '/chat/update-language', d: 'Set language' },
    { m: 'POST', p: '/user/send', d: 'User message + file' },
    { m: 'GET', p: '/languages', d: 'Supported langs' },
  ]},
  { cat: 'Files', endpoints: [
    { m: 'POST', p: '/upload', d: 'Upload file' },
    { m: 'GET', p: '/files/{name}', d: 'Serve file' },
  ]},
  { cat: 'Agent', endpoints: [
    { m: 'POST', p: '/agents', d: 'Create (admin)' },
    { m: 'GET', p: '/agents', d: 'List (admin)' },
    { m: 'POST', p: '/agent/login', d: 'Agent login' },
    { m: 'GET', p: '/agent/sessions', d: 'Get sessions' },
    { m: 'GET', p: '/agent/chat/{id}', d: 'Chat history' },
    { m: 'POST', p: '/agent/send', d: 'Send message + file' },
    { m: 'POST', p: '/agent/join-session', d: 'Claim session' },
    { m: 'PUT', p: '/agent/languages', d: 'Set languages' },
  ]},
  { cat: 'Master', endpoints: [
    { m: 'GET', p: '/master/agents', d: 'List agents' },
    { m: 'POST', p: '/master/reassign-session', d: 'Reassign' },
    { m: 'POST', p: '/master/unassign-session', d: 'Unassign' },
  ]},
  { cat: 'Payments', endpoints: [
    { m: 'POST', p: '/payment/razorpay/create', d: 'Create order' },
    { m: 'POST', p: '/payment/razorpay/verify', d: 'Verify' },
    { m: 'POST', p: '/payment/cashfree/create', d: 'Create order' },
    { m: 'POST', p: '/payment/cashfree/verify', d: 'Verify' },
  ]},
  { cat: 'WebSocket', endpoints: [
    { m: 'WSS', p: '/ws/chat/{session_id}', d: 'Real-time chat' },
  ]},
];

type TabKey = 'overview' | 'panels' | 'javascript' | 'php' | 'flutter' | 'rest' | 'endpoints';

export default function APIDocsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'book-outline' },
    { key: 'panels', label: 'Panels', icon: 'layers-outline' },
    { key: 'javascript', label: 'JS SDK', icon: 'logo-javascript' },
    { key: 'php', label: 'PHP SDK', icon: 'code-slash-outline' },
    { key: 'flutter', label: 'Flutter SDK', icon: 'phone-portrait-outline' },
    { key: 'rest', label: 'REST API', icon: 'globe-outline' },
    { key: 'endpoints', label: 'Endpoints', icon: 'list-outline' },
  ];

  const CodeBlock = ({ code }: { code: string }) => (
    <View style={styles.codeBlock}>
      <Text style={styles.codeText}>{code}</Text>
    </View>
  );

  const renderOverview = () => (
    <View>
      <View style={styles.heroCard}>
        <Ionicons name="rocket" size={28} color="#F5A623" />
        <Text style={styles.heroTitle}>Integration Kits</Text>
        <Text style={styles.heroSub}>Everything you need to integrate the chatbot into your application</Text>
      </View>

      {/* Download PDF Button */}
      <TouchableOpacity
        style={styles.pdfDownloadBtn}
        onPress={() => {
          if (typeof window !== 'undefined') {
            const link = document.createElement('a');
            link.href = `${BACKEND_URL}/api/docs/api-kit-pdf`;
            link.download = 'ChatBot_Hub_API_Kit.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }}
      >
        <Ionicons name="document-text" size={22} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.pdfDownloadTitle}>Download API Kit PDF</Text>
          <Text style={styles.pdfDownloadDesc}>Complete docs — all panels, endpoints & SDK guides</Text>
        </View>
        <Ionicons name="download-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Available SDKs</Text>

      <TouchableOpacity style={styles.sdkCard} onPress={() => setActiveTab('javascript')}>
        <View style={[styles.sdkIcon, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="logo-javascript" size={24} color="#F59E0B" />
        </View>
        <View style={styles.sdkInfo}>
          <Text style={styles.sdkName}>JavaScript SDK</Text>
          <Text style={styles.sdkDesc}>For web apps, Node.js, React, Vue, etc.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.sdkCard} onPress={() => setActiveTab('php')}>
        <View style={[styles.sdkIcon, { backgroundColor: '#EDE9FE' }]}>
          <Ionicons name="code-slash" size={24} color="#7C3AED" />
        </View>
        <View style={styles.sdkInfo}>
          <Text style={styles.sdkName}>PHP SDK</Text>
          <Text style={styles.sdkDesc}>For Laravel, WordPress, custom PHP apps</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.sdkCard} onPress={() => setActiveTab('flutter')}>
        <View style={[styles.sdkIcon, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="phone-portrait" size={24} color="#0284C7" />
        </View>
        <View style={styles.sdkInfo}>
          <Text style={styles.sdkName}>Flutter SDK</Text>
          <Text style={styles.sdkDesc}>For Flutter & Dart mobile apps (iOS, Android)</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.sdkCard} onPress={() => setActiveTab('rest')}>
        <View style={[styles.sdkIcon, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="globe" size={24} color="#10B981" />
        </View>
        <View style={styles.sdkInfo}>
          <Text style={styles.sdkName}>REST API</Text>
          <Text style={styles.sdkDesc}>Direct HTTP calls from any language</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Features Covered</Text>
      {['Admin management', 'Q&A CRUD with agent handoff', 'Chat sessions + language', 'Agent login + chat + claiming',
        'Master agent reassign/unassign', 'WebSocket real-time', 'Razorpay & Cashfree payments', '20+ languages support',
        'File upload & sharing', 'Bulk CSV/Excel upload'
      ].map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}

      <View style={styles.baseUrlBox}>
        <Text style={styles.baseUrlLabel}>Base URL</Text>
        <Text style={styles.baseUrlValue}>{BACKEND_URL}/api</Text>
      </View>
    </View>
  );

  const renderPanels = () => (
    <View>
      <View style={styles.heroCard}>
        <Ionicons name="layers" size={28} color="#F5A623" />
        <Text style={styles.heroTitle}>Platform Panels</Text>
        <Text style={styles.heroSub}>Three distinct interfaces for different user roles</Text>
      </View>

      {/* ---- USER PANEL ---- */}
      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <View style={[styles.panelIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="person" size={24} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>User Panel</Text>
            <Text style={styles.panelRoute}>Route: /start-chat → /chat</Text>
          </View>
        </View>
        <Text style={styles.panelDesc}>
          The end-user facing chat interface where users interact with the bot and agents.
        </Text>
        <Text style={styles.panelSubHead}>Features</Text>
        {[
          { icon: 'language-outline' as const, text: 'Language selection at chat start (20+ languages)' },
          { icon: 'chatbubble-ellipses-outline' as const, text: 'Interactive decision-tree Q&A flow with branching options' },
          { icon: 'card-outline' as const, text: 'In-chat payments via Razorpay & Cashfree gateways' },
          { icon: 'swap-horizontal-outline' as const, text: 'Contextual agent handoff — triggered by satisfaction check or keywords' },
          { icon: 'chatbubbles-outline' as const, text: 'Real-time live chat with agents via WebSocket' },
          { icon: 'attach-outline' as const, text: 'File & image sharing during agent chat' },
          { icon: 'help-circle-outline' as const, text: 'Smart "Was this helpful?" satisfaction prompt after bot answers' },
        ].map((f, i) => (
          <View key={i} style={styles.panelFeatureRow}>
            <Ionicons name={f.icon} size={16} color="#10B981" />
            <Text style={styles.panelFeatureText}>{f.text}</Text>
          </View>
        ))}
        <Text style={styles.panelSubHead}>User Flow</Text>
        <View style={styles.flowSteps}>
          {['Enter name, mobile & platform', 'Select language', 'Bot presents Q&A tree', 'User picks options', 'Payment (if required)', 'Satisfaction check', 'Agent handoff (if needed)', 'Live chat with agent'].map((s, i) => (
            <View key={i} style={styles.flowStep}>
              <View style={styles.flowStepNum}><Text style={styles.flowStepNumText}>{i + 1}</Text></View>
              <Text style={styles.flowStepText}>{s}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.panelSubHead}>API Endpoints Used</Text>
        <CodeBlock code={'POST /api/chat/session      → Create session\nGET  /api/chat/start/{id}   → Start bot flow\nPOST /api/chat/select       → Select option\nPOST /api/chat/request-agent → Request live agent\nPOST /api/user/send         → Send message/file\nPOST /api/upload            → Upload file\nWSS  /api/ws/chat/{id}      → Real-time chat'} />
      </View>

      {/* ---- AGENT PANEL ---- */}
      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <View style={[styles.panelIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="headset" size={24} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Agent Panel</Text>
            <Text style={styles.panelRoute}>Route: /agent/login → /agent/dashboard</Text>
          </View>
        </View>
        <Text style={styles.panelDesc}>
          The agent workspace for handling live chat sessions with users.
        </Text>
        <Text style={styles.panelSubHead}>Features</Text>
        {[
          { icon: 'log-in-outline' as const, text: 'Secure agent login (JWT or Sanctum token)' },
          { icon: 'list-outline' as const, text: 'Dashboard showing pending & active chat sessions' },
          { icon: 'hand-left-outline' as const, text: 'Claim/join sessions waiting for an agent' },
          { icon: 'chatbubbles-outline' as const, text: 'Real-time chat with users — view full chat history' },
          { icon: 'attach-outline' as const, text: 'Send files, images, and documents to users' },
          { icon: 'language-outline' as const, text: 'Manage known languages — users see agent\'s language match' },
          { icon: 'globe-outline' as const, text: 'Platform-based filtering — agents only see relevant sessions' },
          { icon: 'eye-outline' as const, text: 'View complete user journey (bot Q&A + agent messages)' },
        ].map((f, i) => (
          <View key={i} style={styles.panelFeatureRow}>
            <Ionicons name={f.icon} size={16} color="#3B82F6" />
            <Text style={styles.panelFeatureText}>{f.text}</Text>
          </View>
        ))}
        <Text style={styles.panelSubHead}>Agent Roles</Text>
        <View style={styles.roleCards}>
          <View style={styles.roleCardSmall}>
            <Ionicons name="headset" size={18} color="#3B82F6" />
            <Text style={styles.roleCardTitle}>Agent</Text>
            <Text style={styles.roleCardDesc}>Handles assigned platform sessions. Can claim, chat, and send files.</Text>
          </View>
          <View style={styles.roleCardSmall}>
            <Ionicons name="star" size={18} color="#F5A623" />
            <Text style={styles.roleCardTitle}>Master Agent</Text>
            <Text style={styles.roleCardDesc}>View all sessions. Reassign chats between agents. Unassign agents from sessions.</Text>
          </View>
        </View>
        <Text style={styles.panelSubHead}>API Endpoints Used</Text>
        <CodeBlock code={'POST /api/agent/login         → Agent login\nGET  /api/agent/sessions      → Get sessions\nGET  /api/agent/chat/{id}     → Chat history\nPOST /api/agent/join-session  → Claim session\nPOST /api/agent/send          → Send message/file\nPUT  /api/agent/languages     → Update languages\nGET  /api/master/agents       → List agents (master)\nPOST /api/master/reassign-session → Reassign\nPOST /api/master/unassign-session → Unassign'} />
      </View>

      {/* ---- ADMIN PANEL ---- */}
      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <View style={[styles.panelIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Admin Panel</Text>
            <Text style={styles.panelRoute}>Route: /admin/login → /admin/dashboard</Text>
          </View>
        </View>
        <Text style={styles.panelDesc}>
          Full control panel for managing the chatbot platform — questions, agents, payments, and integrations.
        </Text>
        <Text style={styles.panelSubHead}>Features</Text>
        {[
          { icon: 'log-in-outline' as const, text: 'Secure admin login (JWT or Sanctum token)' },
          { icon: 'stats-chart-outline' as const, text: 'Dashboard with key stats (questions, sessions, agents, payments)' },
          { icon: 'git-branch-outline' as const, text: 'Q&A Decision Tree — create, edit, delete questions with options' },
          { icon: 'cloud-upload-outline' as const, text: 'Bulk upload questions via CSV/Excel with platform validation' },
          { icon: 'map-outline' as const, text: 'Visual journey view — see the full Q&A decision tree flow' },
          { icon: 'people-outline' as const, text: 'Agent management — create agents, assign platforms & roles' },
          { icon: 'card-outline' as const, text: 'Payment gateway settings — configure Razorpay & Cashfree keys' },
          { icon: 'shield-checkmark-outline' as const, text: 'Sanctum integration — connect Laravel auth, test connections' },
          { icon: 'code-slash-outline' as const, text: 'API docs & SDKs — JavaScript, PHP, Flutter integration kits' },
        ].map((f, i) => (
          <View key={i} style={styles.panelFeatureRow}>
            <Ionicons name={f.icon} size={16} color="#8B5CF6" />
            <Text style={styles.panelFeatureText}>{f.text}</Text>
          </View>
        ))}
        <Text style={styles.panelSubHead}>Admin Pages</Text>
        <View style={styles.adminPages}>
          {[
            { route: '/admin/dashboard', name: 'Dashboard', desc: 'Stats overview + quick navigation' },
            { route: '/admin/questions', name: 'Questions', desc: 'CRUD for Q&A decision tree' },
            { route: '/admin/bulk-upload', name: 'Bulk Upload', desc: 'Import questions via CSV/Excel' },
            { route: '/admin/journey', name: 'View Journey', desc: 'Visual decision tree flow' },
            { route: '/admin/agents', name: 'Agents', desc: 'Manage agents, platforms, roles' },
            { route: '/admin/pg-settings', name: 'Payment Settings', desc: 'Razorpay & Cashfree keys' },
            { route: '/admin/sanctum', name: 'Sanctum', desc: 'Laravel Sanctum integration' },
            { route: '/admin/api-docs', name: 'API Docs', desc: 'SDKs, guides, and endpoints' },
          ].map((p, i) => (
            <View key={i} style={styles.adminPageRow}>
              <Text style={styles.adminPageRoute}>{p.route}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminPageName}>{p.name}</Text>
                <Text style={styles.adminPageDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.panelSubHead}>API Endpoints Used</Text>
        <CodeBlock code={'POST /api/admin/login          → Admin login\nGET  /api/admin/stats          → Dashboard stats\nGET  /api/admin/pg-settings    → Get PG config\nPUT  /api/admin/pg-settings    → Update PG config\nGET  /api/admin/sanctum-config → Get Sanctum config\nPUT  /api/admin/sanctum-config → Update Sanctum\nPOST /api/admin/sanctum-test   → Test connection\nPOST /api/questions             → Create question\nGET  /api/questions             → List questions\nPUT  /api/questions/{id}       → Update question\nDEL  /api/questions/{id}       → Delete question\nPOST /api/questions/bulk-upload → Bulk import\nGET  /api/questions/bulk-template → CSV template\nPOST /api/agents               → Create agent\nGET  /api/agents               → List agents'} />
      </View>

      {/* Authentication Note */}
      <View style={styles.authNote}>
        <Ionicons name="key" size={20} color="#F5A623" />
        <View style={{ flex: 1 }}>
          <Text style={styles.authNoteTitle}>Dual Authentication</Text>
          <Text style={styles.authNoteText}>
            All panels support both JWT and Laravel Sanctum tokens. JWT tokens are issued by this platform. Sanctum tokens are validated against your connected Laravel app. The system auto-detects the token format.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderJavaScript = () => (
    <View>
      <Text style={styles.sectionTitle}>JavaScript SDK</Text>
      <Text style={styles.fileNote}>File: /sdk/chatbot_sdk.js</Text>

      <Text style={styles.subTitle}>Quick Start</Text>
      <CodeBlock code={JS_QUICK_START.replace('{BASE_URL}', BACKEND_URL || '')} />

      <Text style={styles.subTitle}>Agent Chat</Text>
      <CodeBlock code={JS_AGENT_EXAMPLE} />

      <Text style={styles.subTitle}>Master Agent</Text>
      <CodeBlock code={JS_MASTER_EXAMPLE} />

      <View style={styles.tipBox}>
        <Ionicons name="bulb" size={16} color="#F5A623" />
        <Text style={styles.tipText}>The JS SDK includes WebSocket support via connectWebSocket() for real-time agent chat.</Text>
      </View>
    </View>
  );

  const renderPHP = () => (
    <View>
      <Text style={styles.sectionTitle}>PHP SDK</Text>
      <Text style={styles.fileNote}>File: /sdk/chatbot_sdk.php</Text>

      <Text style={styles.subTitle}>Quick Start</Text>
      <CodeBlock code={PHP_QUICK_START.replace('{BASE_URL}', BACKEND_URL || '')} />

      <Text style={styles.subTitle}>Agent Integration</Text>
      <CodeBlock code={PHP_AGENT_EXAMPLE} />

      <View style={styles.tipBox}>
        <Ionicons name="bulb" size={16} color="#F5A623" />
        <Text style={styles.tipText}>PHP SDK uses cURL internally. Ensure the cURL extension is enabled in your php.ini.</Text>
      </View>
    </View>
  );

  const renderFlutter = () => (
    <View>
      <Text style={styles.sectionTitle}>Flutter/Dart SDK</Text>
      <Text style={styles.fileNote}>File: /sdk/chatbot_sdk.dart</Text>

      <View style={styles.depBox}>
        <Ionicons name="cube-outline" size={16} color="#0284C7" />
        <View style={styles.depInfo}>
          <Text style={styles.depTitle}>Dependencies (pubspec.yaml)</Text>
          <Text style={styles.depText}>http: ^1.2.0{'\n'}web_socket_channel: ^2.4.0</Text>
        </View>
      </View>

      <Text style={styles.subTitle}>Quick Start</Text>
      <CodeBlock code={FLUTTER_QUICK_START.replace('{BASE_URL}', BACKEND_URL || '')} />

      <Text style={styles.subTitle}>Agent Chat + File Upload</Text>
      <CodeBlock code={FLUTTER_AGENT_EXAMPLE} />

      <Text style={styles.subTitle}>WebSocket (Real-time)</Text>
      <CodeBlock code={FLUTTER_WEBSOCKET_EXAMPLE} />

      <View style={styles.tipBox}>
        <Ionicons name="bulb" size={16} color="#F5A623" />
        <Text style={styles.tipText}>The Flutter SDK includes full type safety, file upload support, and WebSocket for real-time chat. Copy chatbot_sdk.dart to your lib/ directory and import it.</Text>
      </View>
    </View>
  );

  const renderREST = () => (
    <View>
      <Text style={styles.sectionTitle}>REST API</Text>
      <Text style={styles.descText}>Use these HTTP endpoints from any language or tool (Python, cURL, Postman, etc.)</Text>

      <Text style={styles.subTitle}>Authentication</Text>
      <CodeBlock code={'# Get token\nPOST /api/admin/login\n{"username": "admin", "password": "admin123"}\n\n# Use token in all requests\nHeaders:\n  Authorization: Bearer {token}\n  Content-Type: application/json'} />

      <Text style={styles.subTitle}>Chat Flow</Text>
      <CodeBlock code={REST_EXAMPLE} />

      <View style={styles.tipBox}>
        <Ionicons name="bulb" size={16} color="#F5A623" />
        <Text style={styles.tipText}>All endpoints are prefixed with /api. WebSocket uses wss:// protocol.</Text>
      </View>
    </View>
  );

  const renderEndpoints = () => (
    <View>
      <Text style={styles.sectionTitle}>All API Endpoints</Text>
      {ENDPOINTS_TABLE.map((cat, ci) => (
        <View key={ci} style={styles.epCategory}>
          <Text style={styles.epCatTitle}>{cat.cat}</Text>
          {cat.endpoints.map((ep, ei) => (
            <View key={ei} style={styles.epRow}>
              <View style={[styles.epMethod, ep.m === 'POST' ? styles.epPost : ep.m === 'GET' ? styles.epGet : ep.m === 'PUT' ? styles.epPut : ep.m === 'DELETE' ? styles.epDelete : styles.epWs]}>
                <Text style={styles.epMethodText}>{ep.m}</Text>
              </View>
              <Text style={styles.epPath}>/api{ep.p}</Text>
              <Text style={styles.epDesc}>{ep.d}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Docs & SDKs</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#F5A623' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'panels' && renderPanels()}
        {activeTab === 'javascript' && renderJavaScript()}
        {activeTab === 'php' && renderPHP()}
        {activeTab === 'flutter' && renderFlutter()}
        {activeTab === 'rest' && renderREST()}
        {activeTab === 'endpoints' && renderEndpoints()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 12 },
  tabBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', maxHeight: 48 },
  tabBarContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 2, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#F5A623' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#F5A623' },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8 },
  heroSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  pdfDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EF4444', borderRadius: 14, padding: 16,
    marginBottom: 16,
  },
  pdfDownloadTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  pdfDownloadDesc: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 6 },
  descText: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  fileNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 8 },
  sdkCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sdkIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sdkInfo: { flex: 1, marginLeft: 12 },
  sdkName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sdkDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: 13, color: '#374151' },
  baseUrlBox: {
    backgroundColor: '#111827', borderRadius: 10, padding: 14, marginTop: 16,
  },
  baseUrlLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },
  baseUrlValue: { fontSize: 14, fontWeight: '600', color: '#10B981', marginTop: 4, fontFamily: 'monospace' },
  codeBlock: {
    backgroundColor: '#1F2937', borderRadius: 10, padding: 14, marginBottom: 12,
  },
  codeText: { fontSize: 12, lineHeight: 18, color: '#D1FAE5', fontFamily: 'monospace' },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1',
    padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#FDE68A',
  },
  tipText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  depBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E0F2FE', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#BAE6FD',
  },
  depInfo: { flex: 1 },
  depTitle: { fontSize: 12, fontWeight: '700', color: '#0369A1', marginBottom: 4 },
  depText: { fontSize: 12, color: '#075985', fontFamily: 'monospace', lineHeight: 18 },

  // Panels
  panelCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  panelIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  panelRoute: { fontSize: 11, color: '#6B7280', fontFamily: 'monospace', marginTop: 2 },
  panelDesc: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 12 },
  panelSubHead: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 12, marginBottom: 8 },
  panelFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  panelFeatureText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },
  flowSteps: { gap: 6 },
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowStepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
  },
  flowStepNumText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  flowStepText: { fontSize: 12, color: '#374151' },
  roleCards: { flexDirection: 'row', gap: 10 },
  roleCardSmall: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  roleCardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 6 },
  roleCardDesc: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 4, lineHeight: 16 },
  adminPages: { gap: 6 },
  adminPageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  adminPageRoute: { fontSize: 10, fontWeight: '700', color: '#8B5CF6', fontFamily: 'monospace', width: 110 },
  adminPageName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  adminPageDesc: { fontSize: 11, color: '#6B7280' },
  authNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E1', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  authNoteTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  authNoteText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  epCategory: { marginBottom: 16 },
  epCatTitle: { fontSize: 14, fontWeight: '700', color: '#F5A623', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  epRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 6,
  },
  epMethod: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 40, alignItems: 'center' },
  epPost: { backgroundColor: '#DBEAFE' },
  epGet: { backgroundColor: '#D1FAE5' },
  epPut: { backgroundColor: '#FEF3C7' },
  epDelete: { backgroundColor: '#FEE2E2' },
  epWs: { backgroundColor: '#F3E8FF' },
  epMethodText: { fontSize: 9, fontWeight: '800', color: '#374151' },
  epPath: { fontSize: 11, fontWeight: '600', color: '#111827', flex: 1, fontFamily: 'monospace' },
  epDesc: { fontSize: 11, color: '#6B7280', width: 80 },
});
