// ─────────────────────────────────────────────────────────────────────────────
// "Workspace" = semua data kerja satu percetakan: data master + daftar produk.
// Dua sumber dengan bentuk yang sama, supaya halaman-halaman tidak perlu tahu bedanya:
//   useLocalWorkspace()           → disimpan di browser (mode demo / tanpa Supabase)
//   useRemoteWorkspace(client, s) → disimpan di Supabase, otomatis tersimpan beberapa saat setelah diubah
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useLocalState } from './useLocalState.js';
import { DEFAULT_FINISHING, SAMPLE_BROSUR } from '../lib/masterData.js';
import { DEFAULT_MASTER, MASTER_COLUMNS, diffProducts, masterToRow, normalizeShopData, productRow } from '../lib/sync.js';

const SAVE_DELAY_MS = 800;
const MASTER_KEYS = Object.keys(MASTER_COLUMNS);

const resolve = (next, prev) => (typeof next === 'function' ? next(prev) : next);

// ── Mode lokal ────────────────────────────────────────────────────────────

export function useLocalWorkspace() {
  const [settings, setSettings] = useLocalState('pl2_settings', DEFAULT_MASTER.settings);
  const [papers, setPapers] = useLocalState('pl2_papers', DEFAULT_MASTER.papers);
  const [machines, setMachines] = useLocalState('pl2_machines', DEFAULT_MASTER.machines);
  const [finishing, setFinishing] = useLocalState('pl2_finishing', DEFAULT_MASTER.finishing, (f) => ({ ...DEFAULT_FINISHING, ...f }));
  const [others, setOthers] = useLocalState('pl2_others', DEFAULT_MASTER.others);
  const [digitalPapers, setDigitalPapers] = useLocalState('pl2_dpapers', DEFAULT_MASTER.digitalPapers);
  const [digitalMachines, setDigitalMachines] = useLocalState('pl2_dmachines', DEFAULT_MASTER.digitalMachines);
  const [products, setProducts] = useLocalState('pl2_products', [SAMPLE_BROSUR]);
  const master = React.useMemo(() => ({ settings, papers, machines, finishing, others, digitalPapers, digitalMachines }),
    [settings, papers, machines, finishing, others, digitalPapers, digitalMachines]);
  const setters = { settings: setSettings, papers: setPapers, machines: setMachines, finishing: setFinishing, others: setOthers, digitalPapers: setDigitalPapers, digitalMachines: setDigitalMachines };
  return {
    status: 'ready', readOnly: false, save: { state: 'saved' },
    master, products, setProducts,
    setMaster: (key, value) => setters[key](value),
    replaceAll: ({ master: m, products: p }) => {
      for (const k of MASTER_KEYS) if (m?.[k] !== undefined) setters[k](m[k]);
      if (p) setProducts(p);
    },
  };
}

// ── Mode Supabase ─────────────────────────────────────────────────────────

