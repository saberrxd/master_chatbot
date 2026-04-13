import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SDKInitScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [channelName, setChannelName] = useState('');
  const [assignedMaster, setAssignedMaster] = useState('');
  const [assignedMonitor, setAssignedMonitor] = useState('');
  const [loading, setLoading] = useState(false);

  const startChat = async () => {
    if (!userName.trim()) return Alert.alert('Required', 'Please enter your name');
    if (!userMobile.trim()) return Alert.alert('Required', 'Please enter your mobile number');
    if (!platformName.trim()) return Alert.alert('Required', 'Please enter platform name');

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName.trim(),
          user_mobile: userMobile.trim(),
          platform_name: platformName.trim(),
          user_email: userEmail.trim() || null,
          channel_name: channelName.trim() || null,
          assigned_master: assignedMaster.trim() || null,
          assigned_monitor: assignedMonitor.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push({
          pathname: '/chat',
          params: {
            sessionId: data.id,
            userName: userName.trim(),
            userEmail: userEmail.trim(),
            userMobile: userMobile.trim(),
          },
        });
      } else {
        Alert.alert('Error', data.detail || 'Failed to start session');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="chatbubbles" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>ChatBot SDK</Text>
            <Text style={styles.subtitle}>Fill in your details to start a conversation</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Required Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-user-name"
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-user-mobile"
                  style={styles.input}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#9CA3AF"
                  value={userMobile}
                  onChangeText={setUserMobile}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Platform <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="globe-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-platform-name"
                  style={styles.input}
                  placeholder="e.g., Website, Mobile App"
                  placeholderTextColor="#9CA3AF"
                  value={platformName}
                  onChangeText={setPlatformName}
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Optional Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-user-email"
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  value={userEmail}
                  onChangeText={setUserEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Channel Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="megaphone-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-channel-name"
                  style={styles.input}
                  placeholder="Enter channel name"
                  placeholderTextColor="#9CA3AF"
                  value={channelName}
                  onChangeText={setChannelName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assigned Master</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-assigned-master"
                  style={styles.input}
                  placeholder="Enter assigned master"
                  placeholderTextColor="#9CA3AF"
                  value={assignedMaster}
                  onChangeText={setAssignedMaster}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assigned Monitor</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="eye-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="input-assigned-monitor"
                  style={styles.input}
                  placeholder="Enter assigned monitor"
                  placeholderTextColor="#9CA3AF"
                  value={assignedMonitor}
                  onChangeText={setAssignedMonitor}
                />
              </View>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            testID="start-chat-btn"
            style={[styles.startBtn, loading && styles.disabledBtn]}
            onPress={startChat}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>
              {loading ? 'Starting...' : 'Start Chat'}
            </Text>
          </TouchableOpacity>

          {/* Admin Link */}
          <TouchableOpacity
            testID="admin-login-link"
            style={styles.adminLink}
            onPress={() => router.push('/admin/login')}
          >
            <Ionicons name="settings-outline" size={16} color="#9CA3AF" />
            <Text style={styles.adminLinkText}>Admin Panel</Text>
          </TouchableOpacity>

          {/* Agent Login Link */}
          <TouchableOpacity
            testID="agent-login-link"
            style={styles.agentLink}
            onPress={() => router.push('/agent/login')}
          >
            <Ionicons name="headset-outline" size={16} color="#F5A623" />
            <Text style={styles.agentLinkText}>Agent Portal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: '#FFF8E1',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  form: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  required: { color: '#EF4444' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  disabledBtn: { opacity: 0.6 },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  adminLinkText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  agentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  agentLinkText: {
    fontSize: 14,
    color: '#F5A623',
    fontWeight: '600',
  },
});
