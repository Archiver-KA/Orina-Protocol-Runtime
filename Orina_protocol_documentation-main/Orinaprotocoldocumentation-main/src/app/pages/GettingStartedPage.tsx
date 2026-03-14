import { PageTitle, PageSubtitle, Paragraph, BulletList, InfoBox, Divider, SectionTitle, SubSectionTitle } from "../components/DocComponents";

export function GettingStartedPage() {
  return (
    <div>
      <PageTitle>Getting Started</PageTitle>
      <PageSubtitle>
        Begin your journey on Orina Protocol — connect your wallet, set your profile, and start trading RWAs securely.
      </PageSubtitle>

      <Paragraph>
        Orina Protocol is a Web3-native application. Unlike traditional e-commerce platforms requiring email registrations and passwords, Orina uses your cryptocurrency wallet as your central identity. 
      </Paragraph>

      <Divider />

      <SectionTitle>1. Connect Your Wallet</SectionTitle>
      
      <Paragraph>
        To perform any transaction, you must connect a Web3 wallet. Orina supports:
      </Paragraph>
      <BulletList items={[
        "MetaMask (Browser Extension)",
        "WalletConnect (Mobile Wallets)",
        "Coinbase Wallet",
      ]} />

      <Paragraph>
        Click the <strong>Connect Wallet</strong> button in the top navigation bar. Once connected, your wallet address acts as your account identifier.
      </Paragraph>

      <InfoBox>
        <strong>Security First:</strong> Orina is non-custodial. We never have access to your private keys or crypto funds. Every state-changing action (buying, minting, confirming delivery) requires explicit authorization (a signature) via your wallet software.
      </InfoBox>

      <Divider />

      <SectionTitle>2. Set Up Your Profile (Local Storage)</SectionTitle>
      
      <Paragraph>
        After connecting, navigate to the <strong>Settings</strong> page to configure your profile. Data is stored directly in your browser's local storage to ensure rapid performance and decentralization without relying on central database authorities.
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Display Name & Avatar:</strong> Customize how you appear to other buyers and sellers in the community.</>,
        <><strong className="text-foreground">Delivery Address:</strong> Set up your default shipping destination. This is critical for calculating shipping feasibility and is snapshotted during purchases.</>,
        <><strong className="text-foreground">Theme & Preferences:</strong> Choose Light or Dark mode, and set notification preferences.</>,
      ]} />

      <Divider />

      <SectionTitle>3. Understanding the Escrow & ATP Model</SectionTitle>
      
      <Paragraph>
        Before participating in the marketplace, it is crucial to understand how purchasing works on Orina compared to classic e-commerce:
      </Paragraph>

      <SubSectionTitle>Trustless Settlement via ATP</SubSectionTitle>
      <Paragraph>
        When you click "Buy" on Orina, <strong>you are not sending money directly to the seller</strong>. Instead, your cryptocurrency is safely routed into an Escrow Smart Contract regulated by the Atomic Transaction Protocol (ATP).
      </Paragraph>
      <BulletList items={[
        "The funds are locked.",
        "The seller is notified to prepare the physical shipment.",
        "The seller has a strict timeout window to accept the order and ship.",
        "Once you (the buyer) physically receive the item and confirm it matches the description, you trigger the release of funds to the seller.",
      ]} />

      <Paragraph>
        If the physical shipment fails, the ATP provides a structured mechanism to raise a dispute or automatically refund your assets based on algorithmic timeouts.
      </Paragraph>

      <Divider />

      <SectionTitle>Next Steps</SectionTitle>
      
      <Paragraph>
        Ready to dive in? Choose your path:
      </Paragraph>
      <BulletList items={[
        <>
          <strong className="text-foreground">For Buyers:</strong> Read the <a href="/buyer-guide" className="text-primary hover:underline">Buyer Guide</a> to understand how to discover assets, lock funds in escrow, and handle physical logistics.
        </>,
        <>
          <strong className="text-foreground">For Sellers:</strong> Read the <a href="/seller-guide" className="text-primary hover:underline">Seller Guide</a> to learn about your strict responsibilities regarding order acceptance and off-chain shipping.
        </>,
      ]} />
    </div>
  );
}
