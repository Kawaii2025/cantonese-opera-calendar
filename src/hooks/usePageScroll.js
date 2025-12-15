import { useEffect, useRef } from 'react';
/**
 * Custom hook for page-level scroll navigation between months
 * Scrolling up/down anywhere on the page navigates to previous/next month
 */
export const usePageScroll = (currentDate, onDateChange, isModalOpen = false) => {
    const scrollTimeoutRef = useRef(null);
    useEffect(() => {
        const handleWheel = (e) => {
            // Don't change months when modal is open
            if (isModalOpen) {
                return;
            }
            if (scrollTimeoutRef.current)
                clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                const newDate = e.deltaY > 0
                    ? currentDate.add(1, 'month')
                    : currentDate.subtract(1, 'month');
                onDateChange(newDate);
            }, 100);
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [currentDate, onDateChange, isModalOpen]);
};
