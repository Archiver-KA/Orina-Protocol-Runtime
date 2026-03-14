import { PageTitle, PageSubtitle, Paragraph, BulletList, Divider, SectionTitle, SubSectionTitle, InfoBox } from "../components/DocComponents";

export function PrivacyPolicyPage() {
  return (
    <div>
      <PageTitle>Privacy Policy</PageTitle>
      <PageSubtitle>
        How your data is handled in the decentralized Orina Protocol environment.
      </PageSubtitle>

      <Paragraph>
        Your privacy is paramount. Unlike traditional e-commerce platforms, Orina Protocol is built on a <strong>local-first, decentralized architecture</strong>. We do not maintain centralized user databases, and we do not sell your personal data.
      </Paragraph>

      <Divider />

      <SectionTitle>1. On-Chain Data (Public)</SectionTitle>
      
      <Paragraph>
        When you interact with the Orina smart contracts via the Atomic Transaction Protocol, you broadcast data to a public blockchain network (e.g., Ethereum, Polygon, BSC).
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Wallet Addresses:</strong> Your public wallet address is visible on-chain.</>,
        <><strong className="text-foreground">Transaction History:</strong> All your minting, buying, order acceptance, and delivery confirmation transactions are immutable and public.</>,
        <><strong className="text-foreground">Asset Metadata:</strong> The RWA attributes you configure or select during an order are recorded on-chain.</>,
      ]} />
      <InfoBox>
        <strong>Blockchain Immutability:</strong> Orina Protocol cannot delete, hide, or alter data once it is finalized on a public blockchain. Please be mindful of what wallet addresses you use to interact with the protocol.
      </InfoBox>

      <SectionTitle>2. Off-Chain Data (Local Storage)</SectionTitle>
      
      <Paragraph>
        To provide a rich user experience without centralized servers, Orina's frontend interface stores the majority of your personal data entirely within your browser's local storage.
      </Paragraph>

      <SubSectionTitle>Profile and Settings</SubSectionTitle>
      <Paragraph>
        Your Display Name, Avatar, Profile Banner, Theme Preferences, and Delivery Addresses are stored locally under your wallet address key (e.g., <code className="text-primary">orina_user_profile_&lt;address&gt;</code>). This data never leaves your device unless you explicitly share it.
      </Paragraph>

      <SubSectionTitle>Seller Location Snapshots</SubSectionTitle>
      <Paragraph>
        When a seller mints an asset, a geographic snapshot derived from their local delivery address settings is published to the decentralized index to place the asset on the Marketplace Map.
      </Paragraph>

      <SectionTitle>3. Optional Sync Data (Encrypted)</SectionTitle>
      
      <Paragraph>
        If the decentralized application frontend utilizes optional backend synchronization nodes (like Supabase REST interfaces) for features like Direct Messaging or cross-device Profile Syncing, that data is handled with strict minimal-retention policies.
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Direct Messages:</strong> Order communication is routed through secure channels. Messages are end-to-end encrypted where possible.</>,
        <><strong className="text-foreground">Authentication:</strong> We authenticate sessions statelessly using cryptographic wallet signatures (e.g., Sign-In With Ethereum/Web3) rather than passwords.</>,
      ]} />

      <SectionTitle>4. Third-Party Services</SectionTitle>
      
      <Paragraph>
        Orina Protocol interfaces may integrate with third-party Web3 infrastructure providers (e.g., RPC nodes like Alchemy or Infura, IPFS gateways). Your IP address and basic web request data may be subject to the privacy policies of those respective node providers.
      </Paragraph>

      <SectionTitle>5. Your Rights</SectionTitle>
      
      <Paragraph>
        Because Orina is a local-first application:
      </Paragraph>
      <BulletList items={[
        <><strong className="text-foreground">Right to Delete:</strong> You can wipe all your off-chain profile data instantly by clearing your browser's <code className="text-primary">localStorage</code> or using the Developer Reset tools in the Settings page.</>,
        <><strong className="text-foreground">Right to Portability:</strong> You hold the cryptographic keys to your wallet, meaning you retain ultimate control over your on-chain assets and identity.</>,
      ]} />
    </div>
  );
}
