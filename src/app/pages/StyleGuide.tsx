import { Download, Terminal, Code } from 'lucide-react';
import { TypographySection } from '../components/TypographySection';
import { Toast } from '../components/notifications/toast';
import { useState } from 'react';

export function StyleGuide() {
  const [toasts, setToasts] = useState<any[]>([]);
  
  const addToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    const id = `toast_${Date.now()}`;
    const newToast = {
      id,
      type,
      title,
      message,
      duration: 5000,
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };
    setToasts(prev => [...prev, newToast]);
  };

  const exportJSON = () => {
    const styleData = {
      version: '1.0.5',
      colors: {
        primary: '#2CC295',
        studioBg: '#121212',
        panelBg: '#141417',
        panelBorder: '#27272a',
        accentPurple: '#9333ea',
        accentOrange: '#F97316',
        accentBlue: '#3B82F6',
        accentRed: '#EF4444',
      },
      glassmorphism: {
        blur: '24px',
        saturation: '180%',
      },
      buttons: {
        primary: {
          background: 'linear-gradient(135deg, #2CC295 0%, #229b77 100%)',
          shadow: '0 4px 12px rgba(44, 194, 149, 0.2)',
        },
        secondary: {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    };
    
    const dataStr = JSON.stringify(styleData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'web3-style-guide.json');
    link.click();
    addToast('success', 'Export Successful', 'Style guide JSON file has been exported successfully.');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#121212] text-zinc-300 custom-scrollbar">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle, rgba(44, 194, 149, 0.15) 0%, rgba(18, 18, 18, 0) 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, rgba(18, 18, 18, 0) 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-7xl mx-auto p-8 pb-20 relative">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2CC295] rounded-xl flex items-center justify-center shadow-lg shadow-[#2CC295]/20">
              <Terminal className="text-black" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight leading-none">WEB3 MASTER</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">CSS STYLE GUIDE v1.0.5</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
              <p className="text-xs font-medium text-zinc-400">Developer Reference</p>
              <p className="text-[10px] text-[#2CC295] font-mono tracking-widest uppercase">Documentation</p>
            </div>
            <button 
              onClick={exportJSON}
              className="bg-zinc-900 border border-[#27272a] px-4 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              EXPORT JSON
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-16">
          {/* CSS Variables */}
          <section className="space-y-6" id="css-variables">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">01. CSS VARIABLES</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
              {[
                { name: '--primary-teal', color: '#2CC295', textColor: 'text-[#2CC295]' },
                { name: '--deep-dark', color: '#121212', textColor: 'text-zinc-500' },
                { name: '--accent-purple', color: '#9333ea', textColor: 'text-purple-400' },
                { name: '--accent-orange', color: '#F97316', textColor: 'text-orange-500' },
                { name: '--accent-blue', color: '#3B82F6', textColor: 'text-blue-500' },
                { name: '--accent-red', color: '#EF4444', textColor: 'text-red-500' },
                { name: '--panel-border', color: '#27272a', textColor: 'text-zinc-400' },
              ].map((item) => (
                <div key={item.name} className="bg-[#141417] border border-[#27272a] p-4 rounded-2xl">
                  <div 
                    className="w-full h-24 rounded-xl mb-4" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <code className={`text-xs ${item.textColor} block font-mono`}>{item.name}</code>
                  <p className="text-sm font-bold text-white">{item.color.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Typography System */}
          <TypographySection />

          {/* Button Components */}
          <section className="space-y-6" id="button-components">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">03. BUTTON COMPONENTS</h2>
            </div>
            <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Primary Gradient */}
                <div className="space-y-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Primary Gradient</p>
                  <div className="space-y-4">
                    <button 
                      className="w-full py-3 rounded-xl text-black font-bold text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #2CC295 0%, #229b77 100%)',
                        boxShadow: '0 4px 12px rgba(44, 194, 149, 0.2)',
                      }}
                    >
                      Default State
                    </button>
                    <button 
                      className="w-full py-3 rounded-xl text-black font-bold text-sm opacity-90 brightness-110"
                      style={{
                        background: 'linear-gradient(135deg, #2CC295 0%, #229b77 100%)',
                        boxShadow: '0 4px 12px rgba(44, 194, 149, 0.2)',
                      }}
                    >
                      Hover State
                    </button>
                    <button 
                      className="w-full bg-zinc-800 py-3 rounded-xl text-zinc-600 font-bold text-sm cursor-not-allowed border border-[#27272a]"
                      disabled
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                {/* Secondary Glass */}
                <div className="space-y-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Secondary Glass</p>
                  <div className="space-y-4">
                    <button 
                      className="w-full py-3 rounded-xl text-white font-bold text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      Default State
                    </button>
                    <button className="w-full bg-white/10 border border-white/20 py-3 rounded-xl text-white font-bold text-sm">
                      Hover State
                    </button>
                    <button 
                      className="w-full bg-transparent border border-zinc-800 py-3 rounded-xl text-zinc-700 font-bold text-sm cursor-not-allowed"
                      disabled
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                {/* Outline Subtle */}
                <div className="space-y-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Outline Subtle</p>
                  <div className="space-y-4">
                    <button className="w-full border border-zinc-700 py-3 rounded-xl text-zinc-300 font-medium text-sm hover:border-zinc-500">
                      Default State
                    </button>
                    <button className="w-full border border-[#2CC295]/50 py-3 rounded-xl text-[#2CC295] font-medium text-sm">
                      Hover State
                    </button>
                    <button 
                      className="w-full border border-zinc-900 py-3 rounded-xl text-zinc-800 font-medium text-sm cursor-not-allowed"
                      disabled
                    >
                      Disabled
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Glassmorphism Cards */}
          <section className="space-y-6" id="glassmorphism-cards">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">04. GLASSMORPHISM CARDS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Standard Glass */}
              <div 
                className="rounded-3xl p-8 min-h-[240px] flex flex-col justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white/20 blur-sm"></div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-white/10 text-zinc-400 font-mono">BLUR: 24PX</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Standard Glass</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">High saturation background filter with subtle white borders for a premium Web3 aesthetic.</p>
                </div>
                <div className="pt-6 border-t border-white/5 flex gap-4">
                  <div className="h-2 w-12 bg-white/20 rounded-full"></div>
                  <div className="h-2 w-12 bg-white/5 rounded-full"></div>
                </div>
              </div>

              {/* Primary Accent Card */}
              <div 
                className="rounded-3xl p-8 min-h-[240px] flex flex-col justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(44, 194, 149, 0.3)',
                  boxShadow: '0 0 20px rgba(44, 194, 149, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#2CC295]/10 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[#2CC295]/40"></div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-[#2CC295]/20 text-[#2CC295] font-mono font-bold">ACCENT GLOW</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Primary Accent Card</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">Integrated outer glow effect and teal-tinted borders for emphasized UI elements.</p>
                </div>
                <div className="pt-6 border-t border-[#2CC295]/10 flex gap-4">
                  <div className="h-2 w-12 bg-[#2CC295]/40 rounded-full"></div>
                  <div className="h-2 w-12 bg-[#2CC295]/10 rounded-full"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Ambient Backgrounds */}
          <section className="space-y-6" id="ambient-backgrounds">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">05. AMBIENT BACKGROUNDS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Glow Teal */}
              <div className="bg-zinc-950 rounded-2xl border border-[#27272a] overflow-hidden relative">
                <div className="p-6 relative z-10">
                  <h4 className="text-white font-bold text-sm mb-1">Glow Teal</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">radial-gradient(circle, rgba(44,194,149,0.15), transparent)</p>
                </div>
                <div className="h-64 flex items-center justify-center relative overflow-hidden">
                  <div 
                    className="w-48 h-48 opacity-100"
                    style={{
                      background: 'radial-gradient(circle, rgba(44, 194, 149, 0.15) 0%, rgba(18, 18, 18, 0) 70%)',
                      filter: 'blur(60px)',
                    }}
                  ></div>
                </div>
              </div>

              {/* Glow Purple */}
              <div className="bg-zinc-950 rounded-2xl border border-[#27272a] overflow-hidden relative">
                <div className="p-6 relative z-10">
                  <h4 className="text-white font-bold text-sm mb-1">Glow Purple</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">radial-gradient(circle, rgba(147,51,234,0.12), transparent)</p>
                </div>
                <div className="h-64 flex items-center justify-center relative overflow-hidden">
                  <div 
                    className="w-48 h-48 opacity-100"
                    style={{
                      background: 'radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, rgba(18, 18, 18, 0) 70%)',
                      filter: 'blur(60px)',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* Forms & Controls - EXACT COPY FROM HTML TEMPLATE */}
          <section className="space-y-6" id="forms-controls">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">06. FORMS & CONTROLS</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-12">
                {/* Text Inputs & Toggles */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">edit_note</span> Text Inputs &amp; Toggles
                  </h2>
                  <div className="space-y-4">
                    {/* Default Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400">Default Input</label>
                      <input 
                        className="w-full bg-zinc-900/50 border-[#27272a] rounded-lg px-4 py-2.5 text-sm text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] transition-all teal-glow-focus" 
                        placeholder="Enter collection name..." 
                        type="text"
                      />
                    </div>

                    {/* Pill Segmented Toggle */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400">Pill Segmented Toggle</label>
                      <div className="bg-zinc-900/80 p-1.5 rounded-full inline-flex items-center border border-[#27272a]">
                        <button className="px-6 py-2 text-sm font-bold text-zinc-400 rounded-full hover:text-white transition-colors">
                          Simple
                        </button>
                        <button className="px-6 py-2 text-sm font-bold text-white bg-zinc-800 rounded-full shadow-sm">
                          Custom
                        </button>
                      </div>
                    </div>

                    {/* Search with Premium Gradient */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400">Search with Premium Gradient</label>
                      <div className="input-gradient-border">
                        <div className="input-inner flex items-center px-3 py-2">
                          <span className="material-symbols-outlined text-zinc-500 text-lg mr-2">search</span>
                          <input 
                            className="bg-transparent border-none focus:ring-0 p-0 text-sm text-white w-full" 
                            placeholder="Search assets, wallets..." 
                            type="text"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standard Toggles */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">toggle_on</span> Standard Toggles
                  </h2>
                  <div className="p-6 bg-[#141417] border border-[#27272a] rounded-xl space-y-6">
                    {/* Live Notifications */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-300">Live Notifications</span>
                      <label className="suno-toggle">
                        <input type="checkbox" defaultChecked />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    {/* Public Profile */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-300">Public Profile</span>
                      <label className="suno-toggle">
                        <input type="checkbox" />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Checkboxes & Radios */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_box</span> Checkboxes &amp; Radios
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Checkboxes */}
                    <div className="p-6 bg-[#141417] border border-[#27272a] rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          defaultChecked
                          className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-zinc-900 transition-colors"
                        />
                        <span className="text-sm text-zinc-300">Checked</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-zinc-900 transition-colors"
                        />
                        <span className="text-sm text-zinc-300">Unchecked</span>
                      </div>
                    </div>

                    {/* Radio Buttons */}
                    <div className="p-6 bg-[#141417] border border-[#27272a] rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="demo-radio"
                          defaultChecked
                          className="w-5 h-5 border-zinc-700 bg-zinc-800 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-zinc-900"
                        />
                        <span className="text-sm text-zinc-300">Selected</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="demo-radio"
                          className="w-5 h-5 border-zinc-700 bg-zinc-800 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-zinc-900"
                        />
                        <span className="text-sm text-zinc-300">Standard</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-12">
                {/* Detailed Version Selector */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">list_alt</span> Detailed Version Selector
                  </h2>
                  <div className="dropdown-panel rounded-xl overflow-hidden w-full max-w-[320px]">
                    <div className="p-2 space-y-1">
                      {/* v5 */}
                      <div className="p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">v5</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 uppercase">Pro</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 uppercase">Beta</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Voix authentiques, qualité audio et contrôle supérieurs</p>
                      </div>

                      {/* v4.5+ */}
                      <div className="p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">v4.5+</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 uppercase">Pro</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Méthodes de création avancées</p>
                      </div>

                      {/* v4.5-all - Selected */}
                      <div className="p-3 rounded-lg bg-zinc-800/60 cursor-pointer border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">v4.5-all</span>
                          <span className="material-symbols-outlined text-white text-base">check_circle</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Meilleur modèle gratuit</p>
                      </div>

                      {/* v4 */}
                      <div className="p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">v4</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 uppercase">Pro</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Qualité sonore améliorée</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter & Sort Controls */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">filter_list</span> Filter &amp; Sort Controls
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Filter Panel */}
                    <div className="dropdown-panel rounded-xl overflow-hidden w-full max-w-[240px]">
                      <div className="p-2 space-y-0.5">
                        {/* Liked */}
                        <div className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-zinc-400 text-[20px]">thumb_up</span>
                            <span className="text-sm font-medium text-white">Liked</span>
                          </div>
                          <div className="w-4 h-4 border border-zinc-600 rounded"></div>
                        </div>

                        {/* Disliked */}
                        <div className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-zinc-400 text-[20px]">thumb_down</span>
                            <span className="text-sm font-medium text-white">Disliked</span>
                          </div>
                          <div className="w-4 h-4 border border-zinc-600 rounded"></div>
                        </div>

                        {/* Public */}
                        <div className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-zinc-400 text-[20px]">public</span>
                            <span className="text-sm font-medium text-white">Public</span>
                          </div>
                          <div className="w-4 h-4 border border-zinc-600 rounded"></div>
                        </div>

                        {/* Private - Selected */}
                        <div className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-zinc-400 text-[20px]">lock</span>
                            <span className="text-sm font-medium text-white">Private</span>
                          </div>
                          <div className="w-4 h-4 border-[#2CC295] bg-[#2CC295]/20 rounded flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#2CC295] text-[14px] font-bold">check</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sort Panel */}
                    <div className="dropdown-panel rounded-xl overflow-hidden w-full max-w-[200px] h-fit">
                      <div className="p-2 space-y-0.5">
                        {/* Newest - Selected */}
                        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/60 rounded-lg cursor-pointer">
                          <span className="text-sm font-bold text-white">Newest</span>
                          <span className="material-symbols-outlined text-white text-base">check_circle</span>
                        </div>

                        {/* Oldest */}
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <span className="text-sm font-medium text-zinc-400">Oldest</span>
                        </div>

                        {/* Most Upvoted */}
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <span className="text-sm font-medium text-zinc-400">Most Upvoted</span>
                        </div>

                        {/* Least Upvoted */}
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer">
                          <span className="text-sm font-medium text-zinc-400">Least Upvoted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Button Styles - EXACT COPY FROM HTML TEMPLATE */}
          <section className="space-y-6" id="button-styles">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">07. BUTTON STYLES</h2>
            </div>

            <div className="space-y-20">
              {/* Buttons w icon */}
              <div className="grid grid-cols-[200px_1fr] gap-8">
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Buttons w icon</h3>
                </div>
                <div className="space-y-10">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                    <span>Default</span>
                    <span>Hover</span>
                    <span>Pressed</span>
                    <span>Disabled</span>
                  </div>

                  {/* Teal Gradient Buttons */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="w-10 h-10 rounded-full teal-gradient-btn flex items-center justify-center text-black">
                      <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-[#2CC295]/80 flex items-center justify-center text-black shadow-[0_0_20px_rgba(44,194,149,0.4)]">
                      <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-[#2CC295]/60 flex items-center justify-center text-black scale-95 transition-transform">
                      <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 cursor-not-allowed opacity-50">
                      <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                  </div>

                  {/* Glass Buttons */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="w-10 h-10 rounded-lg glass-btn flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-xl">settings</span>
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-xl">settings</span>
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white scale-95">
                      <span className="material-symbols-outlined text-xl">settings</span>
                    </button>
                    <button className="w-10 h-10 rounded-lg border border-white/5 flex items-center justify-center text-zinc-700 cursor-not-allowed">
                      <span className="material-symbols-outlined text-xl">settings</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons w icon and label */}
              <div className="grid grid-cols-[200px_1fr] gap-8">
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Buttons w icon and label</h3>
                </div>
                <div className="space-y-10">
                  {/* Teal Gradient Buttons with Icon + Label */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="teal-gradient-btn text-black font-bold py-2.5 px-6 rounded-full flex items-center gap-2 w-fit">
                      <span className="material-symbols-outlined text-lg">wallet</span>
                      <span>Connect Wallet</span>
                    </button>
                    <button className="bg-[#2CC295]/90 text-black font-bold py-2.5 px-6 rounded-full flex items-center gap-2 w-fit shadow-lg shadow-[#2CC295]/30">
                      <span className="material-symbols-outlined text-lg">wallet</span>
                      <span>Connect Wallet</span>
                    </button>
                    <button className="bg-[#2CC295]/70 text-black font-bold py-2.5 px-6 rounded-full flex items-center gap-2 w-fit scale-95">
                      <span className="material-symbols-outlined text-lg">wallet</span>
                      <span>Connect Wallet</span>
                    </button>
                    <button className="bg-zinc-800 text-zinc-600 font-bold py-2.5 px-6 rounded-full flex items-center gap-2 w-fit cursor-not-allowed opacity-50">
                      <span className="material-symbols-outlined text-lg">wallet</span>
                      <span>Connect Wallet</span>
                    </button>
                  </div>

                  {/* Glass Buttons with Icon + Label */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="glass-btn text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 w-fit">
                      <span className="material-symbols-outlined text-lg">token</span>
                      <span>Mint NFT</span>
                    </button>
                    <button className="bg-white/10 border border-white/20 text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 w-fit">
                      <span className="material-symbols-outlined text-lg">token</span>
                      <span>Mint NFT</span>
                    </button>
                    <button className="bg-white/5 border border-white/10 text-white/80 font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 w-fit scale-95">
                      <span className="material-symbols-outlined text-lg">token</span>
                      <span>Mint NFT</span>
                    </button>
                    <button className="border border-white/5 text-zinc-700 font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 w-fit cursor-not-allowed">
                      <span className="material-symbols-outlined text-lg">token</span>
                      <span>Mint NFT</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons w label */}
              <div className="grid grid-cols-[200px_1fr] gap-8">
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Buttons w label</h3>
                </div>
                <div className="space-y-10">
                  {/* Teal Gradient Buttons Label Only */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="teal-gradient-btn text-black font-bold py-2.5 px-8 rounded-lg w-fit">
                      Confirm Swap
                    </button>
                    <button className="bg-[#2CC295]/90 text-black font-bold py-2.5 px-8 rounded-lg w-fit shadow-lg shadow-[#2CC295]/20">
                      Confirm Swap
                    </button>
                    <button className="bg-[#2CC295]/70 text-black font-bold py-2.5 px-8 rounded-lg w-fit scale-95">
                      Confirm Swap
                    </button>
                    <button className="bg-zinc-800 text-zinc-600 font-bold py-2.5 px-8 rounded-lg w-fit cursor-not-allowed opacity-50">
                      Confirm Swap
                    </button>
                  </div>

                  {/* Glass Buttons Label Only */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <button className="glass-btn text-white font-medium py-2.5 px-8 rounded-lg w-fit">
                      View Transaction
                    </button>
                    <button className="bg-white/10 border border-white/20 text-white font-medium py-2.5 px-8 rounded-lg w-fit">
                      View Transaction
                    </button>
                    <button className="bg-white/5 border border-white/10 text-white/80 font-medium py-2.5 px-8 rounded-lg w-fit scale-95">
                      View Transaction
                    </button>
                    <button className="border border-white/5 text-zinc-700 font-medium py-2.5 px-8 rounded-lg w-fit cursor-not-allowed">
                      View Transaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cards & Layouts - EXACT COPY FROM HTML TEMPLATE */}
          <section className="space-y-6" id="cards-layouts">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">08. CARDS & LAYOUTS</h2>
            </div>

            <div className="space-y-16">
              {/* 1. Navigation Architecture */}
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">1. Navigation Architecture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top Header System */}
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Top Header System</p>
                    <div className="h-16 glass-card rounded-xl flex items-center justify-between px-6 border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 bg-[#2CC295] rounded"></div>
                        <div className="w-24 h-2 bg-zinc-800 rounded"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800"></div>
                        <div className="w-16 h-8 rounded-lg bg-zinc-800"></div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Layout */}
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Sidebar Layout</p>
                    <div className="w-full h-16 glass-card rounded-xl p-3 flex gap-2 border-white/10">
                      <div className="w-1/4 h-full bg-zinc-800/50 rounded"></div>
                      <div className="w-3/4 h-full bg-zinc-800/50 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Card Library */}
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">2. Card Library</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* NFT Card */}
                  <div className="glass-card rounded-2xl overflow-hidden group hover:border-[#2CC295]/30 transition-all">
                    <div className="aspect-square bg-zinc-800 relative">
                      <img 
                        alt="Asset" 
                        className="w-full h-full object-cover opacity-50" 
                        src="https://images.unsplash.com/photo-1713188090500-a4fb0d2cf309?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRpZ2l0YWwlMjBhcnQlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzAxOTg3NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white">#4821</div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-white uppercase">Vibrant Void</h4>
                        <span className="text-[10px] text-zinc-500 font-mono">0.45 ETH</span>
                      </div>
                      <button className="w-full py-2 bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#2CC295] hover:text-black transition-colors">
                        Place Bid
                      </button>
                    </div>
                  </div>

                  {/* Order Status Card */}
                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Order #DE-392</span>
                      <span className="material-symbols-outlined text-zinc-500 text-sm">more_vert</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2CC295]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#2CC295] text-lg">sync</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">In Progress</p>
                          <p className="text-[10px] text-zinc-500">State Machine: Minting</p>
                        </div>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2CC295] w-2/3"></div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Card */}
                  <div className="glass-card rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-[#2CC295]/30 p-1">
                      <img 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover" 
                        src="https://images.unsplash.com/photo-1683815251677-8df20f826622?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHBlcnNvbnxlbnwxfHx8fDE3NzAxNzIzMTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CryptoArtist_Pro</h4>
                      <p className="text-[10px] text-[#2CC295] font-mono mt-1">0x71C...4f2</p>
                    </div>
                    <div className="flex gap-4 pt-2 border-t border-white/5 w-full justify-center">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase">Sales</p>
                        <p className="text-xs font-bold text-white">1.2k</p>
                      </div>
                      <div className="w-px h-8 bg-white/5"></div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase">Rating</p>
                        <p className="text-xs font-bold text-white">4.9/5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Status Badges */}
              <div className="space-y-6 pb-12">
                <h2 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">3. Status Badges</h2>
                <div className="flex flex-wrap gap-4 items-center glass-card p-6 rounded-2xl border-white/10">
                  {/* Success Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.5)]"></div>
                    <span className="text-[10px] font-bold text-[#2CC295] uppercase tracking-wider">Success</span>
                  </div>

                  {/* Pending Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Pending</span>
                  </div>

                  {/* Error Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Error</span>
                  </div>

                  {/* Disabled Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500/10 border border-zinc-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disabled</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Alerts */}
          <section className="space-y-6" id="system-alerts">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
              <h2 className="text-xl font-bold text-white tracking-tight">09. SYSTEM ALERTS</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                  System Alerts
                </h3>
                <p className="text-xs text-zinc-600 mt-2">
                  'Sonner' style toasts for technical feedback.
                </p>
              </div>

              <div className="space-y-4">
                {/* Static Toast Examples */}
                <Toast
                  type="success"
                  title="Transaction Confirmed"
                  message="Wallet 0x71...4f2 successfully swapped 1.5 ETH to USDC."
                  duration={0}
                  onClose={() => {}}
                />

                <Toast
                  type="error"
                  title="Execution Reverted"
                  message="Insufficient gas for the requested transaction. Please check your balance."
                  duration={0}
                  onClose={() => {}}
                />

                <Toast
                  type="warning"
                  title="Slippage Warning"
                  message="High price impact detected. Transaction may be frontrun."
                  duration={0}
                  onClose={() => {}}
                />

                {/* Action Buttons */}
                <div className="mt-8 flex gap-3 flex-wrap">
                  <button
                    onClick={() => addToast('success', 'Transaction Confirmed', 'Your transaction was successful!')}
                    className="px-4 py-2 bg-[#2CC295] text-black font-bold rounded-lg hover:bg-[#2CC295]/90 transition-all text-sm"
                  >
                    Show Success
                  </button>
                  <button
                    onClick={() => addToast('error', 'Transaction Failed', 'Your transaction was reverted.')}
                    className="px-4 py-2 bg-[#ef4444] text-white font-bold rounded-lg hover:bg-[#ef4444]/90 transition-all text-sm"
                  >
                    Show Error
                  </button>
                  <button
                    onClick={() => addToast('warning', 'Warning', 'High slippage detected.')}
                    className="px-4 py-2 bg-[#f59e0b] text-black font-bold rounded-lg hover:bg-[#f59e0b]/90 transition-all text-sm"
                  >
                    Show Warning
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="border-t border-[#27272a] pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#2CC295] rounded flex items-center justify-center">
                  <Code size={14} className="text-black font-bold" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Dev Team Only</span>
              </div>
              <div className="flex gap-8">
                <a className="text-xs text-zinc-500 hover:text-white transition-colors uppercase font-bold tracking-widest" href="#">Changelog</a>
                <a className="text-xs text-zinc-500 hover:text-white transition-colors uppercase font-bold tracking-widest" href="#">Components</a>
                <a className="text-xs text-zinc-500 hover:text-white transition-colors uppercase font-bold tracking-widest" href="#">Assets</a>
              </div>
              <div className="text-[10px] text-zinc-600 font-mono">
                © 2024 ORINA DESIGN SYSTEM
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast Container for dynamic toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      )}
    </div>
  );
}