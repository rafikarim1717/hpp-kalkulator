// ─────────────────────────────────────────────────────────────────────────────
// Data master default. Struktur & angka contoh mengikuti app referensi
// "Kalkulator Biaya Cetak Pro" (setting client), supaya hasil hitung bisa dicocokkan.
// Semua ukuran cm, semua harga Rupiah.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  bleed: 0.2, // cm di tiap sisi, dipakai kalau "Pakai bleed" dicentang
  profitPct: 50,
  profitMin: 300000, // profit minimum per order
  taxPct: 10,
  // pilihan susunan otomatis: 'cheapest' = termurah yang muat semua finishing,
  // 'reference' = sama dengan app Android (naik maksimal, kalau kebesaran langsung 1 naik)
  autoLayout: 'cheapest',
  // komponen mana yang kena profit / pajak
  profitOn: { media: true, print: true, finishing: true, other: true },
  taxOn: { media: true, print: true, finishing: true, other: true },
};

// Kertas offset: satu kertas bisa punya beberapa ukuran plano, masing-masing dengan harga sendiri.
// priceBy: 'sheet' = harga per lembar plano, 'ream' = harga per rim (500 lembar)
export const DEFAULT_PAPERS = [
  {
    id: 'ac190', name: 'Art Carton 190', gsm: 190, priceBy: 'sheet',
    sizes: [
      { w: 79, h: 109, price: 2578 },
      { w: 65, h: 100, price: 1946 },
      { w: 65, h: 90, price: 1752 },
      { w: 61, h: 92, price: 1680 },
    ],
  },
];

// Mesin offset.
//  insheetMin / insheetPct : kertas cadangan setting mesin = max(minimum, % × lembar cetak)
//  minW×minH / maxW×maxH   : ukuran lembar cetak yang bisa masuk mesin
//  printW×printH           : area cetak maksimal
//  marginSide / marginGrip : tambahan di sisi lebar / sisi panjang lembar (pinggir + gripper)
//  minSheets, costMin      : ongkos minimum per plat sampai X lembar
//  costMinSame             : ongkos minimum per plat kalau depan-belakang pakai plat yang sama
//  costPerSheet            : ongkos per warna per lembar per sisi di atas X lembar
export const DEFAULT_MACHINES = [
  {
    id: 'gto52', name: 'Gto 52', insheetMin: 75, insheetPct: 1,
    minW: 14.5, minH: 21, maxW: 36, maxH: 52, printW: 34, printH: 50,
    marginSide: 1.5, marginGrip: 2,
    platePrice: 14500, minSheets: 1000, costMin: 50000, costMinSame: 70000, costPerSheet: 50,
  },
];

// Setting finishing. Tiap jenis punya cara hitung sendiri (lihat engine.js).
export const DEFAULT_FINISHING = {
  laminating: {
    maxWidth: 49, insheet: 35, bleed: 0.5,
    types: [
      { name: 'Doff', min: 150000, rate: 0.18 },
      { name: 'Glossy', min: 120000, rate: 0.15 },
    ],
  },
  varnish: { maxWidth: 38, insheet: 35, min: 100000, rate: 0.05 },
  spotuv: { maxWidth: 95, insheet: 5, min: 350000, rate: 1 },
  pond: {
    maxW: 52, maxH: 72, bleed: 1, insheetMin: 10, insheetPct: 1, min: 50000, rate: 100,
    templates: [
      { name: 'Easy', min: 50000, rate: 500 },
      { name: 'Medium', min: 90000, rate: 900 },
      { name: 'Hard', min: 120000, rate: 1200 },
    ],
  },
  folding: { maxW: 29.7, maxH: 42, insheet: 35, min: 40000, rate: 50 },
  poly: {
    maxW: 40, maxH: 40, insheetMin: 35, insheetPct: 1,
    templateMin: 20000, templateRate: 350,
    f1: { min: 40000, rate: 2 },
    f2: { min: 40000, rate: 7, minPerSpot: 100 },
  },
  emboss: {
    maxW: 40, maxH: 40, insheetMin: 10, insheetPct: 1,
    templateMin: 40000, templateRate: 700, min: 100000, rate: 200,
  },
  spiral: {
    min: 5000,
    types: [
      { name: '3/16', rate: 50 }, { name: '1/4', rate: 80 }, { name: '5/16', rate: 100 },
      { name: '3/8', rate: 120 }, { name: '7/16', rate: 135 },
    ],
  },
  cutting: { rate: 1000, min: 10000 }, // per kg, otomatis untuk media yang dicetak
};

