export interface IWeeklyEntry {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  date: string; // ISO date
  person: string;
  status: 'pending' | 'done' | 'missed';
  completedAt?: string; // ISO timestamp when marked
}

export interface IMonthlyStats {
  [person: string]: {
    done: number;
    missed: number;
  };
}

export interface ITrashDutyData {
  weekStartDate: string; // ISO date of Monday
  weekNumber: number; // Week number of year
  currentDayIndex: number; // Current day of week (0-6)
  weekSchedule: IWeeklyEntry[]; // 7 entries, one per day
  monthlyStats: IMonthlyStats; // Cumulative stats for current month
  lastActionDate: string | null;
  lastUpdated: string;
  rotationOffset?: number;
}