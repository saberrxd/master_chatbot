import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

declare global {
  var adminToken: string | undefined;
  var adminUsername: string | undefined;
}

interface Stats {
  total_questions: number;
  total_sessions: number;
  total_payments: number;
  paid_payments: number;
  total_revenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${global.adminToken}` },
      });
      if (res.ok) {
        setStats(await res.json());
      } else if (res.status === 401) {
        router.replace('/admin/login');
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!global.adminToken) {
      router.replace('/admin/login');
      return;
    }
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const logout = () => {
    global.adminToken = undefined;
    global.adminUsername = undefined;
    router.replace('/admin/login');
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
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{global.adminUsername || 'Admin'}</Text>
          </View>
          <TouchableOpacity testID="admin-logout-btn" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="help-circle" size={28} color="#F5A623" />
            <Text style={styles.statNum}>{stats?.total_questions || 0}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="chatbubbles" size={28} color="#3B82F6" />
            <Text style={styles.statNum}>{stats?.total_sessions || 0}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="card" size={28} color="#10B981" />
            <Text style={styles.statNum}>{stats?.paid_payments || 0}</Text>
            <Text style={styles.statLabel}>Payments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cash" size={28} color="#F59E0B" />
            <Text style={styles.statNum}>₹{stats?.total_revenue || 0}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Menu */}
        <Text style={styles.sectionTitle}>Management</Text>

        <TouchableOpacity
          testID="manage-questions-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/questions')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="list" size={22} color="#F5A623" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Manage Questions</Text>
            <Text style={styles.menuDesc}>Add, edit, or delete Q&A flows</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="view-sessions-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/sessions')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="people" size={22} color="#3B82F6" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Chat Sessions</Text>
            <Text style={styles.menuDesc}>View user conversations</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="add-question-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/add-question')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="add-circle" size={22} color="#10B981" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Add New Question</Text>
            <Text style={styles.menuDesc}>Create new Q&A entry</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="api-docs-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/api-docs')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="code-slash" size={22} color="#F59E0B" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>PHP SDK & API Docs</Text>
            <Text style={styles.menuDesc}>Integrate with your PHP admin panel</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="pg-settings-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/pg-settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="card-outline" size={22} color="#EF4444" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Payment Gateway Settings</Text>
            <Text style={styles.menuDesc}>Manage Razorpay & Cashfree credentials</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="manage-agents-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/agents')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="headset" size={22} color="#F5A623" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Manage Agents</Text>
            <Text style={styles.menuDesc}>Add, edit, or remove chat agents</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="sanctum-settings-btn"
          style={styles.menuItem}
          onPress={() => router.push('/admin/sanctum')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="shield-checkmark" size={22} color="#8B5CF6" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Sanctum Integration</Text>
            <Text style={styles.menuDesc}>Connect Laravel Sanctum authentication</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="go-home-btn"
          style={styles.menuItem}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="home" size={22} color="#6B7280" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Go to Chatbot</Text>
            <Text style={styles.menuDesc}>Test the chatbot experience</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 24, fontWeight: '800', color: '#111827' },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 6,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  menuDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
