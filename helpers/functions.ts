export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper to get Monday of current week
export const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Helper to check if it's a new week (Monday)
export const isNewWeek = (lastWeekStart: string, currentDate: Date): boolean => {
  const lastMonday = new Date(lastWeekStart);
  const currentMonday = getMondayOfWeek(currentDate);
  lastMonday.setHours(0,0,0);
  currentMonday.setHours(0,0,0);
  return currentMonday.getTime() > lastMonday.getTime();
};

// Helper to check if it's a new month
export const isNewMonth = (lastDate: string): boolean => {
  const last = new Date(lastDate);
  const current = new Date();
  return current.getMonth() !== last.getMonth() || current.getFullYear() !== last.getFullYear();
};