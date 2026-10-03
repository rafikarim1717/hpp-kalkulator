// App root
import React from 'react';
import { Icon } from './components/Icon.jsx';
import Login from './components/Login.jsx';
import { TweakRadio, TweakSection, TweakSlider, TweaksPanel, useTweaks } from './components/TweaksPanel.jsx';
import { useLocalState } from './hooks/useLocalState.js';
import {
  DEFAULT_DIGITAL_MACHINES, DEFAULT_DIGITAL_PAPERS, DEFAULT_FINISHING, DEFAULT_MACHINES,
  DEFAULT_OTHERS, DEFAULT_PAPERS, DEFAULT_SETTINGS, SAMPLE_BROSUR, newId,
} from './lib/masterData.js';
import DigitalCalcPage, { newDigitalItem } from './pages/DigitalCalcPage.jsx';
import {
  DigitalMasterPage, FinishingPage, MachinesPage, OthersPage, PapersPage, SettingsPage,
} from './pages/MasterPages.jsx';
import OffsetCalcPage, { newOffsetMedia } from './pages/OffsetCalcPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';

const TWEAK_DEFAULTS = {
  theme: 'warm',
  density: 'comfortable',
  font: 'serif',
  accent_hue: 265,
};

const NAV = [
  { id: 'offset', label: 'Offset Printing', icon: Icon.Calc, group: 'Kalkulator' },
  { id: 'digital', label: 'Digital Printing', icon: Icon.Grid, group: 'Kalkulator' },
  { id: 'paper', label: 'Kertas', icon: Icon.Paper, group: 'Data Master' },
  { id: 'machine', label: 'Mesin', icon: Icon.Tool, group: 'Data Master' },
  { id: 'finishing', label: 'Finishing', icon: Icon.Edit, group: 'Data Master' },
  { id: 'other', label: 'Biaya lain', icon: Icon.Plus, group: 'Data Master' },
  { id: 'digital-master', label: 'Digital', icon: Icon.Grid, group: 'Data Master' },
  { id: 'settings', label: 'Pengaturan umum', icon: Icon.Clock, group: 'Pengaturan' },
];

