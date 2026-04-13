import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Switch
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface OptionItem {
  id: string;
  text: string;
  next_question_id: string | null;
  is_answer: boolean;
  answer_text: string | null;
  requires_payment: boolean;
  payment_amount: number | null;
  payment_gateway: string | null;
  is_agent_handoff: boolean;
}

export default function AddQuestionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!params.editId;

  const [questionText, setQuestionText] = useState('');
  const [isRoot, setIsRoot] = useState(false);
  const [category, setCategory] = useState('');
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEdit, setFetchingEdit] = useState(isEdit);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  // Platform state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [showPlatformInput, setShowPlatformInput] = useState(false);

  useEffect(() => {
    fetchAllQuestions();
    fetchPlatforms();
    if (isEdit) fetchQuestion();
  }, []);

  const fetchAllQuestions = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/questions', {
        headers: { Authorization: 'Bearer ' + global.adminToken },
      });
      if (res.ok) setAllQuestions(await res.json());
    } catch (e) {}
  };

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/platforms/all', {
        headers: { Authorization: 'Bearer ' + global.adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailablePlatforms(data.platforms || []);
      }
    } catch (e) {}
  };

  const fetchQuestion = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/questions/' + params.editId);
      if (res.ok) {
        const data = await res.json();
        setQuestionText(data.text);
        setIsRoot(data.is_root);
        setCategory(data.category || '');
        setOptions(data.options || []);
        setSelectedPlatforms(data.platforms || []);
      }
    } catch (e) {}
    setFetchingEdit(false);
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const addCustomPlatform = async () => {
    const name = newPlatform.trim();
    if (!name) return;
    if (availablePlatforms.includes(name)) {
      togglePlatform(name);
      setNewPlatform('');
      setShowPlatformInput(false);
      return;
    }
    // Save to backend
    try {
      await fetch(BACKEND_URL + '/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.adminToken,
        },
        body: JSON.stringify({ name }),
      });
    } catch (e) {}
    setAvailablePlatforms(prev => [...prev, name].sort());
    setSelectedPlatforms(prev => [...prev, name]);
    setNewPlatform('');
    setShowPlatformInput(false);
  };

  const addOption = () => {
    setOptions(prev => [...prev, {
      id: 'opt_' + Date.now(),
      text: '',
      next_question_id: null,
      is_answer: false,
      answer_text: null,
      requires_payment: false,
      payment_amount: null,
      payment_gateway: null,
      is_agent_handoff: false,
    }]);
  };

  const updateOption = (index: number, field: string, value: any) => {
    setOptions(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!questionText.trim()) return Alert.alert('Error', 'Please enter question text');
    if (options.length === 0) return Alert.alert('Error', 'Add at least one option');

    for (const opt of options) {
      if (!opt.text.trim()) return Alert.alert('Error', 'All options must have text');
      if (opt.is_answer && !opt.answer_text?.trim()) return Alert.alert('Error', 'Answer options must have answer text');
      if (opt.requires_payment && (!opt.payment_amount || opt.payment_amount <= 0)) {
        return Alert.alert('Error', 'Paid options must have a valid amount');
      }
    }

    setLoading(true);
    try {
      const body = {
        text: questionText.trim(),
        is_root: isRoot,
        category: category.trim() || null,
        platforms: selectedPlatforms,
        options: options.map(o => ({
          ...o,
          text: o.text.trim(),
          answer_text: o.answer_text?.trim() || null,
          payment_gateway: o.requires_payment ? (o.payment_gateway || 'razorpay') : null,
        })),
      };

      const url = isEdit
        ? BACKEND_URL + '/api/questions/' + params.editId
        : BACKEND_URL + '/api/questions';

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + global.adminToken,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Alert.alert('Success', isEdit ? 'Question updated!' : 'Question created!');
        router.back();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.detail || 'Failed to save');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save question');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingEdit) {
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="add-q-back-btn" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Question' : 'New Question'}</Text>
          <TouchableOpacity
            testID="save-question-btn"
            onPress={save}
            disabled={loading}
            style={styles.saveBtn}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Question Text */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Question</Text>
            <TextInput
              testID="question-text-input"
              style={styles.textarea}
              placeholder="Enter your question..."
              placeholderTextColor="#9CA3AF"
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Platform Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platforms</Text>
            <Text style={styles.platformHint}>
              Select which platforms will see this question. Leave empty for all platforms.
            </Text>

            {/* Selected platforms */}
            {selectedPlatforms.length > 0 && (
              <View style={styles.selectedPlatforms}>
                {selectedPlatforms.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={styles.selectedChip}
                    onPress={() => togglePlatform(p)}
                  >
                    <Text style={styles.selectedChipText}>{p}</Text>
                    <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedPlatforms.length === 0 && (
              <View style={styles.allPlatformsBadge}>
                <Ionicons name="globe" size={14} color="#10B981" />
                <Text style={styles.allPlatformsText}>Available to ALL platforms</Text>
              </View>
            )}

            {/* Available platforms to pick */}
            <Text style={styles.miniLabel}>Tap to add/remove platforms:</Text>
            <View style={styles.platformGrid}>
              {availablePlatforms.map(p => {
                const isSelected = selectedPlatforms.includes(p);
                return (
                  <TouchableOpacity
                    key={p}
                    testID={'platform-' + p}
                    style={[styles.platformChip, isSelected && styles.platformChipActive]}
                    onPress={() => togglePlatform(p)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#F5A623'}
                    />
                    <Text style={[styles.platformChipText, isSelected && styles.platformChipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add new platform button */}
              <TouchableOpacity
                testID="add-platform-btn"
                style={styles.addPlatformChip}
                onPress={() => setShowPlatformInput(!showPlatformInput)}
              >
                <Ionicons name="add" size={16} color="#F5A623" />
                <Text style={styles.addPlatformText}>New Platform</Text>
              </TouchableOpacity>
            </View>

            {/* New platform input */}
            {showPlatformInput && (
              <View style={styles.newPlatformRow}>
                <TextInput
                  testID="new-platform-input"
                  style={styles.newPlatformInput}
                  placeholder="e.g., Website, Android, iOS, WhatsApp"
                  placeholderTextColor="#9CA3AF"
                  value={newPlatform}
                  onChangeText={setNewPlatform}
                  autoFocus
                />
                <TouchableOpacity
                  testID="save-platform-btn"
                  style={styles.newPlatformSave}
                  onPress={addCustomPlatform}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Root Question (first shown)</Text>
              <Switch
                testID="is-root-switch"
                value={isRoot}
                onValueChange={setIsRoot}
                trackColor={{ false: '#E5E7EB', true: '#F5A623' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <TextInput
              testID="category-input"
              style={styles.inputSmall}
              placeholder="Category (optional)"
              placeholderTextColor="#9CA3AF"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          {/* Options */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Options ({options.length})</Text>
              <TouchableOpacity testID="add-option-btn" onPress={addOption} style={styles.addOptBtn}>
                <Ionicons name="add" size={18} color="#F5A623" />
                <Text style={styles.addOptText}>Add Option</Text>
              </TouchableOpacity>
            </View>

            {options.map((opt, idx) => (
              <View key={opt.id} style={styles.optCard}>
                <View style={styles.optHeader}>
                  <Text style={styles.optNum}>Option {idx + 1}</Text>
                  <TouchableOpacity testID={'remove-option-' + idx} onPress={() => removeOption(idx)}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  testID={'option-text-' + idx}
                  style={styles.inputSmall}
                  placeholder="Option text (shown to user)"
                  placeholderTextColor="#9CA3AF"
                  value={opt.text}
                  onChangeText={(v) => updateOption(idx, 'text', v)}
                />

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Is Final Answer?</Text>
                  <Switch
                    testID={'is-answer-switch-' + idx}
                    value={opt.is_answer}
                    onValueChange={(v) => updateOption(idx, 'is_answer', v)}
                    trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {opt.is_answer && (
                  <TextInput
                    testID={'answer-text-' + idx}
                    style={[styles.textarea, { minHeight: 60 }]}
                    placeholder="Answer text..."
                    placeholderTextColor="#9CA3AF"
                    value={opt.answer_text || ''}
                    onChangeText={(v) => updateOption(idx, 'answer_text', v)}
                    multiline
                  />
                )}

                {!opt.is_answer && (
                  <View>
                    <Text style={styles.miniLabel}>Link to next question:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qLinkScroll}>
                      <TouchableOpacity
                        style={[styles.qLinkChip, !opt.next_question_id && styles.qLinkActive]}
                        onPress={() => updateOption(idx, 'next_question_id', null)}
                      >
                        <Text style={[styles.qLinkText, !opt.next_question_id && styles.qLinkActiveText]}>None</Text>
                      </TouchableOpacity>
                      {allQuestions.filter(q => q.id !== params.editId).map(q => (
                        <TouchableOpacity
                          key={q.id}
                          style={[styles.qLinkChip, opt.next_question_id === q.id && styles.qLinkActive]}
                          onPress={() => updateOption(idx, 'next_question_id', q.id)}
                        >
                          <Text
                            style={[styles.qLinkText, opt.next_question_id === q.id && styles.qLinkActiveText]}
                            numberOfLines={1}
                          >
                            {q.text.slice(0, 30)}...
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Requires Payment?</Text>
                  <Switch
                    testID={'requires-payment-switch-' + idx}
                    value={opt.requires_payment}
                    onValueChange={(v) => updateOption(idx, 'requires_payment', v)}
                    trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {!opt.is_answer && !opt.requires_payment && (
                  <View style={styles.settingRow}>
                    <View style={styles.settingLabelWrap}>
                      <Text style={styles.settingLabel}>Agent Handoff?</Text>
                      <Text style={styles.settingHint}>Transfers user to live agent</Text>
                    </View>
                    <Switch
                      testID={'agent-handoff-switch-' + idx}
                      value={opt.is_agent_handoff}
                      onValueChange={(v) => {
                        updateOption(idx, 'is_agent_handoff', v);
                        if (v) {
                          updateOption(idx, 'is_answer', false);
                          updateOption(idx, 'next_question_id', null);
                          updateOption(idx, 'requires_payment', false);
                        }
                      }}
                      trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                )}

                {opt.requires_payment && (
                  <View>
                    <TextInput
                      testID={'payment-amount-' + idx}
                      style={styles.inputSmall}
                      placeholder="Amount (INR)"
                      placeholderTextColor="#9CA3AF"
                      value={opt.payment_amount?.toString() || ''}
                      onChangeText={(v) => updateOption(idx, 'payment_amount', parseFloat(v) || null)}
                      keyboardType="numeric"
                    />
                    <View style={styles.gwRow}>
                      <TouchableOpacity
                        testID={'gw-razorpay-' + idx}
                        style={[styles.gwChip, (opt.payment_gateway === 'razorpay' || !opt.payment_gateway) && styles.gwActive]}
                        onPress={() => updateOption(idx, 'payment_gateway', 'razorpay')}
                      >
                        <Text style={[styles.gwChipText, (opt.payment_gateway === 'razorpay' || !opt.payment_gateway) && styles.gwActiveText]}>
                          Razorpay
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={'gw-cashfree-' + idx}
                        style={[styles.gwChip, opt.payment_gateway === 'cashfree' && styles.gwActive]}
                        onPress={() => updateOption(idx, 'payment_gateway', 'cashfree')}
                      >
                        <Text style={[styles.gwChipText, opt.payment_gateway === 'cashfree' && styles.gwActiveText]}>
                          Cashfree
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
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
  saveBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  textarea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputSmall: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  settingLabelWrap: { flex: 1 },
  settingHint: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  // Platform styles
  platformHint: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  selectedPlatforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  allPlatformsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
  },
  allPlatformsText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  miniLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 4 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  platformChipActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  platformChipText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  platformChipTextActive: { color: '#FFFFFF' },
  addPlatformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addPlatformText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  newPlatformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  newPlatformInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  newPlatformSave: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  addOptText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  optCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optNum: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  qLinkScroll: { marginBottom: 8 },
  qLinkChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  qLinkActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  qLinkText: { fontSize: 12, color: '#6B7280' },
  qLinkActiveText: { color: '#FFFFFF', fontWeight: '600' },
  gwRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  gwChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  gwActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  gwChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  gwActiveText: { color: '#FFFFFF' },
});
