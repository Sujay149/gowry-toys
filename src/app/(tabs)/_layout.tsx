import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

interface TabIconProps {
  color: ColorValue;
  size: number;
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}

function TabIcon({ color, size, name, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
      size={size}
      color={String(color)}
    />
  );
}

export default function TabsLayout() {
  const { session, profile, initializing, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  if (initializing) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!profile) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>No access</Text>
        <Text style={styles.missingText}>
          Your account does not have an active role in this system. Please contact the admin.
        </Text>
        <AppButton title="Sign Out" onPress={() => signOut()} variant="outline" icon="log-out-outline" />
      </View>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + Spacing.xs,
        },
        tabBarLabelStyle: {
          fontSize: FontSizes.micro,
          fontWeight: FontWeights.semibold,
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: (props) => <TabIcon {...props} name="home" />,
        }}
      />
      {isAdmin ? (
        <Tabs.Screen
          name="workers"
          options={{
            title: 'Workers',
            tabBarLabel: 'Workers',
            tabBarIcon: (props) => <TabIcon {...props} name="people" />,
          }}
        />
      ) : null}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarLabel: 'Scan',
          tabBarIcon: (props) => <TabIcon {...props} name="qr-code" />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: (props) => <TabIcon {...props} name="calendar" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports',
          tabBarIcon: (props) => <TabIcon {...props} name="document-text" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: (props) => <TabIcon {...props} name="person" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  missingTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  missingText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});