import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SanctumSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [testToken, setTestToken] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/sanctum-config`, {
        headers: { Authorization: `Bearer ${(global as any).adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled || false);
        setApiUrl(data.api_url || '');
      }
    } catch (e) {}
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!apiUrl.trim() && enabled) {
      Alert.alert('Error', 'Please enter the Laravel API URL');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/sanctum-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(global as any).adminToken}`,
        },
        body: JSON.stringify({
          enabled,
          api_url: apiUrl.trim(),
        }),
      });
      if (res.ok) {
        Alert.alert('Saved', 'Sanctum configuration updated successfully');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Failed to save');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Error', 'Please enter the Laravel API URL first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/sanctum-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(global as any).adminToken}`,
        },
        body: JSON.stringify({
          api_url: apiUrl.trim(),
          test_token: testToken.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Network error' });
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
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
        <Text style={styles.headerTitle}>Sanctum Integration</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={28} color="#8B5CF6" />
          <Text style={styles.infoTitle}>Laravel Sanctum Auth</Text>
          <Text style={styles.infoDesc}>
            Connect your Laravel application to allow users to authenticate with Sanctum tokens alongside JWT.
          </Text>
        </View>

        {/* Enable Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Enable Sanctum Authentication</Text>
            <Text style={styles.toggleDesc}>Accept Sanctum tokens for admin & agent API access</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
            thumbColor={enabled ? '#8B5CF6' : '#9CA3AF'}
          />
        </View>

        {/* API URL */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Laravel App URL</Text>
          <Text style={styles.fieldHint}>
            Base URL of your Laravel app (without /api)
          </Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://hiteam.hitch.zone"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>User sends API request with Sanctum token in Authorization header</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Chatbot detects Sanctum format (id|token) and validates via your Laravel API</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>User gets admin/agent access automatically — no separate login needed</Text>
          </View>
        </View>

        {/* Token Format */}
        <View style={styles.tokenFormatCard}>
          <Text style={styles.sectionTitle}>Token Format</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>Authorization Header:</Text>
            <Text style={styles.codeText}>Bearer 296782|INmFkiyJoay...</Text>
          </View>
          <Text style={styles.tokenNote}>
            Sanctum tokens contain a pipe (|) character. JWT tokens don't. The system automatically detects which type is being used.
          </Text>
        </View>

        {/* Test Connection */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Test Connection</Text>
          <Text style={styles.fieldHint}>Enter a Sanctum token to test the connection (optional)</Text>
          <TextInput
            style={styles.input}
            value={testToken}
            onChangeText={setTestToken}
            placeholder="Paste a Sanctum token to test..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.testBtn, testing && styles.btnDisabled]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Ionicons name="flash" size={18} color="#8B5CF6" />
            )}
            <Text style={styles.testBtnText}>{testing ? 'Testing...' : 'Test Connection'}</Text>
          </TouchableOpacity>

          {testResult && (
            <View style={[styles.testResult, testResult.success ? styles.testSuccess : styles.testFail]}>
              <Ionicons
                name={testResult.success ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={testResult.success ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.testResultText, testResult.success ? styles.testSuccessText : styles.testFailText]}>
                {testResult.message}
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={saveConfig}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="save" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 12 },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },

  infoCard: {
    backgroundColor: '#EDE9FE', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#C4B5FD',
  },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 8 },
  infoDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  toggleDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  fieldHint: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827',
  },

  howItWorks: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  stepText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },

  tokenFormatCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  codeBlock: { backgroundColor: '#1F2937', borderRadius: 10, padding: 14, marginBottom: 8 },
  codeLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  codeText: { fontSize: 13, color: '#A7F3D0', fontFamily: 'monospace' },
  tokenNote: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  testSection: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EDE9FE', borderRadius: 12, paddingVertical: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#C4B5FD',
  },
  testBtnText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  btnDisabled: { opacity: 0.6 },

  testResult: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12, marginTop: 12,
  },
  testSuccess: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  testFail: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  testResultText: { flex: 1, fontSize: 13, lineHeight: 20 },
  testSuccessText: { color: '#065F46' },
  testFailText: { color: '#DC2626' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
