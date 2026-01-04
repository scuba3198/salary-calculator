import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import { getCurrentDate } from './utils/nepali-calendar';
import { useDebounce } from './hooks/useDebounce';
import { useRef } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
    // Current Nepali Date (Auto-updates)
    const [current, setCurrent] = useState(getCurrentDate());
    const [viewYear, setViewYear] = useState(current.year);
    const [viewMonth, setViewMonth] = useState(current.month);

    useEffect(() => {
        // Check for date change every minute
        const timer = setInterval(() => {
            const now = getCurrentDate();
            if (now.year !== current.year || now.month !== current.month || now.day !== current.day) {
                setCurrent(now);
                // Optional: Auto-switch view if in current month view? 
                // Let's keep view stable to avoiding jarring jumps, just update standard "today" indicator.
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [current]);

    // Settings
    const [hourlyRate, setHourlyRate] = useState(() => Number(localStorage.getItem('metric_hourlyRate')) || 0);
    const [dailyHours, setDailyHours] = useState(() => Number(localStorage.getItem('metric_dailyHours')) || 8);
    const [tdsPercentage, setTdsPercentage] = useState(() => Number(localStorage.getItem('metric_tdsPercentage')) || 1);

    // Theme
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');

    // Attendance: Dictionary { "YYYY-MM-DD": true }
    const [markedDates, setMarkedDates] = useState(() => {
        const saved = localStorage.getItem('metric_markedDates');
        return saved ? JSON.parse(saved) : {};
    });

    // Auth
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const isInitialLoad = useRef(true);

    // Debounced values
    const debouncedHourlyRate = useDebounce(hourlyRate, 1000);
    const debouncedDailyHours = useDebounce(dailyHours, 1000);
    const debouncedTdsPercentage = useDebounce(tdsPercentage, 1000);

    // --- Effects ---

    // 1. Theme Effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);

        if (user) {
            supabase.from('user_settings').update({ theme }).eq('user_id', user.id).then(({ error }) => {
                if (error) console.error('Error syncing theme:', error);
            });
        }
    }, [theme, user]);

    // 2. Auth Listener
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await loadUserData(session.user.id);
            } else {
                setLoadingAuth(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setMarkedDates({});
                setHourlyRate(0);
                setDailyHours(8);
                setTdsPercentage(1);
                setLoadingAuth(false);
                return;
            }

            setUser(session?.user ?? null);
            if (session?.user) {
                await loadUserData(session.user.id);
            } else {
                setLoadingAuth(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 3. User Data Handler
    const loadUserData = async (userId) => {
        try {
            setLoadingAuth(true);
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (settings && !settingsError) {
                isInitialLoad.current = true;
                if (settings.hourly_rate !== null) setHourlyRate(Number(settings.hourly_rate));
                if (settings.daily_hours !== null) setDailyHours(Number(settings.daily_hours));
                if (settings.tds_percentage !== null) setTdsPercentage(Number(settings.tds_percentage));
                if (settings.theme) setTheme(settings.theme);
                setTimeout(() => { isInitialLoad.current = false; }, 2000); // Allow state to settle
            }

            const { data: attendance, error: attendanceError } = await supabase
                .from('attendance')
                .select('date_str')
                .eq('user_id', userId);

            if (attendance && !attendanceError) {
                const dates = {};
                attendance.forEach(row => dates[row.date_str] = true);
                setMarkedDates(dates);
            }
        } catch (err) {
            console.error('Error loading user data:', err);
        } finally {
            setLoadingAuth(false);
        }
    };

    // 4. Persistence
    useEffect(() => {
        localStorage.setItem('metric_hourlyRate', hourlyRate);
        localStorage.setItem('metric_dailyHours', dailyHours);
        localStorage.setItem('metric_tdsPercentage', tdsPercentage);
    }, [hourlyRate, dailyHours, tdsPercentage]);

    useEffect(() => {
        if (user && !loadingAuth && !isInitialLoad.current) {
            supabase.from('user_settings').upsert({
                user_id: user.id,
                hourly_rate: debouncedHourlyRate,
                daily_hours: debouncedDailyHours,
                tds_percentage: debouncedTdsPercentage,
                updated_at: new Date()
            }).then(({ error }) => {
                if (error) console.error('Error saving settings:', error);
            });
        }
    }, [debouncedHourlyRate, debouncedDailyHours, debouncedTdsPercentage, user, loadingAuth]);

    useEffect(() => {
        localStorage.setItem('metric_markedDates', JSON.stringify(markedDates));
    }, [markedDates]);


    // --- Actions ---

    // Calendar expects (year, month, day)
    const toggleDate = async (year, month, day) => {
        const dateKey = `${year}-${month}-${day}`;
        const newDates = { ...markedDates };
        const isAdding = !newDates[dateKey];

        if (isAdding) {
            newDates[dateKey] = true;
        } else {
            delete newDates[dateKey];
        }
        setMarkedDates(newDates);

        if (user) {
            if (isAdding) {
                await supabase.from('attendance').insert({ user_id: user.id, date_str: dateKey });
            } else {
                await supabase.from('attendance').delete().match({ user_id: user.id, date_str: dateKey });
            }
        }
    };

    const isMarked = (year, month, day) => {
        return !!markedDates[`${year}-${month}-${day}`];
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const resetData = async () => {
        if (window.confirm('Are you sure? This will clear all data and sign you out.')) {
            try {
                if (user) await supabase.auth.signOut();
            } catch (err) {
                console.error('Sign out error during reset:', err);
            }
            setMarkedDates({});
            setHourlyRate(0);
            setDailyHours(8);
            setTdsPercentage(1);
            localStorage.clear();
            window.location.reload();
        }
    };

    // Calculation (Iterating over object keys)
    const getMonthlyStats = () => {
        let count = 0;
        // Iterate over keys since markedDates is a dictionary
        Object.keys(markedDates).forEach(dateStr => {
            const [y, m, d] = dateStr.split('-').map(Number);
            if (y === viewYear && m === viewMonth) {
                count++;
            }
        });

        const grossSalary = count * dailyHours * hourlyRate;
        const tdsAmount = (grossSalary * tdsPercentage) / 100;
        const netSalary = grossSalary - tdsAmount;

        return {
            daysWorked: count,
            totalHours: count * dailyHours,
            totalSalary: grossSalary,
            grossSalary,
            tdsAmount,
            netSalary
        };
    };

    return (
        <AppContext.Provider value={{
            viewYear, setViewYear,
            viewMonth, setViewMonth,
            hourlyRate, setHourlyRate,
            dailyHours, setDailyHours,
            tdsPercentage, setTdsPercentage,
            markedDates, toggleDate, isMarked,
            resetData,
            user, loadingAuth,
            theme, toggleTheme,
            getMonthlyStats,
            currentDate: current
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppStore() {
    return useContext(AppContext);
}
