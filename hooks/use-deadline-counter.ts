import { useState, useEffect } from 'react';

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formattedTime: string;
  percentageRemaining: number;
}

/**
 * Custom hook that counts down to 23:00 (11:00 PM) today
 * If current time is past 23:00, it counts down to 23:00 tomorrow
 * 
 * @returns TimeRemaining object with hours, minutes, seconds, and formatted string
 */
export const useDeadlineCounter = (): TimeRemaining => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    formattedTime: '00:00:00',
    percentageRemaining: 0,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      
      // Create deadline for today at 23:00
      const deadline = new Date();
      deadline.setHours(23, 0, 0, 0);
      
      // If current time is past 23:00, set deadline to tomorrow
      if (now >= deadline) {
        deadline.setDate(deadline.getDate() + 1);
      }
      
      // Calculate difference in milliseconds
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        return {
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          formattedTime: '00:00:00',
          percentageRemaining: 0,
        };
      }
      
      // Convert to hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Format as HH:MM:SS
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      // Calculate percentage remaining (assuming 24-hour period)
      const totalMillisecondsInDay = 24 * 60 * 60 * 1000;
      const percentageRemaining = (diff / totalMillisecondsInDay) * 100;
      
      return {
        hours,
        minutes,
        seconds,
        isExpired: false,
        formattedTime,
        percentageRemaining,
      };
    };
    
    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());
    
    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return timeRemaining;
};


/**
 * Helper function to get urgency level
 * Returns: 'critical' (< 1h), 'warning' (< 3h), or 'normal'
 */
export const getUrgencyLevel = (timeRemaining: TimeRemaining): 'critical' | 'warning' | 'normal' => {
  if (timeRemaining.isExpired) {
    return 'critical';
  }
  
  const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes;
  
  if (totalMinutes < 60) {
    return 'critical'; // Less than 1 hour
  } else if (totalMinutes < 180) {
    return 'warning'; // Less than 3 hours
  } else {
    return 'normal';
  }
};
