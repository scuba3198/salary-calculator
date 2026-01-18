import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './utils/supabase';
import { getCurrentDate } from './utils/nepali-calendar';


const AppContext = createContext();

export function AppProvider({ children }) {
    // Current Nepali Date (Auto-updates)
    const [current, setCurrent] = useState(getCurrentDate());
    const [viewYear, setViewYear] = useState(current.year);
    const [viewMonth, setViewMonth] = useState(current.month);
    const currentDateRef = useRef(current);

    // Sync ref with state
    useEffect(() => {
        currentDateRef.current = current;
    }, [current]);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = getCurrentDate();
            const current = currentDateRef.current;
            if (now.year !== current.year || now.month !== current.month || now.day !== current.day) {
                setCurrent(now);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // --- Multi-Org State ---
    const [organizations, setOrganizations] = useState([]);
    const [currentOrgId, setCurrentOrgId] = useState(() => localStorage.getItem('last_org_id') || null);

    // Derived Current Org
    const currentOrg = organizations.find(o => o.id === currentOrgId) || organizations[0] || null;

    // Theme (Global)
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');

    // Attendance: { "YYYY-MM-DD": daily_hours } for CURRENT Org
    const [markedDates, setMarkedDates] = useState({});

    // Auth & Sync State
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const hasLoadedFromRemote = useRef(false);

    // Guest Mode: Track if we have unsaved guest data to merge
    const guestDataRef = useRef({ markedDates: {}, orgSettings: null });
    const isGuestModeRef = useRef(false);

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
                isGuestModeRef.current = true;

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

            // Check if we're transitioning from guest mode with data to merge
            const dataToMerge = isGuestModeRef.current && Object.keys(guestDataRef.current.markedDates).length > 0
                ? { dates: { ...guestDataRef.current.markedDates }, settings: guestDataRef.current.orgSettings }
                : null;

            isGuestModeRef.current = false; // No longer in guest mode

            const isNewUser = user?.id !== session.user.id;
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
    }, []);

    // 2.5. Sync guest data to ref when in guest mode
    useEffect(() => {
        if (isGuestModeRef.current && currentOrgId === 'guest') {
            guestDataRef.current = {
                markedDates: { ...markedDates },
                orgSettings: organizations[0] || null
            };
        }
    }, [markedDates, organizations, currentOrgId]);

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
                    .select('date_str, daily_hours')
                    .eq('organization_id', activeId);

                if (!error && attendance) {
                    attendance.forEach(row => remoteDates[row.date_str] = row.daily_hours ?? 8);
                }
            }

            // MERGE GUEST DATES
            if (dataToMerge?.dates && activeId) {
                const datesToInsert = [];
                Object.entries(dataToMerge.dates).forEach(([dateStr, dayHours]) => {
                    if (!remoteDates[dateStr]) { // Only insert if not already present
                        datesToInsert.push({
                            user_id: userId,
                            organization_id: activeId,
                            date_str: dateStr,
                            daily_hours: dayHours
                        });
                        remoteDates[dateStr] = dayHours; // Update local view immediately
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
            .select('date_str, daily_hours')
            .eq('organization_id', orgId);

        if (!error && attendance) {
            const dates = {};
            attendance.forEach(row => dates[row.date_str] = row.daily_hours ?? 8);
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

        // First, delete all attendance records for this organization
        const { error: attendanceError } = await supabase
            .from('attendance')
            .delete()
            .eq('organization_id', id);

        if (attendanceError) {
            console.error("Failed to delete attendance records:", attendanceError);
            alert("Failed to delete organization's attendance records: " + attendanceError.message);
            return;
        }

        // Then, delete the organization
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
        if (!currentOrgId || isSyncing) return;

        const dateKey = `${year}-${month + 1}-${day}`;
        const newDates = { ...markedDates };
        const isAdding = !newDates[dateKey];
        const hoursToStore = currentOrg?.daily_hours ?? 8;

        if (isAdding) {
            // Store the current daily_hours setting when marking the date
            newDates[dateKey] = hoursToStore;
        } else {
            delete newDates[dateKey];
        }

        setMarkedDates(newDates);

        // Stop here if guest OR if org ID is the temporary 'guest' placeholder (race condition guard)
        if (!user || currentOrgId === 'guest') return;

        try {
            if (isAdding) {
                await supabase.from('attendance').insert({
                    user_id: user.id,
                    organization_id: currentOrgId,
                    date_str: dateKey,
                    daily_hours: hoursToStore
                });
            } else {
                await supabase.from('attendance').delete().match({
                    user_id: user.id,
                    organization_id: currentOrgId,
                    date_str: dateKey
                });
            }
        } catch (error) {
            console.error('Failed to sync attendance:', error);
            // Rollback state on failure
            setMarkedDates(prev => {
                const rollback = { ...prev };
                if (isAdding) {
                    delete rollback[dateKey];
                } else {
                    rollback[dateKey] = hoursToStore;
                }
                return rollback;
            });
        }
    };

    const isMarked = (year, month, day) => !!markedDates[`${year}-${month + 1}-${day}`];

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
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        localStorage.clear();
        window.location.reload();
    };

    // Calculation
    const getMonthlyStats = () => {
        let count = 0;
        let totalHours = 0;
        Object.entries(markedDates).forEach(([dateStr, dayHours]) => {
            const [y, m] = dateStr.split('-').map(Number);
            if (y === viewYear && m === viewMonth + 1) {
                count++;
                totalHours += Number(dayHours) || 0;
            }
        });

        const rate = Number(currentOrg?.hourly_rate || 0);
        const tds = Number(currentOrg?.tds_percentage || 0);

        const grossSalary = totalHours * rate;
        const tdsAmount = (grossSalary * tds) / 100;
        const netSalary = grossSalary - tdsAmount;

        return { daysWorked: count, totalHours, totalSalary: grossSalary, grossSalary, tdsAmount, netSalary };
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore() {
    return useContext(AppContext);
}
