import { PageTitle, PageSubtitle, Paragraph, BulletList, InfoBox, Divider, SectionTitle, SubSectionTitle, OrderedList } from "../components/DocComponents";

export function BuyerGuidePage() {
  return (
    <div>
      <PageTitle>Buyer Guide</PageTitle>
      <PageSubtitle>
        A complete guide to discovering, purchasing, and securing real-world assets on Orina Protocol.
      </PageSubtitle>

      <Paragraph>
        As a buyer on Orina, you benefit from atomic transaction guarantees that secure your funds in a smart contract escrow until delivery is confirmed. However, because physical shipping happens off-chain, you must understand the risks and how to protect yourself using Orina's dispute mechanisms.
      </Paragraph>

      <Divider />

      <SectionTitle>1. Discovering Assets</SectionTitle>
      
      <SubSectionTitle>Marketplace Browsing</SubSectionTitle>
      <Paragraph>
        Navigate to the <strong>Marketplace</strong> to browse RWA listings. You can view assets via:
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Grid View:</strong> Visual card layout with images.</>,
        <><strong className="text-foreground">List View:</strong> Table format for scanning details quickly.</>,
        <><strong className="text-foreground">Map View:</strong> Interactive map based on the <em>Asset Location Snapshot</em> provided by the seller during minting.</>,
      ]} />

      <SubSectionTitle>Seller Due Diligence</SubSectionTitle>
      <Paragraph>
        Because shipping is handled externally, <strong>evaluating the seller is your most important step</strong>. Click on an asset to view the seller's profile:
      </Paragraph>
      <BulletList items={[
        "Check their Completion Rate and Average Delivery Time.",
        "Look for the Verified Seller badge (if applicable).",
        "Read past community reviews and dispute histories."
      ]} />

      <Divider />

      <SectionTitle>2. Configuring Your Purchase</SectionTitle>
      
      <Paragraph>
        RWA assets often come with <strong>Configurable Attributes</strong> defined by the seller (e.g., Purity, Packaging type, exact Warehouse origin).
      </Paragraph>

      <BulletList items={[
        "Carefully read the help text for each attribute option.",
        "Your attribute selections are snapshotted at the time of purchase and saved into the smart contract order data. This guarantees the seller cannot retroactively change the agreement.",
      ]} />

      <Divider />

      <SectionTitle>3. The Purchase Workflow (ATP Escrow)</SectionTitle>
      
      <Paragraph>
        Orina Protocol uses the Atomic Transaction Protocol to handle payments securely.
      </Paragraph>

      <SubSectionTitle>Locking Funds</SubSectionTitle>
      <OrderedList items={[
        "Review your selected quantity, attributes, and total price.",
        "Click <strong>Buy Now</strong>.",
        "Sign the transaction with your Web3 wallet.",
      ]} />
      <Paragraph>
        This transaction moves your cryptocurrency into the <strong>Orina Escrow Smart Contract</strong>. The seller does not receive the funds yet.
      </Paragraph>

      <SubSectionTitle>The ATP State Machine</SubSectionTitle>
      <BulletList items={[
        <><strong className="text-foreground">PENDING_SELLER_ACCEPT:</strong> The seller must review and accept your order within a strict protocol deadline.</>,
        <><strong className="text-foreground">PENDING_SHIPMENT:</strong> The seller prepares the physical asset for delivery.</>,
        <><strong className="text-foreground">IN_TRANSIT:</strong> The seller confirms they have shipped the item. A countdown timer for maximum transit duration begins.</>,
      ]} />

      <InfoBox>
        <strong>Orina is Not a Shipping Company:</strong> Shipping physically volatile assets across borders carries customs risks, delays, and potential damage. Orina guarantees your funds are safe <em>on-chain</em>, but you and the seller must communicate (via Community/Messages) regarding tracking and timelines.
      </InfoBox>

      <Divider />

      <SectionTitle>4. Confirming Delivery or Disputing</SectionTitle>
      
      <Paragraph>
        Once you receive the physical item, inspect it immediately.
      </Paragraph>

      <SubSectionTitle>Happy Path: Confirm Delivery</SubSectionTitle>
      <OrderedList items={[
        "Go to the <strong>Orders</strong> page.",
        "Find your order in the <strong>IN_TRANSIT</strong> state.",
        "Click <strong>Confirm Delivery</strong> and sign the transaction.",
      ]} />
      <Paragraph>
        This action releases the escrowed funds to the seller and mints a <strong>Receipt NFT</strong> directly to your wallet, proving your ownership and purchase history.
      </Paragraph>

      <SubSectionTitle>Exception Path: ATP Disputes</SubSectionTitle>
      <Paragraph>
        If the off-chain reality breaks the on-chain agreement, you are protected by the dispute mechanism:
      </Paragraph>
      <BulletList items={[
        "<strong>Timeout Refunds:</strong> If the seller fails to accept the order or fails to ship within the protocol's time limits, you can trigger a timeout action from the Orders page to instantly reclaim your escrowed funds.",
        "<strong>Open Dispute:</strong> If the item is heavily delayed, damaged, or does not match the snapshotted attributes, click <strong>Open Dispute</strong>. You must provide evidence (e.g., photos, tracking numbers) which will be reviewed by protocol-designated arbiters.",
      ]} />

      <InfoBox>
        <strong>Timeliness is Critical:</strong> Do not miss your delivery inspection window. The ATP is deterministic. If the delivery window completely expires without a dispute being opened, the protocol may eventually allow the seller to claim the funds under the assumption of successful delivery.
      </InfoBox>

      <Divider />

      <SectionTitle>5. Best Practices</SectionTitle>
      
      <BulletList items={[
        <><strong className="text-foreground">Never Bypass Escrow:</strong> Never send funds directly to a seller outside of the Orina smart contract flow.</>,
        <><strong className="text-foreground">Document Everything:</strong> Keep screenshots, exact tracking links, and unboxing videos to ensure strong standing during any potential dispute.</>,
        <><strong className="text-foreground">Keep Settings Updated:</strong> Ensure your Delivery Address in your Local Settings is perfectly accurate—this is the exact address the seller sees.</>,
      ]} />
    </div>
  );
}