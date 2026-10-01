import { describe, expect, it } from 'vitest';
import { calcHPP, calcImposition, calcSheetSize, sheetFitsMachine, validateJob } from './calc.js';
import { DEFAULT_TOOLS, normalizeHppState } from './constants.js';

const SM52 = DEFAULT_TOOLS[0];

// Input dasar = contoh di docs/TUTORIAL.md (Brosur A5 4/4, 2000 pcs)
const brosur = {
  type: 'single', qty: 2000, pages: 0,
  pcsPerSheet: 8, planoCut: 2,
  wastePct: 3, setupSheets: 50,
  colorsFront: 4, colorsBack: 4, maxColor: 4,
  runRate: 85000, platePrice: 45000, minRun: 500,
  paperPrice: 180000, sheetsPerPack: 500,
  finishings: [{ name: 'Laminasi Doff 1 sisi', price: 150000, basis: 'per1000lembar' }],
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
    expect(r.finTotal).toBeCloseTo(37500);  // 250 lbr × 150.000/1000
    expect(r.sub).toBeCloseTo(546940);
    expect(r.perPcs).toBeCloseTo(273.47);
  });

  it('menghitung harga jual (markup 30% + PPN 11%)', () => {
    expect(r.sell).toBeCloseTo(711022);
    expect(r.effMarginPct).toBeCloseTo(23.08, 1);
    expect(r.ppn).toBeCloseTo(78212.42, 1);
    expect(r.sellIncl).toBeCloseTo(789234.42, 1);
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

describe('migrasi data lama', () => {
  it('mengubah field versi lama ke field baru', () => {
    const s = normalizeHppState({ pcsPerPlano: 6, extraPct: 5, colors: 4, duplex: 2, minOrder: 1000, finishings: [{ name: 'X', price: 1, qty: 1000 }] });
    expect(s.pcsPerSheet).toBe(6);
    expect(s.planoCut).toBe(1);
    expect(s.wastePct).toBe(5);
    expect(s.colorsFront).toBe(4);
    expect(s.colorsBack).toBe(4);
    expect(s.minRun).toBe(1000);
    expect(s.finishings[0].basis).toBe('per1000pcs');
    expect(s.pcsPerPlano).toBeUndefined();
  });
});
