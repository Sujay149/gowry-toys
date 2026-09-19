import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a .env file at the project root. See README.md.'
  );
}

const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) =>
          typeof window !== 'undefined' && window.localStorage
            ? Promise.resolve(window.localStorage.getItem(key))
            : Promise.resolve(null),
        setItem: (key: string, value: string) =>
          typeof window !== 'undefined' && window.localStorage
            ? Promise.resolve(window.localStorage.setItem(key, value))
            : Promise.resolve(),
        removeItem: (key: string) =>
          typeof window !== 'undefined' && window.localStorage
            ? Promise.resolve(window.localStorage.removeItem(key))
            : Promise.resolve(),
      }
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const REPORTS_BUCKET = 'attendance-reports';
export const AVATARS_BUCKET = 'avatars';
export const FUNCTIONS = {
  markAttendance: 'mark-attendance',
  generateMonthlyReport: 'generate-monthly-report',
} as const;