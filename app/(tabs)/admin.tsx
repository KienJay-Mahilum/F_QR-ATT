import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { countRole, getAdminDashboardData, type AdminAttendanceRecord, type AdminProfile, type AdminDashboardData } from '@/lib/admin';
import { getProfile, type Role } from '@/lib/profiles';

type RoleFilter = 'all' | Role;

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function UserCard({ profile }: { profile: AdminProfile }) {
  const displayName = profile.full_name?.trim() || 'Name not provided';
  return (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{profile.email}</Text>
        <Text style={styles.userMeta}>Joined {formatDate(profile.created_at)}</Text>
      </View>
      <View style={[styles.roleBadge, profile.role === 'admin' && styles.adminBadge, profile.role === 'teacher' && styles.teacherBadge]}>
        <Text style={styles.roleBadgeText}>{profile.role}</Text>
      </View>
    </View>
  );
}

function AttendanceCard({ record }: { record: AdminAttendanceRecord }) {
  return (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceIcon}>
        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.attendanceInfo}>
        <Text style={styles.userName}>{record.event_title}</Text>
        <Text style={styles.userEmail}>Student: {record.student_name}</Text>
        <Text style={styles.userMeta}>Teacher: {record.teacher_name}</Text>
        <Text style={styles.userMeta}>{formatDate(record.scanned_at)}</Text>
      </View>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [section, setSection] = useState<'overview' | 'users' | 'attendance'>('overview');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      setCheckingRole(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const profile = await getProfile(user.id);
    setRole(profile?.role ?? null);
    if (profile?.role !== 'admin') {
      setDashboard(null);
      setLoading(false);
      setRefreshing(false);
      setCheckingRole(false);
      return;
    }

    const result = await getAdminDashboardData();
    if (result.error) setError(result.error);
    else setDashboard(result.data);
    setLoading(false);
    setRefreshing(false);
    setCheckingRole(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setCheckingRole(true);
      loadDashboard();
    }, [loadDashboard])
  );

  const filteredProfiles = useMemo(() => {
    const profiles = dashboard?.profiles ?? [];
    const query = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
      const matchesSearch = !query || `${profile.full_name ?? ''} ${profile.email}`.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [dashboard?.profiles, roleFilter, search]);

  if (checkingRole || (loading && !dashboard)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.helperText}>Verifying administrator access…</Text>
      </View>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={42} color={COLORS.textSecondary} />
        <Text style={styles.deniedTitle}>Admin access only</Text>
        <Text style={styles.helperText}>This dashboard is available only to authorized administrators.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryButtonText}>Return to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (error && !dashboard) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={'#B3261E'} />
        <Text style={styles.deniedTitle}>Could not load dashboard</Text>
        <Text style={styles.helperText}>{error}</Text>
        <Pressable style={styles.primaryButton} onPress={() => loadDashboard()}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const data = dashboard;
  const maxDayCount = Math.max(1, ...(data?.attendanceByDay.map((day) => day.count) ?? []));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={COLORS.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>QR-ATT MANAGEMENT</Text>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Users, attendance, and activity at a glance.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh dashboard" style={styles.refreshButton} onPress={() => loadDashboard(true)}>
          <Ionicons name="refresh-outline" size={21} color={COLORS.primary} />
        </Pressable>
      </View>

      {error ? <Text style={styles.inlineError}>Some dashboard data could not refresh: {error}</Text> : null}

      <View style={styles.sectionTabs}>
        {(['overview', 'users', 'attendance'] as const).map((item) => (
          <Pressable key={item} onPress={() => setSection(item)} style={[styles.sectionTab, section === item && styles.sectionTabActive]}>
            <Text style={[styles.sectionTabText, section === item && styles.sectionTabTextActive]}>{item === 'overview' ? 'Overview' : item === 'users' ? 'Users' : 'Attendance'}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'overview' ? (
        <>
          <View style={styles.statsGrid}>
            <StatCard title="Registered users" value={data?.profiles.length ?? 0} icon="people-outline" />
            <StatCard title="Students" value={countRole(data?.profiles ?? [], 'student')} icon="school-outline" />
            <StatCard title="Teachers" value={countRole(data?.profiles ?? [], 'teacher')} icon="person-outline" />
            <StatCard title="Attendance scans" value={data?.totalAttendance ?? 0} icon="qr-code-outline" />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Attendance activity</Text>
            <Text style={styles.panelSubtitle}>Recorded scans over the last 7 calendar days</Text>
            {data?.attendanceByDay.map((day) => (
              <View key={day.label} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{day.label}</Text>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { width: `${(day.count / maxDayCount) * 100}%` }]} />
                </View>
                <Text style={styles.chartCount}>{day.count}</Text>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Account distribution</Text>
            {(['student', 'teacher', 'admin'] as const).map((roleName) => {
              const count = countRole(data?.profiles ?? [], roleName);
              const total = Math.max(1, data?.profiles.length ?? 0);
              return (
                <View key={roleName} style={styles.distributionRow}>
                  <Text style={styles.distributionLabel}>{roleName[0].toUpperCase() + roleName.slice(1)}</Text>
                  <View style={styles.distributionTrack}>
                    <View style={[styles.distributionBar, { width: `${(count / total) * 100}%` }]} />
                  </View>
                  <Text style={styles.chartCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={() => setSection('users')}>
            <Text style={styles.primaryButtonText}>View registered users</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textOnPrimary} />
          </Pressable>
        </>
      ) : null}

      {section === 'users' ? (
        <>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Registered users</Text>
            <Text style={styles.panelSubtitle}>Search by name or email and filter by role.</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search users…"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all', 'student', 'teacher', 'admin'] as const).map((filter) => (
                <Pressable key={filter} onPress={() => setRoleFilter(filter)} style={[styles.filterChip, roleFilter === filter && styles.filterChipActive]}>
                  <Text style={[styles.filterText, roleFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'All roles' : filter[0].toUpperCase() + filter.slice(1)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {filteredProfiles.length ? filteredProfiles.map((profile) => <UserCard key={profile.id} profile={profile} />) : (
              <Text style={styles.emptyText}>No users match your search.</Text>
            )}
          </View>
        </>
      ) : null}

      {section === 'attendance' ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent attendance records</Text>
          <Text style={styles.panelSubtitle}>Latest 100 records. Total recorded scans: {(data?.totalAttendance ?? 0).toLocaleString()}.</Text>
          {data?.attendance.length ? data.attendance.map((record) => <AttendanceCard key={record.id} record={record} />) : (
            <Text style={styles.emptyText}>No attendance records found.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  centered: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  title: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  sectionTabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 4, gap: 4 },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  sectionTabActive: { backgroundColor: COLORS.card, elevation: 1 },
  sectionTabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  sectionTabTextActive: { color: COLORS.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 125, backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  panel: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 12 },
  panelTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  panelSubtitle: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, marginTop: -7 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chartLabel: { width: 34, color: COLORS.textSecondary, fontSize: 11 },
  chartTrack: { flex: 1, height: 10, backgroundColor: COLORS.surface, borderRadius: 999, overflow: 'hidden' },
  chartBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 999 },
  chartCount: { width: 30, textAlign: 'right', color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  distributionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distributionLabel: { width: 66, color: COLORS.textSecondary, fontSize: 12 },
  distributionTrack: { flex: 1, height: 9, backgroundColor: COLORS.surface, borderRadius: 999, overflow: 'hidden' },
  distributionBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 999 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 16 },
  primaryButtonText: { color: COLORS.textOnPrimary, fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, paddingVertical: 12 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: COLORS.card },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.textOnPrimary },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, gap: 2 },
  userName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  userEmail: { color: COLORS.textSecondary, fontSize: 11 },
  userMeta: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  roleBadge: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#E3F2FD' },
  teacherBadge: { backgroundColor: '#FFF3E0' },
  adminBadge: { backgroundColor: '#F3E5F5' },
  roleBadgeText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  attendanceCard: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  attendanceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  attendanceInfo: { flex: 1, gap: 3 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 18, fontSize: 13 },
  helperText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 10 },
  deniedTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 12 },
  inlineError: { color: '#B3261E', backgroundColor: '#FCE8E6', borderRadius: 10, padding: 10, fontSize: 12 },
});
