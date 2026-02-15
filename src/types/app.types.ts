import type { Tables } from './database.types';
import type { User } from '@supabase/supabase-js';

// Database row types (aliases for convenience)
export type Organization = Tables<'organizations'>;
export type AttendanceRow = Tables<'attendance'>;
export type UserSettings = Tables<'user_settings'>;

// Nepali date
export interface NepaliDate {
    year: number;
    month: number; // 0-indexed (0 = Baisakh)
    day: number;
}

// Month info (from nepali-calendar utility)
export interface MonthInfo {
    year: number;
    month: number;
    startWeekday: number; // 0=Sun, 6=Sat
    daysInMonth: number;
}

// Monthly salary stats
export interface MonthlyStats {
    daysWorked: number;
    totalHours: number;
    totalSalary: number;
    grossSalary: number;
    tdsAmount: number;
    netSalary: number;
}

// Marked dates map: "YYYY-M-D" → daily_hours
export type MarkedDatesMap = Record<string, number>;

// Theme
export type Theme = 'dark' | 'light';

// App Context shape (for store.tsx)
export interface AppContextValue {
    viewYear: number;
    setViewYear: React.Dispatch<React.SetStateAction<number>>;
    viewMonth: number;
    setViewMonth: React.Dispatch<React.SetStateAction<number>>;

    hourlyRate: number;
    setHourlyRate: (val: number | '') => void;
    dailyHours: number;
    setDailyHours: (val: number) => void;
    tdsPercentage: number;
    setTdsPercentage: (val: number | '') => void;

    markedDates: MarkedDatesMap;
    toggleDate: (year: number, month: number, day: number) => Promise<void>;
    isMarked: (year: number, month: number, day: number) => boolean;
    resetData: () => Promise<void>;
    forceLogout: () => Promise<void>;

    user: User | null;
    loadingAuth: boolean;
    isSyncing: boolean;
    theme: Theme;
    toggleTheme: () => void;
    getMonthlyStats: () => MonthlyStats;
    currentDate: NepaliDate;

    organizations: Organization[];
    currentOrg: Organization | null;
    switchOrganization: (orgId: string) => Promise<void>;
    addOrganization: (name: string) => Promise<void>;
    updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
    deleteOrganization: (id: string) => Promise<void>;
}
