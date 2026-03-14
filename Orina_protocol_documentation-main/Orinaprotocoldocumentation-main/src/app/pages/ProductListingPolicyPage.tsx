import { PageTitle, PageSubtitle, Paragraph, BulletList, Divider, SectionTitle, SubSectionTitle, InfoBox } from "../components/DocComponents";

export function ProductListingPolicyPage() {
  return (
    <div>
      <PageTitle>Product Listing Policy</PageTitle>
      <PageSubtitle>
        Guidelines for acceptable Real-World Asset (RWA) tokenization on Orina Protocol.
      </PageSubtitle>

      <Paragraph>
        Orina Protocol is designed for the tokenization and exchange of legitimate Real-World Assets. To maintain a safe and compliant marketplace interface, all sellers must adhere to this Product Listing Policy.
      </Paragraph>

      <Divider />

      <SectionTitle>1. Seller Ownership and Legality</SectionTitle>
      
      <Paragraph>
        By minting an RWA token on Orina Protocol, you strictly warrant that:
      </Paragraph>
      <BulletList items={[
        "You currently possess the physical asset or hold the legal, unencumbered title to it.",
        "The sale, transport, and ownership transfer of the asset does not violate the laws of your jurisdiction, the buyer's jurisdiction, or any international trade embargoes.",
        "The asset is not stolen, counterfeit, or illegally obtained.",
      ]} />

      <SectionTitle>2. Prohibited Items</SectionTitle>
      
      <Paragraph>
        The following categories of physical assets are strictly prohibited from being listed or tokenized on Orina Protocol's frontend interfaces.
      </Paragraph>
      
      <SubSectionTitle>Dangerous or Illegal Goods</SubSectionTitle>
      <BulletList items={[
        "Firearms, ammunition, explosives, and destructive devices.",
        "Controlled substances, illegal drugs, and drug paraphernalia.",
        "Hazardous chemicals or radioactive materials requiring specialized unverified transport.",
      ]} />

      <SubSectionTitle>Regulated Financial Instruments</SubSectionTitle>
      <BulletList items={[
        "Unregistered securities, stocks, bonds, or investment contracts.",
        "Fiat currency exchanges or structured money service businesses.",
      ]} />

      <SubSectionTitle>Other Prohibited Categories</SubSectionTitle>
      <BulletList items={[
        "Counterfeit goods or items infringing on copyrights and trademarks.",
        "Stolen goods or assets under active legal disputes.",
        "Human parts, remains, or protected/endangered wildlife species.",
      ]} />

      <SectionTitle>3. Accurate Representation</SectionTitle>
      <Paragraph>
        Sellers must accurately describe their assets. 
      </Paragraph>
      <BulletList items={[
        "Images must be real photos of the actual asset, not generic stock photography.",
        "Flaws, damage, or wear must be explicitly stated in the description.",
        "The <strong>Configurable Buyer Attributes</strong> must accurately reflect the off-chain reality. You must be able to fulfill exactly what the buyer selects (e.g., exact purity grade).",
      ]} />

      <InfoBox>
        <strong>Dispute Consequence:</strong> Intentional misrepresentation of an asset heavily biases the ATP Dispute Resolution process in favor of the buyer, leading to escrow refunds and potential reputation slashing.
      </InfoBox>

      <SectionTitle>4. Shipping Constraints</SectionTitle>
      <Paragraph>
        Sellers must ensure the asset can realistically be legally shipped to the buyer. If the asset requires special export licenses or cannot cross certain international borders, this <strong>must</strong> be clearly stated in the item description before a buyer locks funds in escrow.
      </Paragraph>

      <SectionTitle>5. Enforcement</SectionTitle>
      <Paragraph>
        While smart contracts are immutable, the Orina decentralized frontend indexing nodes reserve the right to delist, hide, or attach warning labels to any asset or seller profile that violates this policy, in order to protect the community.
      </Paragraph>
    </div>
  );
}
