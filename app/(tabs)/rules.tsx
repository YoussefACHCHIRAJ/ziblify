import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ref, set, onValue, getDatabase } from 'firebase/database';
import { FontAwesome } from '@expo/vector-icons';
import { initializeApp } from 'firebase/app';
import { FirebaseConfig } from '@/configs/db';

const app = initializeApp(FirebaseConfig);
const database = getDatabase(app);

interface Rule {
  id: string;
  title: string;
  notes: string;
}

const rules: Rule[] = [
  {
    id: '1',
    title: `Any member who fails to perform his assigned trash duty three (3) times within a single calendar month, starting from the effective date of this rule, shall be assigned exclusive responsibility for taking out the trash for the entire following week.`,
    notes: `Each missed duty counts as one violation.\nA duty is considered “missed” if not completed by 10:00 PM of the assigned day.`,
  },
  {
    id: '2',
    title: `Each member’s assigned floor cleaning (تسياق) duty period runs from Saturday 12:00 AM until Monday 11:59 PM. Any member who fails to complete his floor cleaning duty within this period shall clean the entire house alone on the next scheduled cleaning period.`,
    notes: `“Entire house” includes all shared spaces (Hallway, kitchen, bathroom floors).\nA “failure” means the task was not done or not done properly as verified by inspection.`,
  },
  {
    id: '3',
    title: `Any member who leaves his dirty dishes in the sink for more than twenty-four (24) hours after use, shall clean the entire kitchen preparation area (Potaji), including sink, countertops, and utensils area.`,
    notes: `24 hours are counted from the last recorded time of use.`,
  },
];

const renderItem = ({ item }: { item: Rule }) => (
  <View style={styles.ruleContainer}>
    <Text style={styles.counter}>Clause {item.id}</Text>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.notes}>{item.notes}</Text>
  </View>
);
export default function RulesScreen() {
  return (
    <FlatList
      data={rules}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  ruleContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f2f2f2',
    borderBottomWidth: .5,
    borderColor: "#3333"
  },
  counter: {
    fontFamily: "serif",
    fontSize: 20
  },
  title: {
    fontWeight: 'normal',
    marginBottom: 8,
    fontFamily: "serif",
    fontSize: 18,
  },
  notes: {
    fontFamily: "serif",
    marginBottom: 12,
  }
});
