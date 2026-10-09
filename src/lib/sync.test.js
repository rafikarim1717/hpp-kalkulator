import { describe, expect, it } from 'vitest';
import { DEFAULT_FINISHING, DEFAULT_SETTINGS } from './masterData.js';
import { DEFAULT_MASTER, diffProducts, masterToRow, mergeProducts, normalizeShopData, productRow, readBrowserData } from './sync.js';

const memStorage = (obj) => ({ getItem: (k) => (k in obj ? obj[k] : null) });

describe('normalizeShopData', () => {
  it('percetakan baru (settings kosong) → data contoh, belum seeded', () => {
    const r = normalizeShopData({ settings: {}, papers: [] });
    expect(r.seeded).toBe(false);
    expect(r.master).toEqual(DEFAULT_MASTER);
    expect(normalizeShopData(null).seeded).toBe(false);
  });
  it('baris tersimpan → master, kolom snake_case dipetakan, finishing & settings dilengkapi default', () => {
    const r = normalizeShopData({
      settings: { margin: 30 }, papers: [{ id: 'k1' }], machines: [], finishing: { custom: { x: 1 } },
      others: null, digital_papers: [{ id: 'd1' }], digital_machines: [{ id: 'm1' }],
    });
    expect(r.seeded).toBe(true);
    expect(r.master.settings).toEqual({ ...DEFAULT_SETTINGS, margin: 30 });
    expect(r.master.papers).toEqual([{ id: 'k1' }]);
    expect(r.master.others).toEqual([]);
    expect(r.master.digitalPapers).toEqual([{ id: 'd1' }]);
    expect(r.master.digitalMachines).toEqual([{ id: 'm1' }]);
    expect(r.master.finishing).toEqual({ ...DEFAULT_FINISHING, custom: { x: 1 } });
  });
});

describe('masterToRow', () => {
  it('hanya kolom yang berubah, nama kolom database', () => {
    expect(masterToRow({ papers: [1], digitalMachines: [2] })).toEqual({ papers: [1], digital_machines: [2] });
    expect(masterToRow({})).toEqual({});
  });
});

describe('productRow', () => {
  it('menyimpan produk utuh di data', () => {
    const p = { id: 'p1', kind: 'offset', name: 'Brosur', qty: 1000 };
    expect(productRow('s1', p)).toEqual({ id: 'p1', shop_id: 's1', kind: 'offset', name: 'Brosur', data: p });
    expect(productRow('s1', { id: 'p2', kind: 'digital' }).name).toBe('');
  });
});

describe('diffProducts', () => {
  const a = { id: 'a', kind: 'offset', qty: 1 };
  const b = { id: 'b', kind: 'offset', qty: 2 };
  it('produk baru & berubah di-upsert, yang hilang dihapus', () => {
    const prev = new Map([['a', JSON.stringify(a)], ['b', JSON.stringify(b)]]);
    const a2 = { ...a, qty: 5 };
    const c = { id: 'c', kind: 'digital' };
    const { upserts, deletes, next } = diffProducts(prev, [a2, c]);
    expect(upserts).toEqual([a2, c]);
    expect(deletes).toEqual(['b']);
    expect([...next.keys()]).toEqual(['a', 'c']);
  });
  it('tidak ada perubahan → kosong', () => {
    const prev = new Map([['a', JSON.stringify(a)]]);
    const r = diffProducts(prev, [a]);
    expect(r.upserts).toEqual([]);
    expect(r.deletes).toEqual([]);
  });
});

describe('readBrowserData', () => {
  it('tidak ada data → null', () => {
    expect(readBrowserData(memStorage({}))).toBeNull();
    expect(readBrowserData(null)).toBeNull();
  });
  it('membaca data master & produk valid saja', () => {
    const r = readBrowserData(memStorage({
      pl2_papers: JSON.stringify([{ id: 'k' }]),
      pl2_dpapers: JSON.stringify([{ id: 'd' }]),
      pl2_finishing: JSON.stringify({ custom: 1 }),
      pl2_products: JSON.stringify([{ id: 'p', kind: 'offset' }, { id: 'q' }, null]),
      pl2_machines: '{rusak',
    }));
    expect(r.master.papers).toEqual([{ id: 'k' }]);
    expect(r.master.digitalPapers).toEqual([{ id: 'd' }]);
    expect(r.master.machines).toBeUndefined();
    expect(r.master.finishing).toEqual({ ...DEFAULT_FINISHING, custom: 1 });
    expect(r.products).toEqual([{ id: 'p', kind: 'offset' }]);
  });
});

describe('mergeProducts', () => {
  it('produk dengan id yang sudah ada dilewati', () => {
    expect(mergeProducts([{ id: 'a', v: 1 }], [{ id: 'a', v: 2 }, { id: 'b' }])).toEqual([{ id: 'a', v: 1 }, { id: 'b' }]);
  });
});
