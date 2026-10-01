import { describe, expect, it } from 'vitest';
import { calcHPP, calcImposition, calcJob, calcSheetSize, sheetFitsMachine, validateJob } from './calc.js';
import { DEFAULT_COMPONENT, DEFAULT_TOOLS, PRODUCT_TEMPLATES, normalizeHppState } from './constants.js';

const SM52 = DEFAULT_TOOLS[0];

// Input dasar = contoh di docs/TUTORIAL.md (Brosur A5 4/4, 2000 pcs)
const brosur = {
  type: 'single', qty: 2000, pages: 0,
  pcsPerSheet: 8, planoCut: 2,
  wastePct: 3, setupSheets: 50,
  colorsFront: 4, colorsBack: 4, maxColor: 4,
  runRate: 85000, platePrice: 45000, minRun: 500,
  paperPrice: 180000, sheetsPerPack: 500,
  finishings: [
    { name: 'Laminasi Doff', price: 150000, basis: 'per1000lembar', sides: 1 },
    { name: 'Potong (mesin potong)', price: 50000, basis: 'per1000lembar', sides: 1 },
  ],
  otherCost: 0, pricingMode: 'markup', marginPct: 30, ppnPct: 11,
};

describe('layout', () => {
  it('memotong plano 65×100 jadi ½ → 65×50', () => {
    expect(calcSheetSize(65, 100, 2)).toEqual({ w: 65, h: 50, cut: 2 });
    expect(calcSheetSize(65, 100, 4)).toEqual({ w: 32.5, h: 50, cut: 4 });
  });

  it('A5 + bleed 0.3 (15.4 × 21.6) muat 8 di lembar 65×50', () => {
    const r = calcImposition(65, 50, 15.4, 21.6, 0.5, 1, 0, 0, 'best');
    expect(r.count).toBe(8);
    expect(r.cols).toBe(4);
    expect(r.rows).toBe(2);
  });

  it('tidak crash / negatif kalau margin lebih besar dari lembar', () => {
    const r = calcImposition(10, 10, 5, 5, 6, 6, 0, 0, 'best');
    expect(r.count).toBe(0);
    expect(r.eff).toBe(0);
  });

  it('layout campuran: 3 berdiri + 2 tidur = 5 (lebih banyak dari satu arah)', () => {
    // lembar 70 × 50, item 20 × 30, tanpa margin & gap
    expect(calcImposition(70, 50, 20, 30, 0, 0, 0, 0, 'portrait').count).toBe(3);
    expect(calcImposition(70, 50, 20, 30, 0, 0, 0, 0, 'landscape').count).toBe(4);
    const best = calcImposition(70, 50, 20, 30, 0, 0, 0, 0, 'best');
    expect(best.count).toBe(5);
    expect(best.mixed).toBe(true);
    expect(best.blocks).toHaveLength(2);
    expect(best.blocks.map((b) => b.count).sort()).toEqual([2, 3]);
  });

  it('layout campuran tetap menghormati gap & tidak keluar area', () => {
    const r = calcImposition(70, 50, 20, 30, 0, 0, 1, 1, 'best');
    for (const b of r.blocks) {
      expect(b.x + b.cols * b.iw + (b.cols - 1) * 1).toBeLessThanOrEqual(70 + 1e-9);
      expect(b.y + b.rows * b.ih + (b.rows - 1) * 1).toBeLessThanOrEqual(50 + 1e-9);
    }
  });

  it('kalau satu arah sudah paling banyak, tidak pakai campuran', () => {
    const r = calcImposition(65, 50, 15.4, 21.6, 0.5, 1, 0, 0, 'best');
    expect(r.count).toBe(8);
    expect(r.mixed).toBe(false);
  });

  it('cek ukuran lembar vs mesin (boleh diputar)', () => {
    expect(sheetFitsMachine(65, 50, SM52).ok).toBe(true); // diputar jadi 50 × 65
    expect(sheetFitsMachine(65, 100, SM52).fitsMax).toBe(false);
  });
});

