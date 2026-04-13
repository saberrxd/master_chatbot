import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="questions" />
      <Stack.Screen name="add-question" />
      <Stack.Screen name="sessions" />
      <Stack.Screen name="api-docs" />
      <Stack.Screen name="pg-settings" />
      <Stack.Screen name="journey" />
      <Stack.Screen name="agents" />
    </Stack>
  );
}
