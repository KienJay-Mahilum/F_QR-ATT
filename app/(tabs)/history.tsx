import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQrEventId, setExpandedQrEventId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setStudentRecords([]);
    } else {
      const records = await getAttendanceHistory(user.id);
      setStudentRecords(records);
      setTeacherEvents([]);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>Loading records...</Text>
      </View>
    );
  }
  //history view to "teacher"
  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Events — Attendance</Text>
        {teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events yet. Create an event in the Teacher tab.
          </Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              // Rebuild the attendance payload from the saved event fields.
              // The QR must use eventCode (not the database UUID) for scanner lookup.
              const qrPayload = buildQRPayload({
                eventId: item.eventCode,
                title: item.title,
                start: item.startTime ?? undefined,
                end: item.endTime ?? undefined,
              });
              const qrIsVisible = expandedQrEventId === item.eventId;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{item.attendeeCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventMeta}>{item.eventCode}</Text>
                  {item.startTime && (
                    <Text style={styles.eventMeta}>Start Time: {formatDate(item.startTime)}</Text>
                  )}
                  {item.endTime && (
                    <Text style={styles.eventMeta}>End Time: {formatDate(item.endTime)}</Text>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={qrIsVisible ? `Hide QR code for ${item.title}` : `View QR code for ${item.title}`}
                    style={styles.qrButton}
                    onPress={() =>
                      setExpandedQrEventId((current) =>
                        current === item.eventId ? null : item.eventId
                      )
                    }
                  >
                    <Text style={styles.qrButtonText}>
                      {qrIsVisible ? 'Hide QR Code' : 'View QR Code'}
                    </Text>
                  </Pressable>

                  {qrIsVisible && (
                    <View style={styles.qrContainer}>
                      <View style={styles.qrBox}>
                        <QRCode value={qrPayload} size={190} />
                      </View>
                      <Text style={styles.qrHint}>
                        Scan this code to record attendance for this event.
                      </Text>
                    </View>
                  )}

                  {item.attendees.length === 0 ? (
                    <Text style={styles.emptyAttendees}>No scans yet.</Text>
                  ) : (
                    <View style={styles.attendeeList}>
                      {item.attendees.map((a) => (
                        <View key={`${item.eventId}-${a.studentId}`} style={styles.attendeeRow}>
                          <Text style={styles.attendeeId}>
                            {(a as any).studentName ?? shortId(a.studentId)}
                          </Text>
                          <Text style={styles.attendeeTime}>{formatDate(a.scannedAt)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    );
  }
  //history for the  "Student"
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>
      {studentRecords.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>{item.eventId}</Text>
              <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  attendeeList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  attendeeId: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  attendeeTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyAttendees: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  qrButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  qrButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
  },
  qrHint: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});