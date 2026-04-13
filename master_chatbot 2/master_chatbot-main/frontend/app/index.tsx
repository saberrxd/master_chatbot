import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, useWindowDimensions, Platform, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/* eslint-disable @typescript-eslint/no-require-imports */
const logoSource = require('../assets/logo.jpg');

const FEATURES = [
  {
    icon: 'git-branch-outline' as const,
    title: 'Decision Tree Q&A',
    desc: 'Build dynamic conversation flows with branching logic. Guide users to the right answer every time.',
    color: '#F5A623',
  },
  {
    icon: 'headset-outline' as const,
    title: 'Live Agent Chat',
    desc: 'Seamless handoff from bot to real agents when users need human support.',
    color: '#3B82F6',
  },
  {
    icon: 'language-outline' as const,
    title: 'Multilingual',
    desc: 'Support 20+ languages. Users choose their language, agents manage their known languages.',
    color: '#10B981',
  },
  {
    icon: 'card-outline' as const,
    title: 'Payment Integration',
    desc: 'Collect payments directly in chat with Razorpay and Cashfree gateways.',
    color: '#8B5CF6',
  },
  {
    icon: 'cloud-upload-outline' as const,
    title: 'Bulk Upload',
    desc: 'Import hundreds of Q&A via CSV/Excel. Save hours of manual data entry.',
    color: '#EF4444',
  },
  {
    icon: 'attach-outline' as const,
    title: 'File Sharing',
    desc: 'Users and agents can share images, documents, and files directly in chat.',
    color: '#F59E0B',
  },
];

const STEPS = [
  {
    num: '1',
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'User Starts Chat',
    desc: 'Users begin a conversation via your website or app.',
  },
  {
    num: '2',
    icon: 'git-branch-outline' as const,
    title: 'Bot Guides',
    desc: 'Smart decision tree navigates users to the right answer.',
  },
  {
    num: '3',
    icon: 'swap-horizontal-outline' as const,
    title: 'Agent Handoff',
    desc: 'If needed, seamlessly connect to a live agent.',
  },
  {
    num: '4',
    icon: 'checkmark-circle-outline' as const,
    title: 'Resolution',
    desc: 'Issue resolved — with full history for follow-ups.',
  },
];