describe('calcHPP — contoh tutorial brosur', () => {
  const r = calcHPP(brosur);

  it('menghitung lembar', () => {
    expect(r.netSheets).toBe(250);       // 2000 / 8
    expect(r.wastePctSheets).toBe(8);    // ceil(250 × 3%)
    expect(r.passes).toBe(2);            // 4/4 di mesin 4 warna
    expect(r.setupWaste).toBe(100);      // 50 × 2 pass
    expect(r.printSheets).toBe(358);
    expect(r.planoSheets).toBe(179);     // ceil(358 / 2)
  });

  it('menghitung biaya', () => {
    expect(r.plateCost).toBe(360000);    // 8 plat × 45.000
    expect(r.runCost).toBe(85000);       // 2 pass × min 500 lbr × 85.000/1000
    expect(r.paperCost).toBeCloseTo(64440); // 179 / 500 × 180.000
    expect(r.finItems[0].cost).toBeCloseTo(37500); // laminasi 250 lbr × 150.000/1000
    expect(r.finItems[1].cost).toBeCloseTo(12500); // potong 250 lbr × 50.000/1000
    expect(r.sub).toBeCloseTo(559440);
    expect(r.perPcs).toBeCloseTo(279.72);
  });

  it('menghitung harga jual (markup 30% + PPN 11%)', () => {
    expect(r.sell).toBeCloseTo(727272);
    expect(r.effMarginPct).toBeCloseTo(23.08, 1);
    expect(r.ppn).toBeCloseTo(79999.92, 1);
    expect(r.sellIncl).toBeCloseTo(807271.92, 1);
  });
});

describe('calcHPP — perbaikan bug rumus lama', () => {
  it('cetak bolak-balik TIDAK menggandakan kertas', () => {
    const satuSisi = calcHPP({ ...brosur, colorsBack: 0, setupSheets: 0 });
    const duaSisi = calcHPP({ ...brosur, colorsBack: 4, setupSheets: 0 });
    expect(duaSisi.planoSheets).toBe(satuSisi.planoSheets);
    expect(duaSisi.plateCost).toBe(satuSisi.plateCost * 2);
  });

  it('minimum order mesin cuma menaikkan ongkos cetak, bukan kertas', () => {
    const r = calcHPP({ ...brosur, qty: 400, wastePct: 0, setupSheets: 0, minRun: 1000 });
    expect(r.printSheets).toBe(50);
    expect(r.planoSheets).toBe(25);
    expect(r.runCost).toBe(2 * 85000); // ditagih 1000 lbr per pass
  });

  it('warna melebihi unit mesin → tambah pass', () => {
    const r = calcHPP({ ...brosur, colorsFront: 5, colorsBack: 0, maxColor: 4 });
    expect(r.passes).toBe(2);
    expect(r.plates).toBe(5);
  });

  it('finishing 2 sisi = 2× biaya, flat tidak terpengaruh sisi', () => {
    const r = calcHPP({ ...brosur, finishings: [
      { name: 'Laminasi 2 sisi', price: 150000, basis: 'per1000lembar', sides: 2 },
      { name: 'Pisau', price: 350000, basis: 'flat', sides: 2 },
    ] });
    expect(r.finItems[0].cost).toBeCloseTo(75000); // 250 lbr × 150 × 2
    expect(r.finItems[1].cost).toBe(350000);
  });

  it('finishing per 1000 pcs ikut jumlah order', () => {
    const r = calcHPP({ ...brosur, qty: 5000, finishings: [{ name: 'Poly', price: 180000, basis: 'per1000pcs' }] });
    expect(r.finTotal).toBeCloseTo(900000);
  });

  it('mode margin = % dari harga jual', () => {
    const r = calcHPP({ ...brosur, pricingMode: 'margin', marginPct: 30 });
    expect(r.effMarginPct).toBeCloseTo(30);
    expect(r.sell).toBeCloseTo(r.sub / 0.7);
  });
});