const App = () => {
  const [user, setUser] = useLocalState('pl_user', null);
  const [page, setPage] = useLocalState('pl2_page', 'offset');
  const [openId, setOpenId] = useLocalState('pl2_open', null);
  const [settings, setSettings] = useLocalState('pl2_settings', DEFAULT_SETTINGS);
  const [papers, setPapers] = useLocalState('pl2_papers', DEFAULT_PAPERS);
  const [machines, setMachines] = useLocalState('pl2_machines', DEFAULT_MACHINES);
  const [finishing, setFinishing] = useLocalState('pl2_finishing', DEFAULT_FINISHING, (f) => ({ ...DEFAULT_FINISHING, ...f }));
  const [others, setOthers] = useLocalState('pl2_others', DEFAULT_OTHERS);
  const [digitalPapers, setDigitalPapers] = useLocalState('pl2_dpapers', DEFAULT_DIGITAL_PAPERS);
  const [digitalMachines, setDigitalMachines] = useLocalState('pl2_dmachines', DEFAULT_DIGITAL_MACHINES);
  const [products, setProducts] = useLocalState('pl2_products', [SAMPLE_BROSUR]);
  const master = React.useMemo(() => ({
    settings, papers, machines, finishing, others, digitalPapers, digitalMachines,
  }), [settings, papers, machines, finishing, others, digitalPapers, digitalMachines]);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const mainRef = React.useRef(null);

  // Mulai dari atas tiap pindah halaman (supaya banner/peringatan di atas kelihatan)
  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [page, openId]);

  // Apply tweaks to body
  React.useEffect(() => {
    document.body.dataset.theme = tweaks.theme;
    document.body.dataset.density = tweaks.density;
    document.body.dataset.font = tweaks.font;
    document.documentElement.style.setProperty('--accent', `oklch(0.52 0.18 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-soft', `oklch(0.95 0.04 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-strong', `oklch(0.42 0.20 ${tweaks.accent_hue})`);
    document.documentElement.style.setProperty('--accent-text', `oklch(0.42 0.20 ${tweaks.accent_hue})`);
  }, [tweaks.theme, tweaks.density, tweaks.font, tweaks.accent_hue]);

  const tweaksPanel = (
    <TweaksPanel title="Tampilan" open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
      {renderTweaksContent(tweaks, setTweak)}
    </TweaksPanel>
  );

  if (!user) return <>
    <Login onLogin={setUser} onOpenTweaks={() => setTweaksOpen(true)} />
    {tweaksPanel}
  </>;

  const openProduct = products.find((p) => p.id === openId);
  const setProduct = (next) => setProducts(products.map((p) => (p.id === next.id ? next : p)));
  const newProduct = (kind) => {
    const p = kind === 'offset'
      ? { id: newId('p'), kind, name: '', qty: 1000, media: [newOffsetMedia(master)], others: [] }
      : { id: newId('p'), kind, name: '', qty: 100, items: [newDigitalItem(master)], others: [] };
    setProducts([...products, p]);
    setOpenId(p.id);
  };
  const duplicate = (id) => {
    const src = products.find((p) => p.id === id);
    if (!src) return;
    const copy = { ...JSON.parse(JSON.stringify(src)), id: newId('p'), name: `${src.name || 'Produk'} (salinan)` };
    setProducts([...products, copy]);
    setOpenId(copy.id);
  };
  const remove = (id) => { setProducts(products.filter((p) => p.id !== id)); if (openId === id) setOpenId(null); };

  const renderPage = () => {
    switch (page) {
      case 'offset': case 'digital': {
        if (openProduct && openProduct.kind === page) {
          const Calc = page === 'offset' ? OffsetCalcPage : DigitalCalcPage;
          return <Calc key={openProduct.id} product={openProduct} setProduct={setProduct} master={master}
            onBack={() => setOpenId(null)} onDuplicate={() => duplicate(openProduct.id)} />;
        }
        return <ProductsPage kind={page} products={products} master={master} onOpen={setOpenId}
          onNew={() => newProduct(page)} onDuplicate={duplicate} onDelete={remove} />;
      }
      case 'paper': return <PapersPage papers={papers} setPapers={setPapers} />;
      case 'machine': return <MachinesPage machines={machines} setMachines={setMachines} />;
      case 'finishing': return <FinishingPage finishing={finishing} setFinishing={setFinishing} />;
      case 'other': return <OthersPage others={others} setOthers={setOthers} />;
      case 'digital-master': return <DigitalMasterPage papers={digitalPapers} setPapers={setDigitalPapers} machines={digitalMachines} setMachines={setDigitalMachines} />;
      case 'settings': return <SettingsPage settings={settings} setSettings={setSettings} />;
      default: return null;
    }
  };

  const navByGroup = {};
  NAV.forEach((n) => { (navByGroup[n.group] = navByGroup[n.group] || []).push(n); });

  return <>
    <div className="app-shell">
      <div className="topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileNav(!mobileNav)}>
          <Icon.Menu style={{ width: 16, height: 16 }} />
        </button>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-name">Pricelab</div>
          <div className="brand-version">v3 beta</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTweaksOpen(!tweaksOpen)} title="Pengaturan tampilan">
            Tampilan
          </button>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 20 }}>
            {user}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setUser(null)} title="Keluar">
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
                <div key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setPage(n.id); setOpenId(null); setMobileNav(false); }}>
                  <I className="nav-icon" />
                  <span>{n.label}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px 10px', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
          v3 beta · Pricelab
        </div>
      </div>

      <main className="main" ref={mainRef}>
        {renderPage()}
      </main>
    </div>

    {tweaksPanel}
  </>;
};

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
