import { useEffect, useState } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { initializeAuth, useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const [timeoutReached, setTimeoutReached] = useState(false);
  console.log('[RootLayout] Auth state:', {
  loading,
  timeoutReached,
  hasSession: !!session,
});

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (mounted) {
        console.warn(
          '[RootLayout] Auth initialization timed out.'
        );
        setTimeoutReached(true);
      }
    }, 10000);

    Promise.resolve()
      .then(() => initializeAuth())
      .catch((error) => {
        console.error(
          '[RootLayout] Auth initialization failed:',
          error
        );
      });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Show the spinner only while auth is initializing,
  // with a 10-second maximum wait.
  if (loading && !timeoutReached) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  const path = segments[0];

  const inAuthGroup =
    path === 'login' || path === 'register';

  const inTabsGroup = path === '(tabs)';

  // No session: send the user to Login.
  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  // Existing session: send the user to the app tabs.
  if (session && !inTabsGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});