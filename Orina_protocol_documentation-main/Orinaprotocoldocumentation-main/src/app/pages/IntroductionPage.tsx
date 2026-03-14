import { PageTitle, PageSubtitle, Paragraph, BulletList, InfoBox, Divider, SectionTitle } from "../components/DocComponents";

export function IntroductionPage() {
  return (
    <div>
      <PageTitle>Welcome to Orina Protocol</PageTitle>
      <PageSubtitle>
        The decentralized infrastructure for tokenizing, trading, and settling physical Real-World Assets (RWA) via the Atomic Transaction Protocol.
      </PageSubtitle>

      <Paragraph>
        Orina Protocol redefines e-commerce by introducing a decentralized marketplace where physical goods are traded using blockchain technology. Unlike traditional platforms that act as central custodians of trust, Orina provides a trustless environment powered by the Atomic Transaction Protocol (ATP).
      </Paragraph>

      <Divider />

      <SectionTitle>What is Orina Protocol?</SectionTitle>
      
      <Paragraph>
        Orina provides the smart contract infrastructure for buyers and sellers to interact securely without intermediaries. The protocol focuses on:
      </Paragraph>

      <BulletList items={[
        "Tokenizing real-world assets into verifiable on-chain records.",
        "Guaranteed settlement through the Atomic Transaction Protocol (ATP).",
        "Deterministic escrow handling to secure buyer funds.",
        "Clear, community-driven dispute resolution mechanisms.",
        "A decentralized, self-custodial marketplace interface."
      ]} />

      <Divider />

      <SectionTitle>The Atomic Transaction Protocol (ATP)</SectionTitle>

      <Paragraph>
        <strong className="text-foreground">What is ATP?</strong>
      </Paragraph>
      <Paragraph>
        The Atomic Transaction Protocol is the core state machine of Orina. It ensures that every transaction is atomic—meaning it either fully completes with both parties satisfied, or it safely reverts, protecting user funds. 
      </Paragraph>

      <Paragraph>
        When a buyer purchases an asset, their funds are locked in a secure Escrow smart contract. The funds are only released to the seller when the buyer confirms receipt of the physical item, or if the protocol's time-bound deadlines definitively expire in the seller's favor.
      </Paragraph>

      <InfoBox>
        <strong>High-Risk Off-chain Reality:</strong> While Orina's ATP guarantees the security of your crypto funds on-chain, <strong>shipping physical goods is an off-chain activity carrying inherent risks.</strong> Orina does not control shipping couriers, customs, or physical state. Sellers are strictly responsible for delivery, and buyers must perform due diligence on seller reputation.
      </InfoBox>

      <Divider />

      <SectionTitle>Documentation Overview</SectionTitle>

      <Paragraph>
        Use the sidebar to navigate through the protocol's guides and policies:
      </Paragraph>

      <BulletList items={[
        <>
          <strong className="text-foreground">Getting Started:</strong> How to connect your wallet and set up your profile.
        </>,
        <>
          <strong className="text-foreground">Buyer Guide:</strong> How to securely buy assets and confirm delivery.
        </>,
        <>
          <strong className="text-foreground">Seller Guide:</strong> How to tokenize assets and manage your delivery obligations.
        </>,
        <>
          <strong className="text-foreground">App Architecture:</strong> Technical details on the Orina frontend and smart contracts.
        </>,
        <>
          <strong className="text-foreground">Legal & Policies:</strong> The Terms of Use, Listing rules, and Privacy guidelines governing the platform.
        </>,
      ]} />
    </div>
  );
}