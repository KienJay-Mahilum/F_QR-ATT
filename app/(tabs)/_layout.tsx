import { Tabs, usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Load the actual role from the user's Supabase profile.
  useEffect(() => {
    let active = true;

    setRole(null);
    setRoleLoaded(false);

    if (!user) {
      setRoleLoaded(true);
      return () => {
        active = false;
      };
    }

    getProfile(user.id)
      .then((profile) => {
        if (!active) return;
        setRole(profile?.role ?? null);
        setRoleLoaded(true);
      })
      .catch((error) => {
        console.error('Could not load user role:', error);
        if (!active) return;
        setRole(null);
        setRoleLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Prevent restricted roles from accessing other tab routes directly.
  useEffect(() => {
    if (!roleLoaded) return;

    const onAdmin = pathname.endsWith('/admin');
    const onProfile = pathname.endsWith('/profile');
    const onScan = pathname.endsWith('/scan');
    const onTeacher = pathname.endsWith('/teacher');

    if (role === 'admin') {
      // Admins may access only Dashboard and Profile.
      if (!onAdmin && !onProfile) {
        router.replace('/(tabs)/admin');
      }
      return;
    }

    if (onAdmin) {
      router.replace('/(tabs)');
      return;
    }

    if (role !== 'student' && onScan) {
      router.replace('/(tabs)');
      return;
    }

    if (role !== 'teacher' && onTeacher) {
      router.replace('/(tabs)');
    }
  }, [pathname, role, roleLoaded, router]);

  const showGeneralTabs =
    roleLoaded && (role === 'student' || role === 'teacher');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: showGeneralTabs ? undefined : null,
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',

          // Only students can see and access the Scan tab.
          href: !roleLoaded || role !== 'student' ? null : undefined,

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          href: showGeneralTabs ? undefined : null,
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          href:
            roleLoaded && role === 'teacher'
              ? undefined
              : null,
          title: 'Teacher',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          href:
            roleLoaded && role === 'admin'
              ? undefined
              : null,
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'analytics'
                  : 'analytics-outline'
              }
              color={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}