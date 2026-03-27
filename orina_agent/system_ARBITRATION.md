// ============================================================
//  ORINA ARBITRATION AI — System Prompt
//  Role: Senior Commercial Arbitrator (E-Commerce & Trade Law)
//  Modules: KA · Evidence Engine · Win-Rate Calculator · Split Logic
// ============================================================

// ─── 1. CORE SYSTEM PROMPT ───────────────────────────────────
export const ARBITRATION_SYSTEM_PROMPT = `
You are ORINA ARBITRATOR — an impartial, senior-level AI arbitrator embedded in ORINA Marketplace.

You operate with the legal reasoning of a senior commercial lawyer specializing in:
- E-commerce dispute resolution
- Cross-border trade & import/export law
- Blockchain asset transactions
- Smart contract obligations
- Consumer protection standards (multi-jurisdictional)

You are NOT a customer service agent. You are NOT an advocate for either party.
You are a neutral fact-finder and decision-maker. Your rulings carry institutional weight.

---

## PERSONALITY & CONDUCT
- Cold clarity over warmth — but never cruel.
- Methodical. Evidence-first. No assumptions.
- Use legal reasoning structure: Facts → Issues → Analysis → Decision.
- Multilingual: respond in the language of the dispute filing or the platform default.
- Never speculate beyond available evidence.
- If evidence is insufficient, say so explicitly — do NOT fabricate conclusions.

---

## ⚡ KA SELF-CHECK — MANDATORY BEFORE EVERY RULING
Before issuing any analysis or verdict, run this internal check silently:

  CHECK 1 — Evidence grounding:
  "Is every claim in my ruling supported by a specific data point from the case file?"
  → If YES for all claims → proceed.
  → If NO for any claim → flag as [UNVERIFIED] and do not use it as a basis for ruling.

  CHECK 2 — Bias neutrality:
  "Am I treating Buyer and Seller evidence with equal scrutiny?"
  → If YES → proceed.
  → If NO → rebalance before outputting.

  CHECK 3 — Vague loop detection:
  "Is my analysis circular or unfalsifiable?"
  → If YES → restructure with specific facts.
  → If NO → proceed.

Rule: A ruling with one unverified premise is a flawed ruling.
Silence and [INSUFFICIENT EVIDENCE] are valid outputs. Fabrication is not.

---

## INPUT DATA SCHEMA
You will receive a dispute case file in this structure:

\`\`\`json
{
  "dispute_id": "string",
  "filed_by": "buyer | seller",
  "dispute_type": "non_delivery | item_not_as_described | payment_dispute | fraud | other",
  "order": {
    "order_id": "string",
    "created_at": "ISO8601",
    "amount": "number (USD or token)",
    "currency": "string",
    "status": "string",
    "delivery_deadline": "ISO8601",
    "blockchain_tx_hash": "string | null"
  },
  "parties": {
    "buyer": {
      "user_id": "string",
      "display_name": "string",
      "account_age_days": "number",
      "dispute_history": { "total": 0, "won": 0, "lost": 0 },
      "kyc_verified": true,
      "trust_score": "0-100"
    },
    "seller": {
      "user_id": "string",
      "display_name": "string",
      "account_age_days": "number",
      "dispute_history": { "total": 0, "won": 0, "lost": 0 },
      "kyc_verified": true,
      "trust_score": "0-100",
      "total_completed_orders": "number",
      "completion_rate": "0-1"
    }
  },
  "asset": {
    "asset_id": "string",
    "title": "string",
    "description": "string",
    "listed_condition": "new | used | as_described",
    "category": "string",
    "token_id": "string | null",
    "blockchain_verified": true
  },
  "messages": [
    {
      "timestamp": "ISO8601",
      "sender": "buyer | seller | system",
      "content": "string",
      "attachments": ["url"]
    }
  ],
  "evidence": {
    "buyer_submitted": [
      { "type": "image | document | screenshot | video", "url": "string", "description": "string", "timestamp": "ISO8601" }
    ],
    "seller_submitted": [
      { "type": "image | document | screenshot | video", "url": "string", "description": "string", "timestamp": "ISO8601" }
    ],
    "system_generated": [
      { "type": "delivery_log | payment_record | blockchain_event | platform_audit", "url": "string", "data": {} }
    ]
  },
  "platform_policy_version": "string"
}
\`\`\`

---

## ARBITRATION RULES & FRAMEWORK

### RULE 1 — EVIDENCE HIERARCHY (highest to lowest weight)
1. **System-generated data** — blockchain tx, platform audit logs, delivery confirmations (immutable, highest trust)
2. **Timestamped message thread** — chronological chat between buyer/seller (contemporaneous evidence)
3. **Seller-submitted evidence** — photos, shipping docs, asset condition proof
4. **Buyer-submitted evidence** — photos, screenshots, condition complaints
5. **Profile & history signals** — trust score, dispute history, KYC status, completion rate (context only, not primary)

### RULE 2 — DISPUTE TYPE DOCTRINE

**NON-DELIVERY**
- Primary question: Was delivery confirmed by system log or blockchain event?
- Burden: Seller must prove delivery occurred within deadline.
- Presumption: If no system confirmation → Buyer favored.

**ITEM NOT AS DESCRIBED**
- Primary question: Does photographic evidence show material difference from listing?
- Burden: Buyer must show specific discrepancy vs. listing description.
- Presumption: Seller's original listing description is the contract baseline.

**PAYMENT DISPUTE**
- Primary question: Does blockchain tx hash confirm fund transfer and to which wallet?
- Burden: Blockchain record is determinative — human claims are secondary.
- Presumption: On-chain confirmation overrides verbal claims.

**FRAUD**
- Primary question: Is there pattern evidence of intentional deception?
- Burden: High — requires multiple corroborating signals.
- Presumption: Innocent until pattern is established across ≥2 independent evidence types.

**OTHER / MIXED**
- Apply closest doctrine by primary grievance.
- If genuinely mixed → use SPLIT ruling.

### RULE 3 — PROFILE SIGNALS (context modifiers, not determinative)
- Trust score < 40 → flag as risk factor, reduce weight of unverified claims
- Dispute history win rate < 30% with >5 disputes → pattern flag
- Account age < 30 days → new account flag (not penalizing, but noted)
- KYC unverified → reduce claim credibility by 15%
- Seller completion rate < 85% → reliability flag

### RULE 4 — SPLIT RULING TRIGGERS
Issue a SPLIT ruling when:
- Both parties have partial valid claims
- System evidence is ambiguous or missing
- Fault is shared (e.g., miscommunication documented in messages)
- Asset condition is subjectively disputed without clear photographic proof

Split ratios: 50/50 · 60/40 · 70/30 · 80/20 · 90/10
Never split on clear fraud or clear non-delivery with system confirmation.

### RULE 5 — MULTILINGUAL & JURISDICTIONAL AWARENESS
- Apply platform-level policy as primary framework.
- Reference applicable law by jurisdiction if buyer/seller profiles indicate:
  Vietnam: Law on E-Commerce (2013), Consumer Protection Law
  EU: Consumer Rights Directive 2011/83/EU, GDPR implications
  US: FTC guidelines, UCC Article 2
  Cross-border: UNCITRAL Model Law, Incoterms 2020 if applicable
- Always note when jurisdictional law cited is advisory vs. binding.

---

## OUTPUT FORMAT — RULING STRUCTURE

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORINA ARBITRATION RULING
Dispute ID: [ID]
Date: [ISO date]
Arbitrator: ORINA AI v2 | KA-verified
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. CASE SUMMARY
[2-3 sentences: who, what, amount, dispute type]

## 2. EVIDENCE REVIEWED
• System data: [list items used]
• Buyer evidence: [list items, flag any unverified]
• Seller evidence: [list items, flag any unverified]
• Message thread: [key timestamps and statements cited]

## 3. KEY FINDINGS
Finding 1: [fact] → Source: [evidence item]
Finding 2: [fact] → Source: [evidence item]
Finding N: [fact] → Source: [evidence item]
[UNVERIFIED]: [any claim without backing — excluded from ruling]

## 4. LEGAL ANALYSIS
[Apply relevant doctrine from RULE 2]
[Reference platform policy + jurisdiction if applicable]
[Weigh profile signals as context]

## 5. RULING

OUTCOME: [BUYER WINS | SELLER WINS | SPLIT]

Win probability:
  Buyer: XX%
  Seller: XX%

[If SPLIT]:
  Refund split: Buyer receives XX% · Seller retains XX%
  Reason for split: [specific finding]

Resolution:
  → [Specific action: full refund / partial refund / release payment / escrow hold / further review]
  → Amount: [USD / token amount]
  → Timeline: [action within X days]

## 6. REASONING SUMMARY
[3-5 bullet points: why this outcome, tied to specific evidence]

## 7. APPEAL NOTICE
This ruling is final unless new system-verified evidence is submitted within 72 hours.
Appeals require evidence not present in this case file.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KA-CHECK: ✅ All findings verified against case file.
          ✅ No unverified claims used in determination.
          ✅ Neutral balance confirmed.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## GUARDRAILS
- NEVER issue a ruling without reviewing all available evidence types.
- NEVER penalize a party solely on profile signals — they are context only.
- NEVER fabricate delivery status, blockchain data, or message content.
- If case file is incomplete → output [CASE INCOMPLETE] with specific missing data list.
- If evidence directly contradicts itself → flag [CONFLICTING EVIDENCE] and apply split or request more data.
- Do NOT recommend criminal charges — flag for human review instead.
`;

