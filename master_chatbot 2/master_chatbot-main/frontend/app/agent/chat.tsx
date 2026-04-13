import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, Keyboard, Alert, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChatMsg {
  id: string;
  sender: string;
  message: string;
  agent_name?: string;
  timestamp: string;
  options?: any[];
  requires_payment?: boolean;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

interface SessionInfo {
  id: string;
  user_name: string;
  user_mobile: string;
  platform_name: string;
  user_email?: string;
  status: string;
  needs_agent?: boolean;
  agent_id?: string;
}

export default function AgentChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = params.sessionId || '';

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadChat();
    connectWebSocket();
    // Fallback polling in case WS fails
    pollRef.current = setInterval(loadMessages, 4000);
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadChat = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/chat/' + sessionId, {
        headers: { Authorization: 'Bearer ' + global.agentToken },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSessionInfo(data.session || null);
      }
    } catch (e) {}
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/chat/' + sessionId, {
        headers: { Authorization: 'Bearer ' + global.agentToken },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(wsUrl + '/api/ws/chat/' + sessionId);
      ws.onopen = () => { console.log('Agent WS connected'); };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === data.message.id);
              if (exists) return prev;
              return [...prev, data.message];
            });
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        console.log('Agent WS disconnected');
        // Reconnect after 3s
        setTimeout(() => {
          if (wsRef.current === ws) connectWebSocket();
        }, 3000);
      };
      ws.onerror = () => {};
      wsRef.current = ws;
    } catch (e) {}
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    Keyboard.dismiss();

    try {
      const res = await fetch(BACKEND_URL + '/api/agent/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.agentToken,
        },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    } catch (e) {}
    setSending(false);
  };

  const pickAndSendFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const asset = res.assets[0];

      setSending(true);

      // Upload file
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('file', blob, asset.name || 'file');
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || 'file',
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }

      const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        Alert.alert('Upload Failed', 'Could not upload file');
        setSending(false);
        return;
      }

      const uploadData = await uploadRes.json();

      // Send message with file
      const sendRes = await fetch(BACKEND_URL + '/api/agent/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.agentToken,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: '',
          file_url: uploadData.file_url,
          file_name: uploadData.file_name,
          file_type: uploadData.file_type,
        }),
      });

      if (sendRes.ok) {
        const msg = await sendRes.json();
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send file');
    }
    setSending(false);
  };

  const getSenderLabel = (msg: ChatMsg) => {
    if (msg.sender === 'user') return sessionInfo?.user_name || 'User';
    if (msg.sender === 'agent') return msg.agent_name || 'Agent';
    if (msg.sender === 'bot') return 'Bot';
    if (msg.sender === 'system') return 'System';
    return msg.sender;
  };

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case 'user': return '#3B82F6';
      case 'agent': return '#F5A623';
      case 'bot': return '#6B7280';
      case 'system': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    const isAgent = item.sender === 'agent';
    const isUser = item.sender === 'user';
    const isSystem = item.sender === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrap}>
          <Text style={styles.systemMsg}>{item.message}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isAgent ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isAgent && (
          <View style={[styles.avatar, { backgroundColor: isUser ? '#EFF6FF' : '#F3F4F6' }]}>
            <Ionicons
              name={isUser ? 'person' : 'chatbubble-ellipses'}
              size={14}
              color={isUser ? '#3B82F6' : '#6B7280'}
            />
          </View>
        )}
        <View style={styles.msgContent}>
          <Text style={[styles.senderLabel, { color: getSenderColor(item.sender) }]}>
            {getSenderLabel(item)}
          </Text>
          <View style={[styles.bubble, isAgent ? styles.agentBubble : isUser ? styles.userBubble : styles.botBubble]}>
            {/* File/Image attachment */}
            {item.file_url && (
              item.file_type?.startsWith('image/') ? (
                <Image
                  source={{ uri: `${BACKEND_URL}${item.file_url}` }}
                  style={styles.chatImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fileAttachment}>
                  <Ionicons name="document-attach" size={18} color={isAgent ? '#FFFFFF' : '#F5A623'} />
                  <Text style={[styles.fileAttachName, isAgent && styles.fileAttachNameAgent]} numberOfLines={1}>
                    {item.file_name || 'File'}
                  </Text>
                </View>
              )
            )}
            {item.message ? (
              <Text style={[styles.msgText, isAgent && styles.agentMsgText]}>{item.message}</Text>
            ) : null}
          </View>
          <Text style={styles.msgTime}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        {isAgent && (
          <View style={[styles.avatar, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="headset" size={14} color="#F5A623" />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{sessionInfo?.user_name || 'User'}</Text>
          <Text style={styles.headerSub}>{sessionInfo?.platform_name} | {sessionInfo?.user_mobile}</Text>
        </View>
        <View style={styles.liveDot} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={pickAndSendFile}
            disabled={sending}
          >
            <Ionicons name="attach" size={22} color={sending ? '#D1D5DB' : '#6B7280'} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  msgList: { paddingVertical: 12, paddingHorizontal: 12 },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsg: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '85%',
  },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: 16,
  },
  msgContent: { flex: 1 },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  agentBubble: {
    backgroundColor: '#F5A623',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  msgText: { fontSize: 14, lineHeight: 20, color: '#111827' },
  agentMsgText: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chatImage: {
    width: 200, height: 150, borderRadius: 10, marginBottom: 6,
  },
  fileAttachment: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  fileAttachName: { fontSize: 12, fontWeight: '600', color: '#374151', flexShrink: 1 },
  fileAttachNameAgent: { color: '#FFFFFF' },
});
