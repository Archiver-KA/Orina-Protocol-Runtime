export function TypographySection() {
  return (
    <section className="space-y-6" id="typography-system">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-[#2CC295] rounded-full"></div>
        <h2 className="text-xl font-bold text-white tracking-tight">02. TYPOGRAPHY SYSTEM</h2>
      </div>

      <div className="space-y-12">
        {/* Font Family */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">Font Family</h3>
          <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Primary Font</p>
                <p className="text-4xl text-white font-sans">Inter</p>
                <p className="text-sm text-zinc-400 mt-2">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p className="text-sm text-zinc-400">abcdefghijklmnopqrstuvwxyz</p>
                <p className="text-sm text-zinc-400 font-mono">0123456789 !@#$%^&*()</p>
              </div>
            </div>
          </div>
        </div>

        {/* Heading Scales */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">Heading Scale</h3>
          <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8 space-y-8">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-6xl font-bold text-white tracking-tight">Heading 1</span>
                <span className="text-xs text-zinc-500 font-mono">60px / Bold / -0.02em</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-5xl font-bold text-white tracking-tight">Heading 2</span>
                <span className="text-xs text-zinc-500 font-mono">48px / Bold / -0.01em</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-4xl font-bold text-white tracking-tight">Heading 3</span>
                <span className="text-xs text-zinc-500 font-mono">36px / Bold / -0.01em</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-3xl font-bold text-white tracking-tight">Heading 4</span>
                <span className="text-xs text-zinc-500 font-mono">30px / Bold / Normal</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-2xl font-bold text-white">Heading 5</span>
                <span className="text-xs text-zinc-500 font-mono">24px / Bold / Normal</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                <span className="text-xl font-bold text-white">Heading 6</span>
                <span className="text-xs text-zinc-500 font-mono">20px / Bold / Normal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Text & Labels */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">Body & Labels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Body Large</p>
                <p className="text-lg text-white leading-relaxed">
                  The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain technology.
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">18px / Regular / 1.6</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Body Medium</p>
                <p className="text-base text-white leading-relaxed">
                  The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain technology.
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">16px / Regular / 1.5</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Body Small</p>
                <p className="text-sm text-white leading-relaxed">
                  The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain technology.
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">14px / Regular / 1.5</p>
              </div>
            </div>

            <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Label</p>
                <p className="text-xs text-white font-medium">
                  COLLECTION NAME
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">12px / Medium / Normal</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Caption</p>
                <p className="text-[11px] text-zinc-400">
                  Transaction hash: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">11px / Regular / 1.4</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Tiny</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  METADATA • STATUS • VERIFIED
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">10px / Bold / 0.2em</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Mono</p>
                <p className="text-xs text-[#2CC295] font-mono">
                  0x71C7...976F
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">12px / Mono / Normal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Font Weights */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">Font Weights</h3>
          <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                <span className="text-2xl text-white font-light">Light 300</span>
                <span className="text-xs text-zinc-500 font-mono">font-light</span>
              </div>
              
              <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                <span className="text-2xl text-white font-normal">Regular 400</span>
                <span className="text-xs text-zinc-500 font-mono">font-normal</span>
              </div>

              <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                <span className="text-2xl text-white font-medium">Medium 500</span>
                <span className="text-xs text-zinc-500 font-mono">font-medium</span>
              </div>

              <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                <span className="text-2xl text-white font-semibold">Semibold 600</span>
                <span className="text-xs text-zinc-500 font-mono">font-semibold</span>
              </div>

              <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                <span className="text-2xl text-white font-bold">Bold 700</span>
                <span className="text-xs text-zinc-500 font-mono">font-bold</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Styles */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#2CC295] uppercase tracking-[0.2em]">Text Styles & Cases</h3>
          <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Uppercase + Tracking</p>
                  <p className="text-[10px] text-white uppercase tracking-[0.2em] font-bold">
                    SECTION HEADER
                  </p>
                  <code className="text-[10px] text-zinc-500">uppercase tracking-[0.2em]</code>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Mono Address</p>
                  <p className="text-xs text-[#2CC295] font-mono">
                    0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                  </p>
                  <code className="text-[10px] text-zinc-500">font-mono text-[#2CC295]</code>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Tight Tracking</p>
                  <p className="text-3xl text-white font-bold tracking-tight">
                    Orina
                  </p>
                  <code className="text-[10px] text-zinc-500">tracking-tight</code>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Line Height Relaxed</p>
                  <p className="text-sm text-white leading-relaxed">
                    The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain.
                  </p>
                  <code className="text-[10px] text-zinc-500">leading-relaxed (1.625)</code>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Line Height Normal</p>
                  <p className="text-sm text-white leading-normal">
                    The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain.
                  </p>
                  <code className="text-[10px] text-zinc-500">leading-normal (1.5)</code>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Line Height Tight</p>
                  <p className="text-sm text-white leading-tight">
                    The quick brown fox jumps over the lazy dog. Web3 marketplace powered by blockchain.
                  </p>
                  <code className="text-[10px] text-zinc-500">leading-tight (1.25)</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}