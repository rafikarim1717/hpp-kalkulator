// Daftar produk tersimpan (offset atau digital).
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Empty } from '../components/ui.jsx';
import { calcDigital, calcOffset } from '../lib/engine.js';
import { fmtNum, fmtRp } from '../lib/format.js';

const ProductsPage = ({ kind, products, master, onOpen, onNew, onDuplicate, onDelete }) => {
  const [q, setQ] = React.useState('');
  const list = products.filter((p) => p.kind === kind && (!q || (p.name || '').toLowerCase().includes(q.toLowerCase())));
  const isOffset = kind === 'offset';
  return (
    <div className="page-fade">
      <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{isOffset ? 'Offset' : 'Digital'} <em>Printing</em></h1>
          <div className="page-sub">Produk yang sudah dihitung. Klik untuk buka kalkulasinya.</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Icon.Plus style={{ width: 14, height: 14 }} /> Produk baru</button>
      </div>

      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" aria-label="Cari produk" style={{ marginBottom: 18 }} />

      {list.length === 0 ? (
        <Empty title="Belum ada produk" sub={q ? 'Tidak ada yang cocok dengan pencarian.' : 'Mulai dengan bikin produk baru.'}
          action={!q && <button className="btn btn-primary" onClick={onNew}>Produk baru</button>} />
      ) : (
        <div className="product-grid">
          {list.map((p) => {
            const r = isOffset ? calcOffset(p, master) : calcDigital(p, master);
            const parts = isOffset ? p.media : p.items;
            const first = parts?.[0];
            const sub = first ? `${fmtNum(first.w, 1)} × ${fmtNum(first.h, 1)} cm · ${parts.length} ${isOffset ? 'media' : 'item'}` : 'Belum diisi';
            return (
              <div key={p.id} className="card product-card" role="button" tabIndex={0}
                onClick={() => onOpen(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(p.id); }}>
                <div className="row-between">
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name || 'Tanpa nama'}</span>
                  <span className="tag tag-neutral">{fmtNum(p.qty)} pcs</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
                <div className="row-between" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 18 }}>{fmtRp(r.total)}</span>
                  <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{fmtRp(r.perPcs)}/pcs</span>
                </div>
                <div className="row" style={{ marginTop: 10, gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon" title="Duplikat" aria-label={`Duplikat ${p.name || 'produk'}`} onClick={() => onDuplicate(p.id)}>
                    <Icon.Copy style={{ width: 15, height: 15 }} />
                  </button>
                  <button className="btn btn-ghost btn-icon icon-danger" title="Hapus" aria-label={`Hapus ${p.name || 'produk'}`} onClick={() => { if (window.confirm(`Hapus ${p.name || 'produk ini'}?`)) onDelete(p.id); }}>
                    <Icon.Trash style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
