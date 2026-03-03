import type { User } from "@supabase/supabase-js";
import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
	AppContextValue,
	MarkedDatesMap,
	MonthlyStats,
	NepaliDate,
	Organization,
	Theme,
} from "./types/app.types";
import { calculateMonthlyStats } from "./utils/calculations";
import { getCurrentDate } from "./utils/nepali-calendar";
import { supabase } from "./utils/supabase";

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
	// Current Nepali Date (Auto-updates)
	const [current, setCurrent] = useState<NepaliDate>(getCurrentDate());
	const [viewYear, setViewYear] = useState<number>(current.year);
	const [viewMonth, setViewMonth] = useState<number>(current.month);
	const currentDateRef = useRef<NepaliDate>(current);

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
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [currentOrgId, setCurrentOrgId] = useState<string | null>(
		() => localStorage.getItem("last_org_id") || null,
	);

	// --- Global Modals ---
	const [globalAlert, setGlobalAlert] = useState<string | null>(null);
	const [globalConfirm, setGlobalConfirm] = useState<{
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Derived Current Org
	const currentOrg: Organization | null =
		organizations.find((o) => o.id === currentOrgId) || organizations[0] || null;

	// Theme (Global)
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("app_theme") || "dark") as Theme,
	);

	// Attendance: { "YYYY-MM-DD": daily_hours } for CURRENT Org
	const [markedDates, setMarkedDates] = useState<MarkedDatesMap>({});

	// Auth & Sync State
	const [user, setUser] = useState<User | null>(null);
	const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
	const [isSyncing, setIsSyncing] = useState<boolean>(false);
	const hasLoadedFromRemote = useRef<boolean>(false);

	// Guest Mode: Track if we have unsaved guest data to merge
	const guestDataRef = useRef<{
		markedDates: MarkedDatesMap;
		orgSettings: Organization | null;
	}>({ markedDates: {}, orgSettings: null });
	const isGuestModeRef = useRef<boolean>(false);

	// --- Effects ---

	// 1. Theme Effect
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("app_theme", theme);
		if (user && hasLoadedFromRemote.current) {
			supabase
				.from("user_settings")
				.upsert({ user_id: user.id, theme }, { onConflict: "user_id" })
				.then(({ error }) => {
					if (error) console.error("Error syncing theme:", error);
				});
		}
	}, [theme, user]);

	// 2. Auth Listener & Data Loader
	const userIdRef = useRef<string | null>(null);

	useEffect(() => {
		const loadUserData = async (
			userId: string,
			dataToMerge: {
				dates: MarkedDatesMap;
				settings: Organization | null;
			} | null = null,
		) => {
			try {
				setIsSyncing(true);
				setLoadingAuth(true);

				// Fetch Organizations
				const { data: orgs, error: orgError } = await supabase
					.from("organizations")
					.select("*")
					.eq("user_id", userId)
					.order("created_at", { ascending: true });

				if (orgError) throw orgError;

				let validOrgs: Organization[] = orgs || [];
				let activeId: string | null = null;

				// Handle Merging Guest Data into Primary Org
				if (validOrgs.length === 0) {
					// New user - create from guest settings or default
					const defaults = dataToMerge?.settings || {
						name: "Primary Job",
						hourly_rate: 0,
						daily_hours: 8,
						tds_percentage: null as number | null,
					};
					const { data: newOrg } = await supabase
						.from("organizations")
						.insert({
							user_id: userId,
							name: defaults.name,
							hourly_rate: defaults.hourly_rate,
							daily_hours: defaults.daily_hours,
							tds_percentage:
								(defaults as { tds_percentage?: number | null }).tds_percentage ?? null,
						})
						.select()
						.single();
					if (newOrg) {
						validOrgs = [newOrg];
						activeId = newOrg.id;
					}
				} else {
					// Existing user
					// Determine active org
					const savedId = localStorage.getItem("last_org_id");
					activeId = validOrgs.find((o) => o.id === savedId)?.id ?? validOrgs[0]?.id ?? null;
				}

				setOrganizations(validOrgs);
				setCurrentOrgId(activeId);
				if (activeId) localStorage.setItem("last_org_id", activeId);

				// Fetch Attendance for Active Org
				const remoteDates: MarkedDatesMap = {};
				if (activeId) {
					const { data: attendance, error } = await supabase
						.from("attendance")
						.select("date_str, daily_hours")
						.eq("organization_id", activeId);

					if (!error && attendance) {
						attendance.forEach((row) => {
							remoteDates[row.date_str] = row.daily_hours ?? 8;
						});
					}
				}

				// MERGE GUEST DATES
				if (dataToMerge?.dates && activeId) {
					const datesToInsert: {
						user_id: string;
						organization_id: string;
						date_str: string;
						daily_hours: number;
					}[] = [];
					Object.entries(dataToMerge.dates).forEach(([dateStr, dayHours]) => {
						if (!remoteDates[dateStr]) {
							// Only insert if not already present
							datesToInsert.push({
								user_id: userId,
								organization_id: activeId,
								date_str: dateStr,
								daily_hours: dayHours,
							});
							remoteDates[dateStr] = dayHours; // Update local view immediately
						}
					});

					if (datesToInsert.length > 0) {
						await supabase.from("attendance").insert(datesToInsert);
						console.log(`Merged ${datesToInsert.length} guest dates.`);
					}
				}

				setMarkedDates(remoteDates);

				// Fetch Theme from user_settings (if exists)
				const { data: settings } = await supabase
					.from("user_settings")
					.select("theme")
					.eq("user_id", userId)
					.single();
				if (settings?.theme) setTheme(settings.theme as Theme);

				hasLoadedFromRemote.current = true;
			} catch (err) {
				console.error("Error loading user data:", err);
			} finally {
				setLoadingAuth(false);
				setIsSyncing(false);
			}
		};

		const handleAuthChange = async (incomingUser: User | null) => {
			if (!incomingUser) {
				// GUEST MODE INITIALIZATION
				userIdRef.current = null;
				setUser(null);
				isGuestModeRef.current = true;

				// Create a default ephemeral guest organization
				const guestOrg: Organization = {
					id: "guest",
					name: "Draft Workspace",
					hourly_rate: 0,
					daily_hours: 8,
					tds_percentage: null,
					user_id: "",
					color: null,
					created_at: null,
					updated_at: null,
				};
				setOrganizations([guestOrg]);
				setCurrentOrgId("guest");
				setMarkedDates({}); // Clear any previous state
				setLoadingAuth(false);
				hasLoadedFromRemote.current = false;
				guestDataRef.current = { markedDates: {}, orgSettings: null }; // Reset guest tracking
				return;
			}

			// Check if we're transitioning from guest mode with data to merge
			const dataToMerge =
				isGuestModeRef.current && Object.keys(guestDataRef.current.markedDates).length > 0
					? {
						dates: { ...guestDataRef.current.markedDates },
						settings: guestDataRef.current.orgSettings,
					}
					: null;

			isGuestModeRef.current = false; // No longer in guest mode

			const isActualNewUser = userIdRef.current !== incomingUser.id;
			userIdRef.current = incomingUser.id;
			setUser(incomingUser);

			if (isActualNewUser || !hasLoadedFromRemote.current) {
				await loadUserData(incomingUser.id, dataToMerge);
			}
		};

		// 1. Explicit Session Restoration
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				handleAuthChange(session.user);
			} else {
				// Only switch to guest mode if getSession confirmed no current session
				handleAuthChange(null);
			}
		});

		// 2. Continuous Listener
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === "SIGNED_OUT") {
				handleAuthChange(null);
			} else if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
				handleAuthChange(session?.user ?? null);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	// Sync guest data to ref when in guest mode
	useEffect(() => {
		if (isGuestModeRef.current && currentOrgId === "guest") {
			guestDataRef.current = {
				markedDates: { ...markedDates },
				orgSettings: organizations[0] || null,
			};
		}
	}, [markedDates, organizations, currentOrgId]);

	// --- Actions ---

	const fetchAttendance = async (orgId: string) => {
		const { data: attendance, error } = await supabase
			.from("attendance")
			.select("date_str, daily_hours")
			.eq("organization_id", orgId);

		if (!error && attendance) {
			const dates: MarkedDatesMap = {};
			attendance.forEach((row) => {
				dates[row.date_str] = row.daily_hours ?? 8;
			});
			setMarkedDates(dates);
		}
	};

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	};

	const switchOrganization = async (orgId: string) => {
		if (orgId === currentOrgId) return;
		setIsSyncing(true);
		setCurrentOrgId(orgId);
		localStorage.setItem("last_org_id", orgId);
		setMarkedDates({}); // Clear transiently
		try {
			await fetchAttendance(orgId);
		} catch (e) {
			console.error("Error fetching attendance", e);
		} finally {
			setIsSyncing(false);
		}
	};

	const addOrganization = async (name: string) => {
		if (!user) {
			// Guest mode: Only one org allowed
			setGlobalAlert(
				"Guests can only use the 'Draft Workspace'. Please login to create multiple organizations.",
			);
			return;
		}
		setIsSyncing(true);
		const { data, error } = await supabase
			.from("organizations")
			.insert({
				user_id: user.id,
				name,
				hourly_rate: 0,
				daily_hours: 8,
				tds_percentage: null,
			})
			.select()
			.single();

		if (!error && data) {
			setOrganizations((prev) => [...prev, data as Organization]);
			switchOrganization(data.id);
		}
		setIsSyncing(false);
	};

	const updateOrganization = async (id: string, updates: Partial<Organization>) => {
		// Optimistic update
		setOrganizations((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));

		if (!user || id === "guest") return; // Stop here for guests or guest org

		// Debounce actual DB call if needed? For now, direct simple update.
		const { error } = await supabase.from("organizations").update(updates).eq("id", id);
		if (error) {
			console.error("Update failed", error);
		}
	};

	const deleteOrganization = async (id: string) => {
		if (!user) return; // Guests can't delete the default org really

		if (organizations.length <= 1) {
			setGlobalAlert("Cannot delete the only organization.");
			return;
		}

		// First, delete all attendance records for this organization
		const { error: attendanceError } = await supabase
			.from("attendance")
			.delete()
			.eq("organization_id", id);

		if (attendanceError) {
			console.error("Failed to delete attendance records:", attendanceError);
			setGlobalAlert(
				`Failed to delete organization's attendance records: ${attendanceError.message}`,
			);
			return;
		}

		// Then, delete the organization
		const { error, count } = await supabase
			.from("organizations")
			.delete({ count: "exact" })
			.eq("id", id);

		if (error) {
			console.error("Delete failed:", error);
			setGlobalAlert(`Failed to delete organization: ${error.message}`);
		} else if (count === 0) {
			setGlobalAlert(
				"Failed to delete: Organization not found or permission denied (0 rows affected).",
			);
		} else {
			const newOrgs = organizations.filter((o) => o.id !== id);
			setOrganizations(newOrgs);
			if (currentOrgId === id && newOrgs[0]) {
				switchOrganization(newOrgs[0].id);
			}
		}
	};

	// Calendar Action
	const toggleDate = async (year: number, month: number, day: number) => {
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
		if (!user || currentOrgId === "guest") return;

		try {
			if (isAdding) {
				await supabase.from("attendance").insert({
					user_id: user.id,
					organization_id: currentOrgId,
					date_str: dateKey,
					daily_hours: hoursToStore,
				});
			} else {
				await supabase.from("attendance").delete().match({
					user_id: user.id,
					organization_id: currentOrgId,
					date_str: dateKey,
				});
			}
		} catch (error) {
			console.error("Failed to sync attendance:", error);
			// Rollback state on failure
			setMarkedDates((prev) => {
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

	const isMarked = (year: number, month: number, day: number) =>
		!!markedDates[`${year}-${month + 1}-${day}`];

	// Getters/Setters Compatibility for existing components
	// These update the CURRENT organization
	const setHourlyRate = (val: number | "") => {
		if (currentOrgId) updateOrganization(currentOrgId, { hourly_rate: val === "" ? 0 : val });
	};
	const setDailyHours = (val: number) => {
		if (currentOrgId) updateOrganization(currentOrgId, { daily_hours: val });
	};
	const setTdsPercentage = (val: number | "") => {
		if (currentOrgId)
			updateOrganization(currentOrgId, {
				tds_percentage: val === "" ? null : val,
			});
	};

	const resetData = async () => {
		setGlobalConfirm({
			message: "Reset current workspace data?",
			onConfirm: async () => {
				if (user && currentOrgId) {
					await supabase.from("attendance").delete().eq("organization_id", currentOrgId);
					await updateOrganization(currentOrgId, {
						hourly_rate: 0,
						daily_hours: 8,
						tds_percentage: null,
					});
				}
				setMarkedDates({});
				setGlobalConfirm(null);
			},
		});
	};

	const forceLogout = async () => {
		try {
			await supabase.auth.signOut();
		} catch (_) {
			/* ignore */
		}
		localStorage.clear();
		window.location.reload();
	};

	// Calculation
	const getMonthlyStats = (): MonthlyStats => {
		return calculateMonthlyStats(
			markedDates,
			viewYear,
			viewMonth,
			Number(currentOrg?.hourly_rate || 0),
			Number(currentOrg?.tds_percentage || 0)
		);
	};

	return (
		<AppContext.Provider
			value={{
				viewYear,
				setViewYear,
				viewMonth,
				setViewMonth,

				// Exposed Props
				hourlyRate: currentOrg?.hourly_rate || 0,
				setHourlyRate,
				dailyHours: currentOrg?.daily_hours ?? 8,
				setDailyHours,
				tdsPercentage: currentOrg?.tds_percentage ?? null,
				setTdsPercentage,

				markedDates,
				toggleDate,
				isMarked,
				resetData,
				forceLogout,

				globalAlert,
				setGlobalAlert,
				globalConfirm,
				setGlobalConfirm,

				user,
				loadingAuth,
				isSyncing,
				theme,
				toggleTheme,
				getMonthlyStats,
				currentDate: current,

				// New Props
				organizations,
				currentOrg,
				switchOrganization,
				addOrganization,
				updateOrganization,
				deleteOrganization,
			}}
		>
			{children}
		</AppContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppContextValue {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useAppStore must be used within an AppProvider");
	}
	return context;
}
