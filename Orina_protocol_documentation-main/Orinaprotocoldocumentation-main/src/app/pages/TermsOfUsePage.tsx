import { PageTitle, PageSubtitle, Paragraph, BulletList, Divider, SectionTitle, SubSectionTitle } from "../components/DocComponents";

export function TermsOfUsePage() {
  return (
    <div>
      <PageTitle>Terms of Use</PageTitle>
      <PageSubtitle>
        Legal agreement and guidelines for using the Orina Protocol and Marketplace.
      </PageSubtitle>

      <Paragraph>
        Welcome to Orina Protocol. By accessing or using our decentralized application and smart contracts, you agree to be bound by these Terms of Use. Orina Protocol is a decentralized software application that facilitates peer-to-peer transactions. 
      </Paragraph>

      <Divider />

      <SectionTitle>1. Acceptance of Terms</SectionTitle>
      <Paragraph>
        By interacting with the Orina Protocol, you acknowledge that you have read, understood, and agree to these Terms. If you do not agree, you must not use the protocol. We reserve the right to modify these terms at any time; continued use constitutes acceptance of modifications.
      </Paragraph>

      <SectionTitle>2. Protocol Nature and Liability</SectionTitle>
      
      <SubSectionTitle>Decentralized Infrastructure</SubSectionTitle>
      <Paragraph>
        Orina Protocol operates entirely via smart contracts on blockchain networks. We do not hold custody of your digital assets, your fiat currency, or the physical Real-World Assets (RWAs) being traded. All transactions are peer-to-peer governed by the Atomic Transaction Protocol (ATP).
      </Paragraph>

      <SubSectionTitle>Off-Chain Shipping and Fulfillment</SubSectionTitle>
      <Paragraph>
        <strong>Orina Protocol is not a shipping company.</strong> Orina provides cryptographic guarantee of escrowed funds, but takes zero responsibility for the physical transportation, customs clearance, or delivery of Real-World Assets. This is strictly the responsibility of the seller and buyer to coordinate.
      </Paragraph>

      <SubSectionTitle>Limitation of Liability</SubSectionTitle>
      <Paragraph>
        To the maximum extent permitted by law, Orina Protocol and its developers shall not be liable for:
      </Paragraph>
      <BulletList items={[
        "Loss of funds due to user error, phishing, or compromised wallets.",
        "Failure of a seller to deliver a physical asset.",
        "Damage to physical assets during off-chain transit.",
        "Smart contract vulnerabilities or underlying blockchain network congestion/failures.",
      ]} />

      <SectionTitle>3. User Conduct</SectionTitle>
      
      <Paragraph>
        While the protocol is permissionless, the frontend interfaces may curate or hide content. You agree not to:
      </Paragraph>
      <BulletList items={[
        "Use the protocol for any illegal activity, including money laundering or financing terrorism.",
        "Tokenize assets that you do not legally own or have the right to sell.",
        "Manipulate the dispute resolution system with fraudulent claims or fake evidence.",
        "Harass, defraud, or impersonate other users.",
      ]} />

      <SectionTitle>4. Dispute Resolution (ATP Escrow)</SectionTitle>
      <Paragraph>
        Disputes regarding transactions utilizing the ATP escrow system will be handled according to the protocol's defined arbiter processes. By using the escrow, you agree to be bound by the final programmatic outcome of the dispute resolution system, governed by the smart contract logic.
      </Paragraph>

      <SectionTitle>5. Intellectual Property</SectionTitle>
      <Paragraph>
        The Orina Protocol source code is open source. However, the Orina name, brand assets, and UI designs are protected. You may not use our branding in a way that implies endorsement or affiliation without express written permission. Sellers retain all IP rights to the descriptions and images of the assets they tokenize.
      </Paragraph>
    </div>
  );
}
