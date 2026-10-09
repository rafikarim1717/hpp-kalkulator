// Koneksi ke Supabase. Kalau env tidak diisi, aplikasi jalan di mode lokal (data di browser).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const isRemote = !!supabase;

// Pesan error Supabase → bahasa yang dimengerti pengguna
export function friendlyError(err) {
  const msg = String(err?.message || err || '');
  const map = [
    [/Invalid login credentials/i, 'Email atau password salah.'],
    [/Email not confirmed/i, 'Email belum dikonfirmasi. Cek inbox (atau folder spam) lalu klik link konfirmasi.'],
    [/User already registered/i, 'Email ini sudah terdaftar. Silakan masuk.'],
    [/Password should be at least/i, 'Password minimal 6 karakter.'],
    [/Unable to validate email|invalid format/i, 'Format email tidak valid.'],
    [/rate limit|too many requests/i, 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'],
    [/Failed to fetch|NetworkError|network/i, 'Tidak bisa terhubung ke server. Cek koneksi internet.'],
    [/row-level security|permission denied/i, 'Tidak punya izin untuk perubahan ini.'],
  ];
  for (const [re, text] of map) if (re.test(msg)) return text;
  return msg || 'Terjadi kesalahan.';
}
