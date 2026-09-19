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
          <Stack.Screen
            name="scanner"
            options={{ presentation: 'modal', headerShown: true, title: 'Scan QR', headerBackTitle: 'Close' }}
          />
          <Stack.Screen
            name="workers/add"
            options={{ presentation: 'modal', headerShown: true, title: 'Add Worker' }}
          />
          <Stack.Screen name="workers/[id]" options={{ headerShown: true, title: 'Worker Details' }} />
          <Stack.Screen
            name="workers/[id]/edit"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit Worker' }}
          />
          <Stack.Screen
            name="workers/[id]/qr"
            options={{ presentation: 'modal', headerShown: true, title: 'Worker QR Code' }}
          />
          <Stack.Screen name="attendance/history" options={{ headerShown: true, title: 'Attendance History' }} />
          <Stack.Screen name="attendance/monthly" options={{ headerShown: true, title: 'Monthly Attendance' }} />
          <Stack.Screen name="reports/[id]" options={{ headerShown: true, title: 'Report' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}