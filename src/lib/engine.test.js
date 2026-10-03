import { describe, expect, it } from 'vitest';
import { calcDigital, calcOffset, negotiate } from './engine.js';
import {
  DEFAULT_DIGITAL_MACHINES, DEFAULT_DIGITAL_PAPERS, DEFAULT_FINISHING, DEFAULT_MACHINES,
  DEFAULT_OTHERS, DEFAULT_PAPERS, DEFAULT_SETTINGS, SAMPLE_BROSUR,
} from './masterData.js';

const master = {
  settings: DEFAULT_SETTINGS, papers: DEFAULT_PAPERS, machines: DEFAULT_MACHINES,
  finishing: DEFAULT_FINISHING, others: DEFAULT_OTHERS,
  digitalPapers: DEFAULT_DIGITAL_PAPERS, digitalMachines: DEFAULT_DIGITAL_MACHINES,
};

describe('Brosur 100 pcs (angka dari app referensi)', () => {
  const r = calcOffset(SAMPLE_BROSUR, master);
  const m = r.media[0];

  it('lembar cetak 14,5 × 21, 1 naik, plano 79 × 109 isi 27', () => {
    expect(m.up).toBe(1);
    expect([m.layout.sheetW, m.layout.sheetH]).toEqual([14.5, 21]);
    expect([m.plano.w, m.plano.h, m.plano.ratio]).toEqual([79, 109, 27]);
  });

  it('210 lembar = 100 + 35 insheet laminasi + 75 insheet mesin → 8 plano', () => {
    expect(m.printSheets).toBe(135);
    expect(m.machineInsheet).toBe(75);
    expect(m.totalSheets).toBe(210);
    expect(m.plano.planos).toBe(8);
    expect(m.paperCost).toBe(20624);
  });

  it('cetak, laminasi, potong sama dengan app referensi', () => {
    expect(m.print.cost).toBe(64500);
    expect(m.finItems[0].cost).toBe(300000);
    expect(m.cutting.kg).toBeCloseTo(0.32, 2);
    expect(m.cutting.cost).toBe(10000);
  });

  it('biaya lain', () => {
    expect(r.others.map((o) => o.cost)).toEqual([20000, 50000, 7000, 100000, 15000]);
  });

  it('total biaya 587.124, profit dinaikkan ke minimum 300.000', () => {
    expect(r.cost).toBe(587124);
    expect(r.profitRaw).toBe(293562);
    expect(r.profitAdj).toBe(6438);
    expect(r.profit).toBe(300000);
  });

  it('pajak 10% dari biaya (bug pajak plastik app lama sudah dibetulkan)', () => {
    expect(r.tax).toBeCloseTo(58712.4, 6);
    expect(r.total).toBeCloseTo(945836.4, 6);
  });

  it('nego 8.500/pcs → profit turun di bawah minimum', () => {
    const n = negotiate(r, 8500, 100);
    expect(n.totalBid).toBe(850000);
    expect(n.profit).toBeCloseTo(850000 - 587124 - 58712.4, 6);
    expect(n.safe).toBe(false);
  });
});

describe('Undangan 1.000 pcs (2 media, app referensi)', () => {
  const undangan = {
    qty: 1000,
    media: [
      { ...SAMPLE_BROSUR.media[0], id: 'a' },
      { id: 'b', paperId: 'ac190', w: 12, h: 12, perPcs: 1, machine: { machineId: 'gto52', front: 1 }, finishings: [] },
    ],
    others: [],
  };
  const r = calcOffset(undangan, master);

  it('media 1 (laminasi): 1 naik, 1.110 lembar, 42 plano', () => {
    const m = r.media[0];
    expect(m.up).toBe(1);
    expect(m.totalSheets).toBe(1110);
    expect(m.plano.planos).toBe(42);
    expect(m.paperCost).toBe(108276);
    expect(m.print.extraSheets).toBe(35);
    expect(m.print.cost).toBe(14500 + 50000 + 1750);
  });

  it('media 2 (tanpa finishing): lembar 25,5 × 50 isi 8, plano 1:6, 200 lembar, 34 plano', () => {
    const m = r.media[1];
    expect(m.up).toBe(8);
    expect([m.layout.sheetW, m.layout.sheetH]).toEqual([25.5, 50]);
    expect(m.plano.ratio).toBe(6);
    expect(m.totalSheets).toBe(200);
    expect(m.plano.planos).toBe(34);
    expect(m.paperCost).toBe(87652);
  });
});

describe('Pilihan susunan manual', () => {
  it('memilih 2 × 4 naik tetap memberi peringatan lebar laminasi', () => {
    const p = { ...SAMPLE_BROSUR, media: [{ ...SAMPLE_BROSUR.media[0], layoutKey: 'P2x4' }] };
    const m = calcOffset(p, master).media[0];
    expect(m.up).toBe(8);
    expect(m.warnings.join(' ')).toMatch(/Laminating/);
  });
});

describe('Digital', () => {
  it('harga bertingkat per jumlah lembar', () => {
    const r = calcDigital({
      qty: 40,
      items: [{ id: 'd1', machineId: 'indigo1000', paperId: 'hvs80', w: 10, h: 15, perPcs: 1, finishings: [] }],
      others: [],
    }, master);
    const it0 = r.items[0];
    expect(it0.up).toBeGreaterThan(0);
    expect(it0.sheets).toBe(Math.ceil(40 / it0.up));
    expect(it0.pricePerSheet).toBe(8250);
  });
});
