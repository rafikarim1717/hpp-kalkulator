// App root
import React from 'react';
import { Icon } from './components/Icon.jsx';
import Login from './components/Login.jsx';
import { TweakRadio, TweakSection, TweakSlider, TweaksPanel, useTweaks } from './components/TweaksPanel.jsx';
import { useLocalState } from './hooks/useLocalState.js';
import {
  DEFAULT_HPP_STATE, DEFAULT_MATERIALS, DEFAULT_PLANO_STATE, DEFAULT_TOOLS,
  normalizeHppState, normalizeMaterial, normalizePlanoState,
} from './lib/constants.js';
import HistoryPage from './pages/HistoryPage.jsx';
import HppPage from './pages/HppPage.jsx';
import MaterialsPage from './pages/MaterialsPage.jsx';
import PlanoPage from './pages/PlanoPage.jsx';
import ToolsPage from './pages/ToolsPage.jsx';

const TWEAK_DEFAULTS = {
  theme: 'warm',
  density: 'comfortable',
  font: 'serif',
  accent_hue: 265,
};

const NAV = [
  { id: 'plano', label: 'Plano & Imposition', icon: Icon.Grid, group: 'Kalkulator' },
  { id: 'hpp', label: 'Hitung HPP', icon: Icon.Calc, group: 'Kalkulator' },
  { id: 'tools', label: 'Mesin', icon: Icon.Tool, group: 'Master Data' },
  { id: 'materials', label: 'Material', icon: Icon.Paper, group: 'Master Data' },
  { id: 'history', label: 'Histori', icon: Icon.Clock, group: 'Riwayat' },
];

const App = () => {
  const [user, setUser] = useLocalState('pl_user', null);
  const [page, setPage] = useLocalState('pl_page', 'plano');
  const [tools, setTools] = useLocalState('pl_tools', DEFAULT_TOOLS);
  const [materials, setMaterials] = useLocalState('pl_materials', DEFAULT_MATERIALS, (list) => list.map(normalizeMaterial));
  const [history, setHistory] = useLocalState('pl_history', []);
  const [planoState, setPlanoState] = useLocalState('pl_plano', DEFAULT_PLANO_STATE, normalizePlanoState);
  const [hppState, setHppState] = useLocalState('pl_hpp', DEFAULT_HPP_STATE(), normalizeHppState);
  const [fromPlano, setFromPlano] = React.useState(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

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

  const sendToHpp = (layout) => {
    const { machineId, ...rest } = layout;
    const patch = { ...rest };
    // ikut pilih mesin kalau di Plano dicek dan di HPP belum dipilih
    const t = tools.find((x) => String(x.id) === String(machineId));
    if (t && !hppState.machineId) {
      Object.assign(patch, { machineId, maxColor: t.maxcolor, runRate: t.runrate, platePrice: t.plate, minRun: t.minorder });
    }
    setFromPlano({ ...layout, acked: false });
    setHppState({ ...hppState, ...patch });
    setPage('hpp');
  };
  const ackFromPlano = () => setFromPlano(null);

  const saveCalc = (s, result) => {
    const entry = {
      id: Date.now(), date: new Date().toISOString(),
      name: s.name, qty: s.qty,
      sub: result.sub, perPcs: result.perPcs, sell: result.sell, sellPer: result.sellPer,
      sellIncl: result.sellIncl,
      input: s, // snapshot lengkap supaya bisa dibuka lagi
    };
    setHistory([...history, entry]);
  };

  const openFromHistory = (entry) => {
    setHppState(normalizeHppState(entry.input));
    setFromPlano(null);
    setPage('hpp');
  };

  const renderPage = () => {
    switch (page) {
      case 'plano': return <PlanoPage planoState={planoState} setPlanoState={setPlanoState} tools={tools} onSendToHpp={sendToHpp} />;
      case 'hpp': return <HppPage hppState={hppState} setHppState={setHppState} tools={tools} materials={materials} onSave={saveCalc} fromPlano={fromPlano} ackFromPlano={ackFromPlano} />;
      case 'tools': return <ToolsPage tools={tools} setTools={setTools} />;
      case 'materials': return <MaterialsPage materials={materials} setMaterials={setMaterials} />;
      case 'history': return <HistoryPage history={history} setHistory={setHistory} onOpen={openFromHistory} />;
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
          <div className="brand-version">v2.0</div>
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
                  onClick={(e) => { e.stopPropagation(); setPage(n.id); setMobileNav(false); }}>
                  <I className="nav-icon" />
                  <span>{n.label}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px 10px', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
          v2.0 · Pricelab
        </div>
      </div>

      <main className="main">
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