const STATS = [
  { value: '20+', label: 'Languages' },
  { value: '2', label: 'Payment Gateways' },
  { value: '3', label: 'User Roles' },
  { value: '3', label: 'SDK Kits' },
];

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isWide = screenWidth > 700 || width > 700;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== NAVBAR ===== */}
        <View style={styles.navbar}>
          <View style={styles.navLeft}>
            <Image source={logoSource} style={styles.navLogo} />
            <Text style={styles.navBrand}>ChatBot Hub</Text>
          </View>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => router.push('/admin/login')} style={styles.navLink}>
              <Text style={styles.navLinkText}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/agent/login')} style={styles.navLink}>
              <Text style={styles.navLinkText}>Agent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/start-chat')}
              style={styles.navCta}
            >
              <Text style={styles.navCtaText}>Try Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== HERO ===== */}
        <View style={styles.hero}>
          <View style={styles.heroBg}>
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />
          </View>
          <View style={styles.heroContent}>
            <Image source={logoSource} style={styles.heroLogo} />
            <Text style={styles.heroTitle}>
              Intelligent Chatbot{'\n'}for Your Business
            </Text>
            <Text style={styles.heroSubtitle}>
              Decision-tree Q&A, live agent chat, payments, multilingual support — all in one powerful platform.
            </Text>
            <View style={[styles.heroBtns, isWide && styles.heroBtnsWide]}>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => router.push('/start-chat')}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                <Text style={styles.heroBtnText}>Start Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtnOutline}
                onPress={() => router.push('/admin/login')}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={20} color="#F5A623" />
                <Text style={styles.heroBtnOutlineText}>Admin Panel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===== STATS BAR ===== */}
        <View style={styles.statsBar}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ===== FEATURES ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTag}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          <Text style={styles.sectionDesc}>
            A complete chatbot platform built for modern businesses.
          </Text>
          <View style={[styles.featuresGrid, isWide && styles.featuresGridWide]}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[styles.featureCard, isWide && styles.featureCardWide]}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                  <Ionicons name={f.icon} size={26} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== HOW IT WORKS ===== */}
        <View style={[styles.section, styles.sectionAlt]}>
          <Text style={styles.sectionTag}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Simple 4-Step Flow</Text>
          <Text style={styles.sectionDesc}>
            From first message to resolution — fast and frictionless.
          </Text>
          <View style={[styles.stepsGrid, isWide && styles.stepsGridWide]}>
            {STEPS.map((s, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepNumWrap}>
                  <Text style={styles.stepNum}>{s.num}</Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={s.icon} size={28} color="#F5A623" />
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
                {i < STEPS.length - 1 && !isWide && (
                  <View style={styles.stepConnector}>
                    <Ionicons name="arrow-down" size={18} color="#D1D5DB" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ===== ROLES ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTag}>BUILT FOR TEAMS</Text>
          <Text style={styles.sectionTitle}>Three Powerful Roles</Text>
          <View style={[styles.rolesGrid, isWide && styles.rolesGridWide]}>
            {[
              {
                icon: 'shield-checkmark' as const,
                title: 'Admin',
                desc: 'Manage Q&A trees, agents, payment gateways, and view analytics. Full control over the platform.',
                color: '#8B5CF6',
                route: '/admin/login',
              },
              {
                icon: 'star' as const,
                title: 'Master Agent',
                desc: 'View all chats across platforms. Reassign and un-assign sessions between agents.',
                color: '#F5A623',
                route: '/agent/login',
              },
              {
                icon: 'headset' as const,
                title: 'Agent',
                desc: 'Handle live chats with users. Manage language preferences and resolve issues in real-time.',
                color: '#3B82F6',
                route: '/agent/login',
              },
            ].map((r, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.roleCard, isWide && styles.roleCardWide]}
                onPress={() => router.push(r.route as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.roleIconWrap, { backgroundColor: r.color + '15' }]}>
                  <Ionicons name={r.icon} size={28} color={r.color} />
                </View>
                <Text style={styles.roleTitle}>{r.title}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
                <View style={styles.roleArrow}>
                  <Text style={[styles.roleArrowText, { color: r.color }]}>Login</Text>
                  <Ionicons name="arrow-forward" size={14} color={r.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ===== INTEGRATION ===== */}
        <View style={[styles.section, styles.sectionAlt]}>
          <Text style={styles.sectionTag}>INTEGRATION</Text>
          <Text style={styles.sectionTitle}>Ready-to-Use SDKs</Text>
          <Text style={styles.sectionDesc}>
            Integrate in minutes with our PHP, JavaScript, and Flutter SDKs.
          </Text>
          <View style={[styles.sdkCards, isWide && styles.sdkCardsWide]}>
            <View style={styles.sdkCard}>
              <View style={styles.sdkHeader}>
                <View style={[styles.sdkBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.sdkBadgeText}>JS</Text>
                </View>
                <Text style={styles.sdkTitle}>JavaScript SDK</Text>
              </View>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {'import ChatBotSDK from\n  \'./emergent_chatbot_sdk\';\n\nconst sdk = new ChatBotSDK(\n  \'https://your-api.com/api\'\n);\n\nconst session = await\n  sdk.startSession({\n    user_name: \'John\',\n    platform_name: \'Web\'\n  });'}
                </Text>
              </View>
            </View>
            <View style={styles.sdkCard}>
              <View style={styles.sdkHeader}>
                <View style={[styles.sdkBadge, { backgroundColor: '#0284C7' }]}>
                  <Text style={styles.sdkBadgeText}>Dart</Text>
                </View>
                <Text style={styles.sdkTitle}>Flutter SDK</Text>
              </View>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {'import \'chatbot_sdk.dart\';\n\nfinal sdk = ChatBotSDK(\n  \'https://your-api.com\'\n);\n\nfinal session = await\n  sdk.createSession(\n    userName: \'John\',\n    platformName: \'Android App\',\n    userMobile: \'999\',\n  );'}
                </Text>
              </View>
            </View>
            <View style={styles.sdkCard}>
              <View style={styles.sdkHeader}>
                <View style={[styles.sdkBadge, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.sdkBadgeText}>PHP</Text>
                </View>
                <Text style={styles.sdkTitle}>PHP SDK</Text>
              </View>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {'<?php\nrequire \'emergent_chatbot_sdk.php\';\n\n$sdk = new ChatBotAdminSDK(\n  \'https://your-api.com/api\'\n);\n\n$session = $sdk->startSession([\n  \'user_name\' => \'John\',\n  \'platform_name\' => \'Web\'\n]);'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== CTA ===== */}
        <View style={styles.ctaSection}>
          <Image source={logoSource} style={styles.ctaLogo} />
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaDesc}>
            Set up your intelligent chatbot in minutes. No credit card required.
          </Text>
          <View style={[styles.ctaBtns, isWide && styles.ctaBtnsWide]}>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/start-chat')}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>Try the Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaBtnSecondary}
              onPress={() => router.push('/admin/api-docs')}
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={20} color="#F5A623" />
              <Text style={styles.ctaBtnSecondaryText}>View Docs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== FOOTER ===== */}
        <View style={styles.footer}>
          <View style={styles.footerTop}>
            <View style={styles.footerBrand}>
              <Image source={logoSource} style={styles.footerLogo} />
              <Text style={styles.footerBrandName}>ChatBot Hub</Text>
            </View>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/start-chat')}>
                <Text style={styles.footerLink}>Start Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/agent/login')}>
                <Text style={styles.footerLink}>Agent Portal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/admin/api-docs')}>
                <Text style={styles.footerLink}>Documentation</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.footerDivider} />
          <Text style={styles.footerCopy}>
            {'\u00A9'} 2025 ChatBot Hub. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: { width: 36, height: 36, borderRadius: 10 },
  navBrand: { fontSize: 18, fontWeight: '800', color: '#111827' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLink: { paddingVertical: 6 },
  navLinkText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  navCta: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navCtaText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Hero
  hero: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 24,
    backgroundColor: '#FFF8E1',
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroCircle1: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
  },
  heroCircle2: {
    position: 'absolute', bottom: -30, left: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(245, 166, 35, 0.06)',
  },
  heroContent: { alignItems: 'center', zIndex: 1 },
  heroLogo: {
    width: 80, height: 80, borderRadius: 24, marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32, fontWeight: '900', color: '#111827',
    textAlign: 'center', lineHeight: 40, letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 16, color: '#4B5563', textAlign: 'center',
    marginTop: 14, lineHeight: 24, maxWidth: 500, paddingHorizontal: 10,
  },
  heroBtns: {
    flexDirection: 'column', gap: 12, marginTop: 28, width: '100%', maxWidth: 340,
  },
  heroBtnsWide: { flexDirection: 'row', maxWidth: 400 },
  heroBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#F5A623', paddingVertical: 16, borderRadius: 14,
  },
  heroBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#F5A623',
  },
  heroBtnOutlineText: { fontSize: 16, fontWeight: '700', color: '#F5A623' },

  // Stats
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#111827', paddingVertical: 24, paddingHorizontal: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900', color: '#F5A623' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  section: { paddingVertical: 48, paddingHorizontal: 20 },
  sectionAlt: { backgroundColor: '#F9FAFB' },
  sectionTag: {
    fontSize: 12, fontWeight: '800', color: '#F5A623', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center',
    letterSpacing: -0.5,
  },
  sectionDesc: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8,
    lineHeight: 22, maxWidth: 500, alignSelf: 'center',
  },

  // Features
  featuresGrid: { marginTop: 28, gap: 16 },
  featuresGridWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  featureCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  featureCardWide: { width: '30%', minWidth: 260, maxWidth: 380 },
  featureIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  featureTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6 },
  featureDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  // Steps
  stepsGrid: { marginTop: 28, gap: 16 },
  stepsGridWide: { flexDirection: 'row', justifyContent: 'center' },
  stepCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
  },
  stepNumWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepNum: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  stepIconWrap: { marginBottom: 10 },
  stepTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  stepConnector: { marginTop: 12 },

  // Roles
  rolesGrid: { marginTop: 28, gap: 16 },
  rolesGridWide: { flexDirection: 'row', justifyContent: 'center' },
  roleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  roleCardWide: { flex: 1, maxWidth: 300 },
  roleIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  roleTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  roleDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 14 },
  roleArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roleArrowText: { fontSize: 13, fontWeight: '700' },

  // SDK
  sdkCards: { marginTop: 28, gap: 16 },
  sdkCardsWide: { flexDirection: 'row', justifyContent: 'center' },
  sdkCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F3F4F6', flex: 1, maxWidth: 400,
  },
  sdkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sdkBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  sdkBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  sdkTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  codeBlock: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16,
  },
  codeText: {
    fontSize: 12, color: '#A7F3D0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 19,
  },

  // CTA
  ctaSection: {
    backgroundColor: '#111827', paddingVertical: 48, paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaLogo: { width: 56, height: 56, borderRadius: 16, marginBottom: 16 },
  ctaTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  ctaDesc: {
    fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 10,
    lineHeight: 22, maxWidth: 400,
  },
  ctaBtns: { flexDirection: 'column', gap: 12, marginTop: 24, width: '100%', maxWidth: 340 },
  ctaBtnsWide: { flexDirection: 'row', maxWidth: 400 },
  ctaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#F5A623', paddingVertical: 16, borderRadius: 14,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  ctaBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 2, borderColor: '#F5A623', paddingVertical: 16, borderRadius: 14,
  },
  ctaBtnSecondaryText: { fontSize: 16, fontWeight: '700', color: '#F5A623' },

  // Footer
  footer: {
    backgroundColor: '#F9FAFB', paddingVertical: 32, paddingHorizontal: 24,
  },
  footerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 20,
  },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogo: { width: 32, height: 32, borderRadius: 8 },
  footerBrandName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  footerLink: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  footerDivider: {
    height: 1, backgroundColor: '#E5E7EB', marginVertical: 20,
  },
  footerCopy: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
