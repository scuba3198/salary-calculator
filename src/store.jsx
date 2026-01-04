import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './utils/supabase';
import { getCurrentDate } from './utils/nepali-calendar';
import { useDebounce } from './hooks/useDebounce';

const AppContext = createContext();

export function AppProvider({ children }) {
    // Current Nepali Date (Auto-updates)
    const [current, setCurrent] = useState(getCurrentDate());
    const [viewYear, setViewYear] = useState(current.year);
    const [viewMonth, setViewMonth] = useState(current.month);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = getCurrentDate();
            if (now.year !== current.year || now.month !== current.month || now.day !== current.day) {
                setCurrent(now);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [current]);

    // --- Multi-Org State ---
    const [organizations, setOrganizations] = useState([]);
    const [currentOrgId, setCurrentOrgId] = useState(() => localStorage.getItem('last_org_id') || null);

    // Derived Current Org
    const currentOrg = organizations.find(o => o.id === currentOrgId) || organizations[0] || null;

    // Theme (Global)
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');

    // Attendance: { "YYYY-MM-DD": true } for CURRENT Org
    const [markedDates, setMarkedDates] = useState({});

    // Auth & Sync State
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const hasLoadedFromRemote = useRef(false);

    // --- Effects ---

    // 1. Theme Effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);
        if (user && hasLoadedFromRemote.current) {
            supabase.from('user_settings').upsert({ user_id: user.id, theme }, { onConflict: 'user_id' }).then(({ error }) => {
                if (error) console.error('Error syncing theme:', error);
            });
        }
    }, [theme, user]);

    // 2. Auth Listener
    useEffect(() => {
        const handleAuthChange = async (session) => {
            if (!session?.user) {
                setUser(null);
                setOrganizations([]);
                setCurrentOrgId(null);
                setMarkedDates({});
                setLoadingAuth(false);
                hasLoadedFromRemote.current = false;
                return;
            }

            const isNewUser = user?.id !== session.user.id;
            setUser(session.user);

            if (isNewUser || !hasLoadedFromRemote.current) {
                await loadUserData(session.user.id);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthChange(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') handleAuthChange(null);
            else if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) handleAuthChange(session);
        });

        return () => subscription.unsubscribe();
    }, [user?.id]);

    // 3. User Data Handler
    const loadUserData = async (userId) => {
        try {
            setIsSyncing(true);
            setLoadingAuth(true);

            // Fetch Organizations
            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (orgError) throw orgError;

            // If no orgs (edge case), create default? (Migration should have covered this)
            // But let's be safe.
            let validOrgs = orgs || [];
            if (validOrgs.length === 0) {
                // Fallback create
                const { data: newOrg } = await supabase.from('organizations').insert({
                    user_id: userId, name: 'Primary Job', hourly_rate: 0, daily_hours: 8
                }).select().single();
                if (newOrg) validOrgs = [newOrg];
            }

            setOrganizations(validOrgs);

            // Determine active org
            const savedId = localStorage.getItem('last_org_id');
            const activeId = validOrgs.find(o => o.id === savedId)?.id || validOrgs[0]?.id;

            // If we found a valid ID, set it. Note: currentOrgId state update might be async, 
            // so we use local variable for fetching attendance.
            setCurrentOrgId(activeId);
            if (activeId) localStorage.setItem('last_org_id', activeId);

            // Fetch Attendance for Active Org
            if (activeId) {
                await fetchAttendance(activeId);
            }

            // Fetch Theme from user_settings (if exists)
            const { data: settings } = await supabase.from('user_settings').select('theme').eq('user_id', userId).single();
            if (settings?.theme) setTheme(settings.theme);

            hasLoadedFromRemote.current = true;
        } catch (err) {
            console.error('Error loading user data:', err);
        } finally {
            setLoadingAuth(false);
            setIsSyncing(false);
        }
    };

    const fetchAttendance = async (orgId) => {
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('date_str')
            .eq('organization_id', orgId);

        if (!error && attendance) {
            const dates = {};
            attendance.forEach(row => dates[row.date_str] = true);
            setMarkedDates(dates);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- Actions ---

    const switchOrganization = async (orgId) => {
        if (orgId === currentOrgId) return;
        setIsSyncing(true);
        setCurrentOrgId(orgId);
        localStorage.setItem('last_org_id', orgId);
        setMarkedDates({}); // Clear transiently
        try {
            await fetchAttendance(orgId);
        } catch (e) {
            console.error("Error fetching attendance", e);
        } finally {
            setIsSyncing(false);
        }
    };

    const addOrganization = async (name) => {
        setIsSyncing(true);
        const { data, error } = await supabase.from('organizations').insert({
            user_id: user.id,
            name,
            hourly_rate: 0,
            daily_hours: 8,
            tds_percentage: 1
        }).select().single();

        if (!error && data) {
            setOrganizations(prev => [...prev, data]);
            switchOrganization(data.id);
        }
        setIsSyncing(false);
    };

    const updateOrganization = async (id, updates) => {
        // Optimistic update
        setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));

        // Debounce actual DB call if needed? For now, direct simple update.
        // If rapid typing inputs, this might spam DB.
        // We should probably rely on the ID being stable.
        const { error } = await supabase.from('organizations').update(updates).eq('id', id);
        if (error) {
            console.error('Update failed', error);
        }
    };

    const deleteOrganization = async (id) => {
        if (organizations.length <= 1) {
            alert("Cannot delete the only organization.");
            return;
        }

        const { error } = await supabase.from('organizations').delete().eq('id', id);
        if (!error) {
            const newOrgs = organizations.filter(o => o.id !== id);
            setOrganizations(newOrgs);
            if (currentOrgId === id) {
                switchOrganization(newOrgs[0].id);
            }
        } else {
            console.error("Delete failed:", error);
            alert("Failed to delete organization: " + error.message);
        }
    };

    // Calendar Action
    const toggleDate = async (year, month, day) => {
        if (!currentOrgId || !user) return;
        const dateKey = `${year}-${month}-${day}`;
        const newDates = { ...markedDates };
        const isAdding = !newDates[dateKey];

        if (isAdding) newDates[dateKey] = true;
        else delete newDates[dateKey];

        setMarkedDates(newDates);

        if (isAdding) {
            await supabase.from('attendance').insert({
                user_id: user.id,
                organization_id: currentOrgId,
                date_str: dateKey
            });
        } else {
            await supabase.from('attendance').delete().match({
                user_id: user.id,
                organization_id: currentOrgId,
                date_str: dateKey
            });
        }
    };

    const isMarked = (year, month, day) => !!markedDates[`${year}-${month}-${day}`];

    // Getters/Setters Compatibility for existing components
    // These update the CURRENT organization
    const setHourlyRate = (val) => {
        if (currentOrgId) updateOrganization(currentOrgId, { hourly_rate: val });
    };
    const setDailyHours = (val) => {
        if (currentOrgId) updateOrganization(currentOrgId, { daily_hours: val });
    };
    const setTdsPercentage = (val) => {
        if (currentOrgId) updateOrganization(currentOrgId, { tds_percentage: val });
    };

    const resetData = async () => {
        if (window.confirm('Reset current workspace data?')) {
            if (user && currentOrgId) {
                await supabase.from('attendance').delete().eq('organization_id', currentOrgId);
                await updateOrganization(currentOrgId, { hourly_rate: 0, daily_hours: 8, tds_percentage: 1 });
            }
            setMarkedDates({});
        }
    };

    const forceLogout = async () => {
        try { await supabase.auth.signOut(); } catch (e) { }
        localStorage.clear();
        window.location.reload();
    };

    // Calculation
    const getMonthlyStats = () => {
        let count = 0;
        Object.keys(markedDates).forEach(dateStr => {
            const [y, m, d] = dateStr.split('-').map(Number);
            if (y === viewYear && m === viewMonth) count++;
        });

        const rate = Number(currentOrg?.hourly_rate || 0);
        const hours = Number(currentOrg?.daily_hours || 8);
        const tds = Number(currentOrg?.tds_percentage || 0);

        const grossSalary = count * hours * rate;
        const tdsAmount = (grossSalary * tds) / 100;
        const netSalary = grossSalary - tdsAmount;

        return { daysWorked: count, totalHours: count * hours, totalSalary: grossSalary, grossSalary, tdsAmount, netSalary };
    };

    return (
        <AppContext.Provider value={{
            viewYear, setViewYear,
            viewMonth, setViewMonth,

            // Exposed Props
            hourlyRate: currentOrg?.hourly_rate || 0, setHourlyRate,
            dailyHours: currentOrg?.daily_hours || 8, setDailyHours,
            tdsPercentage: currentOrg?.tds_percentage ?? 1, setTdsPercentage,

            markedDates, toggleDate, isMarked,
            resetData, forceLogout,
            user, loadingAuth, isSyncing,
            theme, toggleTheme,
            getMonthlyStats,
            currentDate: current,

            // New Props
            organizations,
            currentOrg,
            switchOrganization,
            addOrganization,
            updateOrganization,
            deleteOrganization
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppStore() {
    return useContext(AppContext);
}
