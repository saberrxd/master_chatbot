import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UploadResult {
  success: boolean;
  total_questions_created: number;
  total_options_created: number;
  questions: Array<{
    ref: string;
    id: string;
    text: string;
    is_root: boolean;
    options_count: number;
  }>;
  errors: string[];
  warnings: string[];
}

export default function BulkUploadScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/platforms/all`, {
        headers: { Authorization: `Bearer ${(global as any).adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlatforms(data.platforms || []);
      }
    } catch (e) {}
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const fname = asset.name || '';
        const ext = fname.split('.').pop()?.toLowerCase();
        if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
          Alert.alert('Invalid File', 'Please select a .csv or .xlsx file');
          return;
        }
        setSelectedFile(asset);
        setResult(null);
        setError(null);
      }
    } catch (e) {
      console.log('File picker error:', e);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // For web: fetch the file URI and create a Blob
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name || 'upload.csv');
      } else {
        // For native: use URI directly
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name || 'upload.csv',
          type: selectedFile.mimeType || 'text/csv',
        } as any);
      }

      const res = await fetch(`${BACKEND_URL}/api/questions/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(global as any).adminToken}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Upload failed');
      }
    } catch (e: any) {
      setError(e.message || 'Network error occurred');
    }
    setUploading(false);
  };

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      if (Platform.OS === 'web') {
        // Web: create a direct download link
        const link = document.createElement('a');
        link.href = `${BACKEND_URL}/api/questions/bulk-template`;
        link.download = 'questions_template.csv';
        // Add auth header via fetch
        const res = await fetch(`${BACKEND_URL}/api/questions/bulk-template`, {
          headers: { Authorization: `Bearer ${(global as any).adminToken}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          Alert.alert('Error', 'Failed to download template');
        }
      } else {
        Alert.alert('Template', 'Template download is available on web. The CSV format is:\nquestion_ref, question_text, is_root, platforms, option_text, is_answer, answer_text, next_question_ref, is_agent_handoff, requires_payment, payment_amount, payment_gateway');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to download template');
    }
    setDownloadingTemplate(false);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulk Upload Questions</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="cloud-upload" size={32} color="#F5A623" />
          <Text style={styles.infoTitle}>Upload Questions via CSV/Excel</Text>
          <Text style={styles.infoDesc}>
            Upload a CSV or Excel file to bulk create questions with options. Each row represents one option under a question.
          </Text>
        </View>

        {/* Template Download */}
        <View style={styles.templateSection}>
          <Text style={styles.sectionTitle}>Step 1: Download Template</Text>
          <Text style={styles.sectionDesc}>Download the CSV template, fill in your questions, then upload.</Text>
          <TouchableOpacity
            style={styles.templateBtn}
            onPress={downloadTemplate}
            disabled={downloadingTemplate}
          >
            {downloadingTemplate ? (
              <ActivityIndicator size="small" color="#F5A623" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#F5A623" />
            )}
            <Text style={styles.templateBtnText}>Download CSV Template</Text>
          </TouchableOpacity>
        </View>

        {/* Available Platforms */}
        {platforms.length > 0 && (
          <View style={styles.platformSection}>
            <Text style={styles.sectionTitle}>Available Platforms</Text>
            <Text style={styles.sectionDesc}>Use these exact platform names in the "platforms" column (comma-separated):</Text>
            <View style={styles.platformChips}>
              {platforms.map((p, idx) => (
                <View key={idx} style={styles.platformChip}>
                  <Ionicons name="globe-outline" size={12} color="#F5A623" />
                  <Text style={styles.platformChipText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Format Guide */}
        <View style={styles.formatSection}>
          <Text style={styles.sectionTitle}>CSV Format Guide</Text>
          <View style={styles.formatGrid}>
            {[
              { col: 'question_ref', desc: 'Unique ID (e.g., Q1, Q2)', required: true },
              { col: 'question_text', desc: 'Question shown to users', required: true },
              { col: 'is_root', desc: '"yes" for first question', required: false },
              { col: 'platforms', desc: 'Comma-separated (e.g., Website,Android)', required: false },
              { col: 'option_text', desc: 'Option/answer text', required: true },
              { col: 'is_answer', desc: '"yes" if final answer', required: false },
              { col: 'answer_text', desc: 'Answer content', required: false },
              { col: 'next_question_ref', desc: 'Links to another question_ref', required: false },
              { col: 'is_agent_handoff', desc: '"yes" to connect user to agent', required: false },
              { col: 'requires_payment', desc: '"yes" for paid answers', required: false },
              { col: 'payment_amount', desc: 'Price (e.g., 499)', required: false },
              { col: 'payment_gateway', desc: '"razorpay" or "cashfree"', required: false },
            ].map((item, idx) => (
              <View key={idx} style={styles.formatRow}>
                <View style={styles.formatColName}>
                  <Text style={styles.formatColText}>{item.col}</Text>
                  {item.required && (
                    <View style={styles.reqBadge}>
                      <Text style={styles.reqBadgeText}>REQ</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.formatDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* File Picker */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Step 2: Select & Upload File</Text>

          {!selectedFile ? (
            <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
              <View style={styles.pickBtnInner}>
                <Ionicons name="document-attach-outline" size={40} color="#D1D5DB" />
                <Text style={styles.pickBtnTitle}>Tap to select file</Text>
                <Text style={styles.pickBtnSub}>Supports .csv and .xlsx</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.fileSelected}>
              <View style={styles.fileInfo}>
                <View style={styles.fileIconWrap}>
                  <Ionicons
                    name={selectedFile.name?.endsWith('.csv') ? 'document-text' : 'grid'}
                    size={24}
                    color="#F5A623"
                  />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </Text>
                </View>
                <TouchableOpacity onPress={resetUpload} style={styles.removeFileBtn}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                onPress={uploadFile}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.uploadBtnText}>
                  {uploading ? 'Uploading...' : 'Upload & Create Questions'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results Display */}
        {result && (
          <View style={styles.resultSection}>
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={styles.successTitle}>Upload Successful!</Text>
              <Text style={styles.successDesc}>
                Created {result.total_questions_created} questions with {result.total_options_created} total options
              </Text>
            </View>

            {/* Question Summary */}
            <Text style={styles.resultSubTitle}>Questions Created</Text>
            {result.questions.map((q, idx) => (
              <View key={idx} style={styles.resultQCard}>
                <View style={styles.resultQHeader}>
                  <View style={styles.refBadge}>
                    <Text style={styles.refBadgeText}>{q.ref}</Text>
                  </View>
                  {q.is_root && (
                    <View style={styles.rootBadge}>
                      <Text style={styles.rootBadgeText}>ROOT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.resultQText} numberOfLines={2}>{q.text}</Text>
                <Text style={styles.resultQOpts}>{q.options_count} options</Text>
              </View>
            ))}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <View style={styles.warningsCard}>
                <View style={styles.warningsHeader}>
                  <Ionicons name="warning" size={18} color="#F59E0B" />
                  <Text style={styles.warningsTitle}>Warnings ({result.warnings.length})</Text>
                </View>
                {result.warnings.map((w, idx) => (
                  <Text key={idx} style={styles.warningText}>{w}</Text>
                ))}
              </View>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <View style={styles.errorsCard}>
                <View style={styles.warningsHeader}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                  <Text style={[styles.warningsTitle, { color: '#EF4444' }]}>Row Errors ({result.errors.length})</Text>
                </View>
                {result.errors.map((e, idx) => (
                  <Text key={idx} style={styles.errorRowText}>{e}</Text>
                ))}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.viewQBtn}
                onPress={() => router.replace('/admin/questions')}
              >
                <Ionicons name="list" size={18} color="#FFFFFF" />
                <Text style={styles.viewQBtnText}>View Questions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadAgainBtn} onPress={resetUpload}>
                <Ionicons name="refresh" size={18} color="#F5A623" />
                <Text style={styles.uploadAgainText}>Upload More</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 12 },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 8 },
  infoDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Section titles
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 20 },

  // Template
  templateSection: { marginBottom: 20 },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#F5A623', borderStyle: 'dashed',
  },
  templateBtnText: { fontSize: 14, fontWeight: '600', color: '#F5A623' },

  // Platform section
  platformSection: { marginBottom: 20 },
  platformChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#F5A623',
  },
  platformChipText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  // Format Guide
  formatSection: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB',
  },
  formatGrid: {},
  formatRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  formatColName: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 155 },
  formatColText: { fontSize: 11, fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  reqBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  reqBadgeText: { fontSize: 8, fontWeight: '800', color: '#EF4444' },
  formatDesc: { flex: 1, fontSize: 11, color: '#6B7280' },

  // Upload
  uploadSection: { marginBottom: 20 },
  pickBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2,
    borderColor: '#E5E7EB', borderStyle: 'dashed', overflow: 'hidden',
  },
  pickBtnInner: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  pickBtnTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 10 },
  pickBtnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // File selected
  fileSelected: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  fileIconWrap: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center',
  },
  fileDetails: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  fileSize: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  removeFileBtn: { padding: 4 },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 14,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Error
  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 20 },

  // Results
  resultSection: { marginBottom: 20 },
  successCard: {
    backgroundColor: '#ECFDF5', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0',
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#065F46', marginTop: 8 },
  successDesc: { fontSize: 13, color: '#047857', marginTop: 4, textAlign: 'center' },

  resultSubTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  resultQCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  resultQHeader: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  refBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  refBadgeText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  rootBadge: { backgroundColor: '#F5A623', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rootBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  resultQText: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  resultQOpts: { fontSize: 12, color: '#6B7280' },

  warningsCard: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: '#FDE68A',
  },
  warningsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  warningsTitle: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  warningText: { fontSize: 12, color: '#92400E', marginBottom: 4, lineHeight: 18 },

  errorsCard: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorRowText: { fontSize: 12, color: '#DC2626', marginBottom: 4, lineHeight: 18 },

  resultActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  viewQBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 14,
  },
  viewQBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  uploadAgainBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F5A623',
  },
  uploadAgainText: { fontSize: 14, fontWeight: '600', color: '#F5A623' },
});
