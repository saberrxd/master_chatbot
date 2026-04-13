import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SessionItem {
  id: string;
  user_name: string;
  user_mobile: string;
  platform_name: string;
  user_email?: string;
  status: string;
  created_at: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  needs_agent: boolean;
  agent_id?: string;
  agent_name?: string;
  language?: string;
}

export default function AgentDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMaster = global.agentData?.role === 'master_agent';
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [reassignSession, setReassignSession] = useState<string | null>(null);

  useEffect(() => {
    if (!global.agentToken) {
      router.replace('/agent/login');
      return;
    }
    fetchSessions();
    if (isMaster) fetchAgentsList();
    pollRef.current = setInterval(fetchSessions, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchAgentsList = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/master/agents', {
        headers: { Authorization: 'Bearer ' + global.agentToken },
      });
      if (res.ok) setAgentsList(await res.json());
    } catch (e) {}
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/sessions', {
        headers: { Authorization: 'Bearer ' + global.agentToken },
      });
      if (res.ok) {
        setSessions(await res.json());
      } else if (res.status === 401) {
        router.replace('/agent/login');
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, []);

  const joinSession = async (sessionId: string) => {
    setJoiningId(sessionId);
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/join-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.agentToken,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.ok) {
        router.push({ pathname: '/agent/chat', params: { sessionId } });
      } else {
        Alert.alert('Error', 'Could not join session');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    }
    setJoiningId(null);
  };

  const openChat = (sessionId: string) => {
    router.push({ pathname: '/agent/chat', params: { sessionId } });
  };

  const reassignToAgent = async (sessionId: string, agentId: string) => {
    try {
      const res = await fetch(BACKEND_URL + '/api/master/reassign-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.agentToken,
        },
        body: JSON.stringify({ session_id: sessionId, agent_id: agentId }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Session reassigned');
        setReassignSession(null);
        fetchSessions();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.detail || 'Failed to reassign');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    }
  };

  const unassignAgent = async (sessionId: string) => {
    Alert.alert('Unassign Agent', 'Remove the assigned agent from this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unassign', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(BACKEND_URL + '/api/master/unassign-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + global.agentToken,
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
          if (res.ok) {
            fetchSessions();
          } else {
            const data = await res.json();
            Alert.alert('Error', data.detail || 'Failed');
          }
        } catch (e) {
          Alert.alert('Error', 'Connection failed');
        }
      }},
    ]);
  };

  const logout = () => {
    global.agentToken = undefined;
    global.agentData = undefined;
    if (pollRef.current) clearInterval(pollRef.current);
    router.replace('/agent/login');
  };

  const goToLanguages = () => {
    router.push('/agent/languages');
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      return d.toLocaleDateString();
    } catch { return ''; }
  };

  const needsAgentSessions = sessions.filter(s => s.needs_agent && !s.agent_id);
  const mySessions = sessions.filter(s => s.agent_id === global.agentData?.id);
  const otherSessions = sessions.filter(s => !s.needs_agent && s.agent_id !== global.agentData?.id);

  const renderSession = ({ item }: { item: SessionItem }) => {
    const isMySession = item.agent_id === global.agentData?.id;
    const needsJoin = item.needs_agent && !item.agent_id;

    return (
      <TouchableOpacity
        style={[styles.sessionCard, needsJoin && styles.sessionCardUrgent]}
        onPress={() => isMySession ? openChat(item.id) : joinSession(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionTop}>
          <View style={styles.sessionInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.sessionName}>{item.user_name}</Text>
              {needsJoin && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>NEW</Text>
                </View>
              )}
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              )}
            </View>
            <Text style={styles.sessionPlatform}>{item.platform_name}{item.language && item.language !== 'en' ? ` | ${item.language.toUpperCase()}` : ''}</Text>
          </View>
          <Text style={styles.sessionTime}>{formatTime(item.last_message_time || item.created_at)}</Text>
        </View>
        {item.last_message ? (
          <Text style={styles.lastMsg} numberOfLines={2}>{item.last_message}</Text>
        ) : null}
        <View style={styles.sessionBottom}>
          {needsJoin ? (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => joinSession(item.id)}
              disabled={joiningId === item.id}
            >
              {joiningId === item.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="hand-left" size={14} color="#FFF" />
                  <Text style={styles.joinBtnText}>Claim Chat</Text>
                </>
              )}
            </TouchableOpacity>
          ) : isMySession ? (
            <View style={styles.myBadge}>
              <Ionicons name="chatbubble" size={12} color="#10B981" />
              <Text style={styles.myBadgeText}>Active Chat</Text>
            </View>
          ) : (
            <View style={styles.otherBadge}>
              <Ionicons name="person" size={12} color="#6B7280" />
              <Text style={styles.otherBadgeText}>{item.agent_name || 'Unassigned'}</Text>
            </View>
          )}
          <Text style={styles.sessionMobile}>{item.user_mobile}</Text>
        </View>

        {/* Master Agent Controls */}
        {isMaster && item.agent_id && (
          <View style={styles.masterControls}>
            <TouchableOpacity
              style={styles.reassignBtn}
              onPress={() => setReassignSession(reassignSession === item.id ? null : item.id)}
            >
              <Ionicons name="swap-horizontal" size={14} color="#7C3AED" />
              <Text style={styles.reassignBtnText}>Reassign</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.unassignBtn}
              onPress={() => unassignAgent(item.id)}
            >
              <Ionicons name="person-remove" size={14} color="#EF4444" />
              <Text style={styles.unassignBtnText}>Unassign</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reassign Agent Picker */}
        {isMaster && reassignSession === item.id && (
          <View style={styles.reassignPicker}>
            <Text style={styles.reassignPickerTitle}>Reassign to:</Text>
            {agentsList
              .filter(a => a.id !== item.agent_id)
              .map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.reassignOption}
                  onPress={() => reassignToAgent(item.id, a.id)}
                >
                  <Ionicons name="headset" size={14} color="#F5A623" />
                  <Text style={styles.reassignOptionText}>{a.display_name}</Text>
                  {a.role === 'master_agent' && (
                    <View style={styles.miniMasterBadge}>
                      <Text style={styles.miniMasterText}>M</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            {agentsList.filter(a => a.id !== item.agent_id).length === 0 && (
              <Text style={styles.noAgentsText}>No other agents available</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
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

  const allSessions = [...needsAgentSessions, ...mySessions, ...otherSessions];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Agent Portal</Text>
          <View style={styles.nameRow2}>
            <Text style={styles.agentName}>{global.agentData?.display_name || 'Agent'}</Text>
            {isMaster && (
              <View style={styles.masterTag}>
                <Text style={styles.masterTagText}>MASTER</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={goToLanguages} style={styles.langBtn}>
            <Ionicons name="language" size={18} color="#F5A623" />
          </TouchableOpacity>
          <View style={styles.onlineDot} />
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{needsAgentSessions.length}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{mySessions.length}</Text>
          <Text style={styles.statLabel}>My Chats</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Sessions List */}
      <FlatList
        data={allSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptySubtext}>New user chats will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  agentName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  nameRow2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  masterTag: { backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  masterTagText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  list: { padding: 16 },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sessionCardUrgent: {
    borderColor: '#F5A623',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sessionInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  urgentBadge: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  unreadBadge: {
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  sessionPlatform: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sessionTime: { fontSize: 11, color: '#9CA3AF' },
  lastMsg: { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 18 },
  sessionBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  myBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  myBadgeText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  otherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  otherBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  sessionMobile: { fontSize: 11, color: '#9CA3AF' },
  masterControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reassignBtnText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  unassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unassignBtnText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  reassignPicker: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reassignPickerTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  reassignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reassignOptionText: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  miniMasterBadge: {
    backgroundColor: '#7C3AED',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMasterText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  noAgentsText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#D1D5DB', marginTop: 4 },
});