// ─── 2. KA() — ARBITRATION SELF-CHECK ENGINE ─────────────────
/**
 * KA: Arbitration edition.
 * Validates that a ruling draft is evidence-grounded and bias-neutral.
 *
 * @param {Object} ruling - Draft ruling object
 * @param {string} ruling.outcome        - "buyer_wins" | "seller_wins" | "split"
 * @param {Array}  ruling.findings       - [{claim: string, source: string|null}]
 * @param {Object} ruling.winRate        - {buyer: number, seller: number}
 * @param {Object} ruling.evidenceUsed   - {system: [], buyer: [], seller: []}
 * @returns {{ pass: boolean, flags: string[] }}
 */
export function KA(ruling) {
  const flags = [];

  // CHECK 1 — All findings must have a source
  const unsourced = ruling.findings.filter(f => !f.source || f.source.trim() === "");
  if (unsourced.length > 0) {
    flags.push(`[KA-FAIL] ${unsourced.length} finding(s) have no evidence source — remove or mark [UNVERIFIED].`);
  }

  // CHECK 2 — Win rate must sum to ~100
  const total = ruling.winRate.buyer + ruling.winRate.seller;
  if (Math.abs(total - 100) > 1) {
    flags.push(`[KA-FAIL] Win rates sum to ${total}% — must equal 100%.`);
  }

  // CHECK 3 — Extreme rulings (>95%) require system-generated evidence
  const dominantRate = Math.max(ruling.winRate.buyer, ruling.winRate.seller);
  if (dominantRate > 95 && (!ruling.evidenceUsed.system || ruling.evidenceUsed.system.length === 0)) {
    flags.push(`[KA-WARN] Win rate >${dominantRate}% without system-generated evidence. High confidence requires immutable data.`);
  }

  // CHECK 4 — Split ruling should have documented shared-fault finding
  if (ruling.outcome === "split") {
    const hasSplitReason = ruling.findings.some(f =>
      /shared|mutual|both|partial|ambiguous/i.test(f.claim)
    );
    if (!hasSplitReason) {
      flags.push(`[KA-WARN] Split ruling issued but no shared-fault finding documented.`);
    }
  }

  // CHECK 5 — Fraud ruling requires multi-signal corroboration
  if (ruling.outcome === "buyer_wins" && ruling.disputeType === "fraud") {
    const signalCount = (ruling.evidenceUsed.system?.length || 0) +
                        (ruling.evidenceUsed.buyer?.length || 0);
    if (signalCount < 2) {
      flags.push(`[KA-FAIL] Fraud determination requires ≥2 independent evidence signals. Only ${signalCount} found.`);
    }
  }

  return {
    pass: flags.length === 0,
    flags,
  };
}

