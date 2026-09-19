import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            headerStyle: {
              backgroundColor: Colors.card,
            },
            headerShadowVisible: false,
            headerTintColor: Colors.primary,
            headerTitleStyle: {
              fontWeight: '700',
              color: Colors.text,
            },
            headerBackTitle: 'Back',
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scanner" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workers/add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workers/[id]" />
          <Stack.Screen name="workers/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workers/[id]/qr" options={{ presentation: 'modal' }} />
          <Stack.Screen name="attendance/history" />
          <Stack.Screen name="attendance/monthly" />
          <Stack.Screen name="reports/[id]" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}