import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentDate } from './utils/nepali-calendar';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // Default to current Nepali Date
    const current = getCurrentDate();

    const [viewYear, setViewYear] = useState(current.year);
    const [viewMonth, setViewMonth] = useState(current.month);

    // Settings
    // Settings
    const [hourlyRate, setHourlyRate] = useState(() => {
        const saved = localStorage.getItem('hourlyRate');
        return saved ? Number(saved) : '';
    });
    const [dailyHours, setDailyHours] = useState(() => {
        const saved = localStorage.getItem('dailyHours');
        return saved ? Number(saved) : '';
    });
    const [tdsPercentage, setTdsPercentage] = useState(() => {
        const saved = localStorage.getItem('tdsPercentage');
        return saved ? Number(saved) : '';
    });

    useEffect(() => {
        localStorage.setItem('hourlyRate', hourlyRate);
    }, [hourlyRate]);

    useEffect(() => {
        localStorage.setItem('dailyHours', dailyHours);
    }, [dailyHours]);

    useEffect(() => {
        localStorage.setItem('tdsPercentage', tdsPercentage);
    }, [tdsPercentage]);

    // Attendance: Set of strings "YYYY-MM-DD"
    const [markedDates, setMarkedDates] = useState(() => {
        const saved = localStorage.getItem('markedDates');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    useEffect(() => {
        localStorage.setItem('markedDates', JSON.stringify([...markedDates]));
    }, [markedDates]);

    // Helper to toggle a date
    const toggleDate = (year, month, day) => {
        const key = `${year}-${month}-${day}`;
        setMarkedDates(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const isMarked = (year, month, day) => {
        return markedDates.has(`${year}-${month}-${day}`);
    };

    // Calculation
    const getMonthlyStats = () => {
        let count = 0;
        for (let dateStr of markedDates) {
            const [y, m, d] = dateStr.split('-').map(Number);
            if (y === viewYear && m === viewMonth) {
                count++;
            }
        }
        const grossSalary = count * dailyHours * hourlyRate;
        const tdsAmount = (grossSalary * tdsPercentage) / 100;
        const netSalary = grossSalary - tdsAmount;

        return {
            daysWorked: count,
            totalHours: count * dailyHours,
            totalSalary: grossSalary, // Keeping prop name for backward compat if needed, but adding specific ones
            grossSalary,
            tdsAmount,
            netSalary
        };
    };

    return (
        <AppContext.Provider value={{
            viewYear, setViewYear,
            viewMonth, setViewMonth,
            viewMonth, setViewMonth,
            hourlyRate, setHourlyRate,
            dailyHours, setDailyHours,
            tdsPercentage, setTdsPercentage,
            toggleDate, isMarked,
            getMonthlyStats,
            currentDate: current
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => useContext(AppContext);
