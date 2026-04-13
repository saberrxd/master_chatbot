import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

declare global {
  var agentToken: string | undefined;
  var agentData: any;
}

export default function AgentLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username.trim() || !password.trim()) return Alert.alert('Error', 'Fill all fields');
    setLoading(true);
    try {
      const res = await fetch(BACKEND_URL + '/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        global.agentToken = data.token;
        global.agentData = data.agent;
        router.replace('/agent/dashboard');
      } else {
        Alert.alert('Login Failed', data.detail || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity testID="agent-login-back" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="headset" size={36} color="#F5A623" />
            </View>
            <Text style={styles.title}>Agent Login</Text>
            <Text style={styles.subtitle}>Sign in to start chatting with users</Text>
          </View>
          <TextInput testID="agent-login-username" style={styles.input} placeholder="Username" placeholderTextColor="#9CA3AF" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput testID="agent-login-password" style={styles.input} placeholder="Password" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity testID="agent-login-btn" style={[styles.loginBtn, loading && { opacity: 0.6 }]} onPress={login} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 20 },
  backBtn: { padding: 4, marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827', marginBottom: 14 },
  loginBtn: { backgroundColor: '#F5A623', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  loginText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
