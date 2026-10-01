import { useEffect, useState } from 'react';

// useState yang otomatis disimpan ke localStorage.
// `normalize` (opsional) dijalankan sekali saat data dibaca — dipakai untuk migrasi data versi lama.
export const useLocalState = (key, initial, normalize) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return normalize ? normalize(parsed) : parsed;
      }
    } catch (e) {}
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }, [key, state]);
  return [state, setState];
};