// Contoh 2 di docs/TUTORIAL.md: buku A5 isi 48 hal + cover, 500 eks
describe('calcHPP — contoh tutorial buku', () => {
  const isi = calcHPP({
    ...brosur, type: 'book', qty: 500, pages: 48,
    colorsFront: 1, colorsBack: 1, paperPrice: 95000,
    finishings: [{ name: 'Lem / Jilid', price: 120000, basis: 'per1000pcs' }],
    ppnPct: 0,
  });
  const cover = calcHPP({
    ...brosur, qty: 500, pcsPerSheet: 2, planoCut: 4,
    colorsFront: 4, colorsBack: 0, paperPrice: 285000,
    finishings: [{ name: 'Laminasi Doff 1 sisi', price: 150000, basis: 'per1000lembar' }],
    ppnPct: 0,
  });

  it('isi 48 hal, 8 hal/sisi, 1/1 → 3 lembar cetak per buku', () => {
    expect(isi.netSheets).toBe(1500);
    expect(isi.printSheets).toBe(1500 + 45 + 100);
    expect(isi.planoSheets).toBe(823);
    expect(isi.plateCost).toBe(90000);
    expect(isi.runCost).toBeCloseTo(279650);
    expect(isi.paperCost).toBeCloseTo(156370);
    expect(isi.finTotal).toBeCloseTo(60000);
    expect(isi.sub).toBeCloseTo(586020);
  });

  it('cover 4/0 di ¼ plano, 2 cover/lembar', () => {
    expect(cover.netSheets).toBe(250);
    expect(cover.printSheets).toBe(308);   // 250 + 8 + 50
    expect(cover.planoSheets).toBe(77);    // ceil(308 / 4)
    expect(cover.plateCost).toBe(180000);
    expect(cover.runCost).toBe(42500);     // min 500 lbr
    expect(cover.paperCost).toBeCloseTo(43890);
    expect(cover.finTotal).toBeCloseTo(37500);
    expect(cover.sub).toBeCloseTo(303890);
  });

  it('total HPP buku = isi + cover', () => {
    expect(isi.sub + cover.sub).toBeCloseTo(889910);
    expect((isi.sub + cover.sub) / 500).toBeCloseTo(1779.82);
  });
});

describe('validateJob', () => {
  it('memperingatkan lembar terlalu besar & warna melebihi mesin', () => {
    const w = validateJob({ ...brosur, colorsFront: 5, sheetW: 65, sheetH: 100 }, SM52);
    expect(w.some((x) => x.includes('terlalu besar'))).toBe(true);
    expect(w.some((x) => x.includes('pass'))).toBe(true);
  });

  it('memperingatkan halaman buku bukan kelipatan 4', () => {
    const w = validateJob({ ...brosur, type: 'book', pages: 50 });
    expect(w.some((x) => x.includes('kelipatan 4'))).toBe(true);
  });
});

