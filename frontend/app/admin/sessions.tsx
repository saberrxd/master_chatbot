import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Session {
  id: string;
  user_name: string;
  user_mobile: string;
  platform_name: string;
  user_email: string | null;
  channel_name: string | null;
  assigned_master: string | null;
  assigned_monitor: string | null;
  created_at: string;
  status: string;
}

export default function SessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${global.adminToken}` },
      });
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderSession = ({ item }: { item: Session }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarSmall}>
          <Ionicons name="person" size={16} color="#F5A623" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.userName}>{item.user_name}</Text>
          <Text style={styles.userMeta}>{item.user_mobile} • {item.platform_name}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.inactiveText]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        {item.user_email && (
          <View style={styles.metaRow}>
            <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{item.user_email}</Text>
          </View>
        )}
        {item.channel_name && (
          <View style={styles.metaRow}>
            <Ionicons name="megaphone-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{item.channel_name}</Text>
          </View>
        )}
        {item.assigned_master && (
          <View style={styles.metaRow}>
            <Ionicons name="shield-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>Master: {item.assigned_master}</Text>
          </View>
        )}
        {item.assigned_monitor && (
          <View style={styles.metaRow}>
            <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>Monitor: {item.assigned_monitor}</Text>
          </View>
        )}
      </View>

      <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
    </View>
  );

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
      <View style={styles.header}>
        <TouchableOpacity testID="sessions-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Sessions ({sessions.length})</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No sessions yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  userMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadge: { backgroundColor: '#ECFDF5' },
  inactiveBadge: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '600' },
  activeText: { color: '#10B981' },
  inactiveText: { color: '#6B7280' },
  metaGrid: { gap: 6, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#6B7280' },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16 },
});
