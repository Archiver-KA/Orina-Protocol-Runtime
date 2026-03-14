import { useState } from "react";
import { PageTitle, PageSubtitle, Paragraph, Divider, SectionTitle } from "../components/DocComponents";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: "General",
    items: [
      {
        question: "What is Orina Protocol?",
        answer: (
          <>
            Orina Protocol is a formally verified infrastructure for trading real-world assets (RWAs) on blockchain. Unlike traditional marketplaces that rely on trust or economic incentives, Orina uses the <strong className="text-foreground">Atomic Transaction Protocol (ATP)</strong> to guarantee safe, strategy-proof settlement regardless of participant behavior.
          </>
        ),
      },
      {
        question: "How is Orina different from other NFT marketplaces?",
        answer: (
          <>
            Orina is designed specifically for physical, real-world assets with atomic escrow guarantees. Key differences:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Formal Verification:</strong> ATP is proven correct through LTL, CTL, ATL, and EVM bytecode analysis</li>
              <li><strong>Strategy-Proof Design:</strong> Protocol dominates all adversarial buyer/seller strategies</li>
              <li><strong>Delivery Integration:</strong> Geo-hierarchical address system with location snapshotting</li>
              <li><strong>Configurable Attributes:</strong> Offchain buyer selections for RWA-specific requirements</li>
              <li><strong>Dispute Resolution:</strong> Protocol-enforced arbitration with cryptographic evidence</li>
            </ul>
          </>
        ),
      },
      {
        question: "Which blockchains does Orina support?",
        answer: (
          <>
            Orina currently supports:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Ethereum (mainnet)</li>
              <li>Polygon</li>
              <li>Binance Smart Chain (BSC)</li>
              <li>Arbitrum</li>
            </ul>
            Additional EVM-compatible chains can be integrated based on community governance.
          </>
        ),
      },
      {
        question: "Is Orina open source?",
        answer: (
          <>
            The Orina smart contracts are verified on blockchain explorers and undergo public audits. The frontend codebase licensing is determined by project governance. All formal verification artifacts (LTL, CTL, NuSMV models, ATL specifications) are published in the whitepaper.
          </>
        ),
      },
    ],
  },
  {
    title: "Buying",
    items: [
      {
        question: "Do I need a wallet to browse assets?",
        answer: (
          <>
            No. Guest users can browse marketplace assets, search, view profiles, and read asset details. However, purchasing assets, adding to favorites, and performing write actions require a connected Web3 wallet.
          </>
        ),
      },
      {
        question: "How do I know an asset is authentic?",
        answer: (
          <>
            Verify seller authenticity through:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Reputation Score:</strong> Derived from completed orders and delivery performance</li>
              <li><strong>Verified Seller Badge:</strong> Awarded after meeting platform criteria</li>
              <li><strong>Transaction History:</strong> Public record of past sales and dispute rate</li>
              <li><strong>Trust Metrics:</strong> Average delivery time, completion rate, buyer reviews</li>
            </ul>
            Orina does not guarantee asset authenticity — buyers should perform due diligence.
          </>
        ),
      },
      {
        question: "What happens if I don't receive my asset?",
        answer: (
          <>
            ATP provides time-bound delivery guarantees. If the seller fails to deliver within the specified window:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>Open a dispute from the order details page</li>
              <li>Provide evidence (communication logs, tracking info)</li>
              <li>Protocol arbiter reviews the case</li>
              <li>Escrow funds are returned if seller is found at fault</li>
            </ol>
            Your funds remain locked in escrow until delivery is confirmed or dispute is resolved.
          </>
        ),
      },
      {
        question: "Can I cancel an order after purchase?",
        answer: (
          <>
            Order cancellation depends on the current state:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>PENDING_SELLER_ACCEPT:</strong> Cancellation possible if seller hasn't accepted yet (protocol timeout enforced)</li>
              <li><strong>PENDING_SHIPMENT or IN_TRANSIT:</strong> Cannot cancel unilaterally — must negotiate with seller or wait for delivery timeout to dispute</li>
              <li><strong>COMPLETED:</strong> Order finalized, no cancellation possible</li>
            </ul>
          </>
        ),
      },
      {
        question: "What are configurable buyer attributes?",
        answer: (
          <>
            Configurable attributes let sellers define offchain options beyond the onchain <code className="text-primary">Unit ID</code>. Examples:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Purity:</strong> Metal grade (99.9%, 99.95%, 99.99%)</li>
              <li><strong>Packaging:</strong> Bulk, Palletized, Individual Units</li>
              <li><strong>Warehouse:</strong> Preferred pickup/ship location</li>
              <li><strong>Finish:</strong> Surface treatment for manufactured goods</li>
            </ul>
            Required attributes must be selected before purchase. Your selections are snapshotted in the order record.
          </>
        ),
      },
    ],
  },
  {
    title: "Selling",
    items: [
      {
        question: "How do I become a seller?",
        answer: (
          <>
            Any wallet holder can become a seller:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>Connect your Web3 wallet</li>
              <li>Set up your profile in <strong>Settings</strong> (display name, avatar, story)</li>
              <li>Configure default delivery address</li>
              <li>Go to <strong>Minting</strong> page and create your first RWA asset</li>
            </ol>
            No approval process required. Reputation builds organically through completed transactions.
          </>
        ),
      },
      {
        question: "What fees does Orina charge?",
        answer: (
          <>
            Fee structure:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Platform Fee:</strong> Percentage deducted from escrow settlement (governance-configurable, typically 2-5%)</li>
              <li><strong>Network Gas Fees:</strong> Standard blockchain transaction costs (paid by transaction signer)</li>
              <li><strong>Listing Fee:</strong> Currently none (may be introduced for priority listings via governance)</li>
            </ul>
            Example: Buyer pays 10 ETH, platform fee is 2% (0.2 ETH), seller receives 9.8 ETH.
          </>
        ),
      },
      {
        question: "Can I edit an asset after minting?",
        answer: (
          <>
            Once minted, <strong>asset snapshots are immutable</strong>. You cannot edit:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Asset location snapshot</li>
              <li>Onchain Unit ID</li>
              <li>Blockchain network</li>
            </ul>
            You <em>can</em> update:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Available quantity (through sales)</li>
              <li>Price (if not locked in escrow)</li>
              <li>Configurable attribute options (but existing orders retain original snapshots)</li>
            </ul>
            To correct major errors, you may need to delist and re-mint the asset.
          </>
        ),
      },
      {
        question: "How do I handle international shipping?",
        answer: (
          <>
            Orina's delivery address system supports global geo-hierarchical data:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Specify delivery duration considering international transit times</li>
              <li>Use configurable attributes to offer warehouse location choices</li>
              <li>Provide tracking information via direct messages</li>
              <li>Document customs clearance for dispute protection</li>
            </ul>
            Note: Orina does not handle customs duties or import taxes — these are buyer/seller responsibility per local laws.
          </>
        ),
      },
      {
        question: "What if a buyer opens a false dispute?",
        answer: (
          <>
            Provide counter-evidence in the dispute resolution modal:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Shipping receipts with tracking numbers</li>
              <li>Photos/video of packaging and asset condition</li>
              <li>Communication logs showing buyer acknowledgment</li>
              <li>Delivery confirmation signatures (if available)</li>
            </ul>
            The protocol arbiter reviews both sides. ATP dispute resolution is strategy-proof — malicious disputes do not provide advantage. Sellers with strong evidence typically prevail.
          </>
        ),
      },
    ],
  },
  {
    title: "Technical",
    items: [
      {
        question: "How does the Atomic Transaction Protocol (ATP) work?",
        answer: (
          <>
            ATP is a state machine with formally verified safety and liveness properties:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li><strong>Escrow Lock:</strong> Buyer funds locked in smart contract</li>
              <li><strong>Seller Accept:</strong> Seller confirms delivery duration (bounded timeout)</li>
              <li><strong>Shipment Confirm:</strong> Seller initiates delivery (countdown starts)</li>
              <li><strong>Buyer Confirm:</strong> Buyer verifies receipt (releases escrow)</li>
              <li><strong>Dispute Resolution:</strong> Arbiter decides fund distribution if issues arise</li>
            </ol>
            Each state transition has protocol-enforced timeouts. See <a href="/atp-protocol" className="text-primary hover:underline">ATP Protocol</a> for full specification.
          </>
        ),
      },
      {
        question: "Where is my data stored?",
        answer: (
          <>
            Orina uses a hybrid persistence model:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Blockchain:</strong> Asset ownership, order states, escrow funds, receipt NFTs (canonical source of truth)</li>
              <li><strong>localStorage (wallet-scoped):</strong> User profile, theme, favorites, watchlist, notifications, community posts, runtime minted assets</li>
              <li><strong>Supabase (optional sync):</strong> Delivery addresses, profile data, community feed, geo reference data</li>
            </ul>
            Critical transaction data lives onchain. Local state provides fast UX with optional remote backup.
          </>
        ),
      },
      {
        question: "Can I use Orina without Supabase?",
        answer: (
          <>
            Yes. Supabase is <strong>optional</strong>. All core features work local-first:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Asset minting and trading (blockchain-backed)</li>
              <li>Profile management (localStorage)</li>
              <li>Favorites and watchlist (localStorage)</li>
              <li>Notifications (localStorage with desktop notification API)</li>
            </ul>
            Supabase enables:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Multi-device profile sync</li>
              <li>Direct messaging backend (Edge Functions)</li>
              <li>Expanded geo reference data (global countries/localities)</li>
            </ul>
          </>
        ),
      },
      {
        question: "How are asset locations determined?",
        answer: (
          <>
            Asset location uses a <strong>snapshot model</strong>:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>Seller configures delivery address in Settings (country → region → locality hierarchy)</li>
              <li>At mint time, delivery address is snapshotted into <code className="text-primary">assetLocationSnapshot</code></li>
              <li>Coordinates come from <code className="text-primary">GeoPlace.lat/lng</code> (Supabase geo_places table or local seed)</li>
              <li>Marketplace map renders markers using <code className="text-primary">assetLocationSnapshot.coordinates</code></li>
            </ol>
            Random coordinates are <strong>never</strong> used. If an asset lacks valid geo data, it won't appear on the map.
          </>
        ),
      },
      {
        question: "What formal verification methods does Orina use?",
        answer: (
          <>
            ATP is verified across multiple layers:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Linear Temporal Logic (LTL):</strong> Safety and liveness invariants</li>
              <li><strong>Computation Tree Logic (CTL):</strong> State-tree reachability properties</li>
              <li><strong>NuSMV / TLA+:</strong> Model checking with executable specifications</li>
              <li><strong>Alternating-time Temporal Logic (ATL):</strong> Strategic adversarial analysis proving protocol dominance</li>
              <li><strong>EVM Bytecode Verification:</strong> Consistency between Solidity semantics and deployed contracts</li>
            </ul>
            See <a href="/invariants" className="text-primary hover:underline">Formal Verification</a> section for detailed specifications.
          </>
        ),
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        question: "My wallet won't connect",
        answer: (
          <>
            Common solutions:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Ensure MetaMask or Web3 wallet extension is installed and unlocked</li>
              <li>Check that you're on a supported network (Ethereum, Polygon, BSC, Arbitrum)</li>
              <li>Try refreshing the page and reconnecting</li>
              <li>Clear browser cache and cookies if persistent issues</li>
              <li>Use WalletConnect for mobile wallets</li>
            </ul>
          </>
        ),
      },
      {
        question: "I can't see my minted assets",
        answer: (
          <>
            Check the following:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Verify you're connected with the <strong>same wallet</strong> used for minting</li>
              <li>Go to <strong>My Assets → RWA Minted</strong> tab</li>
              <li>Check localStorage key <code className="text-primary">orina_runtime_minted_assets_v1</code> (browser DevTools)</li>
              <li>Minted assets are wallet-scoped — switching wallets will show different inventory</li>
              <li>If using different device, assets are local-only unless Supabase sync is enabled</li>
            </ul>
          </>
        ),
      },
      {
        question: "Favorites/Watchlist not syncing across devices",
        answer: (
          <>
            Favorites and watchlist are <strong>local-first</strong> by default:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Stored in wallet-scoped localStorage keys</li>
              <li>Optional Supabase sync must be explicitly enabled</li>
              <li>If Supabase is enabled, check REST endpoint connectivity in browser network tab</li>
              <li>Favorites sync via <code className="text-primary">orina_favorites_&lt;address&gt;</code> key</li>
            </ul>
            For multi-device consistency, enable Supabase sync in Settings.
          </>
        ),
      },
      {
        question: "Theme doesn't persist after refresh",
        answer: (
          <>
            Theme preference is wallet-scoped. Check:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>You're connected with the same wallet</li>
              <li>localStorage key <code className="text-primary">orina_user_settings_&lt;address&gt;</code> exists</li>
              <li>Theme toggle in sidebar footer is triggering correctly</li>
              <li>Browser isn't blocking localStorage (privacy mode can interfere)</li>
            </ul>
            Theme writes back to wallet-scoped settings on every toggle to prevent silent reverts.
          </>
        ),
      },
      {
        question: "Gas fees are too high",
        answer: (
          <>
            Strategies to reduce gas costs:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Use Layer 2 networks (Polygon, Arbitrum) instead of Ethereum mainnet</li>
              <li>Wait for low network congestion periods (check <a href="https://etherscan.io/gastracker" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">gas tracker</a>)</li>
              <li>Batch multiple operations when possible</li>
              <li>Consider asset pricing that justifies gas overhead</li>
            </ul>
            Orina contract architecture is gas-optimized, but base network costs apply.
          </>
        ),
      },
    ],
  },
];

