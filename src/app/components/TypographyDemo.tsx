/**
 * Typography Demo Component
 * Demonstrates the usage of all typography utility classes from the Style Guide
 */

export function TypographyDemo() {
  return (
    <div className="min-h-screen bg-[#121212] p-12 space-y-16">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="text-section-header text-[#2CC295] mb-4">Typography System Demo</div>
        <h1 className="text-h1 text-white mb-4">Custom Typography Classes</h1>
        <p className="text-body-lg text-zinc-400">
          All typography utilities from the Style Guide implemented and ready to use.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-16">
        {/* Headings */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Headings (text-h1 through text-h6)</div>
          <div className="space-y-6 bg-[#141417] border border-[#27272a] rounded-2xl p-8">
            <div className="space-y-2">
              <h1 className="text-h1 text-white">Heading 1 - 60px Bold</h1>
              <code className="text-caption text-[#2CC295]">.text-h1</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h2 className="text-h2 text-white">Heading 2 - 48px Bold</h2>
              <code className="text-caption text-[#2CC295]">.text-h2</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h3 className="text-h3 text-white">Heading 3 - 36px Bold</h3>
              <code className="text-caption text-[#2CC295]">.text-h3</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h4 className="text-h4 text-white">Heading 4 - 30px Bold</h4>
              <code className="text-caption text-[#2CC295]">.text-h4</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h5 className="text-h5 text-white">Heading 5 - 24px Bold</h5>
              <code className="text-caption text-[#2CC295]">.text-h5</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h6 className="text-h6 text-white">Heading 6 - 20px Bold</h6>
              <code className="text-caption text-[#2CC295]">.text-h6</code>
            </div>
          </div>
        </section>

        {/* Body Text */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Body Text (text-body-lg, md, sm)</div>
          <div className="space-y-6 bg-[#141417] border border-[#27272a] rounded-2xl p-8">
            <div className="space-y-2">
              <p className="text-body-lg text-white">
                Body Large (18px) - The quick brown fox jumps over the lazy dog. This is ideal for important paragraphs and introductory text that needs more emphasis.
              </p>
              <code className="text-caption text-[#2CC295]">.text-body-lg</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <p className="text-body-md text-white">
                Body Medium (16px) - The quick brown fox jumps over the lazy dog. This is the default body text size for most content throughout the application.
              </p>
              <code className="text-caption text-[#2CC295]">.text-body-md</code>
            </div>
            
            <div className="space-y-2 pt-6 border-t border-white/5">
              <p className="text-body-sm text-white">
                Body Small (14px) - The quick brown fox jumps over the lazy dog. This is perfect for secondary information, descriptions, and less emphasized content.
              </p>
              <code className="text-caption text-[#2CC295]">.text-body-sm</code>
            </div>
          </div>
        </section>

        {/* Labels & Micro */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Labels & Micro Text</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 bg-[#141417] border border-[#27272a] rounded-2xl p-8">
              <div className="space-y-2">
                <div className="text-label text-white">Label (12px Medium)</div>
                <code className="text-caption text-[#2CC295]">.text-label</code>
                <p className="text-caption text-zinc-400">Use for form labels, small titles</p>
              </div>
              
              <div className="space-y-2 pt-6 border-t border-white/5">
                <div className="text-caption text-white">Caption (11px Regular)</div>
                <code className="text-caption text-[#2CC295]">.text-caption</code>
                <p className="text-caption text-zinc-400">Use for timestamps, metadata</p>
              </div>
              
              <div className="space-y-2 pt-6 border-t border-white/5">
                <div className="text-tiny text-white">Tiny (10px Bold Uppercase)</div>
                <code className="text-caption text-[#2CC295]">.text-tiny</code>
                <p className="text-caption text-zinc-400">Use for status badges</p>
              </div>
            </div>

            <div className="space-y-6 bg-[#141417] border border-[#27272a] rounded-2xl p-8">
              <div className="space-y-2">
                <div className="text-section-header text-white">Section Header</div>
                <code className="text-caption text-[#2CC295]">.text-section-header</code>
                <p className="text-caption text-zinc-400">10px bold uppercase with 0.2em tracking</p>
              </div>
              
              <div className="space-y-2 pt-6 border-t border-white/5">
                <div className="text-label font-mono text-[#2CC295]">Mono Address</div>
                <code className="text-caption text-[#2CC295]">.text-label font-mono</code>
                <p className="text-caption text-zinc-400">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</p>
              </div>
            </div>
          </div>
        </section>

        {/* Practical Examples */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Practical Examples</div>
          
          {/* Card Example */}
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="text-section-header text-[#2CC295]">Market Overview</div>
              <h3 className="text-h3 text-white">Asset Portfolio</h3>
              <p className="text-body-md text-zinc-300">
                Your portfolio contains 24 verified real-world assets across 8 different categories. 
                Total estimated value of $2.4M with 12% growth this month.
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-label text-zinc-500 mb-1">Total Assets</div>
                  <div className="text-h5 text-white">24</div>
                </div>
                <div>
                  <div className="text-label text-zinc-500 mb-1">Categories</div>
                  <div className="text-h5 text-white">8</div>
                </div>
                <div>
                  <div className="text-label text-zinc-500 mb-1">Growth</div>
                  <div className="text-h5 text-[#2CC295]">+12%</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
                  <span className="text-tiny text-[#2CC295]">Active</span>
                </div>
                <span className="text-caption text-zinc-500">Last updated 2 hours ago</span>
              </div>
            </div>
          </div>

          {/* Form Example */}
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <h4 className="text-h4 text-white">Create New Asset</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-label text-zinc-400">Asset Name</label>
                <input 
                  type="text" 
                  placeholder="Enter asset name..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-body-md text-white focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295] outline-none"
                />
                <p className="text-caption text-zinc-500">This will be displayed publicly</p>
              </div>

              <div className="space-y-2">
                <label className="text-label text-zinc-400">Description</label>
                <textarea 
                  placeholder="Describe your asset..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-body-sm text-white focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295] outline-none resize-none"
                />
              </div>

              <button className="w-full bg-[#2CC295] text-black font-bold py-3 rounded-lg text-body-md hover:brightness-110 transition-all">
                Create Asset
              </button>
            </div>
          </div>

          {/* Table Example */}
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900/50 border-b border-[#27272a]">
                <tr>
                  <th className="text-label text-zinc-500 uppercase text-left px-6 py-4">Asset</th>
                  <th className="text-label text-zinc-500 uppercase text-left px-6 py-4">Type</th>
                  <th className="text-label text-zinc-500 uppercase text-right px-6 py-4">Value</th>
                  <th className="text-label text-zinc-500 uppercase text-right px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Luxury Villa #4821', type: 'Real Estate', value: '$450K', status: 'Active' },
                  { name: 'Vintage Ferrari', type: 'Vehicle', value: '$320K', status: 'Pending' },
                  { name: 'Art Collection', type: 'Collectible', value: '$180K', status: 'Active' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#27272a] hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-body-sm text-white font-medium">{row.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-body-sm text-zinc-400">{row.type}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-body-sm text-white font-mono">{row.value}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-full">
                          <span className="text-tiny text-[#2CC295]">{row.status}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Color Combinations */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Color Combinations</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 space-y-3">
              <h5 className="text-h6 text-white">Primary Heading</h5>
              <p className="text-body-md text-zinc-300">Body text in zinc-300</p>
              <p className="text-body-sm text-zinc-400">Secondary text in zinc-400</p>
              <p className="text-caption text-zinc-500">Metadata in zinc-500</p>
            </div>

            <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 space-y-3">
              <h5 className="text-h6 text-[#2CC295]">Teal Accent Heading</h5>
              <p className="text-body-md text-white">White body text</p>
              <p className="text-label font-mono text-[#2CC295]">0x71C7...976F</p>
              <div className="text-tiny text-[#2CC295]">Status Badge</div>
            </div>
          </div>
        </section>

        {/* Glass Badges & Tags */}
        <section className="space-y-6">
          <div className="text-section-header text-zinc-500">Glass Badges & Tags (Glassmorphism Design)</div>
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-8 space-y-8">
            
            {/* Type Badges */}
            <div>
              <h6 className="text-h6 text-white mb-4">Asset Type Badges</h6>
              <div className="flex flex-wrap gap-3">
                {/* RWA Badge */}
                <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  RWA MINTED
                </div>

                {/* Receipt Badge */}
                <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-purple-300 border border-purple-400/30 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                  RECEIPT NFT
                </div>

                {/* Digital NFT Badge */}
                <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-300 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="7"/>
                    <path d="M15 15l6 6"/>
                  </svg>
                  DIGITAL NFT
                </div>
              </div>
              <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
                <code className="text-caption text-zinc-400">
                  bg-black/40 backdrop-blur-md rounded-full border border-[color]/30
                </code>
              </div>
            </div>

            {/* Status Badges */}
            <div className="pt-4 border-t border-white/5">
              <h6 className="text-h6 text-white mb-4">Status Badges</h6>
              <div className="flex flex-wrap gap-3">
                {/* Active */}
                <div className="px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/40 text-green-300 border border-green-400/30">
                  ACTIVE
                </div>

                {/* Sold Out */}
                <div className="px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-700/40 text-zinc-300 border border-zinc-500/30">
                  SOLD OUT
                </div>

                {/* Pending */}
                <div className="px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-yellow-500/40 text-yellow-300 border border-yellow-400/30">
                  PENDING
                </div>

                {/* Finalized */}
                <div className="px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-500/40 text-blue-300 border border-blue-400/30">
                  FINALIZED
                </div>
              </div>
              <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
                <code className="text-caption text-zinc-400">
                  backdrop-blur-md rounded-full bg-[color]/40 text-[color]-300 border border-[color]/30
                </code>
              </div>
            </div>

            {/* Info Banners */}
            <div className="pt-4 border-t border-white/5">
              <h6 className="text-h6 text-white mb-4">Info Banners (Bottom Overlays)</h6>
              <div className="space-y-3">
                {/* Non-transferable */}
                <div className="bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-orange-500/20 inline-flex">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                  <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">Non-Transferable</span>
                </div>

                {/* Transferable */}
                <div className="bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-[#2CC295]/20 inline-flex">
                  <div className="w-1.5 h-1.5 bg-[#2CC295] rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-[#2CC295] uppercase tracking-wider">Transferable</span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
                <code className="text-caption text-zinc-400">
                  bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 border border-[color]/20
                </code>
              </div>
              <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300 font-bold mb-1">💡 Business Logic:</p>
                <ul className="text-xs text-blue-200 space-y-1 ml-4 list-disc">
                  <li><strong>Receipt NFTs</strong> → Non-Transferable (final product after finalize)</li>
                  <li><strong>Digital NFTs</strong> → Transferable (can be transferred normally)</li>
                  <li><strong>RWA Minted</strong> → No badge (listing on marketplace for sale)</li>
                </ul>
              </div>
            </div>

            {/* Glass Buttons */}
            <div className="pt-4 border-t border-white/5">
              <h6 className="text-h6 text-white mb-4">Glass Icon Buttons</h6>
              <div className="flex flex-wrap gap-3">
                {/* Heart Button */}
                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-400 hover:text-[#2CC295] transition-colors border border-white/10">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>

                {/* Share Button */}
                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-400 hover:text-[#2CC295] transition-colors border border-white/10">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                </button>

                {/* More Button */}
                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-400 hover:text-[#2CC295] transition-colors border border-white/10">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>
              <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
                <code className="text-caption text-zinc-400">
                  w-9 h-9 bg-black/40 backdrop-blur-md rounded-full border border-white/10
                </code>
              </div>
            </div>

            {/* Usage Example */}
            <div className="pt-4 border-t border-white/5">
              <h6 className="text-h6 text-white mb-4">Complete Card Example</h6>
              <div className="inline-block bg-zinc-900 rounded-2xl overflow-hidden max-w-sm">
                <div className="aspect-square w-72 bg-zinc-800 relative">
                  <img 
                    src="https://source.unsplash.com/600x600/?luxury,property,real-estate" 
                    alt="Demo Asset"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider">
                    RWA
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/40 text-green-300 border border-green-400/30">
                    ACTIVE
                  </div>
                  
                  {/* Info Banner */}
                  <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-orange-500/20">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">Non-Transferable</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-caption text-[#2CC295] uppercase tracking-widest font-bold">REAL ESTATE</p>
                  <h5 className="text-body-md text-white font-bold mt-1">Luxury Apartment #442</h5>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}