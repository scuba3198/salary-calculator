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

    // Guest Mode: Track if we have unsaved guest data to merge
    const guestDataRef = useRef({ markedDates: {}, orgSettings: null });

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
                // GUEST MODE INITIALIZATION
                setUser(null);

                // Create a default ephemeral guest organization
                const guestOrg = {
                    id: 'guest',
                    name: 'Draft Workspace',
                    hourly_rate: 0,
                    daily_hours: 8,
                    tds_percentage: 1
                };
                setOrganizations([guestOrg]);
                setCurrentOrgId('guest');
                setMarkedDates({}); // Clear any previous state
                setLoadingAuth(false);
                hasLoadedFromRemote.current = false;
                guestDataRef.current = { markedDates: {}, orgSettings: null }; // Reset guest tracking
                return;
            }

            const isNewUser = user?.id !== session.user.id;
            // Check if we have guest data to merge BEFORE setting user
            const dataToMerge = (currentOrgId === 'guest' && Object.keys(markedDates).length > 0)
                ? { dates: { ...markedDates }, settings: organizations[0] }
                : null;

            setUser(session.user);

            if (isNewUser || !hasLoadedFromRemote.current) {
                await loadUserData(session.user.id, dataToMerge);
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
    }, [user?.id]); // Re-run if user ID changes (though logic handles internal checks)

    // 3. User Data Handler
    const loadUserData = async (userId, dataToMerge = null) => {
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

            let validOrgs = orgs || [];
            let activeId = null;

            // Handle Merging Guest Data into Primary Org
            if (validOrgs.length === 0) {
                // New user - create from guest settings or default
                const defaults = dataToMerge?.settings || { name: 'Primary Job', hourly_rate: 0, daily_hours: 8 };
                const { data: newOrg } = await supabase.from('organizations').insert({
                    user_id: userId,
                    name: defaults.name,
                    hourly_rate: defaults.hourly_rate,
                    daily_hours: defaults.daily_hours,
                    tds_percentage: defaults.tds_percentage || 1
                }).select().single();
                if (newOrg) {
                    validOrgs = [newOrg];
                    activeId = newOrg.id;
                }
            } else {
                // Existing user
                // Determine active org
                const savedId = localStorage.getItem('last_org_id');
                activeId = validOrgs.find(o => o.id === savedId)?.id || validOrgs[0]?.id;
            }

            setOrganizations(validOrgs);
            setCurrentOrgId(activeId);
            if (activeId) localStorage.setItem('last_org_id', activeId);

            // Fetch Attendance for Active Org
            let remoteDates = {};
            if (activeId) {
                const { data: attendance, error } = await supabase
                    .from('attendance')
                    .select('date_str')
                    .eq('organization_id', activeId);

                if (!error && attendance) {
                    attendance.forEach(row => remoteDates[row.date_str] = true);
                }
            }

            // MERGE GUEST DATES
            if (dataToMerge?.dates && activeId) {
                const datesToInsert = [];
                Object.keys(dataToMerge.dates).forEach(dateStr => {
                    if (!remoteDates[dateStr]) { // Only insert if not already present
                        datesToInsert.push({
                            user_id: userId,
                            organization_id: activeId,
                            date_str: dateStr
                        });
                        remoteDates[dateStr] = true; // Update local view immediately
                    }
                });

                if (datesToInsert.length > 0) {
                    await supabase.from('attendance').insert(datesToInsert);
                    console.log(`Merged ${datesToInsert.length} guest dates.`);
                }
            }

            setMarkedDates(remoteDates);

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
        if (!user) {
            // Guest mode: Only one org allowed
            alert("Guests can only use the 'Draft Workspace'. Please login to create multiple organizations.");
            return;
        }
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

        if (!user || id === 'guest') return; // Stop here for guests or guest org

        // Debounce actual DB call if needed? For now, direct simple update.
        const { error } = await supabase.from('organizations').update(updates).eq('id', id);
        if (error) {
            console.error('Update failed', error);
        }
    };

    const deleteOrganization = async (id) => {
        if (!user) return; // Guests can't delete the default org really

        if (organizations.length <= 1) {
            alert("Cannot delete the only organization.");
            return;
        }

        const { error, count } = await supabase
            .from('organizations')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete organization: " + error.message);
        } else if (count === 0) {
            alert("Failed to delete: Organization not found or permission denied (0 rows affected).");
        } else {
            const newOrgs = organizations.filter(o => o.id !== id);
            setOrganizations(newOrgs);
            if (currentOrgId === id) {
                switchOrganization(newOrgs[0].id);
            }
        }
    };

    // Calendar Action
    const toggleDate = async (year, month, day) => {
        if (!currentOrgId) return;

        const dateKey = `${year}-${month}-${day}`;
        const newDates = { ...markedDates };
        const isAdding = !newDates[dateKey];

        if (isAdding) newDates[dateKey] = true;
        else delete newDates[dateKey];

        setMarkedDates(newDates);

        // Stop here if guest OR if org ID is the temporary 'guest' placeholder (race condition guard)
        if (!user || currentOrgId === 'guest') return;

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
        const hours = Number(currentOrg?.daily_hours ?? 8);
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
            dailyHours: currentOrg?.daily_hours ?? 8, setDailyHours,
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
