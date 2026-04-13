import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PGState {
  razorpay: {
    enabled: boolean;
    mode: string;
    key_id_masked: string;
    key_secret_masked: string;
  };
  cashfree: {
    enabled: boolean;
    mode: string;
    app_id_masked: string;
    secret_key_masked: string;
  };
  default_gateway: string;
}

export default function PGSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<PGState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // OTP flow
  const [otpStep, setOtpStep] = useState<'none' | 'requesting' | 'enter' | 'verified'>('none');
  const [otp, setOtp] = useState('');
  const [otpPreview, setOtpPreview] = useState('');
  const [unmasked, setUnmasked] = useState<any>(null);

  // Edit mode
  const [editGateway, setEditGateway] = useState<string | null>(null);
  const [editKeyId, setEditKeyId] = useState('');
  const [editKeySecret, setEditKeySecret] = useState('');
  const [editAppId, setEditAppId] = useState('');
  const [editSecretKey, setEditSecretKey] = useState('');

  // Admin email
  const [adminEmail, setAdminEmail] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + global.adminToken,
  };

  useEffect(() => {
    if (!global.adminToken) {
      router.replace('/admin/login');
      return;
    }
    fetchSettings();
    fetchEmail();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings', { headers });
      if (res.ok) setSettings(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  const fetchEmail = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/admin-email', { headers });
      if (res.ok) {
        const data = await res.json();
        setEmailMasked(data.email_masked || '');
        setHasEmail(data.has_email);
      }
    } catch (e) {}
  };

  const saveEmail = async () => {
    if (!adminEmail.trim()) return Alert.alert('Error', 'Enter email');
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/admin-email', {
        method: 'PUT', headers,
        body: JSON.stringify({ email: adminEmail.trim() }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Email updated');
        setShowEmailInput(false);
        fetchEmail();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update');
    }
  };

  const requestOtp = async () => {
    setOtpStep('requesting');
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings/request-otp', {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (res.ok) {
        setOtpPreview(data.otp_preview || '');
        setOtpStep('enter');
        if (!data.email_sent_to) {
          Alert.alert('OTP Generated', 'OTP: ' + data.otp_preview + '\n\nConfigure admin email to receive OTP via mail.');
        } else {
          Alert.alert('OTP Sent', 'Check your email. Expires in 5 minutes.');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate OTP');
      setOtpStep('none');
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return Alert.alert('Error', 'Enter OTP');
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings/verify-otp', {
        method: 'POST', headers,
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setUnmasked(data);
        setOtpStep('verified');
        Alert.alert('Verified', 'Credentials are now visible');
      } else {
        Alert.alert('Invalid', data.detail || 'OTP verification failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Verification failed');
    }
  };

  const toggleGateway = async (gateway: string, enabled: boolean) => {
    setSaving(true);
    try {
      const body: any = {};
      body[gateway] = { enabled };
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings', {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      if (res.ok) fetchSettings();
    } catch (e) {}
    setSaving(false);
  };

  const toggleMode = async (gateway: string, mode: string) => {
    setSaving(true);
    try {
      const body: any = {};
      body[gateway] = { mode };
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings', {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      if (res.ok) fetchSettings();
    } catch (e) {}
    setSaving(false);
  };

  const setDefaultGateway = async (gw: string) => {
    setSaving(true);
    try {
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings', {
        method: 'PUT', headers,
        body: JSON.stringify({ default_gateway: gw }),
      });
      if (res.ok) fetchSettings();
    } catch (e) {}
    setSaving(false);
  };

  const saveCredentials = async (gateway: string) => {
    setSaving(true);
    try {
      const body: any = {};
      if (gateway === 'razorpay') {
        body.razorpay = {};
        if (editKeyId.trim()) body.razorpay.key_id = editKeyId.trim();
        if (editKeySecret.trim()) body.razorpay.key_secret = editKeySecret.trim();
      } else {
        body.cashfree = {};
        if (editAppId.trim()) body.cashfree.app_id = editAppId.trim();
        if (editSecretKey.trim()) body.cashfree.secret_key = editSecretKey.trim();
      }
      const res = await fetch(BACKEND_URL + '/api/admin/pg-settings', {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      if (res.ok) {
        Alert.alert('Success', 'Credentials updated');
        setEditGateway(null);
        setEditKeyId(''); setEditKeySecret(''); setEditAppId(''); setEditSecretKey('');
        fetchSettings();
        setUnmasked(null); setOtpStep('none');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadWrap}><ActivityIndicator size="large" color="#F5A623" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity testID="pg-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Gateway Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Admin Email for OTP */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail" size={18} color="#F5A623" />
            <Text style={styles.cardTitle}>Admin Email (for OTP)</Text>
          </View>
          {hasEmail ? (
            <View style={styles.emailRow}>
              <Text style={styles.emailMasked}>{emailMasked}</Text>
              <TouchableOpacity onPress={() => setShowEmailInput(true)} style={styles.editSmall}>
                <Text style={styles.editSmallText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noEmail}>No email configured. OTP will be shown in-app.</Text>
          )}
          {(showEmailInput || !hasEmail) && (
            <View style={styles.emailInputRow}>
              <TextInput
                testID="admin-email-input"
                style={styles.emailInput}
                placeholder="admin@yourcompany.com"
                placeholderTextColor="#9CA3AF"
                value={adminEmail}
                onChangeText={setAdminEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity testID="save-email-btn" style={styles.emailSaveBtn} onPress={saveEmail}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Default Gateway */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Default Gateway</Text>
          <Text style={styles.cardDesc}>Used when creating new paid questions</Text>
          <View style={styles.defaultRow}>
            <TouchableOpacity
              testID="default-razorpay"
              style={[styles.defaultChip, settings?.default_gateway === 'razorpay' && styles.defaultActive]}
              onPress={() => setDefaultGateway('razorpay')}
            >
              <Ionicons name="card" size={16} color={settings?.default_gateway === 'razorpay' ? '#FFF' : '#3B82F6'} />
              <Text style={[styles.defaultText, settings?.default_gateway === 'razorpay' && styles.defaultActiveText]}>
                Razorpay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="default-cashfree"
              style={[styles.defaultChip, settings?.default_gateway === 'cashfree' && styles.defaultActive]}
              onPress={() => setDefaultGateway('cashfree')}
            >
              <Ionicons name="wallet" size={16} color={settings?.default_gateway === 'cashfree' ? '#FFF' : '#10B981'} />
              <Text style={[styles.defaultText, settings?.default_gateway === 'cashfree' && styles.defaultActiveText]}>
                Cashfree
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Razorpay */}
        <View style={styles.card}>
          <View style={styles.gwHeader}>
            <View style={styles.gwLeft}>
              <View style={[styles.gwDot, { backgroundColor: settings?.razorpay.enabled ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.gwName}>Razorpay</Text>
            </View>
            <Switch
              testID="razorpay-toggle"
              value={settings?.razorpay.enabled}
              onValueChange={(v) => toggleGateway('razorpay', v)}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>Mode:</Text>
            <TouchableOpacity
              testID="rz-mode-test"
              style={[styles.modeChip, settings?.razorpay.mode === 'test' && styles.modeActive]}
              onPress={() => toggleMode('razorpay', 'test')}
            >
              <Text style={[styles.modeText, settings?.razorpay.mode === 'test' && styles.modeActiveText]}>Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="rz-mode-prod"
              style={[styles.modeChip, settings?.razorpay.mode === 'production' && styles.modeProdActive]}
              onPress={() => toggleMode('razorpay', 'production')}
            >
              <Text style={[styles.modeText, settings?.razorpay.mode === 'production' && styles.modeProdActiveText]}>Production</Text>
            </TouchableOpacity>
          </View>

          {/* Credentials */}
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Key ID</Text>
            <Text style={styles.credValue}>
              {otpStep === 'verified' && unmasked?.razorpay ? unmasked.razorpay.key_id : settings?.razorpay.key_id_masked}
            </Text>
          </View>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Key Secret</Text>
            <Text style={styles.credValue}>
              {otpStep === 'verified' && unmasked?.razorpay ? unmasked.razorpay.key_secret : settings?.razorpay.key_secret_masked}
            </Text>
          </View>

          <View style={styles.credActions}>
            <TouchableOpacity
              testID="edit-razorpay-btn"
              style={styles.credBtn}
              onPress={() => setEditGateway(editGateway === 'razorpay' ? null : 'razorpay')}
            >
              <Ionicons name="create-outline" size={16} color="#3B82F6" />
              <Text style={styles.credBtnText}>Edit Credentials</Text>
            </TouchableOpacity>
          </View>

          {editGateway === 'razorpay' && (
            <View style={styles.editSection}>
              <TextInput
                testID="rz-key-id-input"
                style={styles.editInput}
                placeholder="Enter new Razorpay Key ID"
                placeholderTextColor="#9CA3AF"
                value={editKeyId}
                onChangeText={setEditKeyId}
                autoCapitalize="none"
              />
              <TextInput
                testID="rz-key-secret-input"
                style={styles.editInput}
                placeholder="Enter new Razorpay Key Secret"
                placeholderTextColor="#9CA3AF"
                value={editKeySecret}
                onChangeText={setEditKeySecret}
                autoCapitalize="none"
                secureTextEntry
              />
              <TouchableOpacity
                testID="save-razorpay-btn"
                style={styles.saveCredBtn}
                onPress={() => saveCredentials('razorpay')}
                disabled={saving}
              >
                <Text style={styles.saveCredText}>{saving ? 'Saving...' : 'Save Razorpay Credentials'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Cashfree */}
        <View style={styles.card}>
          <View style={styles.gwHeader}>
            <View style={styles.gwLeft}>
              <View style={[styles.gwDot, { backgroundColor: settings?.cashfree.enabled ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.gwName}>Cashfree</Text>
            </View>
            <Switch
              testID="cashfree-toggle"
              value={settings?.cashfree.enabled}
              onValueChange={(v) => toggleGateway('cashfree', v)}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>Mode:</Text>
            <TouchableOpacity
              testID="cf-mode-test"
              style={[styles.modeChip, settings?.cashfree.mode === 'test' && styles.modeActive]}
              onPress={() => toggleMode('cashfree', 'test')}
            >
              <Text style={[styles.modeText, settings?.cashfree.mode === 'test' && styles.modeActiveText]}>Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cf-mode-prod"
              style={[styles.modeChip, settings?.cashfree.mode === 'production' && styles.modeProdActive]}
              onPress={() => toggleMode('cashfree', 'production')}
            >
              <Text style={[styles.modeText, settings?.cashfree.mode === 'production' && styles.modeProdActiveText]}>Production</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.credRow}>
            <Text style={styles.credLabel}>App ID</Text>
            <Text style={styles.credValue}>
              {otpStep === 'verified' && unmasked?.cashfree ? unmasked.cashfree.app_id : settings?.cashfree.app_id_masked}
            </Text>
          </View>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Secret Key</Text>
            <Text style={styles.credValue}>
              {otpStep === 'verified' && unmasked?.cashfree ? unmasked.cashfree.secret_key : settings?.cashfree.secret_key_masked}
            </Text>
          </View>

          <View style={styles.credActions}>
            <TouchableOpacity
              testID="edit-cashfree-btn"
              style={styles.credBtn}
              onPress={() => setEditGateway(editGateway === 'cashfree' ? null : 'cashfree')}
            >
              <Ionicons name="create-outline" size={16} color="#3B82F6" />
              <Text style={styles.credBtnText}>Edit Credentials</Text>
            </TouchableOpacity>
          </View>

          {editGateway === 'cashfree' && (
            <View style={styles.editSection}>
              <TextInput
                testID="cf-app-id-input"
                style={styles.editInput}
                placeholder="Enter new Cashfree App ID"
                placeholderTextColor="#9CA3AF"
                value={editAppId}
                onChangeText={setEditAppId}
                autoCapitalize="none"
              />
              <TextInput
                testID="cf-secret-key-input"
                style={styles.editInput}
                placeholder="Enter new Cashfree Secret Key"
                placeholderTextColor="#9CA3AF"
                value={editSecretKey}
                onChangeText={setEditSecretKey}
                autoCapitalize="none"
                secureTextEntry
              />
              <TouchableOpacity
                testID="save-cashfree-btn"
                style={styles.saveCredBtn}
                onPress={() => saveCredentials('cashfree')}
                disabled={saving}
              >
                <Text style={styles.saveCredText}>{saving ? 'Saving...' : 'Save Cashfree Credentials'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* View Credentials (OTP) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye" size={18} color="#F5A623" />
            <Text style={styles.cardTitle}>View Full Credentials</Text>
          </View>
          <Text style={styles.cardDesc}>
            Requires OTP verification. OTP will be sent to your email.
          </Text>

          {otpStep === 'none' && (
            <TouchableOpacity testID="request-otp-btn" style={styles.otpBtn} onPress={requestOtp}>
              <Ionicons name="lock-open" size={18} color="#FFFFFF" />
              <Text style={styles.otpBtnText}>Request OTP to View</Text>
            </TouchableOpacity>
          )}

          {otpStep === 'requesting' && (
            <View style={styles.otpLoading}>
              <ActivityIndicator color="#F5A623" />
              <Text style={styles.otpLoadingText}>Generating OTP...</Text>
            </View>
          )}

          {otpStep === 'enter' && (
            <View style={styles.otpEnterSection}>
              <TextInput
                testID="otp-input"
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#9CA3AF"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <View style={styles.otpActions}>
                <TouchableOpacity testID="verify-otp-btn" style={styles.verifyBtn} onPress={verifyOtp}>
                  <Text style={styles.verifyBtnText}>Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resendBtn} onPress={requestOtp}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {otpStep === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.verifiedText}>Credentials visible above (scroll up)</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  // Email
  emailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emailMasked: { fontSize: 14, color: '#374151', fontWeight: '500' },
  noEmail: { fontSize: 13, color: '#EF4444' },
  editSmall: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  editSmallText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  emailInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  emailInput: {
    flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  emailSaveBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
  },
  // Default GW
  defaultRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  defaultChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 12, borderRadius: 12,
  },
  defaultActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  defaultText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  defaultActiveText: { color: '#FFFFFF' },
  // Gateway card
  gwHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  gwLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gwDot: { width: 10, height: 10, borderRadius: 5 },
  gwName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  // Mode
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modeLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  modeActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  modeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeActiveText: { color: '#FFFFFF' },
  modeProdActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  modeProdActiveText: { color: '#FFFFFF' },
  // Credentials
  credRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  credLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  credValue: { fontSize: 13, fontWeight: '500', color: '#111827', maxWidth: '60%' },
  credActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  credBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  credBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  // Edit
  editSection: { marginTop: 12, gap: 10 },
  editInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  saveCredBtn: {
    backgroundColor: '#F5A623', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  saveCredText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  // OTP
  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F5A623', paddingVertical: 14, borderRadius: 12,
  },
  otpBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  otpLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  otpLoadingText: { fontSize: 14, color: '#6B7280' },
  otpEnterSection: { gap: 12 },
  otpInput: {
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#F5A623',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, fontSize: 22,
    fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: 8,
  },
  otpActions: { flexDirection: 'row', gap: 10 },
  verifyBtn: { flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  verifyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  resendBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10,
  },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
});
