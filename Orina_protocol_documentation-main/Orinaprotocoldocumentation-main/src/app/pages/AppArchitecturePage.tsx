import { PageTitle, PageSubtitle, Paragraph, BulletList, InfoBox, Divider, SectionTitle, SubSectionTitle, CodeBlock } from "../components/DocComponents";

export function AppArchitecturePage() {
  return (
    <div>
      <PageTitle>App Architecture</PageTitle>
      <PageSubtitle>
        Technical overview of Orina's frontend architecture, persistent local state, and Atomic Transaction Protocol (ATP) integration.
      </PageSubtitle>

      <Paragraph>
        Orina is built as a single-page React application oriented around Web3 wallet session management. It features a decentralized, local-first architecture that strictly interacts with the blockchain for state changes and avoids centralized databases where possible.
      </Paragraph>

      <Divider />

      <SectionTitle>1. Core Application Model</SectionTitle>
      
      <Paragraph>
        The app is driven by a <strong>single React shell managed by page state</strong>, optimizing for fast navigation without hard page reloads.
      </Paragraph>

      <SubSectionTitle>Provider Stack</SubSectionTitle>
      <Paragraph>
        The top-level application in <code className="text-primary">src/app/App.tsx</code> is wrapped in several core providers:
      </Paragraph>
      <BulletList items={[
        <><code className="text-primary">Web3Provider</code>: Wagmi/viem configuration for wallet connectivity.</>,
        <><code className="text-primary">NotificationProvider</code>: In-app toast and desktop notification manager.</>,
        <><code className="text-primary">UserProvider</code>: Wallet-scoped profile identity (loaded from local storage).</>,
        <><code className="text-primary">ThemeProvider</code>: Strict Dark/Light theme toggle.</>,
      ]} />

      <Divider />

      <SectionTitle>2. Data Persistence Model (Local-First)</SectionTitle>
      
      <Paragraph>
        Because Orina emphasizes privacy and decentralization, all off-chain user data is stored within the browser's <code>localStorage</code>, scoped directly to the connected wallet address.
      </Paragraph>

      <SubSectionTitle>Wallet-Scoped Storage Keys</SubSectionTitle>
      <BulletList items={[
        <><code className="text-primary">user_profile_&lt;address&gt;</code>: User display name, avatar, and banner.</>,
        <><code className="text-primary">orina_user_settings_&lt;address&gt;</code>: Delivery address preferences and theme.</>,
        <><code className="text-primary">orina_favorites_&lt;address&gt;</code> & <code className="text-primary">orina_watchlist_&lt;address&gt;</code>: Asset tracking.</>,
        <><code className="text-primary">orina_runtime_orders_v1</code>: Locally cached views of the ATP order state.</>,
      ]} />

      <InfoBox>
        <strong>No Central Database:</strong> Orina does not use centralized SQL/NoSQL databases (like Supabase or Firebase) for core operations. Your profile, settings, and messaging histories are stored entirely client-side, giving you total data sovereignty.
      </InfoBox>

      <Divider />

      <SectionTitle>3. Smart Contract State (ATP Integration)</SectionTitle>
      
      <Paragraph>
        While profile data is local, all canonical marketplace data (ownership, escrow, order tracking) lives entirely on-chain through the Atomic Transaction Protocol smart contracts.
      </Paragraph>

      <SubSectionTitle>The ATP State Machine</SubSectionTitle>
      <Paragraph>
        The frontend continually reads the blockchain (via Wagmi hooks) to derive the current state of an order:
      </Paragraph>
      <CodeBlock language="typescript">{`enum OrderState {
  PENDING_SELLER_ACCEPT = 0, // Buyer locked funds
  PENDING_SHIPMENT = 1,      // Seller accepted with duration
  IN_TRANSIT = 2,            // Seller claims shipped
  COMPLETED = 3,             // Buyer confirmed physical receipt
  DISPUTED = 4,              // Exception thrown
  CANCELLED = 5              // Reverted (timeout or mutual)
}`}</CodeBlock>

      <SubSectionTitle>Transactions</SubSectionTitle>
      <Paragraph>
        Every state transition requires a cryptographic signature. 
      </Paragraph>
      <BulletList items={[
        "When a buyer clicks 'Buy Now', they sign a transaction to lock funds in the ATP Escrow.",
        "When a seller clicks 'Confirm Shipment', they sign a transaction to increment the ATP state.",
        "When a buyer clicks 'Confirm Delivery', their transaction unlocks the escrow balance and triggers the minting of a Receipt NFT."
      ]} />

      <Divider />

      <SectionTitle>4. Marketplace and Minting Flow</SectionTitle>

      <SubSectionTitle>Minting RWA Assets</SubSectionTitle>
      <Paragraph>
        During minting, the seller writes the Asset Metadata (Name, Price, Category) to the blockchain. Crucially, the frontend injects an <strong>Asset Location Snapshot</strong> based on the seller's current local delivery address setting. This geometry data is what populates the Marketplace Map View.
      </Paragraph>

      <SubSectionTitle>Configurable Attributes Validation</SubSectionTitle>
      <Paragraph>
        The frontend handles the complex UI for selecting configurable buyer attributes (e.g., color, warehouse). These selections are serialized into JSON and signed into the buy order transaction, guaranteeing the seller receives an exact, immutable snapshot of the buyer's request.
      </Paragraph>

      <Divider />

      <SectionTitle>Related Documentation</SectionTitle>
      
      <BulletList items={[
        <>
          <a href="/buyer-guide" className="text-primary hover:underline">Buyer Guide</a>: Workflow for executing ATP transactions.
        </>,
        <>
          <a href="/seller-guide" className="text-primary hover:underline">Seller Guide</a>: Managing asset states and off-chain logistics.
        </>,
        <>
          <a href="/terms" className="text-primary hover:underline">Terms of Use</a>: Decentralized platform legal agreements.
        </>,
      ]} />
    </div>
  );
}