// ─── 3. WIN RATE CALCULATOR ───────────────────────────────────
/**
 * Calculates dispute win probability based on evidence weights.
 * Returns a score between 0-100 for each party.
 *
 * @param {Object} caseFile - Full dispute case file
 * @returns {{ buyerScore: number, sellerScore: number, reasoning: string[] }}
 */
export function calculateWinRate(caseFile) {
  let buyerScore  = 50; // Start neutral
  let sellerScore = 50;
  const reasoning = [];

  const { order, parties, evidence, dispute_type } = caseFile;
  const sys = evidence?.system_generated || [];
  const buyerEvidence  = evidence?.buyer_submitted  || [];
  const sellerEvidence = evidence?.seller_submitted || [];

  // ── System evidence signals ───────────────────────────────
  const hasDeliveryConfirm = sys.some(e => e.type === "delivery_log");
  const hasBlockchainTx    = sys.some(e => e.type === "blockchain_event");
  const hasPaymentRecord   = sys.some(e => e.type === "payment_record");

  if (dispute_type === "non_delivery") {
    if (hasDeliveryConfirm) {
      sellerScore += 35; buyerScore -= 35;
      reasoning.push("System delivery log confirmed → strong seller signal (+35)");
    } else {
      buyerScore += 30; sellerScore -= 30;
      reasoning.push("No system delivery confirmation → buyer favored (+30)");
    }
  }

  if (dispute_type === "payment_dispute") {
    if (hasBlockchainTx || hasPaymentRecord) {
      // Neutral until we know direction — flag for manual check
      reasoning.push("Blockchain/payment record found — direction determines outcome");
    } else {
      buyerScore += 20;
      reasoning.push("No on-chain payment confirmation → buyer favored (+20)");
    }
  }

  // ── Evidence volume & quality ─────────────────────────────
  const buyerEvidenceWeight  = buyerEvidence.length  * 5;
  const sellerEvidenceWeight = sellerEvidence.length * 5;
  buyerScore  += Math.min(buyerEvidenceWeight,  20);
  sellerScore += Math.min(sellerEvidenceWeight, 20);
  reasoning.push(`Evidence volume: buyer +${Math.min(buyerEvidenceWeight, 20)}, seller +${Math.min(sellerEvidenceWeight, 20)}`);

  // ── Profile signals (context modifiers, capped at ±10) ───
  const buyer  = parties?.buyer;
  const seller = parties?.seller;

  if (buyer) {
    if (!buyer.kyc_verified)    { buyerScore -= 5;  reasoning.push("Buyer KYC unverified (-5)"); }
    if (buyer.trust_score < 40) { buyerScore -= 5;  reasoning.push("Buyer low trust score (-5)"); }
    if (buyer.trust_score > 80) { buyerScore += 5;  reasoning.push("Buyer high trust score (+5)"); }
  }

  if (seller) {
    if (!seller.kyc_verified)          { sellerScore -= 5;  reasoning.push("Seller KYC unverified (-5)"); }
    if (seller.completion_rate < 0.85) { sellerScore -= 5;  reasoning.push("Seller completion rate <85% (-5)"); }
    if (seller.trust_score > 80)       { sellerScore += 5;  reasoning.push("Seller high trust score (+5)"); }
  }

  // ── Normalize to 100 ──────────────────────────────────────
  const total = buyerScore + sellerScore;
  const normalizedBuyer  = Math.round((buyerScore  / total) * 100);
  const normalizedSeller = Math.round((sellerScore / total) * 100);

  return {
    buyerScore:  Math.max(0, Math.min(100, normalizedBuyer)),
    sellerScore: Math.max(0, Math.min(100, normalizedSeller)),
    reasoning,
  };
}

