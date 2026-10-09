// Sesi login Supabase + percetakan tempat user terdaftar.
import React from 'react';

const PENDING_INVITE_KEY = 'pl_pending_invite';

// Kode undangan dari link (?undangan=KODE) diingat sampai user selesai daftar / masuk.
export function captureInviteFromUrl() {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('undangan');
    if (code) {
      localStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
      url.searchParams.delete('undangan');
      window.history.replaceState({}, '', url.toString());
    }
    return localStorage.getItem(PENDING_INVITE_KEY) || '';
  } catch { return ''; }
}
export const clearPendingInvite = () => { try { localStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ignore */ } };

const today = () => new Date().toISOString().slice(0, 10);
export const isShopActive = (shop) => !shop?.active_until || shop.active_until >= today();

export function useSession(client) {
  const [session, setSession] = React.useState(undefined); // undefined = masih dicek
  const [recovery, setRecovery] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ?? null); });
    const { data } = client.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [client]);
  return { session, recovery, endRecovery: () => setRecovery(false) };
}

// Ambil percetakan user. Kalau belum punya, coba otomatis:
// gabung pakai kode undangan, atau buat percetakan dari nama yang diisi saat daftar.
export function useMembership(client, session) {
  const [state, setState] = React.useState({ status: 'loading' }); // loading | ready | none | error
  const userId = session?.user?.id;
  const reload = React.useCallback(async () => {
    if (!userId) return;
    // muat ulang diam-diam kalau sudah pernah siap (mis. setelah ganti nama), supaya halaman tidak ter-reset
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    const fetchMine = () => client.from('shop_members')
      .select('role, display_name, email, shop:shops(id, name, plan, active_until)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    let { data, error } = await fetchMine();
    if (error) { setState({ status: 'error', error }); return; }

    if (!data.length) {
      const meta = session.user.user_metadata || {};
      const invite = captureInviteFromUrl() || meta.invite_code;
      try {
        if (invite) {
          const r = await client.rpc('join_shop', { p_code: invite, p_display_name: meta.display_name || null });
          if (r.error) throw r.error;
          clearPendingInvite();
        } else if (meta.shop_name) {
          const r = await client.rpc('create_shop', { p_name: meta.shop_name, p_display_name: meta.display_name || null });
          if (r.error) throw r.error;
        }
      } catch (e) {
        clearPendingInvite();
        setState({ status: 'none', error: e });
        return;
      }
      ({ data, error } = await fetchMine());
      if (error) { setState({ status: 'error', error }); return; }
      if (!data.length) { setState({ status: 'none' }); return; }
    }
    const m = data[0];
    setState({
      status: 'ready',
      role: m.role,
      displayName: m.display_name,
      shop: { ...m.shop, active: isShopActive(m.shop) },
    });
  }, [client, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { if (userId) reload(); }, [userId, reload]);
  return { ...state, reload };
}
