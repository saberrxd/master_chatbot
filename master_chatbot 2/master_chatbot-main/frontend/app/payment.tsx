import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId: string;
    questionId: string;
    optionId: string;
    amount: string;
    gateway: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }>();

  const [step, setStep] = useState<'choose' | 'processing' | 'webview' | 'success' | 'failed'>('choose');
  const [selectedGateway, setSelectedGateway] = useState(params.gateway || 'razorpay');
  const [webviewUrl, setWebviewUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);

  const amount = parseFloat(params.amount || '0');

  const initiatePayment = async (gw: string) => {
    setSelectedGateway(gw);
    setLoading(true);
    setStep('processing');

    try {
      const endpoint = gw === 'cashfree'
        ? `${BACKEND_URL}/api/payment/cashfree/create`
        : `${BACKEND_URL}/api/payment/razorpay/create`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: params.sessionId,
          option_id: params.optionId,
          question_id: params.questionId,
          gateway: gw,
          amount: amount,
          customer_name: params.customerName || 'User',
          customer_email: params.customerEmail || 'user@example.com',
          customer_phone: params.customerPhone || '9999999999',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Payment order creation failed');
      }

      setOrderId(data.order_id);

      if (gw === 'cashfree') {
        // Cashfree - use payment link or session
        if (data.payment_link) {
          setWebviewUrl(data.payment_link);
          setStep('webview');
        } else {
          // Build checkout URL
          const checkoutUrl = `https://payments.cashfree.com/forms/${data.payment_session_id}`;
          setWebviewUrl(checkoutUrl);
          setStep('webview');
        }
      } else {
        // Razorpay - use WebView checkout
        const razorpayHtml = buildRazorpayCheckout(data);
        setWebviewUrl(razorpayHtml);
        setStep('webview');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create payment');
      setStep('choose');
    } finally {
      setLoading(false);
    }
  };

  const buildRazorpayCheckout = (data: any) => {
    return `data:text/html,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #FFF8E1; }
    .loading { text-align: center; }
    .loading h2 { color: #F5A623; }
    .loading p { color: #6B7280; }
  </style>
</head>
<body>
  <div class="loading">
    <h2>Opening Razorpay...</h2>
    <p>Please complete your payment</p>
  </div>
  <script>
    var options = {
      key: "${data.key_id}",
      amount: ${data.amount},
      currency: "${data.currency}",
      order_id: "${data.order_id}",
      name: "ChatBot Premium",
      description: "Premium Content Access",
      prefill: {
        name: "${data.customer_name || ''}",
        email: "${data.customer_email || ''}",
        contact: "${data.customer_phone || ''}"
      },
      theme: { color: "#F5A623" },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "razorpay_success",
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature
        }));
      },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "razorpay_dismissed" }));
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "razorpay_failed",
        error: response.error.description
      }));
    });
    setTimeout(function() { rzp.open(); }, 500);
  </script>
</body>
</html>
    `)}`;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'razorpay_success') {
        setStep('processing');
        const res = await fetch(`${BACKEND_URL}/api/payment/razorpay/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: data.order_id,
            payment_id: data.payment_id,
            signature: data.signature,
            gateway: 'razorpay',
            session_id: params.sessionId,
            option_id: params.optionId,
            question_id: params.questionId,
          }),
        });
        if (res.ok) {
          setStep('success');
        } else {
          setStep('failed');
        }
      } else if (data.type === 'razorpay_failed') {
        setStep('failed');
      } else if (data.type === 'razorpay_dismissed') {
        setStep('choose');
      }
    } catch (e) {}
  };

  const handleCashfreeNavChange = async (navState: any) => {
    const url = navState.url || '';
    if (url.includes('/api/payment/cashfree/callback') || url.includes('order_id=')) {
      setStep('processing');
      try {
        const res = await fetch(`${BACKEND_URL}/api/payment/cashfree/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            gateway: 'cashfree',
            session_id: params.sessionId,
            option_id: params.optionId,
            question_id: params.questionId,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          setStep('success');
        } else {
          setStep('failed');
        }
      } catch (e) {
        setStep('failed');
      }
    }
  };

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.processText}>Processing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'webview') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.webHeader}>
          <TouchableOpacity testID="payment-close-btn" onPress={() => setStep('choose')} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>
            {selectedGateway === 'cashfree' ? 'Cashfree Payment' : 'Razorpay Payment'}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <WebView
          source={{ uri: webviewUrl }}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={selectedGateway === 'cashfree' ? handleCashfreeNavChange : undefined}
          javaScriptEnabled
          domStorageEnabled
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webLoading}>
              <ActivityIndicator size="large" color="#F5A623" />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSub}>₹{amount} paid via {selectedGateway === 'cashfree' ? 'Cashfree' : 'Razorpay'}</Text>
          <TouchableOpacity
            testID="back-to-chat-btn"
            style={styles.backToChatBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backToChatText}>Back to Chat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'failed') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={[styles.successCircle, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="close" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Payment Failed</Text>
          <Text style={styles.successSub}>Please try again</Text>
          <TouchableOpacity
            testID="retry-payment-btn"
            style={styles.backToChatBtn}
            onPress={() => setStep('choose')}
          >
            <Text style={styles.backToChatText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Choose gateway
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.chooseWrap}>
        <TouchableOpacity testID="payment-back-btn" onPress={() => router.back()} style={styles.topBack}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{amount.toFixed(0)}</Text>
        </View>

        <Text style={styles.chooseTitle}>Choose Payment Method</Text>

        <TouchableOpacity
          testID="pay-razorpay-btn"
          style={styles.gwBtn}
          onPress={() => initiatePayment('razorpay')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.gwIcon}>
            <Ionicons name="card" size={24} color="#3B82F6" />
          </View>
          <View style={styles.gwInfo}>
            <Text style={styles.gwName}>Razorpay</Text>
            <Text style={styles.gwDesc}>Cards, UPI, Netbanking</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="pay-cashfree-btn"
          style={styles.gwBtn}
          onPress={() => initiatePayment('cashfree')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={[styles.gwIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <View style={styles.gwInfo}>
            <Text style={styles.gwName}>Cashfree</Text>
            <Text style={styles.gwDesc}>Cards, UPI, Wallets</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
          <Text style={styles.secureText}>Payments are secure and encrypted</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  processText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  chooseWrap: { flex: 1, padding: 20 },
  topBack: { padding: 4, marginBottom: 20 },
  amountCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  amountLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  amountValue: { fontSize: 40, fontWeight: '800', color: '#F5A623', marginTop: 4 },
  chooseTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  gwBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gwIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gwInfo: { flex: 1 },
  gwName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  gwDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  secureText: { fontSize: 13, color: '#9CA3AF' },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  backToChatBtn: {
    backgroundColor: '#F5A623',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  backToChatText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: { padding: 4 },
  webHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  webview: { flex: 1 },
  webLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
