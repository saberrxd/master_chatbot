import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, Switch, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LangSetting {
  code: string;
  enabled: boolean;
}

interface SupportedLang {
  code: string;
  name: string;
  native_name: string;
}

export default function AgentLanguagesScreen() {
  const router = useRouter();
  const [supported, setSupported] = useState<SupportedLang[]>([]);
  const [agentLangs, setAgentLangs] = useState<LangSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/languages', {
        headers: { Authorization: 'Bearer ' + global.agentToken },
      });
      if (res.ok) {
        const data = await res.json();
        setSupported(data.supported || []);
        setAgentLangs(data.languages || []);
      }
    } catch (e) {}
    setLoading(false);
  };

  const isEnabled = (code: string): boolean => {
    const lang = agentLangs.find(l => l.code === code);
    return lang ? lang.enabled : false;
  };

  const toggleLang = (code: string) => {
    setAgentLangs(prev => {
      const existing = prev.find(l => l.code === code);
      if (existing) {
        return prev.map(l => l.code === code ? { ...l, enabled: !l.enabled } : l);
      }
      return [...prev, { code, enabled: true }];
    });
  };

  const saveLanguages = async () => {
    setSaving(true);
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/languages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.agentToken,
        },
        body: JSON.stringify({ languages: agentLangs }),
      });
      if (res.ok) {
        Alert.alert('Saved', 'Language preferences updated');
        // Update global agent data
        if (global.agentData) {
          global.agentData.languages = agentLangs;
        }
      } else {
        Alert.alert('Error', 'Failed to save');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    }
    setSaving(false);
  };

  const enabledCount = agentLangs.filter(l => l.enabled).length;

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>My Languages</Text>
          <Text style={styles.headerSub}>{enabledCount} language{enabledCount !== 1 ? 's' : ''} active</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveLanguages}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="information-circle" size={16} color="#F5A623" />
        <Text style={styles.infoText}>Toggle ON the languages you can communicate in. You'll be matched with users who speak these languages.</Text>
      </View>

      <FlatList
        data={supported}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const enabled = isEnabled(item.code);
          return (
            <View style={[styles.langCard, enabled && styles.langCardActive]}>
              <View style={styles.langInfo}>
                <Text style={[styles.langNative, enabled && styles.langNativeActive]}>
                  {item.native_name}
                </Text>
                <Text style={styles.langName}>{item.name} ({item.code})</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={() => toggleLang(item.code)}
                trackColor={{ false: '#E5E7EB', true: '#F5A623' }}
                thumbColor="#FFFFFF"
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  saveBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  list: { padding: 12 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langCardActive: {
    borderColor: '#F5A623',
    backgroundColor: '#FFFBEB',
  },
  langInfo: { flex: 1 },
  langNative: { fontSize: 16, fontWeight: '600', color: '#374151' },
  langNativeActive: { color: '#92400E', fontWeight: '700' },
  langName: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
