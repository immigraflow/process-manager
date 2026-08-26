// Configuração e cliente do Supabase
import { authStorage } from './authStorage.js';

export const SUPABASE_URL = 'https://qsdnndhqhjfrhhmhjytg.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZG5uZGhxaGpmcmhobWhqeXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MDkzMzEsImV4cCI6MjEwMzE4NTMzMX0.yXfD1ymzODA6mW7XzJHG3fAtzxtoia2kKz_vcQKf5h0';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true
  }
});
