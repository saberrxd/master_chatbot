import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Keyboard, Alert, useWindowDimensions, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChatMsg {
  id: string;
  sender: 'bot' | 'user' | 'agent' | 'system';
  message: string;
  options?: { id: string; text: string }[];
  requires_payment?: boolean;
  payment_amount?: number;
  payment_gateway?: string;
  question_id?: string;
  option_id?: string;
  agent_name?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId: string;
    userName: string;
    userEmail: string;
    userMobile: string;
  }>();
  const { sessionId, userName, userEmail, userMobile } = params;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentQId, setCurrentQId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<{ id: string; text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [langStep, setLangStep] = useState(true); // Show language selection first
  const [languages, setLanguages] = useState<any[]>([]);
  const [selectedLang, setSelectedLang] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    fetchLanguages();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/languages`);
      if (res.ok) {
        const data = await res.json();
        setLanguages(data);
      }
    } catch (e) {}
    setLoading(false);
  };

  const selectLanguage = async (langCode: string, langNative: string) => {
    setSelectedLang(langCode);
    setLangStep(false);
    setLoading(true);

    // Save language to session
    try {
      await fetch(`${BACKEND_URL}/api/chat/update-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, language: langCode }),
      });
    } catch (e) {}

    // Add user's choice as a message
    const userMsg: ChatMsg = {
      id: `user_lang_${Date.now()}`,
      sender: 'user',
      message: langNative,
    };
    setMessages([userMsg]);

    // Now start the bot flow
    startChat();
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(wsUrl + '/api/ws/chat/' + sessionId);
      ws.onopen = () => { console.log('User WS connected'); };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            // Only add if from agent or system (bot messages are handled by API)
            if (data.message.sender === 'agent' || data.message.sender === 'system') {
              setMessages(prev => {
                const exists = prev.some(m => m.id === data.message.id);
                if (exists) return prev;
                return [...prev, data.message];
              });
              if (data.message.sender === 'agent') {
                setAgentMode(true);
                setAgentName(data.message.agent_name || 'Agent');
              }
            }
          } else if (data.type === 'agent_joined') {
            setAgentMode(true);
            setAgentName(data.agent_name || 'Agent');
            setMessages(prev => {
              const exists = prev.some(m => m.message === data.message);
              if (exists) return prev;
              return [...prev, {
                id: 'sys_' + Date.now(),
                sender: 'system',
                message: data.message,
              }];
            });
          } else if (data.type === 'agent_requested') {
            // Already handled by the API response
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        setTimeout(() => {
          if (wsRef.current === ws) connectWebSocket();
        }, 3000);
      };
      ws.onerror = () => {};
      wsRef.current = ws;
    } catch (e) {}
  };

  const startChat = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/start/${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        const botMsg: ChatMsg = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          message: data.message,
          options: data.options,
          question_id: data.question_id,
        };
        setMessages(prev => [...prev, botMsg]);
        setCurrentQId(data.question_id);
        setCurrentOptions(data.options || []);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', sender: 'bot', message: 'Could not load chat. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const selectOption = async (optionId: string, optionText: string, overrideQId?: string) => {
    const qId = overrideQId || currentQId;
    if (selecting || !qId) return;
    setSelecting(true);

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      message: optionText,
    };
    setMessages(prev => [...prev, userMsg]);
    setCurrentOptions([]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: qId,
          option_id: optionId,
        }),
      });
      const data = await res.json();

      if (data.type === 'agent_handoff') {
        const sysMsg: ChatMsg = {
          id: `sys_${Date.now()}`,
          sender: 'system',
          message: data.message,
        };
        setMessages(prev => [...prev, sysMsg]);
        setCurrentOptions([]);
        setCurrentQId(null);
        // Don't set agentMode yet - wait for agent to join
      } else if (data.type === 'payment_required') {
        const payMsg: ChatMsg = {
          id: `bot_pay_${Date.now()}`,
          sender: 'bot',
          message: data.message,
          requires_payment: true,
          payment_amount: data.payment_amount,
          payment_gateway: data.payment_gateway,
          question_id: data.question_id,
          option_id: data.option_id,
        };
        setMessages(prev => [...prev, payMsg]);
        setCurrentQId(data.question_id);
      } else if (data.type === 'answer') {
        const ansMsg: ChatMsg = {
          id: `bot_ans_${Date.now()}`,
          sender: 'bot',
          message: data.message,
        };
        setMessages(prev => [...prev, ansMsg]);

        // Show satisfaction check after answer
        setTimeout(() => {
          const satisfactionMsg: ChatMsg = {
            id: `bot_sat_${Date.now()}`,
            sender: 'bot',
            message: 'Was this answer helpful?',
          };
          setMessages(prev => [...prev, satisfactionMsg]);
          setShowSatisfaction(true);
          setCurrentOptions([]);
          // Store continue data for if user says "Yes"
          if (data.continue_question_id && data.continue_options?.length) {
            (global as any).__continueQId = data.continue_question_id;
            (global as any).__continueOptions = data.continue_options;
          }
        }, 800);
      } else if (data.type === 'question') {
        const qMsg: ChatMsg = {
          id: `bot_q_${Date.now()}`,
          sender: 'bot',
          message: data.message,
          options: data.options,
          question_id: data.question_id,
        };
        setMessages(prev => [...prev, qMsg]);
        setCurrentQId(data.question_id);
        setCurrentOptions(data.options || []);
      } else {
        const endMsg: ChatMsg = {
          id: `bot_end_${Date.now()}`,
          sender: 'bot',
          message: data.message || 'Thank you!',
        };
        setMessages(prev => [...prev, endMsg]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: `err_${Date.now()}`, sender: 'bot', message: 'Something went wrong. Please try again.' }]);
    } finally {
      setSelecting(false);
    }
  };

  const requestAgent = async () => {
    setWaitingForAgent(true);
    setShowSatisfaction(false);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/request-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        const sysMsg: ChatMsg = {
          id: `sys_req_${Date.now()}`,
          sender: 'system',
          message: data.message || 'Connecting you to a live agent. Please wait...',
        };
        setMessages(prev => [...prev, sysMsg]);
        setCurrentOptions([]);
        setCurrentQId(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not request agent');
      setWaitingForAgent(false);
    }
  };

  const handleSatisfied = () => {
    setShowSatisfaction(false);
    const userMsg: ChatMsg = {
      id: `user_sat_${Date.now()}`,
      sender: 'user',
      message: 'Yes, thank you!',
    };
    setMessages(prev => [...prev, userMsg]);

    // Continue with next question if available
    const contQId = (global as any).__continueQId;
    const contOpts = (global as any).__continueOptions;
    if (contQId && contOpts?.length) {
      setTimeout(() => {
        const contMsg: ChatMsg = {
          id: `bot_cont_${Date.now()}`,
          sender: 'bot',
          message: 'Is there anything else I can help you with?',
          options: contOpts,
          question_id: contQId,
        };
        setMessages(prev => [...prev, contMsg]);
        setCurrentQId(contQId);
        setCurrentOptions(contOpts);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot_end_${Date.now()}`,
          sender: 'bot',
          message: 'Thank you! Have a great day!',
        }]);
      }, 500);
    }
    (global as any).__continueQId = null;
    (global as any).__continueOptions = null;
  };

  const handleNotSatisfied = () => {
    setShowSatisfaction(false);
    const userMsg: ChatMsg = {
      id: `user_nsat_${Date.now()}`,
      sender: 'user',
      message: 'No, connect me to an agent',
    };
    setMessages(prev => [...prev, userMsg]);
    (global as any).__continueQId = null;
    (global as any).__continueOptions = null;
    requestAgent();
  };

  // Keywords that trigger agent connection
  const AGENT_KEYWORDS = [
    'connect with agent', 'connect to agent', 'talk to agent',
    'human agent', 'live agent', 'speak to agent', 'real person',
    'connect agent', 'need agent', 'want agent', 'agent please',
  ];

  const isAgentRequest = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return AGENT_KEYWORDS.some(kw => lower.includes(kw));
  };

  const sendUserMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    Keyboard.dismiss();

    // Check if user is requesting an agent via keywords
    if (!agentMode && isAgentRequest(text)) {
      const userMsg: ChatMsg = {
        id: `user_kw_${Date.now()}`,
        sender: 'user',
        message: text,
      };
      setMessages(prev => [...prev, userMsg]);
      setSending(false);
      requestAgent();
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const fname = asset.name || 'file';
      const mime = asset.mimeType || 'application/octet-stream';
      const isImage = mime.startsWith('image/');

      setSending(true);

      // Build FormData
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('file', blob, fname);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fname,
          type: mime,
        } as any);
      }

      // If it's an image, use OCR endpoint to extract text & match decision tree
      if (isImage && !agentMode) {
        const ocrRes = await fetch(`${BACKEND_URL}/api/ocr/analyze-session?session_id=${sessionId}`, {
          method: 'POST',
          body: formData,
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();

          // Add the uploaded image as a user message
          const imgMsg: ChatMsg = {
            id: `ocr_img_${Date.now()}`,
            sender: 'user',
            message: '',
            file_url: ocrData.file_url,
            file_name: fname,
            file_type: mime,
          };
          setMessages(prev => [...prev, imgMsg]);

          // Show OCR extracted text
          if (ocrData.extracted_text) {
            const ocrTextMsg: ChatMsg = {
              id: `ocr_text_${Date.now()}`,
              sender: 'bot',
              message: `📋 Text detected from image:\n"${ocrData.extracted_text.substring(0, 300)}${ocrData.extracted_text.length > 300 ? '...' : ''}"`,
            };
            setMessages(prev => [...prev, ocrTextMsg]);
          }

          // Show matched decision tree options
          if (ocrData.matches && ocrData.matches.length > 0) {
            const matchOptions = ocrData.matches.slice(0, 4).map((m: any) => ({
              id: `ocr_opt_${m.option_id}`,
              text: m.option_text,
              _question_id: m.question_id,
              _option_id: m.option_id,
            }));

            const matchMsg: ChatMsg = {
              id: `ocr_match_${Date.now()}`,
              sender: 'bot',
              message: '🔍 Based on the image, here are the best matching options:',
              options: matchOptions,
              question_id: ocrData.matches[0].question_id,
            };
            setMessages(prev => [...prev, matchMsg]);
          } else if (ocrData.extracted_text) {
            const noMatchMsg: ChatMsg = {
              id: `ocr_nomatch_${Date.now()}`,
              sender: 'bot',
              message: 'I extracted text from the image but couldn\'t find a matching answer. Would you like to connect with an agent?',
              options: [
                { id: 'ocr_agent_yes', text: 'Yes, connect to agent' },
                { id: 'ocr_agent_no', text: 'No, continue browsing' },
              ],
            };
            setMessages(prev => [...prev, noMatchMsg]);
          } else {
            const noTextMsg: ChatMsg = {
              id: `ocr_notext_${Date.now()}`,
              sender: 'bot',
              message: 'I couldn\'t detect any text from this image. Please try uploading a clearer image or type your question.',
            };
            setMessages(prev => [...prev, noTextMsg]);
          }

          setSending(false);
          return;
        }
      }

      // Fallback: regular file upload (non-image or agent mode)
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
      const sendRes = await fetch(`${BACKEND_URL}/api/user/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handlePayment = (msg: ChatMsg) => {
    router.push({
      pathname: '/payment',
      params: {
        sessionId: sessionId || '',
        questionId: msg.question_id || '',
        optionId: msg.option_id || '',
        amount: String(msg.payment_amount || 0),
        gateway: msg.payment_gateway || 'razorpay',
        customerName: userName || '',
        customerEmail: userEmail || '',
        customerPhone: userMobile || '',
      },
    });
  };

  // Listen for payment success coming back
  useEffect(() => {
    const checkPaymentResult = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/chat/messages/${sessionId}`);
        const allMsgs = await res.json();
        if (allMsgs && allMsgs.length > messages.length) {
          setMessages(allMsgs.map((m: any, i: number) => ({
            id: m.id || `msg_${i}`,
            sender: m.sender,
            message: m.message,
            options: m.options,
            requires_payment: m.requires_payment,
            payment_amount: m.payment_amount,
            payment_gateway: m.payment_gateway,
            question_id: m.question_id,
            option_id: m.option_id,
            agent_name: m.agent_name,
            file_url: m.file_url,
            file_name: m.file_name,
            file_type: m.file_type,
          })));
          // Check if agent has joined
          const hasAgent = allMsgs.some((m: any) => m.sender === 'agent');
          if (hasAgent) setAgentMode(true);
        }
      } catch (e) {}
    };

    const interval = setInterval(checkPaymentResult, 5000);
    return () => clearInterval(interval);
  }, [messages.length, sessionId]);

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    const isUser = item.sender === 'user';
    const isSystem = item.sender === 'system';
    const isAgent = item.sender === 'agent';

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrap}>
          <Ionicons name="information-circle" size={14} color="#10B981" />
          <Text style={styles.systemMsg}>{item.message}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <View style={[styles.avatar, isAgent && styles.agentAvatar]}>
            <Ionicons
              name={isAgent ? 'headset' : 'chatbubble-ellipses'}
              size={16}
              color={isAgent ? '#10B981' : '#F5A623'}
            />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : isAgent ? styles.agentBubbleSt : styles.botBubble]}>
          {isAgent && (
            <Text style={styles.agentLabel}>{item.agent_name || 'Agent'}</Text>
          )}

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
                <Ionicons name="document-attach" size={20} color={isUser ? '#FFFFFF' : '#F5A623'} />
                <Text style={[styles.fileAttachName, isUser && styles.fileAttachNameUser]} numberOfLines={1}>
                  {item.file_name || 'File'}
                </Text>
              </View>
            )
          )}

          {item.message ? (
            <Text style={[styles.msgText, isUser ? styles.userText : styles.botText]}>
              {item.message}
            </Text>
          ) : null}

          {/* Payment button */}
          {item.requires_payment && (
            <TouchableOpacity
              testID={`pay-btn-${item.id}`}
              style={styles.payBtn}
              onPress={() => handlePayment(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.payBtnText}>
                Pay {'\u20B9'}{item.payment_amount} via {item.payment_gateway === 'cashfree' ? 'Cashfree' : 'Razorpay'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Options */}
          {item.options && item.options.length > 0 && (
            <View style={styles.optionsWrap}>
              {item.options.map((opt: any) => (
                <TouchableOpacity
                  testID={`option-${opt.id}`}
                  key={opt.id}
                  style={styles.optionBtn}
                  onPress={() => {
                    // Handle OCR "connect to agent" options
                    if (opt.id === 'ocr_agent_yes') {
                      requestAgent();
                      return;
                    }
                    if (opt.id === 'ocr_agent_no') {
                      setMessages(prev => [...prev, {
                        id: `sys_${Date.now()}`,
                        sender: 'bot' as const,
                        message: 'No problem! Feel free to upload another image or type your question.',
                      }]);
                      return;
                    }
                    // OCR-matched options have _question_id/_option_id
                    const qId = opt._question_id || item.question_id;
                    const oId = opt._option_id || opt.id;
                    selectOption(oId, opt.text, qId);
                  }}
                  disabled={selecting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{opt.text}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#F5A623" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>Starting conversation...</Text>
        </View>
      </View>
    );
  }

  // Language Selection Step
  if (langStep && languages.length > 0) {
    return (
      <View style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>ChatBot</Text>
          </View>
        </View>
        <View style={styles.langPickerWrap}>
          <View style={styles.langHeader}>
            <Ionicons name="language" size={32} color="#F5A623" />
            <Text style={styles.langTitle}>Choose your language</Text>
            <Text style={styles.langSubtitle}>Please select your preferred language to continue</Text>
          </View>
          <FlatList
            data={languages}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.langGrid}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.langCard}
                onPress={() => selectLanguage(item.code, item.native_name)}
                activeOpacity={0.7}
              >
                <Text style={styles.langCardNative}>{item.native_name}</Text>
                <Text style={styles.langCardName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, agentMode && styles.headerDotAgent, waitingForAgent && !agentMode && styles.headerDotWaiting]} />
          <Text style={styles.headerTitle}>
            {agentMode ? (agentName || 'Live Agent') : waitingForAgent ? 'Connecting...' : 'ChatBot'}
          </Text>
        </View>
        {agentMode && (
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>
        )}
        {waitingForAgent && !agentMode && (
          <ActivityIndicator size="small" color="#F5A623" />
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        style={styles.msgListContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {selecting && (
        <View style={styles.typingBar}>
          <ActivityIndicator size="small" color="#F5A623" />
          <Text style={styles.typingText}>Processing...</Text>
        </View>
      )}

      {/* Satisfaction Check Buttons */}
      {showSatisfaction && !agentMode && !waitingForAgent && (
        <View style={styles.satisfactionBar}>
          <TouchableOpacity
            style={styles.satisfiedBtn}
            onPress={handleSatisfied}
            activeOpacity={0.7}
          >
            <Ionicons name="thumbs-up" size={18} color="#10B981" />
            <Text style={styles.satisfiedBtnText}>Yes, helpful!</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notSatisfiedBtn}
            onPress={handleNotSatisfied}
            activeOpacity={0.7}
          >
            <Ionicons name="headset" size={18} color="#EF4444" />
            <Text style={styles.notSatisfiedBtnText}>No, connect to agent</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Free text input - always visible */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={pickAndSendFile}
          disabled={sending}
        >
          <Ionicons name="attach" size={22} color={sending ? '#D1D5DB' : '#6B7280'} />
        </TouchableOpacity>
        <TextInput
          style={styles.chatInput}
          placeholder={agentMode ? 'Type a message...' : 'Type "connect with agent" for help...'}
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendUserMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Waiting for agent indicator */}
      {waitingForAgent && !agentMode && (
        <View style={styles.waitingBar}>
          <ActivityIndicator size="small" color="#F5A623" />
          <Text style={styles.waitingText}>Waiting for an agent to connect...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280' },
  langPickerWrap: { flex: 1, backgroundColor: '#F9FAFB' },
  langHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFF8E1',
  },
  langTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 12 },
  langSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  langGrid: { padding: 12 },
  langCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 6,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 70,
    justifyContent: 'center',
  },
  langCardNative: { fontSize: 18, fontWeight: '700', color: '#111827' },
  langCardName: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerDotAgent: {
    backgroundColor: '#F5A623',
  },
  headerDotWaiting: {
    backgroundColor: '#F59E0B',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  liveTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveTagText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  satisfactionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  satisfiedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  satisfiedBtnText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  notSatisfiedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notSatisfiedBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  waitingText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  msgList: { paddingVertical: 16, paddingHorizontal: 12 },
  msgListContainer: { flex: 1 },
  systemMsgWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMsg: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
  msgRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowBot: { alignSelf: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  agentAvatar: {
    backgroundColor: '#ECFDF5',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: '#F5A623',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agentBubbleSt: {
    backgroundColor: '#ECFDF5',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  agentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
  botText: { color: '#111827' },
  optionsWrap: { marginTop: 12, gap: 8 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  optionText: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFF8E1',
  },
  typingText: { fontSize: 13, color: '#6B7280' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  chatInput: {
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
  fileAttachNameUser: { color: '#FFFFFF' },
});
