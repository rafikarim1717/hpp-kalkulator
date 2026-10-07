import { describe, expect, it } from 'vitest';
import { DEFAULT_MACHINES, DEFAULT_PAPERS } from './masterData.js';
import { countErrors, machineErrors, paperErrors } from './validate.js';

const gto = DEFAULT_MACHINES[0];

describe('validasi data mesin', () => {
  it('data contoh lolos', () => expect(machineErrors(gto)).toEqual({}));

  it('lebar & tinggi boleh dibalik (72 × 52 sama dengan 52 × 72)', () => {
    expect(machineErrors({ ...gto, minW: 21, minH: 14.5, maxW: 52, maxH: 36, printW: 50, printH: 34 })).toEqual({});
  });

  it('kosong / minus ditolak', () => {
    const e = machineErrors({ ...gto, name: '', printW: 0, platePrice: -1 });
    expect(e.name).toBeTruthy();
    expect(e.printW).toBe('Wajib diisi');
    expect(e.platePrice).toBe('Tidak boleh minus');
  });

  it('minimum lebih besar dari maksimum ditolak', () => {
    expect(machineErrors({ ...gto, minW: 40, minH: 60 }).minW).toMatch(/minimum lebih besar/);
  });

  it('area cetak lebih besar dari kertas maksimum ditolak', () => {
    expect(machineErrors({ ...gto, printW: 40, printH: 50 }).printW).toMatch(/Area cetak lebih besar/);
  });

  it('area cetak + margin melebihi kertas maksimum ditolak', () => {
    expect(machineErrors({ ...gto, printW: 35, printH: 51, marginGrip: 2, marginSide: 1.5 }).marginGrip).toBeTruthy();
  });
});

describe('validasi data kertas', () => {
  it('data contoh lolos', () => expect(countErrors(paperErrors(DEFAULT_PAPERS[0]))).toBe(0));

  it('gramasi, ukuran, harga kosong ditolak', () => {
    const e = paperErrors({ name: 'X', gsm: 0, sizes: [{ w: 65, h: 0, price: 0 }] });
    expect(e.gsm).toBeTruthy();
    expect(e.sizes[0]).toEqual({ h: 'Wajib diisi', price: 'Harga belum diisi' });
    expect(countErrors(e)).toBe(3);
  });

  it('tanpa ukuran plano ditolak', () => {
    expect(paperErrors({ name: 'X', gsm: 100, sizes: [] }).general).toBeTruthy();
  });
});
