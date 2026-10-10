// App root
//   Tanpa env Supabase  → mode lokal: login demo, data di browser (seperti sebelumnya)
//   Dengan env Supabase → login akun, data per percetakan di database, multi-user
import React from 'react';
import { Icon } from './components/Icon.jsx';
import Login from './components/Login.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import { TweakRadio, TweakSection, TweakSlider, TweaksPanel, useTweaks } from './components/TweaksPanel.jsx';
import { useLocalState } from './hooks/useLocalState.js';
import { useLocalWorkspace, useRemoteWorkspace } from './hooks/useWorkspace.js';
import { useMembership, useSession } from './hooks/useAccount.js';
import { supabase, friendlyError } from './lib/supabase.js';
import { newId } from './lib/masterData.js';
import DigitalCalcPage, { newDigitalItem } from './pages/DigitalCalcPage.jsx';
import {
  DigitalMasterPage, FinishingPage, MachinesPage, OthersPage, PapersPage, SettingsPage,
} from './pages/MasterPages.jsx';
import OffsetCalcPage, { newOffsetMedia } from './pages/OffsetCalcPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import { productFromTemplate } from './lib/templates.js';

const TWEAK_DEFAULTS = {
  theme: 'warm',
  density: 'comfortable',
  font: 'serif',
  accent_hue: 265,
};

const NAV = [
  { id: 'offset', label: 'Offset Printing', icon: Icon.Calc, group: 'Kalkulator' },
  { id: 'digital', label: 'Digital Printing', icon: Icon.Grid, group: 'Kalkulator' },
  { id: 'paper', label: 'Kertas', icon: Icon.Paper, group: 'Data Master', adminOnly: true },
  { id: 'machine', label: 'Mesin', icon: Icon.Tool, group: 'Data Master', adminOnly: true },
  { id: 'finishing', label: 'Finishing', icon: Icon.Edit, group: 'Data Master', adminOnly: true },
  { id: 'other', label: 'Biaya lain', icon: Icon.Plus, group: 'Data Master', adminOnly: true },
  { id: 'digital-master', label: 'Digital', icon: Icon.Grid, group: 'Data Master', adminOnly: true },
  { id: 'settings', label: 'Pengaturan umum', icon: Icon.Clock, group: 'Pengaturan' },
];
const ACCOUNT_NAV = { id: 'account', label: 'Akun', icon: Icon.Users, group: 'Pengaturan', adminOnly: true };

// ── Tampilan (tema, kepadatan, font) ───────────────────────────────────────

function useAppearance() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    document.body.dataset.theme = tweaks.theme;
    document.body.dataset.density = tweaks.density;
    document.body.dataset.font = tweaks.font;
    document.documentElement.style.setProperty('--accent', `oklch(0.52 0.18 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-soft', `oklch(0.95 0.04 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-strong', `oklch(0.42 0.20 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-text', `oklch(0.42 0.20 ${tweaks.accent_hue})`);
  }, [tweaks.theme, tweaks.density, tweaks.font, tweaks.accent_hue]);
  const panel = (
    <TweaksPanel title="Tampilan" open={open} onClose={() => setOpen(false)}>
      {renderTweaksContent(tweaks, setTweak)}
    </TweaksPanel>
  );
  return { panel, open: () => setOpen(true), toggle: () => setOpen((o) => !o) };
}

// ── Status simpan ─────────────────────────────────────────────────────────
// Normalnya tidak tampil apa-apa (simpan otomatis). Hanya muncul kalau gagal menyimpan, supaya data tidak hilang diam-diam.

const SavePill = ({ save, readOnly, onRetry }) => {
  if (readOnly || save.state !== 'error') return null;
  return <button className="save-pill error" onClick={onRetry} title={friendlyError(save.error)}>Gagal menyimpan · coba lagi</button>;
};

// Tombol pengaturan tampilan (tema, font, kepadatan) disembunyikan. Ubah ke true untuk memunculkan lagi.
const SHOW_APPEARANCE_BUTTON = false;

const Center = ({ children }) => <div className="center-screen"><div>{children}</div></div>;

// ── Kerangka aplikasi (sama untuk mode lokal & Supabase) ───────────────────

