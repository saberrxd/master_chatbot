import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Question {
  id: string;
  text: string;
  options: any[];
  is_root: boolean;
  category: string | null;
  created_at: string;
}

export default function QuestionsScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/questions`, {
        headers: { Authorization: `Bearer ${global.adminToken}` },
      });
      if (res.ok) {
        setQuestions(await res.json());
      } else if (res.status === 401) {
        router.replace('/admin/login');
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuestions();
  }, []);

  const deleteQuestion = async (id: string) => {
    const performDelete = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/questions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${global.adminToken}` },
        });
        if (res.ok) {
          setQuestions(prev => prev.filter(q => q.id !== id));
        } else {
          const data = await res.json();
          if (Platform.OS === 'web') {
            window.alert(data.detail || 'Failed to delete');
          } else {
            Alert.alert('Error', data.detail || 'Failed to delete');
          }
        }
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert('Could not connect to server');
        } else {
          Alert.alert('Error', 'Could not connect to server');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this question?')) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Question', 'Are you sure you want to delete this question?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const renderQuestion = ({ item }: { item: Question }) => {
    const paidCount = item.options.filter((o: any) => o.requires_payment).length;
    const freeCount = item.options.length - paidCount;
    const platforms = (item as any).platforms || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {item.is_root && (
            <View style={styles.rootBadge}>
              <Text style={styles.rootBadgeText}>ROOT</Text>
            </View>
          )}
          {item.category && (
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{item.category}</Text>
            </View>
          )}
        </View>

        <Text style={styles.questionText} numberOfLines={2}>{item.text}</Text>

        {/* Platform badges */}
        {platforms.length > 0 ? (
          <View style={styles.platformRow}>
            <Ionicons name="globe-outline" size={13} color="#6B7280" />
            {platforms.map((p: string) => (
              <View key={p} style={styles.platformBadge}>
                <Text style={styles.platformBadgeText}>{p}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.platformRow}>
            <Ionicons name="globe" size={13} color="#10B981" />
            <Text style={styles.allPlatText}>All platforms</Text>
          </View>
        )}

        <View style={styles.optionStats}>
          <View style={styles.statChip}>
            <Ionicons name="list" size={14} color="#6B7280" />
            <Text style={styles.statChipText}>{item.options.length} options</Text>
          </View>
          {freeCount > 0 && (
            <View style={[styles.statChip, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.statChipText, { color: '#10B981' }]}>{freeCount} free</Text>
            </View>
          )}
          {paidCount > 0 && (
            <View style={[styles.statChip, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="card" size={14} color="#F59E0B" />
              <Text style={[styles.statChipText, { color: '#F59E0B' }]}>{paidCount} paid</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            testID={`journey-question-${item.id}`}
            style={styles.journeyCardBtn}
            onPress={() => router.push({ pathname: '/admin/journey', params: { questionId: item.id } })}
          >
            <Ionicons name="git-branch-outline" size={18} color="#F5A623" />
            <Text style={styles.journeyCardText}>Journey</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`edit-question-${item.id}`}
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/admin/add-question', params: { editId: item.id } })}
          >
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`delete-question-${item.id}`}
            style={styles.deleteBtn}
            onPress={() => deleteQuestion(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity testID="questions-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Questions</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            testID="bulk-upload-btn"
            onPress={() => router.push('/admin/bulk-upload')}
            style={styles.bulkUploadBtn}
          >
            <Ionicons name="cloud-upload" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="view-journey-btn"
            onPress={() => router.push('/admin/journey')}
            style={styles.journeyBtn}
          >
            <Ionicons name="git-branch" size={18} color="#F5A623" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="add-new-question-btn"
            onPress={() => router.push('/admin/add-question')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        renderItem={renderQuestion}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="help-circle-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No questions yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first question</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulkUploadBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  journeyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rootBadge: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rootBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  catBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  questionText: { fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 22, marginBottom: 10 },
  optionStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statChipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  cardActions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  journeyCardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#F5A623',
  },
  journeyCardText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  platformBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  platformBadgeText: { fontSize: 10, fontWeight: '700', color: '#F5A623' },
  allPlatText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
});
