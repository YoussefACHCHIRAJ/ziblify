import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, get } from "firebase/database";
import { FirebaseConfig } from "@/configs/db";
import { DAYS } from "@/constants";
import { ITrashDutyData } from "@/interfaces";

const app = initializeApp(FirebaseConfig);
const database = getDatabase(app);

const getCurrentServerTime = async (): Promise<Date> => {
  try {
    // Write server timestamp to a temporary location
    const timeRef = ref(database, "currentDate");
    const snapshot = await get(timeRef);
    const offset = snapshot.val() || 0;

    const serverTime = new Date(offset);
    return serverTime;
  } catch (error) {
    console.warn("Failed to get server time, falling back to local time");
    console.log(error);
    return new Date();
  }
};

export default function List() {
  const [today, setToday] = useState<Date>(new Date());
  const [data, setData] = useState<ITrashDutyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const trashDutyRef = ref(database, "trashDuty");

    const unsubscribe = onValue(trashDutyRef, (snapshot) => {
      const fetchedData = snapshot.val() as ITrashDutyData | null;
      if (fetchedData) {
        setData(fetchedData);
      }
      setLoading(false);
    });

    async function getTodayDate() {
      const today = await getCurrentServerTime();
      setToday(today);
    }

    getTodayDate();


    return () => unsubscribe();
  }, []);

  const getStatusEmoji = (status: string): string => {
    switch (status) {
      case 'done':
        return '✓';
      case 'missed':
        return '✗';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'done':
        return '#4CAF50';
      case 'missed':
        return '#FF5722';
      default:
        return '#999';
    }
  };

  const formatWeekDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No schedule data available</Text>
      </View>
    );
  }

  // Sort schedule: Monday first
  const sortedSchedule = [...data.weekSchedule].sort((a, b) => {
    // Convert Sunday (0) to 7 for proper sorting
    const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return dayA - dayB;
  });

  // const today = new Date().getDay();

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Week {data.weekNumber} - {new Date(data.weekStartDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.scheduleContainer}>
          {sortedSchedule.map((entry, index) => {
            const isToday = entry.dayOfWeek === today.getDay();
            const dayName = DAYS[entry.dayOfWeek];

            return (
              <View
                key={index}
                style={[
                  styles.dayRow,
                  isToday && styles.dayRowToday
                ]}
              >
                <View style={styles.dayInfo}>
                  <View style={styles.dayHeader}>
                    <Text style={[
                      styles.dayName,
                      isToday && styles.dayNameToday
                    ]}>
                      {dayName}
                    </Text>
                    <Text style={styles.dayDate}>
                      {formatWeekDate(entry.date)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.personName,
                    isToday && styles.personNameToday
                  ]}>
                    {entry.person}
                  </Text>
                </View>

                <View style={[
                  styles.statusBadge,
                  entry.status === 'done' && styles.statusBadgeDone,
                  entry.status === 'missed' && styles.statusBadgeMissed,
                ]}>
                  <Text style={[
                    styles.statusEmoji,
                    { color: getStatusColor(entry.status) }
                  ]}>
                    {getStatusEmoji(entry.status)}
                  </Text>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(entry.status) }
                  ]}>
                    {entry.status === 'done' ? 'Done' : entry.status === 'missed' ? 'Missed' : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Monthly Stats Summary */}
        <View style={styles.monthlyStatsContainer}>
          <Text style={styles.monthlyStatsTitle}>📊 Monthly Summary</Text>
          <View style={styles.statsGrid}>
            {Object.entries(data.monthlyStats).map(([person, stats]) => (
              <View key={person} style={styles.statCard}>
                <Text style={styles.statCardName}>{person}</Text>
                <View style={styles.statCardNumbers}>
                  <View style={styles.statItem}>
                    <Text style={styles.statDone}>✓ {stats.done}</Text>
                    <Text style={styles.statLabel}>Done</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statMissed}>✗ {stats.missed}</Text>
                    <Text style={styles.statLabel}>Missed</Text>
                  </View>
                </View>
                <View style={styles.statTotal}>
                  <Text style={styles.statTotalText}>
                    Total: {stats.done + stats.missed}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.legendText}>
          Weekly schedule resets every Monday
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  scheduleContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dayRowToday: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  dayInfo: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dayNameToday: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  dayDate: {
    fontSize: 12,
    color: "#999",
  },
  personName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  personNameToday: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
  },
  statusBadgeDone: {
    backgroundColor: "#E8F5E9",
  },
  statusBadgeMissed: {
    backgroundColor: "#FFEBEE",
  },
  statusEmoji: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthlyStatsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  monthlyStatsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  statCardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  statCardNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#ddd",
  },
  statDone: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statMissed: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF5722",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  statTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  statTotalText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  legendText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
  },
});