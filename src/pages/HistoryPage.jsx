// Histori Kalkulasi
import React from 'react';
import { Empty } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { fmtRp } from '../lib/format.js';

const PageHistory = ({ history, setHistory, onOpen }) => {
  const clear = () => {
    if (!confirm('Hapus semua riwayat kalkulasi?')) return;
    setHistory([]);
  };
  const remove = (id) => setHistory(history.filter((x) => x.id !== id));

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="row-between">
          <div>
            <h1 className="page-title"><em>Histori</em> Kalkulasi</h1>
            <div className="page-sub">{history.length} kalkulasi tersimpan.</div>
          </div>
          {history.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clear}>Hapus Semua</button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <Empty title="Belum ada riwayat" sub="Hitung HPP, lalu klik 'Simpan Kalkulasi' untuk menyimpannya di sini." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Total HPP</th>
                <th>HPP / pcs</th>
                <th>Harga Jual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((h) => (
                <tr key={h.id}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(h.date)}</td>
                  <td style={{ fontWeight: 500 }}>{h.name || <em style={{ color: 'var(--text-3)' }}>(tanpa nama)</em>}</td>
                  <td className="mono">{Number(h.qty).toLocaleString('id-ID')}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{fmtRp(h.sub)}</td>
                  <td className="mono">{fmtRp(h.perPcs)}</td>
                  <td className="mono" style={{ color: 'var(--good)', fontWeight: 500 }}>{fmtRp(h.sell)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {h.input && (
                      <button className="btn btn-secondary btn-sm" onClick={() => onOpen(h)} title="Buka lagi di Hitung HPP (untuk revisi / repeat order)">
                        Buka
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon" onClick={() => remove(h.id)} title="Hapus">
                      <Icon.Trash style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PageHistory;