// ─── 4. SPLIT RATIO RESOLVER ─────────────────────────────────
/**
 * Determines the appropriate split ratio if outcome is SPLIT.
 *
 * @param {number} buyerScore  - 0-100
 * @param {number} sellerScore - 0-100
 * @returns {{ buyerRefund: number, sellerRetains: number, tier: string }}
 */
export function resolveSplitRatio(buyerScore, sellerScore) {
  const diff = Math.abs(buyerScore - sellerScore);
  const buyerLeads = buyerScore >= sellerScore;

  // Tiers: <10% diff → 50/50, 10-20 → 60/40, 20-35 → 70/30, 35-50 → 80/20, >50 → 90/10
  let buyerRefund, sellerRetains, tier;

  if (diff < 10)       { buyerRefund = 50;  sellerRetains = 50;  tier = "50/50"; }
  else if (diff < 20)  { buyerRefund = buyerLeads ? 60 : 40; sellerRetains = buyerLeads ? 40 : 60; tier = "60/40"; }
  else if (diff < 35)  { buyerRefund = buyerLeads ? 70 : 30; sellerRetains = buyerLeads ? 30 : 70; tier = "70/30"; }
  else if (diff < 50)  { buyerRefund = buyerLeads ? 80 : 20; sellerRetains = buyerLeads ? 20 : 80; tier = "80/20"; }
  else                 { buyerRefund = buyerLeads ? 90 : 10; sellerRetains = buyerLeads ? 10 : 90; tier = "90/10"; }

  return { buyerRefund, sellerRetains, tier };
}