export const FINISHING_TYPES = [
  { value: 'laminating', label: 'Laminating' },
  { value: 'varnish', label: 'Varnish/UV' },
  { value: 'spotuv', label: 'Spot UV' },
  { value: 'pond', label: 'Pond' },
  { value: 'folding', label: 'Folding' },
  { value: 'poly', label: 'Poly' },
  { value: 'emboss', label: 'Emboss' },
  { value: 'spiral', label: 'Spiral' },
];

// Biaya lain. by: weight (per kg berat produk), area (per cm²), order (sekali), pcs (per N pcs), sheet (per lembar)
export const DEFAULT_OTHERS = [
  { id: 'transport', name: 'Transport', by: 'weight', min: 15000, rate: 1000 },
  { id: 'lem', name: 'Lem', by: 'area', min: 20000, rate: 1 },
  { id: 'design', name: 'Design', by: 'order', rate: 50000 },
  { id: 'plastic', name: 'Plastic', by: 'pcs', rate: 7000, perQty: 100 },
  { id: 'jilid', name: 'Jilid', by: 'sheet', min: 25000, rate: 100 },
];

export const OTHER_BY = [
  { value: 'weight', label: 'Berat (per kg)' },
  { value: 'area', label: 'Luas (per cm²)' },
  { value: 'order', label: 'Per order' },
  { value: 'pcs', label: 'Per pcs' },
  { value: 'sheet', label: 'Per lembar' },
];

// Digital printing
export const DEFAULT_DIGITAL_PAPERS = [
  { id: 'hvs80', name: 'Hvs 80', gsm: 80 },
  { id: 'ap150', name: 'Ap 150', gsm: 150 },
  { id: 'ac210', name: 'Ac 210', gsm: 210 },
  { id: 'ac260', name: 'Ac 260', gsm: 260 },
];

// Harga per kertas: normal = harga per lembar di atas tier tertinggi; tiers = harga kalau jumlah lembar ≤ upTo
export const DEFAULT_DIGITAL_MACHINES = [
  {
    id: 'indigo1000', name: 'Indigo 1000', w: 31, h: 46,
    prices: [
      { paperId: 'hvs80', normal: 2833, tiers: [{ upTo: 10, price: 8250 }, { upTo: 100, price: 5500 }, { upTo: 200, price: 3000 }] },
      { paperId: 'ap150', normal: 0, tiers: [] },
    ],
  },
];

// Contoh produk: Brosur dari app referensi (dipakai juga di unit test)
export const SAMPLE_BROSUR = {
  id: 'p-brosur', kind: 'offset', name: 'Brosur', qty: 100,
  media: [{
    id: 'm1', paperId: 'ac190', w: 12, h: 12, perPcs: 1,
    machine: { machineId: 'gto52', bleed: false, twoSides: false, front: 1, back: 0, special: 0, samePlate: false },
    finishings: [{ id: 'f1', type: 'laminating', front: 'Doff', twoSides: true, back: 'Doff' }],
  }],
  others: [
    { id: 'o1', otherId: 'lem', w: 20, h: 20, multiply: 2 },
    { id: 'o2', otherId: 'design' },
    { id: 'o3', otherId: 'plastic' },
    { id: 'o4', otherId: 'jilid', sheets: 1000 },
    { id: 'o5', otherId: 'transport' },
  ],
};

export const newId = (p = 'x') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
