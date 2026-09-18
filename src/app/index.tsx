import { Redirect } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function GateScreen() {
  const { initializing, session } = useAuth();

  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [entrance, pulse]);

  if (!initializing) {
    return <Redirect href={session ? '/(tabs)/dashboard' : '/login'} />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.brand,
          {
            opacity: entrance,
            transform: [
              {
                scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }),
              },
              {
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              },
            ],
          },
        ]}>
        <BrandMark size={96} />
        <Text style={styles.title}>Gowri Toys</Text>
        <Text style={styles.subtitle}>Toy Manufacturing</Text>
      </Animated.View>

      <View style={styles.loader}>
        <Animated.View
          style={[
            styles.loaderDot,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ]}
        />
        <Animated.View
          style={[
            styles.loaderDot,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  brand: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.heavy,
    color: Colors.text,
    marginTop: Spacing.xl,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  loader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xxxl,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});