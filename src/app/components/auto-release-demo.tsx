import { AutoReleaseIndicator } from '@/app/components/auto-release-indicator';

export function AutoReleaseDemo() {
  const currentTime = Math.floor(Date.now() / 1000);

  // Test scenarios
  const scenarios = [
    {
      title: 'Critical Warning - 30 minutes left',
      autoReleaseAt: BigInt(currentTime + 1800), // 30 minutes
      state: 1,
      finalized: false,
    },
    {
      title: 'Warning - 3 hours left',
      autoReleaseAt: BigInt(currentTime + 10800), // 3 hours
      state: 1,
      finalized: false,
    },
    {
      title: 'Info - 12 hours left',
      autoReleaseAt: BigInt(currentTime + 43200), // 12 hours
      state: 1,
      finalized: false,
    },
    {
      title: 'None - 5 days left',
      autoReleaseAt: BigInt(currentTime + 432000), // 5 days
      state: 1,
      finalized: false,
    },
    {
      title: 'Expired - Past deadline',
      autoReleaseAt: BigInt(currentTime - 3600), // 1 hour ago
      state: 1,
      finalized: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#121212] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Auto-Release Indicator - Demo Page
          </h1>
          <p className="text-zinc-400">
            Testing different warning levels and variants for auto-release deadlines
          </p>
        </div>

        {/* Card Variant */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Card Variant</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scenarios.map((scenario, index) => (
              <div key={index}>
                <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                  {scenario.title}
                </h3>
                <AutoReleaseIndicator
                  autoReleaseAt={scenario.autoReleaseAt}
                  state={scenario.state}
                  finalized={scenario.finalized}
                  variant="card"
                  showTooltip={true}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Banner Variant */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Banner Variant</h2>
          <div className="space-y-4">
            {scenarios.map((scenario, index) => (
              <div 
                key={index}
                className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-white">
                    {scenario.title}
                  </h3>
                </div>
                <AutoReleaseIndicator
                  autoReleaseAt={scenario.autoReleaseAt}
                  state={scenario.state}
                  finalized={scenario.finalized}
                  variant="banner"
                  showTooltip={true}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Compact Variant */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Compact Variant</h2>
          <div className="flex flex-wrap gap-4">
            {scenarios.map((scenario, index) => (
              <div key={index} className="flex flex-col gap-2">
                <span className="text-xs text-zinc-500">{scenario.title}</span>
                <AutoReleaseIndicator
                  autoReleaseAt={scenario.autoReleaseAt}
                  state={scenario.state}
                  finalized={scenario.finalized}
                  variant="compact"
                  showTooltip={false}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Documentation */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Warning Levels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-red-400 font-bold mb-2">🚨 Critical</h3>
              <ul className="text-zinc-400 space-y-1 text-xs">
                <li>• Less than 1 hour remaining</li>
                <li>• Pulsing animation</li>
                <li>• Urgent action required</li>
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-amber-400 font-bold mb-2">⚠️ Warning</h3>
              <ul className="text-zinc-400 space-y-1 text-xs">
                <li>• Less than 6 hours remaining</li>
                <li>• Seller should prepare</li>
                <li>• Action recommended soon</li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-2">ℹ️ Info</h3>
              <ul className="text-zinc-400 space-y-1 text-xs">
                <li>• Less than 24 hours remaining</li>
                <li>• Informational only</li>
                <li>• Plan ahead</li>
              </ul>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-zinc-400 font-bold mb-2">✓ None</h3>
              <ul className="text-zinc-400 space-y-1 text-xs">
                <li>• More than 24 hours remaining</li>
                <li>• No warning needed</li>
                <li>• Plenty of time</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
