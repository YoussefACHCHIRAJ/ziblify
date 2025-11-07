import { FirebaseConfig } from "@/configs/db";
import { DAYS, HOUSEMATES, UNDO_PASSWORD } from "@/constants";
import { ITrashDutyData, IWeeklyEntry, IMonthlyStats } from "@/interfaces";
import {
  getWeekNumber,
  getMondayOfWeek,
  isNewWeek,
  isNewMonth,
} from "@/helpers/functions";
import { initializeApp } from "firebase/app";
import {
  ref,
  onValue,
  set,
  getDatabase,
  get,
  serverTimestamp,
  runTransaction,
} from "firebase/database";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import * as Notifications from "expo-notifications";
import { sendNotification } from "@/lib/send-notifications";
import useNotification from "@/hooks/useNotification";
import {
  useDeadlineCounter,
  getUrgencyLevel,
} from "@/hooks/use-deadline-counter";

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [today, setToday] = useState<Date>(new Date());
  const [data, setData] = useState<ITrashDutyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const pushToken = useNotification({ database });

  const timeRemaining = useDeadlineCounter();
  const urgency = getUrgencyLevel(timeRemaining);

  const getUrgencyColor = () => {
    switch (urgency) {
      case "critical":
        return "#FF5722";
      case "warning":
        return "#FF9800";
      default:
        return "#4CAF50";
    }
  };

  const createNewWeekData = useCallback(
    (
      existingMonthlyStats?: IMonthlyStats,
      previousRotationOffset?: number
    ): ITrashDutyData => {
      const monday = getMondayOfWeek(today);
      const weekNumber = getWeekNumber(today);
      const startingIndex =
        previousRotationOffset !== undefined
          ? (previousRotationOffset + 1) % HOUSEMATES.length
          : 0;
      // Create 7 days schedule (Monday to Sunday)
      const weekSchedule: IWeeklyEntry[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        weekSchedule.push({
          dayOfWeek: (i + 1) % 7, // Monday=1, Sunday=0
          date: date.toISOString(),
          person: HOUSEMATES[(startingIndex + i) % HOUSEMATES.length],
          status: "pending",
        });
      }

      const monthlyStats =
        existingMonthlyStats ||
        HOUSEMATES.reduce((acc, person) => {
          acc[person] = { done: 0, missed: 0 };
          return acc;
        }, {} as IMonthlyStats);

      return {
        weekStartDate: monday.toISOString(),
        weekNumber,
        currentDayIndex: today.getDay(),
        weekSchedule,
        monthlyStats,
        lastActionDate: null,
        lastUpdated: today.toISOString(),
        rotationOffset: (startingIndex + 6) % HOUSEMATES.length,
      };
    },
    []
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeApp = async () => {
      try {
        await set(ref(database, "currentDate"), serverTimestamp());

        const serverTime = await getCurrentServerTime();
        setToday(serverTime);

        const trashDutyRef = ref(database, "trashDuty");

        const snapshot = await get(trashDutyRef);
        const currentData = snapshot.val() as ITrashDutyData | null;

        let needsUpdate = false;
        let newData: ITrashDutyData | null = null;

        if (!currentData) {
          console.log("No data exists, creating initial data");
          needsUpdate = true;
          newData = createNewWeekData();
        } else if (isNewWeek(currentData.weekStartDate, serverTime)) {
          console.log("New week detected, resetting data");
          needsUpdate = true;
          newData = createNewWeekData(
            currentData.monthlyStats,
            currentData.rotationOffset
          );
        } else if (isNewMonth(currentData.lastUpdated)) {
          console.log("New month detected, resetting monthly stats");
          needsUpdate = true;
          const resetMonthlyStats = HOUSEMATES.reduce((acc, person) => {
            acc[person] = { done: 0, missed: 0 };
            return acc;
          }, {} as IMonthlyStats);
          newData = createNewWeekData(
            resetMonthlyStats,
            currentData.rotationOffset
          );
        }

        if (needsUpdate && newData) {
          await runTransaction(trashDutyRef, (txnData) => {
            if (!txnData) {
              return newData;
            }

            if (isNewWeek(txnData.weekStartDate, serverTime)) {
              return newData;
            }

            return txnData;
          });
        }

        unsubscribe = onValue(trashDutyRef, (snapshot) => {
          const fetchedData = snapshot.val() as ITrashDutyData | null;
          if (fetchedData) {
            setData(fetchedData);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize app");
        setLoading(false);
      }
    };

    initializeApp();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [createNewWeekData]);

  const isToday = (dateString: string | null): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  const canTakeAction = (): boolean => {
    return !data?.lastActionDate || !isToday(data.lastActionDate);
  };

  const getTodayEntry = (): IWeeklyEntry | null => {
    if (!data) return null;
    return (
      data.weekSchedule.find((entry) => entry.dayOfWeek === today.getDay()) ||
      null
    );
  };

  const canUndo = (): boolean => {
    if (!data) return false;
    const todayEntry = getTodayEntry();
    return todayEntry?.status !== "pending" && isToday(data.lastActionDate);
  };

  const handleDone = async () => {
    if (!data) return;
    if (!canTakeAction()) {
      Alert.alert(
        "Already Done",
        "Task was already completed today. Come back tomorrow!"
      );
      return;
    }

    const todayEntry = getTodayEntry();
    if (!todayEntry) {
      Alert.alert("Error", "Could not find today's entry");
      return;
    }

    try {
      const updatedSchedule = data.weekSchedule.map((entry) =>
        entry.dayOfWeek === todayEntry.dayOfWeek
          ? {
              ...entry,
              status: "done" as const,
              completedAt: today.toISOString(),
            }
          : entry
      );

      const updatedMonthlyStats = { ...data.monthlyStats };
      updatedMonthlyStats[todayEntry.person].done += 1;

      const updatedData = {
        ...data,
        weekSchedule: updatedSchedule,
        monthlyStats: updatedMonthlyStats,
        lastActionDate: today.toISOString(),
        lastUpdated: today.toISOString(),
      };

      await set(ref(database, "trashDuty"), updatedData);

      if (pushToken) {
        sendNotification({
          action: "done",
          person: todayEntry.person,
          excludeToken: pushToken,
          timestamp: today.toISOString(),
        }).then(() => console.log("Push Notification sent."));
      }

      Alert.alert("✅ Well Done!", `Thanks ${todayEntry.person}!`);
    } catch (error) {
      Alert.alert("Error", "Failed to update. Check your internet connection.");
      console.error(error);
    }
  };

  const handleMissed = async () => {
    if (!data) return;
    if (!canTakeAction()) {
      Alert.alert(
        "Already Marked",
        "An action was already taken today. Come back tomorrow!"
      );
      return;
    }

    const todayEntry = getTodayEntry();
    if (!todayEntry) {
      Alert.alert("Error", "Could not find today's entry");
      return;
    }

    Alert.alert(
      "⚠️ Mark as Missed",
      `Are you sure ${todayEntry.person} missed their turn?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Missed",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedSchedule = data.weekSchedule.map((entry) =>
                entry.dayOfWeek === todayEntry.dayOfWeek
                  ? {
                      ...entry,
                      status: "missed" as const,
                      completedAt: today.toISOString(),
                    }
                  : entry
              );

              const updatedMonthlyStats = { ...data.monthlyStats };
              updatedMonthlyStats[todayEntry.person].missed += 1;

              const updatedData = {
                ...data,
                weekSchedule: updatedSchedule,
                monthlyStats: updatedMonthlyStats,
                lastActionDate: today.toISOString(),
                lastUpdated: today.toISOString(),
              };

              await set(ref(database, "trashDuty"), updatedData);

              Alert.alert(
                "📝 Marked as Missed",
                `${todayEntry.person} missed their turn.`
              );

              if (pushToken) {
                sendNotification({
                  action: "missed",
                  person: todayEntry.person,
                  excludeToken: pushToken,
                  timestamp: today.toISOString(),
                }).then(() => console.log("Push Notification sent."));
              }
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to update. Check your internet connection."
              );
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleUndo = () => {
    if (!canUndo()) {
      Alert.alert("Cannot Undo", "No recent action to undo.");
      return;
    }
    setShowPasswordModal(true);
  };

  const confirmUndo = async () => {
    if (!data) return;

    if (passwordInput !== UNDO_PASSWORD) {
      Alert.alert("Wrong Password", "The password you entered is incorrect.");
      setPasswordInput("");
      return;
    }

    setShowPasswordModal(false);
    setPasswordInput("");

    const todayEntry = getTodayEntry();
    if (!todayEntry) return;

    Alert.alert(
      "↩️ Undo Last Action",
      `Undo: ${todayEntry.person} - ${
        todayEntry.status === "done" ? "Done" : "Missed"
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Undo",
          onPress: async () => {
            try {
              const updatedSchedule = data.weekSchedule.map((entry) =>
                entry.dayOfWeek === todayEntry.dayOfWeek
                  ? {
                      ...entry,
                      status: "pending" as const,
                      completedAt: null,
                    }
                  : entry
              );

              const updatedMonthlyStats = { ...data.monthlyStats };
              if (todayEntry.status === "done") {
                updatedMonthlyStats[todayEntry.person].done -= 1;
              } else if (todayEntry.status === "missed") {
                updatedMonthlyStats[todayEntry.person].missed -= 1;
              }

              const updatedData = {
                ...data,
                weekSchedule: updatedSchedule,
                monthlyStats: updatedMonthlyStats,
                lastActionDate: null,
                lastUpdated: today.toISOString(),
              };

              await set(ref(database, "trashDuty"), updatedData);

              Alert.alert("✅ Undone", "Action reverted successfully.");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to undo. Check your internet connection."
              );
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const cancelPasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordInput("");
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
        <Text>Error loading data</Text>
      </View>
    );
  }

  const todayEntry = getTodayEntry();
  const buttonsDisabled = !canTakeAction();
  const undoEnabled = canUndo();
  const currentDay = DAYS[today.getDay()];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>{currentDay}</Text>
          <Text style={styles.name}>{todayEntry?.person || "N/A"}</Text>

          {buttonsDisabled && todayEntry?.status !== "pending" && (
            <View style={[styles.disabledBadge, todayEntry?.status === "done" ? styles.doneBadge : styles.missedBadge]}>
              <Text style={styles.disabledText}>
                ✓ {todayEntry?.status === "done" ? "Done" : "Missed"} for today
              </Text>

              <Text style={styles.disabledSubtext}>Come back tomorrow</Text>
            </View>
          )}
          {todayEntry?.status === "pending" && (
            <View style={styles.deadlineContainer}>
              <Text style={styles.deadlineText}>
                Take out the trash before 23:00
              </Text>
              <Text style={[styles.deadlineText, { color: getUrgencyColor() }]}>
                Countdown: {timeRemaining.formattedTime} remaining
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.doneButton,
              buttonsDisabled && styles.buttonDisabled,
            ]}
            onPress={handleDone}
            activeOpacity={0.8}
            disabled={buttonsDisabled}
          >
            <Text
              style={[
                styles.buttonText,
                buttonsDisabled && styles.buttonTextDisabled,
              ]}
            >
              ✓ Mark as Done
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.missedButton,
              buttonsDisabled && styles.buttonDisabled,
            ]}
            onPress={handleMissed}
            activeOpacity={0.8}
            disabled={buttonsDisabled}
          >
            <Text
              style={[
                styles.buttonText,
                buttonsDisabled && styles.buttonTextDisabled,
              ]}
            >
              ✗ Mark as Missed
            </Text>
          </TouchableOpacity>
        </View>

        {undoEnabled && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            activeOpacity={0.8}
          >
            <Text style={styles.undoButtonText}>↩️ Undo Last Action</Text>
          </TouchableOpacity>
        )}

        {/* Monthly Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Monthly Stats</Text>
          {HOUSEMATES.map((person) => (
            <View key={person} style={styles.statRow}>
              <Text style={styles.statPerson}>{person}</Text>
              <View style={styles.statNumbers}>
                <Text style={styles.statDone}>
                  ✓ {data.monthlyStats[person]?.done || 0}
                </Text>
                <Text style={styles.statMissed}>
                  ✗ {data.monthlyStats[person]?.missed || 0}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Password Modal */}
        <Modal
          visible={showPasswordModal}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelPasswordModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                🔒 Hahaha, you can&apos;t do it bruv.
              </Text>
              <Text style={styles.modalSubtitle}>
                Only admins can perform this action
              </Text>

              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                secureTextEntry={true}
                value={passwordInput}
                onChangeText={setPasswordInput}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus={true}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={cancelPasswordModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={confirmUndo}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#333",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
    minWidth: 280,
  },
  label: {
    fontSize: 22,
    color: "#666",
    marginBottom: 10,
    fontWeight: "600",
  },
  name: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 10,
  },
  disabledBadge: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  doneBadge: {
    backgroundColor: "#E8F5E9",
  },
  missedBadge: {
    backgroundColor: "#FF5722",
  },
  disabledText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledSubtext: {
    color: "#000",
    fontSize: 12,
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 140,
  },
  doneButton: {
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
  },
  missedButton: {
    backgroundColor: "#FF5722",
    shadowColor: "#FF5722",
  },
  buttonDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonTextDisabled: {
    color: "#E0E0E0",
  },
  deadlineContainer: {
    marginTop: 10,
  },
  deadlineText: {
    fontSize: 16,
    marginBottom: 8,
  },
  undoButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  undoButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  statsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statPerson: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  statNumbers: {
    flexDirection: "row",
    gap: 16,
  },
  statDone: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  statMissed: {
    fontSize: 14,
    color: "#FF5722",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 2,
    borderColor: "#FF9800",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: "#FFF8E1",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f5f5f5",
  },
  modalConfirmButton: {
    backgroundColor: "#FF9800",
  },
  modalCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalConfirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
