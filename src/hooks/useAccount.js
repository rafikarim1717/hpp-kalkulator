// Sesi login Supabase + percetakan & peran user (admin / pegawai).
import React from 'react';

const today = () => new Date().toISOString().slice(0, 10);
// active_until kosong = tanpa batas. Kalau lewat tanggal, data jadi hanya-lihat.
export const isShopActive = (shop) => !shop?.active_until || shop.active_until >= today();

export function useSession(client) {
  const [session, setSession] = React.useState(undefined); // undefined = masih dicek
  React.useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ?? null); });
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [client]);
  return session;
}

// Percetakan tempat user terdaftar. Akun dihubungkan ke percetakan oleh pengelola (lewat SQL),
// jadi kalau belum terhubung, status = 'none'.
export function useMembership(client, session) {
  const [state, setState] = React.useState({ status: 'loading' }); // loading | ready | none | error
  const userId = session?.user?.id;
  const reload = React.useCallback(async () => {
    if (!userId) return;
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    const { data, error } = await client.from('shop_members')
      .select('role, display_name, shop:shops(id, name, plan, active_until)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) { setState({ status: 'error', error }); return; }
    if (!data.length) { setState({ status: 'none' }); return; }
    const m = data[0];
    setState({
      status: 'ready',
      isAdmin: m.role === 'owner',
      displayName: m.display_name,
      shop: { ...m.shop, active: isShopActive(m.shop) },
    });
  }, [client, userId]);

  React.useEffect(() => { if (userId) reload(); }, [userId, reload]);
  return { ...state, reload };
}
