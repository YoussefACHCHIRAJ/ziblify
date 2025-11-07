import { useEffect } from "react";
import { ref, set, get, getDatabase } from "firebase/database";
import { ITrashDutyData, IWeeklyEntry } from "@/interfaces";
import { sendNotification } from "@/lib/send-notifications";

/**
 * Hook to check and auto-mark missed tasks when app opens
 * Place this in your main Index component
 */
export const useAutoMarkMissed = (
  database: any,
  data: ITrashDutyData | null,
  today: Date,
  pushToken: string | null
) => {
  useEffect(() => {
    if (!data) return;

    const checkAndMarkMissed = async () => {
      try {
        const currentHour = today.getHours();
        const todayDayOfWeek = today.getDay();

        // Only check if it's past 22:00 (10 PM)
        if (currentHour < 22) {
          return;
        }

        const todayEntry = data.weekSchedule.find(
          (entry) => entry.dayOfWeek === todayDayOfWeek
        );

        if (!todayEntry) {
          return;
        }

        if (todayEntry.status !== "pending") {
          return;
        }

        const lastActionDate = data.lastActionDate;
        if (lastActionDate) {
          const lastAction = new Date(lastActionDate);
          const isSameDay = lastAction.toDateString() === today.toDateString();

          if (isSameDay) {
            return;
          }
        }

        // Update the schedule
        const updatedSchedule = data.weekSchedule.map((entry) =>
          entry.dayOfWeek === todayDayOfWeek
            ? {
                ...entry,
                status: "missed" as const,
                completedAt: today.toISOString(),
              }
            : entry
        );

        // Update monthly stats
        const updatedMonthlyStats = { ...data.monthlyStats };
        if (!updatedMonthlyStats[todayEntry.person]) {
          updatedMonthlyStats[todayEntry.person] = { done: 0, missed: 0 };
        }
        updatedMonthlyStats[todayEntry.person].missed += 1;

        // Save updated data
        const updatedData: ITrashDutyData = {
          ...data,
          weekSchedule: updatedSchedule,
          monthlyStats: updatedMonthlyStats,
          lastActionDate: today.toISOString(), // Mark as processed
          lastUpdated: today.toISOString(),
        };

        await set(ref(database, "trashDuty"), updatedData);

        if (pushToken) {
          sendNotification({
            action: "missed",
            person: todayEntry.person,
            excludeToken: pushToken,
            timestamp: today.toISOString(),
          }).then(() => console.log("Push Notification sent."));
        }
      } catch (error) {
        console.error("Error in auto-mark missed:", error);
      }
    };

    // Check immediately when component mounts
    checkAndMarkMissed();

    // Also set up an interval to check every minute after 23:00
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() >= 22) {
        checkAndMarkMissed();
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [data, database, pushToken, today]);
};

/**
 * Usage in your Index component:
 *
 * // Add this near your other hooks
 * useAutoMarkMissed(database, data);
 */
