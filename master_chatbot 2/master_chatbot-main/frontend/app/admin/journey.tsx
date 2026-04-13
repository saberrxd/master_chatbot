import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Option {
  id: string;
  text: string;
  next_question_id: string | null;
  is_answer: boolean;
  answer_text: string | null;
  requires_payment: boolean;
  payment_amount: number | null;
  payment_gateway: string | null;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
  is_root: boolean;
  category: string | null;
  platforms: string[];
}

// A step in the simulated journey
interface JourneyStep {
  type: 'question' | 'answer' | 'payment';
  question?: Question;
  selectedOption?: Option;
  answerText?: string;
}

export default function JourneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ questionId?: string }>();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'simulate'>('tree');

  // Simulate mode state
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [journeyComplete, setJourneyComplete] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(BACKEND_URL + '/api/questions', {
        headers: { Authorization: 'Bearer ' + global.adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setAllQuestions(data);

        // Find starting question
        let startQ: Question | null = null;
        if (params.questionId) {
          startQ = data.find((q: Question) => q.id === params.questionId) || null;
        }
        if (!startQ) {
          startQ = data.find((q: Question) => q.is_root) || null;
        }
        if (!startQ && data.length > 0) {
          startQ = data[0];
        }
        if (startQ) {
          setCurrentQuestion(startQ);
          setJourneySteps([{ type: 'question', question: startQ }]);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const getQuestionById = (id: string): Question | undefined => {
    return allQuestions.find(q => q.id === id);
  };

  // Simulate: user selects an option
  const simulateSelect = (option: Option) => {
    const newSteps = [...journeySteps];

    // Record the user's selection
    newSteps.push({
      type: option.requires_payment ? 'payment' : (option.is_answer ? 'answer' : 'question'),
      selectedOption: option,
      answerText: option.answer_text || undefined,
    });

    if (option.requires_payment) {
      // Show payment step then answer
      newSteps.push({
        type: 'answer',
        answerText: option.answer_text || 'Content unlocked after payment.',
      });
      setJourneySteps(newSteps);
      setJourneyComplete(true);
      setCurrentQuestion(null);
    } else if (option.is_answer) {
      // Direct answer - journey may continue from root
      setJourneySteps(newSteps);
      setJourneyComplete(true);
      setCurrentQuestion(null);
    } else if (option.next_question_id) {
      const nextQ = getQuestionById(option.next_question_id);
      if (nextQ) {
        newSteps.push({ type: 'question', question: nextQ });
        setJourneySteps(newSteps);
        setCurrentQuestion(nextQ);
      } else {
        setJourneySteps(newSteps);
        setJourneyComplete(true);
        setCurrentQuestion(null);
      }
    } else {
      setJourneySteps(newSteps);
      setJourneyComplete(true);
      setCurrentQuestion(null);
    }
  };

  const resetSimulation = () => {
    const startQ = params.questionId
      ? getQuestionById(params.questionId)
      : allQuestions.find(q => q.is_root) || allQuestions[0];
    if (startQ) {
      setCurrentQuestion(startQ);
      setJourneySteps([{ type: 'question', question: startQ }]);
      setJourneyComplete(false);
    }
  };

  // Tree view: recursively render question nodes
  const renderTreeNode = (question: Question, depth: number, visited: Set<string>) => {
    if (visited.has(question.id)) {
      return (
        <View key={question.id + '_loop_' + depth} style={[styles.treeNode, { marginLeft: depth * 16 }]}>
          <View style={styles.loopBadge}>
            <Ionicons name="refresh" size={12} color="#F59E0B" />
            <Text style={styles.loopText}>Loops back (already shown)</Text>
          </View>
        </View>
      );
    }

    const newVisited = new Set(visited);
    newVisited.add(question.id);

    return (
      <View key={question.id + '_' + depth} style={[styles.treeNode, { marginLeft: depth * 16 }]}>
        {/* Connector line */}
        {depth > 0 && <View style={styles.connector} />}

        {/* Question box */}
        <View style={[styles.treeQuestion, question.is_root && styles.treeQuestionRoot]}>
          <View style={styles.treeQHeader}>
            {question.is_root && (
              <View style={styles.rootTag}>
                <Text style={styles.rootTagText}>ROOT</Text>
              </View>
            )}
            {question.platforms && question.platforms.length > 0 && (
              <View style={styles.platformTag}>
                <Text style={styles.platformTagText}>
                  {question.platforms.join(', ')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.treeQBubble}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#F5A623" />
            <Text style={styles.treeQText}>{question.text}</Text>
          </View>

          {/* Options */}
          {question.options.map((opt, oi) => (
            <View key={opt.id} style={styles.treeOption}>
              <View style={styles.treeOptionHeader}>
                <View style={[
                  styles.optionDot,
                  { backgroundColor: opt.requires_payment ? '#F59E0B' : opt.is_answer ? '#10B981' : '#3B82F6' }
                ]} />
                <Text style={styles.treeOptionText} numberOfLines={2}>{opt.text}</Text>
              </View>

              {/* Badges */}
              <View style={styles.optionBadges}>
                {opt.requires_payment && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="card" size={10} color="#F59E0B" />
                    <Text style={styles.paidBadgeText}>
                      {'Rs.' + (opt.payment_amount || 0) + ' ' + (opt.payment_gateway || '')}
                    </Text>
                  </View>
                )}
                {opt.is_answer && !opt.requires_payment && (
                  <View style={styles.freeBadge}>
                    <Ionicons name="checkmark-circle" size={10} color="#10B981" />
                    <Text style={styles.freeBadgeText}>Free Answer</Text>
                  </View>
                )}
                {!opt.is_answer && opt.next_question_id && (
                  <View style={styles.linkBadge}>
                    <Ionicons name="arrow-forward" size={10} color="#3B82F6" />
                    <Text style={styles.linkBadgeText}>Goes to next question</Text>
                  </View>
                )}
                {!opt.is_answer && !opt.next_question_id && (
                  <View style={styles.endBadge}>
                    <Ionicons name="stop-circle" size={10} color="#9CA3AF" />
                    <Text style={styles.endBadgeText}>End of flow</Text>
                  </View>
                )}
              </View>

              {/* Answer preview */}
              {opt.is_answer && opt.answer_text && (
                <View style={styles.answerPreview}>
                  <Text style={styles.answerPreviewText} numberOfLines={3}>
                    {opt.answer_text}
                  </Text>
                </View>
              )}

              {/* Render child question */}
              {!opt.is_answer && opt.next_question_id && (() => {
                const childQ = getQuestionById(opt.next_question_id);
                if (childQ) {
                  return renderTreeNode(childQ, depth + 1, newVisited);
                }
                return null;
              })()}
            </View>
          ))}
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

  const startQuestion = params.questionId
    ? getQuestionById(params.questionId)
    : allQuestions.find(q => q.is_root) || allQuestions[0];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="journey-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question Journey</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          testID="tree-view-btn"
          style={[styles.modeBtn, viewMode === 'tree' && styles.modeBtnActive]}
          onPress={() => setViewMode('tree')}
        >
          <Ionicons name="git-branch" size={16} color={viewMode === 'tree' ? '#FFF' : '#6B7280'} />
          <Text style={[styles.modeBtnText, viewMode === 'tree' && styles.modeBtnTextActive]}>
            Tree View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="simulate-view-btn"
          style={[styles.modeBtn, viewMode === 'simulate' && styles.modeBtnActive]}
          onPress={() => { setViewMode('simulate'); resetSimulation(); }}
        >
          <Ionicons name="play" size={16} color={viewMode === 'simulate' ? '#FFF' : '#6B7280'} />
          <Text style={[styles.modeBtnText, viewMode === 'simulate' && styles.modeBtnTextActive]}>
            Simulate User
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Free</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Paid</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Next Q</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={styles.legendText}>End</Text>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {viewMode === 'tree' ? (
          // TREE VIEW
          startQuestion ? (
            renderTreeNode(startQuestion, 0, new Set())
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="git-branch-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No questions to display</Text>
            </View>
          )
        ) : (
          // SIMULATE VIEW
          <View style={styles.simWrap}>
            {journeySteps.map((step, idx) => {
              if (step.type === 'question' && step.question) {
                return (
                  <View key={'step_' + idx} style={styles.simStep}>
                    {/* Bot message */}
                    <View style={styles.simBotRow}>
                      <View style={styles.simAvatar}>
                        <Ionicons name="chatbubble-ellipses" size={14} color="#F5A623" />
                      </View>
                      <View style={styles.simBotBubble}>
                        <Text style={styles.simBotText}>{step.question.text}</Text>
                      </View>
                    </View>

                    {/* Show options only for current question */}
                    {currentQuestion?.id === step.question.id && !journeyComplete && (
                      <View style={styles.simOptions}>
                        {step.question.options.map(opt => (
                          <TouchableOpacity
                            key={opt.id}
                            testID={'sim-opt-' + opt.id}
                            style={[
                              styles.simOptionBtn,
                              opt.requires_payment && styles.simOptionPaid,
                            ]}
                            onPress={() => simulateSelect(opt)}
                          >
                            <Text style={styles.simOptionText}>{opt.text}</Text>
                            <View style={styles.simOptionMeta}>
                              {opt.requires_payment && (
                                <View style={styles.simMetaBadge}>
                                  <Ionicons name="card" size={11} color="#F59E0B" />
                                  <Text style={styles.simMetaText}>
                                    {'Rs.' + (opt.payment_amount || 0)}
                                  </Text>
                                </View>
                              )}
                              {opt.is_answer && !opt.requires_payment && (
                                <View style={[styles.simMetaBadge, { backgroundColor: '#ECFDF5' }]}>
                                  <Ionicons name="checkmark" size={11} color="#10B981" />
                                  <Text style={[styles.simMetaText, { color: '#10B981' }]}>Free</Text>
                                </View>
                              )}
                              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }

              if (step.selectedOption) {
                return (
                  <View key={'sel_' + idx} style={styles.simStep}>
                    {/* User selection */}
                    <View style={styles.simUserRow}>
                      <View style={styles.simUserBubble}>
                        <Text style={styles.simUserText}>{step.selectedOption.text}</Text>
                      </View>
                    </View>

                    {/* Payment indicator */}
                    {step.type === 'payment' && (
                      <View style={styles.simPaymentCard}>
                        <Ionicons name="card" size={18} color="#F59E0B" />
                        <Text style={styles.simPaymentText}>
                          {'Payment Required: Rs.' + (step.selectedOption.payment_amount || 0)}
                        </Text>
                        <Text style={styles.simPaymentGw}>
                          {'via ' + (step.selectedOption.payment_gateway || 'razorpay')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }

              if (step.type === 'answer' && step.answerText) {
                return (
                  <View key={'ans_' + idx} style={styles.simStep}>
                    <View style={styles.simBotRow}>
                      <View style={styles.simAvatar}>
                        <Ionicons name="chatbubble-ellipses" size={14} color="#F5A623" />
                      </View>
                      <View style={[styles.simBotBubble, styles.simAnswerBubble]}>
                        <Text style={styles.simBotText}>{step.answerText}</Text>
                      </View>
                    </View>
                  </View>
                );
              }

              return null;
            })}

            {/* Journey complete */}
            {journeyComplete && (
              <View style={styles.simComplete}>
                <View style={styles.simCompleteBadge}>
                  <Ionicons name="flag" size={18} color="#FFFFFF" />
                  <Text style={styles.simCompleteText}>Journey Complete</Text>
                </View>
                <TouchableOpacity
                  testID="restart-sim-btn"
                  style={styles.restartBtn}
                  onPress={resetSimulation}
                >
                  <Ionicons name="refresh" size={16} color="#F5A623" />
                  <Text style={styles.restartText}>Restart Simulation</Text>
                </TouchableOpacity>
              </View>
            )}

            {!currentQuestion && !journeyComplete && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No root question found</Text>
              </View>
            )}
          </View>
        )}
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
  // Mode toggle
  modeToggle: {
    flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6',
  },
  modeBtnActive: { backgroundColor: '#F5A623' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#FFFFFF' },
  // Legend
  legend: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FFFFFF', gap: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 12 },
  // Tree View
  treeNode: { marginBottom: 4 },
  connector: {
    width: 2, height: 16, backgroundColor: '#E5E7EB', marginLeft: 20, marginBottom: 4,
  },
  treeQuestion: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  treeQuestionRoot: { borderColor: '#F5A623', borderWidth: 2 },
  treeQHeader: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  rootTag: { backgroundColor: '#F5A623', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  rootTagText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  platformTag: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  platformTagText: { fontSize: 9, fontWeight: '600', color: '#3B82F6' },
  treeQBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  treeQText: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, lineHeight: 20 },
  treeOption: { marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  treeOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  treeOptionText: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1 },
  optionBadges: { flexDirection: 'row', gap: 6, marginTop: 4, marginLeft: 16, flexWrap: 'wrap' },
  paidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  paidBadgeText: { fontSize: 10, fontWeight: '600', color: '#F59E0B' },
  freeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  freeBadgeText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
  linkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  linkBadgeText: { fontSize: 10, fontWeight: '600', color: '#3B82F6' },
  endBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  endBadgeText: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  answerPreview: {
    marginTop: 6, marginLeft: 16, backgroundColor: '#F9FAFB', borderRadius: 8,
    padding: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  answerPreviewText: { fontSize: 12, color: '#6B7280', lineHeight: 16, fontStyle: 'italic' },
  loopBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  loopText: { fontSize: 11, fontWeight: '500', color: '#F59E0B' },
  // Simulate View
  simWrap: { gap: 4 },
  simStep: { marginBottom: 8 },
  simBotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '85%' },
  simAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  simBotBubble: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: '#E5E7EB', flex: 1,
  },
  simAnswerBubble: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  simBotText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  simOptions: { marginLeft: 36, marginTop: 8, gap: 6 },
  simOptionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F5A623',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  simOptionPaid: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  simOptionText: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  simOptionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  simMetaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  simMetaText: { fontSize: 10, fontWeight: '600', color: '#F59E0B' },
  simUserRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  simUserBubble: {
    backgroundColor: '#F5A623', borderRadius: 16, borderBottomRightRadius: 4,
    padding: 12, maxWidth: '75%',
  },
  simUserText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  simPaymentCard: {
    alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12,
    padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#F59E0B', gap: 4,
  },
  simPaymentText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  simPaymentGw: { fontSize: 12, color: '#6B7280' },
  simComplete: { alignItems: 'center', marginTop: 20, gap: 12 },
  simCompleteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  simCompleteText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  restartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF8E1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#F5A623',
  },
  restartText: { fontSize: 14, fontWeight: '600', color: '#F5A623' },
});