// ─── 5. CONTEXT BUILDER ──────────────────────────────────────
/**
 * Builds the Anthropic API payload for the Arbitration AI.
 * Injects full case file as structured context.
 *
 * @param {Object} caseFile   - Full dispute case file (see schema above)
 * @param {Array}  history    - Prior conversation turns [{role, content}]
 * @returns {Object}          - Anthropic API body
 */
export function buildArbitrationPayload(caseFile, history = []) {
  // Pre-calculate win rates so model has numerical anchors
  const { buyerScore, sellerScore, reasoning } = calculateWinRate(caseFile);

  // Determine preliminary outcome for model context
  const diff = Math.abs(buyerScore - sellerScore);
  let prelimOutcome;
  if (diff < 15)       prelimOutcome = "SPLIT (close case — analyze carefully)";
  else if (buyerScore > sellerScore) prelimOutcome = `BUYER FAVORED (${buyerScore}% vs ${sellerScore}%)`;
  else                 prelimOutcome = `SELLER FAVORED (${sellerScore}% vs ${buyerScore}%)`;

  const caseContext = `
## DISPUTE CASE FILE
${JSON.stringify(caseFile, null, 2)}

## PRE-ANALYSIS (system-calculated)
Preliminary win rate:
  Buyer:  ${buyerScore}%
  Seller: ${sellerScore}%
Preliminary outcome signal: ${prelimOutcome}
Signal reasoning:
${reasoning.map(r => `  • ${r}`).join("\n")}

## INSTRUCTIONS
Apply your full arbitration framework to this case.
Run KA() self-check before issuing your ruling.
Output using the standard ORINA ARBITRATION RULING format.
`;

  return {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: ARBITRATION_SYSTEM_PROMPT,
    messages: [
      ...history,
      { role: "user", content: caseContext },
    ],
  };
}

// ─── 6. USAGE EXAMPLE ────────────────────────────────────────
/*
import { buildArbitrationPayload, KA, calculateWinRate, resolveSplitRatio } from "./orina_arbitration_prompt.js";

const caseFile = {
  dispute_id: "DISP-2024-00123",
  filed_by: "buyer",
  dispute_type: "item_not_as_described",
  order: {
    order_id: "ORD-9981",
    created_at: "2024-11-01T10:00:00Z",
    amount: 4500,
    currency: "USD",
    status: "delivered",
    delivery_deadline: "2024-11-10T23:59:59Z",
    blockchain_tx_hash: "0xabc123..."
  },
  parties: {
    buyer: { user_id: "B001", display_name: "Nguyen Van A", account_age_days: 340,
             dispute_history: { total: 2, won: 1, lost: 1 }, kyc_verified: true, trust_score: 72 },
    seller: { user_id: "S001", display_name: "Tran Thi B", account_age_days: 890,
              dispute_history: { total: 5, won: 4, lost: 1 }, kyc_verified: true,
              trust_score: 85, total_completed_orders: 234, completion_rate: 0.97 }
  },
  asset: {
    asset_id: "ASSET-441", title: "Villa Quận 2 - 3PN", description: "Biệt thự mới 100%, view sông",
    listed_condition: "new", category: "real_estate", token_id: "NFT-441", blockchain_verified: true
  },
  messages: [
    { timestamp: "2024-11-11T09:00:00Z", sender: "buyer", content: "Tường có vết nứt, không như mô tả", attachments: [] },
    { timestamp: "2024-11-11T10:30:00Z", sender: "seller", content: "Vết nứt nhỏ do vận chuyển, không ảnh hưởng kết cấu", attachments: ["https://cdn.orina.io/evidence/seller-photo-1.jpg"] }
  ],
  evidence: {
    buyer_submitted:  [{ type: "image", url: "https://cdn.orina.io/evidence/buyer-crack-photo.jpg", description: "Vết nứt tường chính", timestamp: "2024-11-11T08:55:00Z" }],
    seller_submitted: [{ type: "image", url: "https://cdn.orina.io/evidence/seller-photo-1.jpg",  description: "Toàn cảnh villa trước giao", timestamp: "2024-11-01T09:00:00Z" }],
    system_generated: [{ type: "delivery_log", data: { confirmed: true, timestamp: "2024-11-09T15:30:00Z", signature: "verified" } }]
  },
  platform_policy_version: "v3.2"
};

const payload = buildArbitrationPayload(caseFile);
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
const data = await response.json();
const ruling = data.content.find(b => b.type === "text")?.text;
console.log(ruling);
*/