// isAdmin=false (pegawai): menu Data Master & Akun tidak muncul dan halamannya tidak bisa dibuka.
const Shell = ({ workspace, appearance, userLabel, onLogout, account, banner, savePill, isAdmin = true }) => {
  const [page, setPage] = useLocalState('pl2_page', 'offset');
  const [openId, setOpenId] = useLocalState('pl2_open', null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [navTick, setNavTick] = React.useState(0); // klik menu = kembali ke daftar
  const mainRef = React.useRef(null);
  const { master, products, setProducts, setMaster } = workspace;

  // Mulai dari atas tiap pindah halaman (supaya banner/peringatan di atas kelihatan)
  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [page, openId]);

  const nav = (account ? [...NAV, ACCOUNT_NAV] : NAV).filter((n) => isAdmin || !n.adminOnly);
  const current = nav.some((n) => n.id === page) ? page : 'offset';

  const openProduct = products.find((p) => p.id === openId);
  const setProduct = (next) => setProducts((list) => list.map((p) => (p.id === next.id ? next : p)));
  const addAndOpen = (p) => { setProducts((list) => [...list, p]); setOpenId(p.id); };
  const newProduct = (kind) => addAndOpen(kind === 'offset'
    ? { id: newId('p'), kind, name: '', qty: 1000, media: [newOffsetMedia(master)], others: [] }
    : { id: newId('p'), kind, name: '', qty: 100, items: [newDigitalItem(master)], others: [] });
  const fromTemplate = (tpl) => addAndOpen(productFromTemplate(tpl, master));
  const duplicate = (id) => {
    const src = products.find((p) => p.id === id);
    if (!src) return;
    addAndOpen({ ...JSON.parse(JSON.stringify(src)), id: newId('p'), name: `${src.name || 'Produk'} (salinan)` });
  };
  const remove = (id) => { setProducts((list) => list.filter((p) => p.id !== id)); if (openId === id) setOpenId(null); };
  const setter = (key) => (v) => setMaster(key, v);

  const renderPage = () => {
    switch (current) {
      case 'offset': case 'digital': {
        if (openProduct && openProduct.kind === current) {
          const Calc = current === 'offset' ? OffsetCalcPage : DigitalCalcPage;
          return <Calc key={openProduct.id} product={openProduct} setProduct={setProduct} master={master}
            onBack={() => setOpenId(null)} onDuplicate={() => duplicate(openProduct.id)} />;
        }
        return <ProductsPage kind={current} products={products} master={master} onOpen={setOpenId}
          onNew={() => newProduct(current)} onFromTemplate={fromTemplate} onDuplicate={duplicate} onDelete={remove} />;
      }
      case 'paper': return <PapersPage papers={master.papers} setPapers={setter('papers')} />;
      case 'machine': return <MachinesPage machines={master.machines} setMachines={setter('machines')} />;
      case 'finishing': return <FinishingPage finishing={master.finishing} setFinishing={setter('finishing')} />;
      case 'other': return <OthersPage others={master.others} setOthers={setter('others')} />;
      case 'digital-master': return <DigitalMasterPage papers={master.digitalPapers} setPapers={setter('digitalPapers')} machines={master.digitalMachines} setMachines={setter('digitalMachines')} />;
      case 'settings': return <SettingsPage settings={master.settings} setSettings={setter('settings')} />;
      case 'account': return account;
      default: return null;
    }
  };

  const navByGroup = {};
  nav.forEach((n) => { (navByGroup[n.group] = navByGroup[n.group] || []).push(n); });

  return <>
    <div className="app-shell">
      <div className="topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
          <Icon.Menu style={{ width: 16, height: 16 }} />
        </button>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-name">Pricelab</div>
          <div className="brand-version">v3 beta</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {savePill}
          {SHOW_APPEARANCE_BUTTON && (
            <button className="btn btn-ghost btn-sm btn-tampilan" onClick={appearance.toggle} title="Pengaturan tampilan" aria-label="Pengaturan tampilan">
              <Icon.Gear style={{ width: 16, height: 16 }} />
            </button>
          )}
          <div className="mono user-chip" style={{ fontSize: 12, color: 'var(--text-3)', padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 20 }}>
            {userLabel}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Keluar" aria-label="Keluar">
            <Icon.Logout style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <div className={`sidebar ${mobileNav ? 'mobile-open' : ''}`} onClick={() => setMobileNav(false)}>
        {Object.entries(navByGroup).map(([group, items]) => (
          <div key={group} className="nav-section">
            <div className="nav-label">{group}</div>
            {items.map((n) => {
              const I = n.icon;
              return (
                <div key={n.id} className={`nav-item ${current === n.id ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setPage(n.id); setOpenId(null); setNavTick((t) => t + 1); setMobileNav(false); }}>
                  <I className="nav-icon" />
                  <span>{n.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <main className="main" ref={mainRef}>
        {banner}
        <React.Fragment key={`${current}-${navTick}`}>{renderPage()}</React.Fragment>
      </main>
    </div>
    {appearance.panel}
  </>;
};

// ── Mode lokal (tanpa Supabase) ───────────────────────────────────────────

const LocalApp = () => {
  const appearance = useAppearance();
  const [user, setUser] = useLocalState('pl_user', null);
  const workspace = useLocalWorkspace();
  if (!user) return <><Login onLogin={setUser} onOpenTweaks={appearance.open} />{appearance.panel}</>;
  return <Shell workspace={workspace} appearance={appearance} userLabel={user} onLogout={() => setUser(null)} />;
};

// ── Mode Supabase ─────────────────────────────────────────────────────────

const signOut = () => supabase.auth.signOut();

const RemoteApp = () => {
  const appearance = useAppearance();
  const session = useSession(supabase);
  if (session === undefined) return <Center>Memuat…</Center>;
  if (!session) return <AuthScreen client={supabase} />;
  return <MemberGate key={session.user.id} session={session} appearance={appearance} />;
};

const MemberGate = ({ session, appearance }) => {
  const membership = useMembership(supabase, session);
  if (membership.status === 'loading') return <Center>Memuat…</Center>;
  if (membership.status === 'ready') {
    return <RemoteShell key={membership.shop.id} session={session} membership={membership} appearance={appearance} />;
  }
  return (
    <Center>
      <p>{membership.status === 'error'
        ? friendlyError(membership.error)
        : `Akun ${session.user.email} belum terhubung ke percetakan. Hubungi pengelola aplikasi.`}</p>
      <div className="row" style={{ gap: 8, justifyContent: 'center', marginTop: 12 }}>
        {membership.status === 'error' && <button className="btn btn-primary" onClick={membership.reload}>Coba lagi</button>}
        <button className="btn btn-ghost" onClick={signOut}>Keluar</button>
      </div>
    </Center>
  );
};

const RemoteShell = ({ session, membership, appearance }) => {
  const workspace = useRemoteWorkspace(supabase, membership.shop);
  const { shop, isAdmin } = membership;

  if (workspace.status === 'loading') return <Center>Memuat data…</Center>;
  if (workspace.status === 'error') {
    return (
      <Center>
        <p>Gagal memuat data: {friendlyError(workspace.loadError)}</p>
        <div className="row" style={{ gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Muat ulang</button>
          <button className="btn btn-ghost" onClick={signOut}>Keluar</button>
        </div>
      </Center>
    );
  }

  const logout = async () => {
    await workspace.retry(); // simpan perubahan terakhir dulu
    signOut();
  };
  const banner = !shop.active && (
    <div className="shop-banner" role="status">
      Akses aplikasi sedang tidak aktif. Data masih bisa dilihat, tapi perubahan tidak disimpan. Hubungi pengelola aplikasi.
    </div>
  );
  const account = isAdmin && (
    <AccountPage client={supabase} session={session} membership={membership} workspace={workspace} />
  );

  return (
    <Shell workspace={workspace} appearance={appearance} isAdmin={isAdmin}
      userLabel={membership.displayName || session.user.email}
      onLogout={logout} account={account || null} banner={banner}
      savePill={<SavePill save={workspace.save} readOnly={workspace.readOnly} onRetry={workspace.retry} />} />
  );
};

const App = () => (supabase ? <RemoteApp /> : <LocalApp />);

function renderTweaksContent(tweaks, setTweak) {
  return <>
    <TweakSection label="Theme">
      <TweakRadio label="Color theme" value={tweaks.theme} onChange={(v) => setTweak('theme', v)}
        options={[
          { value: 'warm', label: 'Warm' },
          { value: 'cool', label: 'Cool' },
          { value: 'mono', label: 'Mono' },
        ]}
      />
      <TweakSlider label="Accent hue" value={tweaks.accent_hue} onChange={(v) => setTweak('accent_hue', v)}
        min={0} max={360} step={5} unit="°" />
    </TweakSection>
    <TweakSection label="Layout">
      <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweak('density', v)}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfy' },
          { value: 'spacious', label: 'Spacious' },
        ]}
      />
      <TweakRadio label="Font" value={tweaks.font} onChange={(v) => setTweak('font', v)}
        options={[
          { value: 'serif', label: 'Serif accent' },
          { value: 'serif-heavy', label: 'Fraunces' },
          { value: 'sans-only', label: 'Sans only' },
        ]}
      />
    </TweakSection>
  </>;
}

export default App;