export function useRemoteWorkspace(client, shop) {
  const shopId = shop?.id;
  const readOnly = !!shop && !shop.active;
  const [status, setStatus] = React.useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = React.useState(null);
  const [master, setMasterState] = React.useState(DEFAULT_MASTER);
  const [products, setProductsState] = React.useState([]);
  const [save, setSave] = React.useState({ state: 'saved' }); // saved | pending | saving | error

  // antrean simpan
  const pendingMaster = React.useRef({});
  const savedProducts = React.useRef(new Map());
  const productsRef = React.useRef([]);
  const productsDirty = React.useRef(false);
  const timer = React.useRef(null);
  const saving = React.useRef(false);

  const flush = React.useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!shopId || readOnly || saving.current) return;
    const masterPatch = pendingMaster.current;
    const hasMaster = Object.keys(masterPatch).length > 0;
    const { upserts, deletes, next } = productsDirty.current
      ? diffProducts(savedProducts.current, productsRef.current)
      : { upserts: [], deletes: [], next: savedProducts.current };
    if (!hasMaster && !upserts.length && !deletes.length) { productsDirty.current = false; setSave({ state: 'saved' }); return; }

    saving.current = true;
    pendingMaster.current = {};
    productsDirty.current = false;
    setSave({ state: 'saving' });
    try {
      if (hasMaster) {
        const { error } = await client.from('shop_data').update(masterToRow(masterPatch)).eq('shop_id', shopId);
        if (error) throw error;
      }
      if (upserts.length) {
        const { error } = await client.from('products').upsert(upserts.map((p) => productRow(shopId, p)), { onConflict: 'shop_id,id' });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await client.from('products').delete().eq('shop_id', shopId).in('id', deletes);
        if (error) throw error;
      }
      savedProducts.current = next;
      saving.current = false;
      // ada perubahan baru selama menyimpan → simpan lagi
      if (Object.keys(pendingMaster.current).length || productsDirty.current) { setSave({ state: 'pending' }); timer.current = setTimeout(() => flush(), SAVE_DELAY_MS); }
      else setSave({ state: 'saved', at: Date.now() });
    } catch (error) {
      // kembalikan ke antrean supaya bisa dicoba lagi
      pendingMaster.current = { ...masterPatch, ...pendingMaster.current };
      productsDirty.current = true;
      saving.current = false;
      setSave({ state: 'error', error });
    }
  }, [client, shopId, readOnly]);

  const schedule = React.useCallback(() => {
    if (readOnly) return;
    setSave((s) => (s.state === 'saving' ? s : { state: 'pending' }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), SAVE_DELAY_MS);
  }, [flush, readOnly]);

  // muat data
  React.useEffect(() => {
    if (!shopId) return undefined;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const [sd, pr] = await Promise.all([
        client.from('shop_data').select('*').eq('shop_id', shopId).maybeSingle(),
        client.from('products').select('id, data').eq('shop_id', shopId).order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      const err = sd.error || pr.error;
      if (err) { setLoadError(err); setStatus('error'); return; }
      const { master: m, seeded } = normalizeShopData(sd.data);
      const list = (pr.data || []).map((r) => r.data).filter(Boolean);
      setMasterState(m);
      setProductsState(list);
      productsRef.current = list;
      savedProducts.current = new Map(list.map((p) => [p.id, JSON.stringify(p)]));
      setStatus('ready');
      // percetakan baru: simpan data contoh sekali supaya semua anggota melihat yang sama
      if (!seeded && !readOnly) { pendingMaster.current = { ...m }; schedule(); }
    })();
    return () => { cancelled = true; };
  }, [client, shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  // simpan sebelum tab ditutup / disembunyikan
  React.useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden' && timer.current) flush(); };
    const onBeforeUnload = (e) => {
      if (timer.current || saving.current) { flush(); e.preventDefault(); e.returnValue = ''; }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [flush]);

  const setMaster = React.useCallback((key, value) => {
    setMasterState((prev) => {
      const v = resolve(value, prev[key]);
      if (!readOnly) pendingMaster.current[key] = v;
      return { ...prev, [key]: v };
    });
    schedule();
  }, [schedule, readOnly]);

  const setProducts = React.useCallback((value) => {
    setProductsState((prev) => {
      const v = resolve(value, prev);
      productsRef.current = v;
      if (!readOnly) productsDirty.current = true;
      return v;
    });
    schedule();
  }, [schedule, readOnly]);

  const replaceAll = React.useCallback(({ master: m, products: p }) => {
    if (m) {
      setMasterState((prev) => {
        const next = { ...prev };
        for (const k of MASTER_KEYS) if (m[k] !== undefined) { next[k] = m[k]; pendingMaster.current[k] = m[k]; }
        return next;
      });
    }
    if (p) { productsRef.current = p; productsDirty.current = true; setProductsState(p); }
    schedule();
  }, [schedule]);

  return {
    status, loadError, readOnly, save, master, products, setProducts, setMaster, replaceAll,
    retry: flush,
  };
}
