import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, Alert, ActivityIndicator, RefreshControl, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Agent {
  id: string;
  username: string;
  display_name: string;
  platforms: string[];
  role: string;
  status: string;
}

export default function AgentsScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);

  // Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [role, setRole] = useState<string>('agent');

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + global.adminToken };

  useEffect(() => { fetchAgents(); fetchPlatforms(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/agents', { headers });
      if (res.ok) setAgents(await res.json());
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  };

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/platforms/all', { headers });
      if (res.ok) { const d = await res.json(); setAvailablePlatforms(d.platforms || []); }
    } catch (e) {}
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchAgents(); }, []);

  const resetForm = () => {
    setUsername(''); setPassword(''); setDisplayName(''); setSelPlatforms([]); setRole('agent'); setShowAdd(false); setEditAgent(null);
  };

  const startEdit = (agent: Agent) => {
    setEditAgent(agent);
    setUsername(agent.username);
    setDisplayName(agent.display_name);
    setSelPlatforms(agent.platforms);
    setRole(agent.role || 'agent');
    setPassword('');
    setShowAdd(true);
  };

  const togglePlatform = (p: string) => {
    setSelPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const saveAgent = async () => {
    if (!editAgent && (!username.trim() || !password.trim())) {
      return Alert.alert('Error', 'Username and password are required');
    }

    try {
      if (editAgent) {
        const body: any = { display_name: displayName.trim(), platforms: selPlatforms, role };
        if (password.trim()) body.password = password.trim();
        const res = await fetch(BACKEND_URL + '/api/agents/' + editAgent.id, {
          method: 'PUT', headers, body: JSON.stringify(body),
        });
        if (res.ok) { Alert.alert('Success', 'Agent updated'); resetForm(); fetchAgents(); }
      } else {
        const res = await fetch(BACKEND_URL + '/api/agents', {
          method: 'POST', headers,
          body: JSON.stringify({
            username: username.trim(), password: password.trim(),
            display_name: displayName.trim() || username.trim(), platforms: selPlatforms, role,
          }),
        });
        const data = await res.json();
        if (res.ok) { Alert.alert('Success', 'Agent created'); resetForm(); fetchAgents(); }
        else Alert.alert('Error', data.detail || 'Failed');
      }
    } catch (e) { Alert.alert('Error', 'Failed to save agent'); }
  };

  const deleteAgent = (id: string, name: string) => {
    Alert.alert('Delete Agent', 'Delete agent "' + name + '"?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await fetch(BACKEND_URL + '/api/agents/' + id, { method: 'DELETE', headers });
          fetchAgents();
        } catch (e) {}
      }},
    ]);
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Ionicons name="headset" size={18} color="#F5A623" />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRoleRow}>
            <Text style={styles.agentName}>{item.display_name}</Text>
            {item.role === 'master_agent' && (
              <View style={styles.masterBadge}>
                <Text style={styles.masterBadgeText}>MASTER</Text>
              </View>
            )}
          </View>
          <Text style={styles.agentUser}>@{item.username}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#10B981' : '#9CA3AF' }]} />
      </View>
      {item.platforms.length > 0 ? (
        <View style={styles.platformRow}>
          {item.platforms.map(p => (
            <View key={p} style={styles.platformChip}>
              <Text style={styles.platformChipText}>{p}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.allPlatText}>All platforms</Text>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#3B82F6" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteAgent(item.id, item.display_name)}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.loadWrap}><ActivityIndicator size="large" color="#F5A623" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity testID="agents-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agents ({agents.length})</Text>
        <TouchableOpacity testID="add-agent-btn" onPress={() => { resetForm(); setShowAdd(!showAdd); }} style={styles.addBtn}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add/Edit Form */}
      {showAdd && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editAgent ? 'Edit Agent' : 'New Agent'}</Text>
          {!editAgent && (
            <TextInput testID="agent-username-input" style={styles.formInput} placeholder="Username" placeholderTextColor="#9CA3AF" value={username} onChangeText={setUsername} autoCapitalize="none" />
          )}
          <TextInput testID="agent-password-input" style={styles.formInput} placeholder={editAgent ? 'New password (leave empty to keep)' : 'Password'} placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput testID="agent-displayname-input" style={styles.formInput} placeholder="Display Name" placeholderTextColor="#9CA3AF" value={displayName} onChangeText={setDisplayName} />

          <View style={styles.roleRow}>
            <Text style={styles.miniLabel}>Role:</Text>
            <View style={styles.roleToggle}>
              <TouchableOpacity
                style={[styles.roleOption, role === 'agent' && styles.roleOptionActive]}
                onPress={() => setRole('agent')}
              >
                <Text style={[styles.roleOptionText, role === 'agent' && styles.roleOptionActiveText]}>Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, role === 'master_agent' && styles.roleOptionMaster]}
                onPress={() => setRole('master_agent')}
              >
                <Text style={[styles.roleOptionText, role === 'master_agent' && styles.roleOptionActiveText]}>Master Agent</Text>
              </TouchableOpacity>
            </View>
          </View>
          {role === 'master_agent' && (
            <Text style={styles.masterHint}>Master agents can view all chats, reassign and unassign agents</Text>
          )}

          <Text style={styles.miniLabel}>Assign Platforms:</Text>
          <View style={styles.platformGrid}>
            {availablePlatforms.map(p => {
              const isSelected = selPlatforms.includes(p);
              return (
                <TouchableOpacity key={p} style={[styles.formPlatChip, isSelected && styles.formPlatActive]} onPress={() => togglePlatform(p)}>
                  <Text style={[styles.formPlatText, isSelected && styles.formPlatActiveText]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selPlatforms.length === 0 && <Text style={styles.allPlatHint}>No platforms = can see all sessions</Text>}

          <TouchableOpacity testID="save-agent-btn" style={styles.saveBtn} onPress={saveAgent}>
            <Text style={styles.saveBtnText}>{editAgent ? 'Update Agent' : 'Create Agent'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList data={agents} keyExtractor={item => item.id} renderItem={renderAgent} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />}
        ListEmptyComponent={<View style={styles.emptyWrap}><Ionicons name="headset-outline" size={48} color="#D1D5DB" /><Text style={styles.emptyText}>No agents yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center' },
  formCard: { backgroundColor: '#FFFFFF', margin: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  formInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 10 },
  miniLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  formPlatChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  formPlatActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  formPlatText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  formPlatActiveText: { color: '#FFFFFF' },
  allPlatHint: { fontSize: 11, color: '#10B981', marginBottom: 8 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  roleToggle: { flexDirection: 'row', flex: 1, gap: 6 },
  roleOption: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  roleOptionActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  roleOptionMaster: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  roleOptionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  roleOptionActiveText: { color: '#FFFFFF' },
  masterHint: { fontSize: 11, color: '#7C3AED', marginBottom: 8, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#F5A623', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  list: { padding: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardInfo: { flex: 1 },
  nameRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  masterBadge: { backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  masterBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  agentName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  agentUser: { fontSize: 12, color: '#6B7280' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  platformChip: { backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#F5A623' },
  platformChipText: { fontSize: 10, fontWeight: '700', color: '#F5A623' },
  allPlatText: { fontSize: 12, color: '#10B981', fontWeight: '500', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 12 },
});
