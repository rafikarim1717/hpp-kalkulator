// ─────────────────────────────────────────────────────────────────────────────
// Logika murni untuk sinkronisasi data ke Supabase (tanpa React, mudah dites).
// ─────────────────────────────────────────────────────────────────────────────
import {
  DEFAULT_DIGITAL_MACHINES, DEFAULT_DIGITAL_PAPERS, DEFAULT_FINISHING, DEFAULT_MACHINES,
  DEFAULT_OTHERS, DEFAULT_PAPERS, DEFAULT_SETTINGS,
} from './masterData.js';

// Nama bagian data master di aplikasi → nama kolom di tabel shop_data
export const MASTER_COLUMNS = {
  settings: 'settings',
  papers: 'papers',
  machines: 'machines',
  finishing: 'finishing',
  others: 'others',
  digitalPapers: 'digital_papers',
  digitalMachines: 'digital_machines',
};

export const DEFAULT_MASTER = {
  settings: DEFAULT_SETTINGS,
  papers: DEFAULT_PAPERS,
  machines: DEFAULT_MACHINES,
  finishing: DEFAULT_FINISHING,
  others: DEFAULT_OTHERS,
  digitalPapers: DEFAULT_DIGITAL_PAPERS,
  digitalMachines: DEFAULT_DIGITAL_MACHINES,
};

const isEmptyObject = (v) => !v || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

// Baris shop_data → data master aplikasi.
// seeded=false artinya percetakan baru (belum pernah disimpan): pakai data contoh dan simpan sekali.
export function normalizeShopData(row) {
  const seeded = !!row && !isEmptyObject(row.settings);
  if (!seeded) return { master: { ...DEFAULT_MASTER }, seeded: false };
  return {
    seeded: true,
    master: {
      // susunan otomatis selalu 'termurah' (mode app Android hanya untuk tes pencocokan angka)
      settings: { ...DEFAULT_SETTINGS, ...row.settings, autoLayout: 'cheapest' },
      papers: Array.isArray(row.papers) ? row.papers : [],
      machines: Array.isArray(row.machines) ? row.machines : [],
      // jenis finishing baru di versi aplikasi berikutnya tetap muncul dengan nilai default
      finishing: { ...DEFAULT_FINISHING, ...(row.finishing || {}) },
      others: Array.isArray(row.others) ? row.others : [],
      digitalPapers: Array.isArray(row.digital_papers) ? row.digital_papers : [],
      digitalMachines: Array.isArray(row.digital_machines) ? row.digital_machines : [],
    },
  };
}

// Data master aplikasi (sebagian atau penuh) → kolom shop_data
export function masterToRow(partial) {
  const row = {};
  for (const [k, col] of Object.entries(MASTER_COLUMNS)) {
    if (partial[k] !== undefined) row[col] = partial[k];
  }
  return row;
}

export const productRow = (shopId, p) => ({
  id: p.id, shop_id: shopId, kind: p.kind, name: p.name || '', data: p,
});

// Bandingkan daftar produk sekarang dengan yang terakhir tersimpan.
// prev: Map id → JSON string. Hasil: produk yang perlu di-upsert, id yang perlu dihapus, Map baru.
export function diffProducts(prev, products) {
  const next = new Map();
  const upserts = [];
  for (const p of products) {
    const json = JSON.stringify(p);
    next.set(p.id, json);
    if (prev.get(p.id) !== json) upserts.push(p);
  }
  const deletes = [...prev.keys()].filter((id) => !next.has(id));
  return { upserts, deletes, next };
}

// Data lama yang tersimpan di browser (mode coba / demo) — untuk dipindahkan ke database.
const LOCAL_KEYS = {
  settings: 'pl2_settings', papers: 'pl2_papers', machines: 'pl2_machines', finishing: 'pl2_finishing',
  others: 'pl2_others', digitalPapers: 'pl2_dpapers', digitalMachines: 'pl2_dmachines',
};

export function readBrowserData(storage = globalThis.localStorage) {
  if (!storage) return null;
  const read = (k) => { try { const raw = storage.getItem(k); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; } };
  const master = {};
  for (const [k, key] of Object.entries(LOCAL_KEYS)) {
    const v = read(key);
    if (v !== undefined) master[k] = v;
  }
  const products = (read('pl2_products') || []).filter((p) => p && p.id && (p.kind === 'offset' || p.kind === 'digital'));
  if (!Object.keys(master).length && !products.length) return null;
  if (master.finishing) master.finishing = { ...DEFAULT_FINISHING, ...master.finishing };
  return { master, products };
}

// Gabungkan produk dari browser ke daftar sekarang: id yang sudah ada dilewati.
export function mergeProducts(current, incoming) {
  const ids = new Set(current.map((p) => p.id));
  return [...current, ...incoming.filter((p) => !ids.has(p.id))];
}
