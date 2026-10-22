import { supabase } from './supabase';
import type { Profile, Role } from './profiles';

export type AdminProfile = Profile & {
  created_at?: string;
};

export type AdminAttendanceRecord = {
  id: string;
  student_id: string;
  student_name: string;
  event_id: string;
  scanned_at: string;
  event_title: string;
  teacher_name: string;
};

export type AdminDashboardData = {
  profiles: AdminProfile[];
  attendance: AdminAttendanceRecord[];
  totalAttendance: number;
  attendanceByDay: { label: string; count: number }[];
};

const DAY_COUNT = 7;

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export async function getAdminDashboardData(): Promise<{
  data: AdminDashboardData | null;
  error: string | null;
}> {
  const chartStart = new Date();
  chartStart.setHours(0, 0, 0, 0);
  chartStart.setDate(chartStart.getDate() - (DAY_COUNT - 1));

  const [profilesResult, attendanceResult, chartResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, student_id, event_id, scanned_at, events ( title, created_by )', {
        count: 'exact',
      })
      .order('scanned_at', { ascending: false })
      .limit(100),
    supabase
      .from('attendance')
      .select('scanned_at')
      .gte('scanned_at', chartStart.toISOString())
      .order('scanned_at', { ascending: true }),
  ]);

  if (profilesResult.error) {
    return { data: null, error: profilesResult.error.message };
  }
  if (attendanceResult.error) {
    return { data: null, error: attendanceResult.error.message };
  }
  if (chartResult.error) {
    return { data: null, error: chartResult.error.message };
  }

  const profiles = (profilesResult.data ?? []) as AdminProfile[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const attendance = (attendanceResult.data ?? []).map((row: any): AdminAttendanceRecord => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const teacher = event?.created_by ? profileById.get(event.created_by) : undefined;
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: profileById.get(row.student_id)?.full_name?.trim() || profileById.get(row.student_id)?.email || `Student ${String(row.student_id).slice(0, 8)}`,
      event_id: row.event_id,
      scanned_at: row.scanned_at,
      event_title: event?.title ?? 'Unknown event',
      teacher_name: teacher?.full_name ?? 'Unknown teacher',
    };
  });

  const chartRows = (chartResult.data ?? []) as { scanned_at: string }[];
  const dayBuckets = new Map<string, number>();
  const today = new Date();
  for (let offset = DAY_COUNT - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    dayBuckets.set(key, 0);
  }
  for (const row of chartRows) {
    const date = new Date(row.scanned_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const attendanceByDay = [...dayBuckets.entries()].map(([key, count]) => {
    const [year, month, day] = key.split('-').map(Number);
    return { label: dayLabel(new Date(year, month, day)), count };
  });

  return {
    data: {
      profiles,
      attendance,
      totalAttendance: attendanceResult.count ?? attendance.length,
      attendanceByDay,
    },
    error: null,
  };
}

export function countRole(profiles: AdminProfile[], role: Role | 'admin') {
  return profiles.filter((profile) => profile.role === role).length;
}
