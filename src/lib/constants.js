export const DEFAULT_TOOLS = [
  { id: 1, name: 'Heidelberg SM52', brand: 'Heidelberg', maxw: 52, maxh: 74, minw: 10, minh: 15, runrate: 85000, plate: 45000, minorder: 500, maxcolor: 4, setup: 50, notes: 'Mesin 4 warna standar' },
  { id: 2, name: 'Ryobi 524H', brand: 'Ryobi', maxw: 36, maxh: 52, minw: 8, minh: 12, runrate: 55000, plate: 35000, minorder: 300, maxcolor: 4, setup: 30, notes: 'Mesin compact serbaguna' },
  { id: 3, name: 'Komori LS426', brand: 'Komori', maxw: 61, maxh: 86, minw: 15, minh: 20, runrate: 110000, plate: 55000, minorder: 1000, maxcolor: 6, setup: 80, notes: 'Mesin besar 6 warna' },
];

export const DEFAULT_MATERIALS = [
  { id: 1, name: 'HVS 70gsm', gram: 70, type: 'HVS', lebar: 65, tinggi: 100, isi: 500, price: 95000, supplier: '', notes: '' },
  { id: 2, name: 'Art Paper 120gsm', gram: 120, type: 'Art Paper', lebar: 65, tinggi: 100, isi: 500, price: 180000, supplier: '', notes: '' },
  { id: 3, name: 'Art Carton 260gsm', gram: 260, type: 'Art Carton', lebar: 65, tinggi: 100, isi: 500, price: 320000, supplier: '', notes: '' },
  { id: 4, name: 'Ivory 230gsm', gram: 230, type: 'Ivory', lebar: 65, tinggi: 100, isi: 500, price: 285000, supplier: '', notes: '' },
  { id: 5, name: 'HVS 80gsm', gram: 80, type: 'HVS', lebar: 79, tinggi: 109, isi: 500, price: 110000, supplier: '', notes: '' },
];

export const PLANO_PRESETS = [
  { label: '65 × 100 cm — Standard', w: 65, h: 100 },
  { label: '79 × 109 cm — Besar', w: 79, h: 109 },
  { label: '61 × 86 cm', w: 61, h: 86 },
  { label: '50 × 70 cm', w: 50, h: 70 },
  { label: '45 × 64 cm', w: 45, h: 64 },
];

export const ITEM_PRESETS = [
  { label: 'Kartu Nama (9 × 5.5)', w: 9, h: 5.5 },
  { label: 'A6 (10.5 × 14.8)', w: 10.5, h: 14.8 },
  { label: 'A5 (14.8 × 21)', w: 14.8, h: 21 },
  { label: 'A4 (21 × 29.7)', w: 21, h: 29.7 },
  { label: 'A3 (29.7 × 42)', w: 29.7, h: 42 },
  { label: 'DL Envelope (10 × 21)', w: 10, h: 21 },
];

// basis: per1000pcs = per 1000 pcs hasil jadi, per1000lembar = per 1000 lembar cetak, flat = sekali bayar
export const FINISHING_PRESETS = [
  { name: 'Laminasi', price: 150000, basis: 'per1000lembar' },
  { name: 'Potong (mesin potong)', price: 50000, basis: 'per1000lembar' },
  { name: 'Pond (die-cut)', price: 200000, basis: 'per1000lembar' },
  { name: 'Pisau Pond (sekali)', price: 350000, basis: 'flat' },
  { name: 'Poly', price: 180000, basis: 'per1000pcs' },
  { name: 'Lem / Jilid', price: 120000, basis: 'per1000pcs' },
  { name: 'Varnish / UV', price: 130000, basis: 'per1000lembar' },
  { name: 'Emboss / Foil', price: 250000, basis: 'per1000pcs' },
  { name: 'Custom', price: 0, basis: 'per1000pcs' },
];

export const FINISHING_BASIS = [
  { value: 'per1000pcs', label: '/ 1000 pcs' },
  { value: 'per1000lembar', label: '/ 1000 lbr cetak' },
  { value: 'flat', label: 'flat (sekali)' },
];

export const PAPER_TYPES = ['HVS', 'Art Paper', 'Art Carton', 'Ivory', 'Duplex', 'Kraft', 'Coated', 'Uncoated', 'Lainnya'];

// Finishing produk jadi (dikerjakan setelah semua komponen jadi). basis: per1000pcs = per 1000 produk jadi
export const JOB_FINISHING_PRESETS = [
  { name: 'Lem / Jilid', price: 120000, basis: 'per1000pcs' },
  { name: 'Jilid Kawat / Steples', price: 0, basis: 'per1000pcs' },
  { name: 'Ring / Spiral', price: 0, basis: 'per1000pcs' },
  { name: 'Rakit / Packing', price: 0, basis: 'per1000pcs' },
  { name: 'Custom', price: 0, basis: 'per1000pcs' },
];

export const JOB_FINISHING_BASIS = [
  { value: 'per1000pcs', label: '/ 1000 produk' },
  { value: 'flat', label: 'flat (sekali)' },
];

let _id = 0;
export const newId = () => `${Date.now().toString(36)}-${(_id++).toString(36)}`;

