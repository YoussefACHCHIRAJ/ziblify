import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ref,
  push,
  onValue,
  getDatabase,
  update,
  remove,
} from "firebase/database";
import { FirebaseConfig } from "@/configs/db";
import { initializeApp } from "firebase/app";
import { formatDate } from "@/helpers/functions";
import useNotification from "@/hooks/useNotification";
import { sendNotification } from "@/lib/send-notifications";

const app = initializeApp(FirebaseConfig);
const database = getDatabase(app);

interface IPayer {
  label: string;
  id: number;
}

interface Expense {
  id: string;
  amount: number;
  payer: IPayer;
  note: string;
  timestamp: string;
  confirmedBy?: number[]; // Array of IDs who confirmed payment
}

const housemates = [
  { label: "Amine", id: 100 },
  { label: "Sohaib", id: 200 },
  { label: "Youssef", id: 300 },
  { label: "Zakaria", id: 100 },
];

const housematesDisplay = [
  { label: "Amine/Zakaria", id: 100 },
  { label: "Sohaib", id: 200 },
  { label: "Youssef", id: 300 },
];

const display: { [key: number]: string } = {
  100: "Amine/Zakaria",
  200: "Sohaib",
  300: "Youssef",
};
const base = 3;

const Finance = () => {
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(housemates[0]);
  const [note, setNote] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const pushToken = useNotification({ database });

  useEffect(() => {
    const expensesRef = ref(database, "expenses");
    onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded: Expense[] = Object.entries(data).map(
          ([key, value]: any) => ({
            id: key,
            amount: value.amount,
            payer: value.payer,
            note: value.note,
            timestamp: value.timestamp,
            confirmedBy: value.confirmedBy || [],
          })
        );
        setExpenses(loaded.reverse());
      } else {
        setExpenses([]);
      }
    });
  }, []);

  const handlePayer = (payer: IPayer) => {
    setPayer(payer);
  };

  const addExpense = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid number.");
      return;
    }
    if (!payer) {
      Alert.alert("Select payer", "Please select who paid.");
      return;
    }

    const newExpense = {
      amount: amt,
      payer,
      note,
      timestamp: new Date().toISOString(),
      confirmedBy: [], // Initialize empty array for confirmations
    };

    try {
      await push(ref(database, "expenses"), newExpense);
      setAmount("");
      setNote("");
      setPayer(housemates[0]);
      Alert.alert("✅ Success", "Expense added successfully!");

      if (pushToken) {
        sendNotification({
          action: "custom",
          person: newExpense.payer.label,
          excludeToken: pushToken,
          timestamp: new Date().toISOString(),
          notification: {
            title: `💰 New Shared Expense - ${newExpense.amount} DH`,
            body: `${newExpense.payer.label} just logged a new purchase for the house.`,
          },
        }).then(() => console.log("Push Notification sent."));
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save expense.");
    }
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleConfirmPayment = async (expenseId: string, memberId: number) => {
    try {
      const expense = expenses.find((exp) => exp.id === expenseId);
      if (!expense) return;

      // Get current confirmations
      const currentConfirmed = expense.confirmedBy || [];

      // Add this member to confirmed list
      const updatedConfirmed = [...currentConfirmed, memberId];

      // Get all members who owe (excluding payer)
      const membersWhoOwe = housematesDisplay
        .filter((mem) => mem.id !== expense.payer.id)
        .map((mem) => mem.id);

      // Check if all members have confirmed
      const allConfirmed = membersWhoOwe.every((id) =>
        updatedConfirmed.includes(id)
      );

      if (allConfirmed) {
        // All confirmed - remove the expense
        const expenseRef = ref(database, `expenses/${expenseId}`);
        await remove(expenseRef);
        Alert.alert(
          "✅ Fully Paid",
          "All payments confirmed! Expense removed."
        );
        if (pushToken) {
          sendNotification({
            action: "custom",
            person: display[memberId],
            excludeToken: pushToken,
            timestamp: new Date().toISOString(),
            notification: {
              title: "Payment Completed - Expense removed",
              body: `${display[memberId]} just paid their share for the expense. Expense removed`,
            },
          }).then(() => console.log("Push Notification sent."));
        }
      } else {
        // Update the confirmed list
        const expenseRef = ref(database, `expenses/${expenseId}`);
        await update(expenseRef, { confirmedBy: updatedConfirmed });
        Alert.alert("✅ Confirmed", "Your payment has been confirmed!");

        if (pushToken) {
          sendNotification({
            action: "custom",
            person: display[memberId],
            excludeToken: pushToken,
            timestamp: new Date().toISOString(),
            notification: {
              title: "Payment Completed",
              body: `${display[memberId]} just paid their share for the expense`,
            },
          }).then(() => console.log("Push Notification sent."));
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to confirm payment.");
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const confirmedBy = item.confirmedBy || [];

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseLeft}>
            <View style={styles.payerBadge}>
              <Text style={styles.payerInitial}>
                {item.payer.label.charAt(0)}
              </Text>
            </View>
            <View style={styles.expenseDetails}>
              <Text style={styles.expensePayer}>
                Paid by {item.payer.label}
              </Text>
            </View>
          </View>
          <Text style={styles.expenseAmount}>{item.amount.toFixed(2)} DH</Text>
        </View>
        <View style={styles.splitSection}>
          <Text style={styles.splitTitle}>Note:</Text>
          <Text style={styles.expenseNote}>
            {item.note || "No description"}
          </Text>
        </View>
        <View style={styles.splitSection}>
          <Text style={styles.splitTitle}>Split Between:</Text>
          {housematesDisplay
            .filter((mem) => mem.id !== item.payer.id)
            .map((mem) => {
              const hasConfirmed = confirmedBy.includes(mem.id);
              return (
                <View key={mem.label} style={styles.splitRow}>
                  <View style={styles.splitLeft}>
                    <Text style={styles.splitName}>{display[mem.id]}</Text>
                    {hasConfirmed && (
                      <Text style={styles.confirmedBadge}>✓ Paid</Text>
                    )}
                  </View>
                  <View style={styles.splitRight}>
                    <Text style={styles.splitAmount}>
                      {(item.amount / base).toFixed(2)} DH
                    </Text>
                    {!hasConfirmed && (
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => handleConfirmPayment(item.id, mem.id)}
                      >
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
        </View>
        <View style={styles.expenseFooter}>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>House Expenses</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>
              {calculateTotalExpenses().toFixed(2)} DH
            </Text>
          </View>
        </View>

        {/* Add Expense Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Add New Expense</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount (DH)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>What was bought?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Groceries, Internet bill..."
              value={note}
              onChangeText={setNote}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Who paid?</Text>
            <View style={styles.housematesContainer}>
              {housemates.map((mem) => (
                <TouchableOpacity
                  onPress={() => handlePayer(mem)}
                  style={[
                    styles.housemateCard,
                    payer.label === mem.label && styles.housemateSelected,
                  ]}
                  key={mem.label}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.housemateLabel,
                      payer.label === mem.label &&
                        styles.housemateLabelSelected,
                    ]}
                  >
                    {mem.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addExpense}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Save Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Expenses List */}
        <View style={styles.expensesSection}>
          <Text style={styles.expensesTitle}>
            Recent Expenses ({expenses.length})
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No expenses yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first expense above
              </Text>
            </View>
          ) : (
            <FlatList
              data={expenses}
              keyExtractor={(item) => item.id}
              renderItem={renderExpense}
              scrollEnabled={false}
              contentContainerStyle={styles.expensesList}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Finance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: "#4CAF50",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    fontWeight: "400",
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    fontWeight: "400",
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "600",
    color: "#4CAF50",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  owedContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  owedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  owedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  owedName: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  owedAmount: {
    fontSize: 14,
    color: "#FF5722",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  formContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  housematesContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  housemateCard: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "white",
  },
  housemateSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  housemateLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  housemateLabelSelected: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  expensesSection: {
    paddingHorizontal: 20,
  },
  expensesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  payerBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  payerInitial: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  expenseDetails: {
    flex: 1,
  },
  expenseNote: {
    fontSize: 13,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    lineHeight: 18,
  },
  expensePayer: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4CAF50",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  splitSection: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  splitTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  splitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitName: {
    fontSize: 14,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  confirmedBadge: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  splitRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  confirmButtonText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  expenseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCC",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
});
