import React from 'react';
import { View, Text, FlatList, StyleSheet, Platform, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
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
    notes: `Each missed duty counts as one violation.\nA duty is considered "missed" if not completed by 10:00 PM of the assigned day.`,
  },
  {
    id: '2',
    title: `Each member's assigned floor cleaning (تسياق) duty period runs from Saturday 12:00 AM until Monday 11:59 PM. Any member who fails to complete his floor cleaning duty within this period shall clean the entire house alone on the next scheduled cleaning period.`,
    notes: `"Entire house" includes all shared spaces (Hallway, kitchen, bathroom floors).\nA "failure" means the task was not done or not done properly as verified by inspection.`,
  },
  {
    id: '3',
    title: `Any member who leaves his dirty dishes in the sink for more than twenty-four (24) hours after use, shall clean the entire kitchen preparation area (Potaji), including sink, countertops, and utensils area.`,
    notes: `24 hours are counted from the last recorded time of use.`,
  },
];

const renderItem = ({ item, index }: { item: Rule; index: number }) => (
  <View style={styles.ruleCard}>
    <View style={styles.ruleHeader}>
      <View style={styles.clauseBadge}>
        <Text style={styles.clauseNumber}>{item.id}</Text>
      </View>
      <Text style={styles.clauseLabel}>Clause {item.id}</Text>
    </View>
    
    <Text style={styles.title}>{item.title}</Text>
    
    <View style={styles.notesSection}>
      <Text style={styles.notesTitle}>Details:</Text>
      <Text style={styles.notes}>{item.notes}</Text>
    </View>
  </View>
);

export default function RulesScreen() {
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>House Rules</Text>
          <Text style={styles.headerSubtitle}>Community Guidelines</Text>
        </View>

        {/* Rules List */}
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.rulesList}
        />

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <View style={styles.noteIcon}>
            <Text style={styles.noteIconText}>ⓘ</Text>
          </View>
          <Text style={styles.footerText}>
            One or more members verification confirms a violation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FF9800',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '400',
  },
  rulesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  ruleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clauseBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clauseNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clauseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  title: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '400',
  },
  notesSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notes: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footerNote: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  noteIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1976D2',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },
});