// Satu komponen = satu bagian produk yang dicetak (mis. isi buku, cover, lembar kalender)
export const DEFAULT_COMPONENT = (patch = {}) => ({
  id: newId(), name: 'Utama', type: 'single', perProduct: 1, pages: 16,
  // layout (diisi dari Plano & Imposition)
  planoW: 65, planoH: 100, planoCut: 1, pcsPerSheet: 4,
  // waste
  wastePct: 5, setupSheets: 50,
  // mesin
  machineId: '', colorsFront: 4, colorsBack: 0, maxColor: 4,
  runRate: 85000, platePrice: 45000, minRun: 500,
  // kertas
  paperId: '', paperPrice: 180000, sheetsPerPack: 500,
  finishings: [],
  ...patch,
});

// Satu kalkulasi = satu produk jadi, berisi satu atau lebih komponen
export const DEFAULT_HPP_STATE = () => {
  const c = DEFAULT_COMPONENT();
  return {
    name: '', qty: 1000,
    components: [c], activeComponentId: c.id,
    jobFinishings: [], otherCost: 0,
    pricingMode: 'markup', marginPct: 30, ppnPct: 0,
  };
};

// Template awal supaya user tidak perlu tahu sendiri komponen apa saja yang dibutuhkan
export const PRODUCT_TEMPLATES = [
  {
    id: 'single', label: 'Single (brosur, kartu nama, poster)',
    build: () => ({ components: [DEFAULT_COMPONENT()], jobFinishings: [] }),
  },
  {
    id: 'book', label: 'Buku / Booklet (isi + cover)',
    build: () => ({
      components: [
        DEFAULT_COMPONENT({ name: 'Isi', type: 'book', pages: 48, colorsFront: 1, colorsBack: 1, planoCut: 2, pcsPerSheet: 8 }),
        DEFAULT_COMPONENT({ name: 'Cover', planoCut: 4, pcsPerSheet: 2 }),
      ],
      jobFinishings: [{ id: newId(), name: 'Lem / Jilid', price: 120000, basis: 'per1000pcs' }],
    }),
  },
  {
    id: 'calendar', label: 'Kalender meja (lembar bulan + alas)',
    build: () => ({
      components: [
        DEFAULT_COMPONENT({ name: 'Lembar bulan', perProduct: 13 }),
        DEFAULT_COMPONENT({ name: 'Alas / dudukan', colorsFront: 4, colorsBack: 0 }),
      ],
      jobFinishings: [{ id: newId(), name: 'Ring / Spiral', price: 0, basis: 'per1000pcs' }],
    }),
  },
];

export const DEFAULT_PLANO_STATE = {
  planoW: 65, planoH: 100, planoCut: 1, itemW: 9, itemH: 5.5,
  bleedX: 0.3, bleedY: 0.5, gapX: 0.2, gapY: 0.2, mode: 'best', machineId: '',
};

// ── Migrasi data lama di localStorage ───────────────────────────────────────
// Versi 1 (bundle asli) dan versi 2 (satu komponen, field datar) diubah ke format produk + komponen.
function normalizeComponent(raw) {
  const c = DEFAULT_COMPONENT(raw || {});
  if (raw && raw.pcsPerPlano != null && raw.pcsPerSheet == null) { c.pcsPerSheet = raw.pcsPerPlano; c.planoCut = 1; }
  if (raw && raw.extraPct != null && raw.wastePct == null) c.wastePct = raw.extraPct;
  if (raw && raw.colors != null && raw.colorsFront == null) {
    c.colorsFront = raw.colors;
    c.colorsBack = Number(raw.duplex) === 2 ? raw.colors : 0;
  }
  if (raw && raw.minOrder != null && raw.minRun == null) c.minRun = raw.minOrder;
  if (raw && raw.setupSheets == null) c.setupSheets = 0; // data lama belum punya kertas setting
  c.finishings = (c.finishings || []).map((f) => ({ basis: 'per1000pcs', sides: 1, ...f }));
  for (const k of ['pcsPerPlano', 'extraPct', 'colors', 'duplex', 'minOrder', 'qty', 'otherCost', 'pricingMode', 'marginPct', 'ppnPct', 'components', 'activeComponentId', 'jobFinishings']) delete c[k];
  return c;
}

export function normalizeHppState(raw) {
  const base = DEFAULT_HPP_STATE();
  if (!raw) return base;
  if (Array.isArray(raw.components) && raw.components.length > 0) {
    const components = raw.components.map(normalizeComponent);
    const active = components.find((c) => c.id === raw.activeComponentId) ? raw.activeComponentId : components[0].id;
    return { ...base, ...raw, components, activeComponentId: active, jobFinishings: raw.jobFinishings || [] };
  }
  // Format lama: satu objek datar
  const comp = normalizeComponent({ ...raw, name: 'Utama', perProduct: 1 });
  return {
    ...base,
    name: raw.name || '', qty: raw.qty ?? base.qty,
    otherCost: raw.otherCost ?? 0, pricingMode: raw.pricingMode || 'markup',
    marginPct: raw.marginPct ?? base.marginPct, ppnPct: raw.ppnPct ?? 0,
    components: [comp], activeComponentId: comp.id, jobFinishings: [],
  };
}

export const normalizeMaterial = (m) => {
  const { satuan, ...rest } = m;
  return { isi: 500, ...rest };
};

export const normalizeTool = (t) => ({ setup: 50, ...t });

export const normalizePlanoState = (raw) => ({ ...DEFAULT_PLANO_STATE, ...(raw || {}) });
