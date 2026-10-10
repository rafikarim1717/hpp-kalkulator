import { describe, expect, it } from 'vitest';
import { DEFAULT_MASTER } from './sync.js';
import { SAMPLE_BROSUR } from './masterData.js';
import { calcOffset } from './engine.js';
import { excelFileName, masterSheets, productSheets } from './excelExport.js';

const values = (sheet) => sheet.data.map((row) => row.map((c) => c.value));

describe('masterSheets', () => {
  const sheets = masterSheets(DEFAULT_MASTER);
  it('6 tab sesuai menu data master', () => {
    expect(sheets.map((s) => s.sheet)).toEqual(['Kertas', 'Mesin', 'Finishing', 'Biaya lain', 'Digital', 'Pengaturan umum']);
  });
  it('kertas: satu baris per ukuran plano, harga per lembar & per rim', () => {
    const rows = values(sheets[0]);
    expect(rows[0][0]).toBe('Kertas');
    expect(rows[1]).toEqual(['Art Carton 190', 190, '79 × 109', 2578, 1289000]);
    expect(rows.length).toBe(1 + DEFAULT_MASTER.papers[0].sizes.length);
  });
  it('kertas harga per rim dikonversi ke per lembar', () => {
    const [k] = masterSheets({ ...DEFAULT_MASTER, papers: [{ name: 'HVS', gsm: 70, priceBy: 'ream', sizes: [{ w: 65, h: 100, price: 500000 }] }] });
    expect(values(k)[1]).toEqual(['HVS', 70, '65 × 100', 1000, 500000]);
  });
  it('finishing memuat semua jenis', () => {
    const jenis = new Set(values(sheets[2]).slice(1).map((r) => r[0]));
    for (const j of ['Laminating', 'Varnish/UV', 'Spot UV', 'Pond', 'Folding', 'Poly', 'Emboss', 'Spiral', 'Potong']) expect(jenis.has(j)).toBe(true);
  });
  it('setiap baris sepanjang header', () => {
    for (const s of sheets) for (const row of s.data) expect(row.length).toBe(s.data[0].length);
  });
});

describe('productSheets', () => {
  it('ringkasan sama dengan hasil kalkulator', () => {
    const [summary, detail] = productSheets([SAMPLE_BROSUR], DEFAULT_MASTER);
    const r = calcOffset(SAMPLE_BROSUR, DEFAULT_MASTER);
    const row = values(summary)[1];
    expect(row[0]).toBe('Brosur');
    expect(row[1]).toBe('Offset');
    expect(row[4]).toBe(Math.round(r.cost));
    expect(row[7]).toBe(Math.round(r.total));
    expect(values(detail).length).toBe(1 + r.lines.length);
  });
  it('produk kosong tetap aman', () => {
    const [summary] = productSheets([{ id: 'x', kind: 'digital', qty: 0, items: [] }], DEFAULT_MASTER);
    expect(values(summary)[1][0]).toBe('Tanpa nama');
  });
});

it('nama file tanpa karakter terlarang', () => {
  expect(excelFileName('Data master', 'Percetakan A/B')).toMatch(/^Data master - Percetakan AB - .+\.xlsx$/);
});
