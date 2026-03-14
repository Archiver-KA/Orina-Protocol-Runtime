import { PageTitle, PageSubtitle, Paragraph, BulletList, InfoBox, Divider, SectionTitle, SubSectionTitle, OrderedList, CodeBlock } from "../components/DocComponents";

export function SellerGuidePage() {
  return (
    <div>
      <PageTitle>Seller Guide</PageTitle>
      <PageSubtitle>
        A comprehensive guide to minting RWA assets, managing orders, and fulfilling off-chain deliveries via Orina Protocol.
      </PageSubtitle>

      <Paragraph>
        As a seller on Orina, you tokenize real-world assets with configurable attributes and manage escrow-backed orders. <strong>Shipping physical assets is entirely your responsibility.</strong> This guide covers the complete workflow from minting to delivery confirmation and settlement.
      </Paragraph>

      <Divider />

      <SectionTitle>1. Setting Up Your Seller Profile</SectionTitle>
      
      <Paragraph>
        Navigate to <strong>Settings</strong> to configure your public seller identity. All data is persisted locally in your wallet's browser storage.
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Display Name & Avatar:</strong> Important for building trust with buyers.</>,
        <><strong className="text-foreground">Default Delivery Address:</strong> This is critical. It determines the <em>Asset Location Snapshot</em> when you mint items, which places your assets on the Marketplace Map.</>,
      ]} />

      <InfoBox>
        <strong>Important:</strong> The delivery address is <strong>snapshotted at mint time</strong>. Changing your settings later does not retroactively update the location of already-minted assets.
      </InfoBox>

      <Divider />

      <SectionTitle>2. Minting RWA Assets</SectionTitle>
      
      <Paragraph>
        Go to the <strong>Minting</strong> page to create tokenized representations of your physical goods.
      </Paragraph>

      <SubSectionTitle>Basic Configuration</SubSectionTitle>
      <OrderedList items={[
        "Enter Asset Name, Description, and upload clear Images.",
        "Set the Category (Metals, Commodities, Collectibles, etc.) and blockchain network.",
        "Define the Price Per Unit and total available Quantity.",
      ]} />

      <SubSectionTitle>Configurable Buyer Attributes</SubSectionTitle>
      <Paragraph>
        You can define off-chain options for buyers (e.g., Purity, Packaging, Warehouse Location).
      </Paragraph>
      <CodeBlock language="json">{`{
  "label": "Packaging",
  "helpText": "Select delivery packaging",
  "required": true,
  "selectionMode": "single",
  "options": [
    { "label": "Standard Box", "priceModifier": 0 },
    { "label": "Palletized", "priceModifier": 50 }
  ]
}`}</CodeBlock>
      <Paragraph>
        Be extremely clear with these attributes. If a buyer opens a dispute claiming the off-chain item does not match the on-chain attribute snapshot, you must prove otherwise.
      </Paragraph>

      <Divider />

      <SectionTitle>3. Managing Orders (The ATP State Machine)</SectionTitle>
      
      <Paragraph>
        When a buyer purchases your asset, their funds are locked in the Orina Escrow. Go to the <strong>Orders</strong> page to manage the lifecycle.
      </Paragraph>

      <SubSectionTitle>State 1: PENDING_SELLER_ACCEPT</SubSectionTitle>
      <BulletList items={[
        "Review the buyer's requested quantity and selected attributes.",
        "Click <strong>Accept Order</strong>.",
        "<strong>Critical Step:</strong> You must specify a delivery duration. This sets a hard algorithmic deadline for you to deliver the physical goods.",
      ]} />

      <SubSectionTitle>State 2: PENDING_SHIPMENT</SubSectionTitle>
      <BulletList items={[
        "Prepare the physical asset exactly as described in the buyer's attribute snapshot.",
        "Organize shipping via your preferred real-world transporter (FedEx, DHL, Local Freight, etc.).",
        "Click <strong>Confirm Shipment</strong> on the Orina protocol to move the order to the next state.",
      ]} />

      <InfoBox>
        <strong>Shipping Liability:</strong> Orina Protocol does not manage shipping, calculate freight costs dynamically, or print shipping labels. As the seller, you bear the sole off-chain risk of getting the asset from your snapshot location to the buyer's address.
      </InfoBox>

      <SubSectionTitle>State 3: IN_TRANSIT</SubSectionTitle>
      <Paragraph>
        The item is out for delivery. The ATP countdown timer you set during acceptance is now active. You must proactively communicate with the buyer via direct messages to provide tracking numbers.
      </Paragraph>

      <Divider />

      <SectionTitle>4. Settlement and Disputes</SectionTitle>

      <SubSectionTitle>Successful Settlement (COMPLETED)</SubSectionTitle>
      <Paragraph>
        When the buyer receives the item, they click "Confirm Delivery". This triggers the smart contract to instantly release the escrowed funds to your wallet. Your reputation score increases automatically.
      </Paragraph>

      <SubSectionTitle>Handling Disputes</SubSectionTitle>
      <Paragraph>
        If the ATP timer expires or the buyer claims the item is defective/missing, they will open a <strong>Dispute</strong>.
      </Paragraph>
      <BulletList items={[
        "You must respond to the dispute with definitive off-chain proof (tracking delivery confirmations, video of packaging).",
        "If you missed the ATP deadlines (failed to accept or failed to deliver within the timeframe), the protocol will automatically refund the buyer to preserve trustless liveness.",
        "If the dispute goes to Arbiter review, funds are frozen until a resolution is mathematically and procedurally finalized."
      ]} />

      <Divider />

      <SectionTitle>5. Best Practices</SectionTitle>
      
      <BulletList items={[
        <><strong className="text-foreground">Accurate Timelines:</strong> Never underestimate delivery durations. An expired ATP timer means lost funds and lost inventory.</>,
        <><strong className="text-foreground">Document Everything off-chain:</strong> Save all shipping receipts, tracking numbers, and packaging photos.</>,
        <><strong className="text-foreground">Communication:</strong> Always message the buyer with tracking info immediately after clicking "Confirm Shipment".</>,
      ]} />
    </div>
  );
}