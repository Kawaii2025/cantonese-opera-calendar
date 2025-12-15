import { useEffect, useRef } from 'react';
import dayjs from 'dayjs';

/**
 * Custom hook for page-level scroll navigation between months
 * Scrolling up/down on the page (but not inside calendar cells) navigates to previous/next month
 */
export const usePageScroll = (currentDate: dayjs.Dayjs, onDateChange: (date: dayjs.Dayjs) => void) => {
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events that aren't inside calendar date content
      const calendarContent = (e.target as HTMLElement).closest('.ant-picker-calendar-date-content');
      if (calendarContent) {
        // If scrolling inside calendar, don't change months
        return;
      }
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      
      scrollTimeoutRef.current = setTimeout(() => {
        const newDate = e.deltaY > 0 
          ? currentDate.add(1, 'month')
          : currentDate.subtract(1, 'month');
        onDateChange(newDate);
      }, 100);
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentDate, onDateChange]);
};