// Contoh 2 di tutorial versi multi-komponen: hasil harus sama dengan isi + cover dihitung terpisah
describe('calcJob — produk multi-komponen', () => {
  const isiInput = { ...brosur, name: 'Isi', type: 'book', pages: 48, colorsFront: 1, colorsBack: 1, paperPrice: 95000, finishings: [] };
  const coverInput = { ...brosur, name: 'Cover', pcsPerSheet: 2, planoCut: 4, colorsFront: 4, colorsBack: 0, paperPrice: 285000,
    finishings: [{ name: 'Laminasi Doff', price: 150000, basis: 'per1000lembar', sides: 1 }] };
  const job = calcJob({
    qty: 500,
    components: [isiInput, coverInput],
    jobFinishings: [{ name: 'Lem / Jilid', price: 120000, basis: 'per1000pcs' }],
    otherCost: 0, pricingMode: 'markup', marginPct: 30, ppnPct: 0,
  });

  it('buku A5: isi + cover + jilid = Rp 889.910', () => {
    expect(job.components[0].result.sub).toBeCloseTo(526020); // isi tanpa jilid
    expect(job.components[1].result.sub).toBeCloseTo(303890);
    expect(job.jobFinTotal).toBeCloseTo(60000);
    expect(job.sub).toBeCloseTo(889910);
    expect(job.perPcs).toBeCloseTo(1779.82);
    expect(job.sell).toBeCloseTo(1156883);
  });

  it('jumlah per produk mengalikan qty komponen (kalender 13 lembar)', () => {
    const r = calcJob({ qty: 100, components: [{ ...brosur, perProduct: 13, finishings: [] }], jobFinishings: [] });
    expect(r.components[0].qty).toBe(1300);
    expect(r.components[0].result.netSheets).toBe(Math.ceil(1300 / 8));
  });

  it('margin & biaya lain dihitung di level produk, bukan per komponen', () => {
    const r = calcJob({ qty: 2000, components: [brosur], jobFinishings: [], otherCost: 100000, marginPct: 30, ppnPct: 0 });
    expect(r.components[0].result.sell).toBeCloseTo(r.components[0].result.sub); // komponen tanpa margin
    expect(r.sub).toBeCloseTo(559440 + 100000);
    expect(r.sell).toBeCloseTo((559440 + 100000) * 1.3);
  });

  it('template buku punya komponen Isi + Cover dan jilid', () => {
    const t = PRODUCT_TEMPLATES.find((x) => x.id === 'book').build();
    expect(t.components.map((c) => c.name)).toEqual(['Isi', 'Cover']);
    expect(t.components[0].type).toBe('book');
    expect(t.jobFinishings[0].name).toBe('Lem / Jilid');
  });
});

describe('migrasi data lama', () => {
  it('versi 1 (bundle asli) jadi produk dengan 1 komponen', () => {
    const s = normalizeHppState({ name: 'Lama', qty: 1000, pcsPerPlano: 6, extraPct: 5, colors: 4, duplex: 2, minOrder: 1000, marginPct: 25, finishings: [{ name: 'X', price: 1, qty: 1000 }] });
    expect(s.name).toBe('Lama');
    expect(s.qty).toBe(1000);
    expect(s.marginPct).toBe(25);
    expect(s.components).toHaveLength(1);
    const c = s.components[0];
    expect(s.activeComponentId).toBe(c.id);
    expect(c.pcsPerSheet).toBe(6);
    expect(c.planoCut).toBe(1);
    expect(c.wastePct).toBe(5);
    expect(c.colorsFront).toBe(4);
    expect(c.colorsBack).toBe(4);
    expect(c.minRun).toBe(1000);
    expect(c.setupSheets).toBe(0);
    expect(c.finishings[0].basis).toBe('per1000pcs');
    expect(c.finishings[0].sides).toBe(1);
    expect(c.pcsPerPlano).toBeUndefined();
    expect(c.qty).toBeUndefined();
  });

  it('versi 2 (field datar, satu komponen) tetap terbaca', () => {
    const s = normalizeHppState({ name: 'Brosur', type: 'single', qty: 2000, pcsPerSheet: 8, planoCut: 2, setupSheets: 50, colorsFront: 4, colorsBack: 4, ppnPct: 11 });
    expect(s.qty).toBe(2000);
    expect(s.ppnPct).toBe(11);
    expect(s.components[0].pcsPerSheet).toBe(8);
    expect(s.components[0].setupSheets).toBe(50);
  });

  it('format baru tidak diubah', () => {
    const c = DEFAULT_COMPONENT({ name: 'Cover' });
    const s = normalizeHppState({ name: 'X', qty: 10, components: [c], activeComponentId: c.id });
    expect(s.components[0].name).toBe('Cover');
    expect(s.activeComponentId).toBe(c.id);
  });
});
