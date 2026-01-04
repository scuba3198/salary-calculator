
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnebikpizabhzozvycxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWJpa3BpemFiaHpvenZ5Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTM2ODIsImV4cCI6MjA4MzA4OTY4Mn0.RTJPmOApWPvQ9ZF0a54QqwrJYep7EUaHk3_4fe6hVhQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