function FAQAccordion({ section }: { section: FAQSection }) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">{section.title}</h3>
      {section.items.map((item, index) => (
        <div
          key={index}
          className="border border-border rounded-lg overflow-hidden bg-card"
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full flex items-start justify-between p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="font-medium text-foreground pr-4">{item.question}</span>
            {expandedItems[index] ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
          </button>
          {expandedItems[index] && (
            <div className="px-4 pb-4 text-muted-foreground">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FAQPage() {
  return (
    <div>
      <PageTitle>Frequently Asked Questions</PageTitle>
      <PageSubtitle>
        Common questions about using Orina Protocol, buying and selling RWAs, and understanding the Atomic Transaction Protocol.
      </PageSubtitle>

      <Paragraph>
        Can't find your answer? Visit the <a href="/getting-started" className="text-primary hover:underline">Getting Started</a> guide or engage with the community in the <strong>Community</strong> page.
      </Paragraph>

      <Divider />

      <div className="space-y-8">
        {faqSections.map((section, index) => (
          <div key={index}>
            <FAQAccordion section={section} />
          </div>
        ))}
      </div>

      <Divider />

      <SectionTitle>Still Have Questions?</SectionTitle>
      <Paragraph>
        For technical documentation, see <a href="/app-architecture" className="text-primary hover:underline">App Architecture</a>.
        <br />
        For protocol specification, see <a href="/atp-protocol" className="text-primary hover:underline">ATP Protocol</a>.
        <br />
        For smart contract details, see <a href="/smart-contract" className="text-primary hover:underline">Smart Contract Architecture</a>.
      </Paragraph>
    </div>
  );
}
