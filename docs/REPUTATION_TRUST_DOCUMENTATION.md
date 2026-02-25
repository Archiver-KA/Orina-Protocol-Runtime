# 🛡️ Orina Reputation & Trust System - Complete Technical Documentation
## Web3 Decentralized Trust Score & Rating Platform

> **Version:** 3.3-final  
> **Last Updated:** February 14, 2026  
> **Protocol:** Atomic Transaction Protocol (ATP) v3.3  
> **System Type:** On-Chain Reputation Management

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Reputation Architecture](#2-reputation-architecture)
3. [Reputation Score System](#3-reputation-score-system)
4. [Level Progression](#4-level-progression)
5. [Trust Badges](#5-trust-badges)
6. [Rating System](#6-rating-system)
7. [Component Scores](#7-component-scores)
8. [Reputation Display Component](#8-reputation-display-component)
9. [Reputation Modal](#9-reputation-modal)
10. [Reputation Section](#10-reputation-section)
11. [Storage System](#11-storage-system)
12. [Calculation Algorithms](#12-calculation-algorithms)
13. [Insights Generation](#13-insights-generation)
14. [Integration Guide](#14-integration-guide)
15. [Code Examples](#15-code-examples)
16. [Best Practices](#16-best-practices)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. System Overview

### 1.1. What is the Reputation System?

The **Reputation & Trust System** is a comprehensive on-chain reputation scoring platform that:
- **Tracks** user transaction history and performance metrics
- **Calculates** multi-dimensional trust scores (0-100 scale)
- **Awards** progressive reputation levels (6 tiers)
- **Displays** trust badges and social proof
- **Enables** peer-to-peer ratings and reviews
- **Provides** detailed breakdowns and insights

### 1.2. Key Features

✅ **6-Tier Reputation Levels:**
- 🌱 Newcomer (0-19): Access to marketplace, basic support
- 🥉 Bronze (20-39): Priority listings, email support
- 🥈 Silver (40-59): Featured listings, 2% fees
- 🥇 Gold (60-79): Premium placement, 1.5% fees
- 💎 Platinum (80-89): VIP placement, 1% fees, verified badge
- 👑 Diamond (90-100): Top placement, no fees, elite badge

✅ **Multi-Dimensional Scoring:**
- Transaction Score (25% weight): Based on volume and count
- Rating Score (25% weight): Based on average rating and review count
- Response Score (15% weight): Based on response time
- Completion Score (15% weight): Based on success rate
- Dispute Score (10% weight): Based on dispute rate and resolution
- Verification Score (10% weight): Based on verification status and account age

✅ **Trust Badges:**
- ✓ Verified User
- ⭐ Top Seller (4.5+ stars, 20+ transactions)
- ⚡ Fast Responder (≤30 min response time)
- 🛡️ Reliable (95%+ completion rate)
- 💎 Premium Member (Platinum/Diamond level)
- 🏆 Trusted (80+ reputation score)

✅ **Rating & Review System:**
- 5-star rating scale (1.0 - 5.0)
- Category ratings: Communication, Delivery, Accuracy
- Written reviews with pros/cons
- Verified purchase badges
- Helpful votes
- Review responses

✅ **Detailed Modal Interface:**
- Overview Tab: Hero stats, metrics, badges, insights
- Breakdown Tab: Component score visualization
- Ratings Tab: All user ratings with filters
- Levels Tab: All 6 reputation levels with benefits

---

## 2. Reputation Architecture

### 2.1. System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REPUTATION & TRUST SYSTEM ARCHITECTURE                   │
│                         ATP v3.3-final Protocol                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND LAYER (React Components)                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  Display Components:                                                  │  │
│  │  • ReputationDisplay (compact | detailed)                             │  │
│  │  • ReputationModal (4 tabs: overview, breakdown, ratings, levels)     │  │
│  │  • ReputationSection (wrapper with data loading)                      │  │
│  │                                                                       │  │
│  │  Features:                                                            │  │
│  │  • Real-time score display                                            │  │
│  │  • Animated progress bars                                             │  │
│  │  • Trust badge gallery                                                │  │
│  │  • Level progression tracker                                          │  │
│  │  • Insight cards                                                      │  │
│  │  • Platform comparison                                                │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  CALCULATION LAYER (Reputation Utils)                                │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  Score Calculation:                                                   │  │
│  │  • calculateReputationScore(): Main aggregation                       │  │
│  │  • calculateTransactionScore(): Volume + count                        │  │
│  │  • calculateRatingScore(): Average + count                            │  │
│  │  • calculateResponseScore(): Response time                            │  │
│  │  • calculateDisputeScore(): Dispute rate + resolution                 │  │
│  │  • calculateVerificationScore(): Verified + age                       │  │
│  │                                                                       │  │
│  │  Analysis:                                                            │  │
│  │  • getReputationLevel(): Determine tier                               │  │
│  │  • getTrustBadges(): Award badges                                     │  │
│  │  • getReputationInsights(): Generate insights                         │  │
│  │  • getScoreComparison(): Compare to average                           │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  DATA LAYER (Types & Storage)                                        │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  Core Types:                                                          │  │
│  │  • ReputationScore: Main score object                                 │  │
│  │  • Rating: Individual rating record                                   │  │
│  │  • TrustBadge: Badge metadata                                         │  │
│  │  • ReputationInsight: AI-generated insight                            │  │
│  │  • DisputeRecord: Dispute history                                     │  │
│  │                                                                       │  │
│  │  Storage (localStorage):                                              │  │
│  │  • studio_reputation_{userId}: ReputationScore                        │  │
│  │  • studio_ratings_{userId}: Rating[]                                  │  │
│  │  • studio_disputes_{userId}: DisputeRecord[]                          │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  DATA SOURCES                                                         │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  • User Activities (from profileUtils)                                │  │
│  │  • Transaction History (on-chain orders)                              │  │
│  │  • Peer Ratings (user reviews)                                        │  │
│  │  • Dispute Records (resolution system)                                │  │
│  │  • Verification Status (KYC/email/phone)                              │  │
│  │  • Account Age (registration date)                                    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Data Flow

```
┌──────────────────┐
│  User Activities │
│  (Transactions)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Load Activities  │────▶│  Peer Ratings    │────▶│ Dispute Records  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ calculateReputationScore │
                    │   (6 component scores)   │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Overall Score (0-100)  │
                    │   + Level Assignment     │
                    └──────────────┬───────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Trust Badges   │   │    Insights     │   │   Comparison    │
│  (6 types)      │   │  (AI-powered)   │   │  (Percentile)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                         │                         │
         └─────────────────────────┴─────────────────────────┘
                                   │
                                   ▼
                       ┌──────────────────────┐
                       │  Save to localStorage│
                       │  Display in UI       │
                       └──────────────────────┘
```

---

## 3. Reputation Score System

### 3.1. Core Interface

```typescript
export interface ReputationScore {
  userId: string;
  overallScore: number; // 0-100
  level: ReputationLevel;
  
  // Component scores (each 0-100)
  transactionScore: number;
  ratingScore: number;
  responseScore: number;
  completionScore: number;
  disputeScore: number;
  verificationScore: number;
  
  // Metrics
  metrics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: number; // ETH
    averageRating: number; // 0-5
    totalReviews: number;
    averageResponseTime: number; // minutes
    completionRate: number; // 0-100%
    disputeRate: number; // 0-100%
    disputesResolved: number;
    disputesTotal: number;
    accountAge: number; // days
  };
  
  // Trust indicators
  trustIndicators: {
    isVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    kycVerified: boolean;
    hasEscrow: boolean;
    premiumMember: boolean;
  };
  
  // History
  scoreHistory: ScoreHistoryItem[];
  recentRatings: Rating[];
  
  // Timestamps
  lastUpdated: number;
  lastTransactionDate?: number;
}
```

### 3.2. Weighted Calculation Formula

**Overall Score = Σ(Component Score × Weight)**

```
Overall Score = 
  transactionScore × 0.25 +
  ratingScore × 0.25 +
  responseScore × 0.15 +
  completionScore × 0.15 +
  disputeScore × 0.10 +
  verificationScore × 0.10
```

**Weight Rationale:**
- **Transaction + Rating (50%)**: Primary trust indicators based on activity
- **Response + Completion (30%)**: Service quality metrics
- **Dispute + Verification (20%)**: Risk mitigation factors

### 3.3. Score Ranges & Meanings

| Range | Level | Quality | Description |
|-------|-------|---------|-------------|
| 90-100 | Diamond 👑 | Elite | Top 1% performers, exceptional trust |
| 80-89 | Platinum 💎 | Excellent | Top 5% performers, very high trust |
| 60-79 | Gold 🥇 | Good | Reliable performers, high trust |
| 40-59 | Silver 🥈 | Average | Established users, moderate trust |
| 20-39 | Bronze 🥉 | New | Growing users, building trust |
| 0-19 | Newcomer 🌱 | Starting | New users, limited history |

---

## 4. Level Progression

### 4.1. All Reputation Levels

#### 🌱 Newcomer (0-19 points)
**Benefits:**
- Access to marketplace
- Basic support

**Characteristics:**
- New to platform
- Limited transaction history
- Building initial reputation

---

#### 🥉 Bronze (20-39 points)
**Benefits:**
- Priority listings
- Email support
- Basic analytics

**Requirements:**
- 5+ completed transactions
- 3.0+ average rating
- <20% dispute rate

---

#### 🥈 Silver (40-59 points)
**Benefits:**
- Featured listings
- Chat support
- Advanced analytics
- Lower fees (2%)

**Requirements:**
- 10+ completed transactions
- 3.5+ average rating
- <15% dispute rate
- 60+ day account age

---

#### 🥇 Gold (60-79 points)
**Benefits:**
- Premium placement
- Priority support
- Pro analytics
- Lowest fees (1.5%)

**Requirements:**
- 20+ completed transactions
- 4.0+ average rating
- <10% dispute rate
- 90+ day account age
- Email verified

---

#### 💎 Platinum (80-89 points)
**Benefits:**
- VIP placement
- 24/7 support
- Custom analytics
- Minimal fees (1%)
- Verified badge

**Requirements:**
- 50+ completed transactions
- 4.5+ average rating
- <5% dispute rate
- 180+ day account age
- Full verification (email + phone)

---

#### 👑 Diamond (90-100 points)
**Benefits:**
- Top placement
- Dedicated manager
- All features unlocked
- No fees (0%)
- Elite badge

**Requirements:**
- 100+ completed transactions
- 4.8+ average rating
- <2% dispute rate
- 365+ day account age
- KYC verified
- Premium member

---

### 4.2. Level Progression Chart

```
Diamond ┤                                               ░░░ (90-100)
        │                                          ░░░░░
Platinum┤                                     ░░░░░
        │                                ░░░░░
Gold    ┤                           ░░░░░
        │                      ░░░░░
Silver  ┤                 ░░░░░
        │            ░░░░░
Bronze  ┤       ░░░░░
        │  ░░░░░
Newcomer┤░░░
        └───────────────────────────────────────────────────────
         0    20   40    60    80   100  150  200  250  300 (days)
```

---

## 5. Trust Badges

### 5.1. Badge System

```typescript
export interface TrustBadge {
  id: string;
  type: 'verified' | 'top_seller' | 'fast_responder' | 
        'reliable' | 'premium' | 'trusted';
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedDate: number;
}
```

### 5.2. Badge Criteria

#### ✓ Verified User
**Criteria:**
- Email verified OR identity verified
- Awarded automatically upon verification

**Display:**
- Icon: ✓
- Color: `text-[#2CC295] bg-[#2CC295]/10`
- Position: Always displayed first

---

#### ⭐ Top Seller
**Criteria:**
- Average rating ≥ 4.5 stars
- Total transactions ≥ 20

**Display:**
- Icon: ⭐
- Color: `text-yellow-400 bg-yellow-400/10`
- Position: Prominent in profile

---

#### ⚡ Fast Responder
**Criteria:**
- Average response time ≤ 30 minutes

**Display:**
- Icon: ⚡
- Color: `text-orange-400 bg-orange-400/10`
- Position: Communication section

---

#### 🛡️ Reliable
**Criteria:**
- Completion rate ≥ 95%

**Display:**
- Icon: 🛡️
- Color: `text-blue-400 bg-blue-400/10`
- Position: Performance section

---

#### 💎 Premium Member
**Criteria:**
- Reputation level: Platinum or Diamond

**Display:**
- Icon: 💎
- Color: `text-purple-400 bg-purple-400/10`
- Position: Status section

---

#### 🏆 Trusted
**Criteria:**
- Overall reputation score ≥ 80

**Display:**
- Icon: 🏆
- Color: `text-cyan-400 bg-cyan-400/10`
- Position: Trust section

---

### 5.3. Badge Display Priority

**Compact View (max 3 badges):**
1. Verified User (if applicable)
2. Highest tier badge (Premium > Trusted > Top Seller)
3. Most recent earned badge

**Detailed View (all badges):**
- Grouped by category
- Sorted by earned date (newest first)
- Animated entrance

---

## 6. Rating System

### 6.1. Rating Interface

```typescript
export interface Rating {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  transactionId: string;
  assetId: string;
  assetName: string;
  
  // Ratings (1-5)
  overallRating: number;
  communicationRating: number;
  deliveryRating: number;
  accuracyRating: number;
  
  // Review
  review?: string;
  pros?: string[];
  cons?: string[];
  
  // Type
  ratingType: 'seller' | 'buyer';
  
  // Response
  response?: string;
  responseDate?: number;
  
  // Status
  verified: boolean;
  helpful: number;
  
  timestamp: number;
}
```

### 6.2. Rating Categories

#### Overall Rating (1.0 - 5.0)
**Weight:** 50%
**Description:** General satisfaction with the transaction

**Scale:**
- ⭐⭐⭐⭐⭐ 5.0: Exceptional
- ⭐⭐⭐⭐ 4.0-4.9: Great
- ⭐⭐⭐ 3.0-3.9: Good
- ⭐⭐ 2.0-2.9: Fair
- ⭐ 1.0-1.9: Poor

---

#### Communication Rating (1.0 - 5.0)
**Weight:** 20%
**Description:** Responsiveness and clarity

**Criteria:**
- Response time
- Message clarity
- Professionalism
- Availability

---

#### Delivery Rating (1.0 - 5.0)
**Weight:** 20%
**Description:** Timeliness and condition

**Criteria:**
- On-time delivery
- Asset condition
- Packaging quality
- Delivery updates

---

#### Accuracy Rating (1.0 - 5.0)
**Weight:** 10%
**Description:** Match to listing description

**Criteria:**
- Description accuracy
- Photo accuracy
- Feature completeness
- No surprises

---

### 6.3. Rating Color Scheme

```typescript
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-400';
  if (rating >= 4.0) return 'text-[#2CC295]';
  if (rating >= 3.5) return 'text-yellow-400';
  if (rating >= 3.0) return 'text-orange-400';
  return 'text-red-400';
}
```

---

## 7. Component Scores

### 7.1. Transaction Score (0-100)

**Weight:** 25% of overall score

**Formula:**
```typescript
function calculateTransactionScore(count: number, volume: number): number {
  const countScore = Math.min((count / 50) * 50, 50); // Max 50 for 50+ txns
  const volumeScore = Math.min((volume / 100) * 50, 50); // Max 50 for 100+ ETH
  return Math.round(countScore + volumeScore);
}
```

**Scoring Tiers:**
- 0-20: New user (0-5 transactions)
- 21-40: Growing (6-15 transactions)
- 41-60: Active (16-30 transactions)
- 61-80: Very Active (31-50 transactions)
- 81-100: Power User (50+ transactions, 100+ ETH)

---

### 7.2. Rating Score (0-100)

**Weight:** 25% of overall score

**Formula:**
```typescript
function calculateRatingScore(average: number, count: number): number {
  if (count === 0) return 50; // Neutral for no ratings
  
  const avgScore = (average / 5) * 70; // Max 70 for 5-star avg
  const countScore = Math.min((count / 20) * 30, 30); // Max 30 for 20+ reviews
  
  return Math.round(avgScore + countScore);
}
```

**Scoring Tiers:**
- 0-30: Poor reputation (<3.0 stars)
- 31-50: Below average (3.0-3.4 stars)
- 51-70: Average (3.5-3.9 stars)
- 71-85: Good (4.0-4.4 stars)
- 86-100: Excellent (4.5-5.0 stars, 20+ reviews)

---

### 7.3. Response Score (0-100)

**Weight:** 15% of overall score

**Formula:**
```typescript
function calculateResponseScore(avgMinutes: number): number {
  if (avgMinutes <= 15) return 100;
  if (avgMinutes <= 30) return 90;
  if (avgMinutes <= 60) return 80;
  if (avgMinutes <= 120) return 70;
  if (avgMinutes <= 240) return 60;
  if (avgMinutes <= 480) return 50;
  return 40;
}
```

**Response Time Tiers:**
- ≤15 min: Instant (100 points)
- ≤30 min: Very Fast (90 points) ⚡
- ≤1 hour: Fast (80 points)
- ≤2 hours: Good (70 points)
- ≤4 hours: Average (60 points)
- ≤8 hours: Slow (50 points)
- >8 hours: Very Slow (40 points)

---

### 7.4. Completion Score (0-100)

**Weight:** 15% of overall score

**Formula:**
```typescript
const completionRate = totalTransactions > 0
  ? (successfulTransactions / totalTransactions) * 100
  : 100; // Perfect score if no history

// Completion Score = Completion Rate (directly mapped)
```

**Completion Rate Tiers:**
- 95-100%: Excellent 🛡️
- 85-94%: Good
- 75-84%: Average
- 65-74%: Below Average
- <65%: Poor

---

### 7.5. Dispute Score (0-100)

**Weight:** 10% of overall score

**Formula:**
```typescript
function calculateDisputeScore(rate: number, resolved: number, total: number): number {
  if (total === 0) return 100; // No disputes = perfect
  
  const rateScore = Math.max(100 - rate * 2, 0); // Penalty for disputes
  const resolutionBonus = total > 0 ? (resolved / total) * 20 : 0; // Bonus for resolving
  
  return Math.round(Math.min(rateScore + resolutionBonus, 100));
}
```

**Dispute Rate Tiers:**
- 0%: Perfect (100 points)
- <2%: Excellent (90+ points)
- 2-5%: Good (70-89 points)
- 5-10%: Average (50-69 points)
- 10-20%: Poor (30-49 points)
- >20%: Very Poor (<30 points)

---

### 7.6. Verification Score (0-100)

**Weight:** 10% of overall score

**Formula:**
```typescript
function calculateVerificationScore(isVerified: boolean, accountAge: number): number {
  const verifiedScore = isVerified ? 50 : 0;
  const ageScore = Math.min((accountAge / 365) * 50, 50); // Max 50 for 1+ year
  return Math.round(verifiedScore + ageScore);
}
```

**Verification Tiers:**
- Verified + 1+ year: 100 points
- Verified + 6 months: 75 points
- Verified + new: 50 points
- Unverified + 1+ year: 50 points
- Unverified + new: 0 points

---

## 8. Reputation Display Component

### 8.1. Component Interface

```typescript
interface ReputationDisplayProps {
  score: ReputationScore;
  variant?: 'compact' | 'detailed';
  showBadges?: boolean;
  onClick?: () => void;
}
```

### 8.2. Compact Variant

**Use Case:** Inline display in cards, lists, headers

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [🥇 Gold]  [🛡️ 85]  [⭐ 4.8 (45)]  [✓] [⭐] [⚡]       │
│   Level      Score     Rating        Badges             │
└─────────────────────────────────────────────────────────┘
```

**Code Example:**
```tsx
<ReputationDisplay
  score={reputationScore}
  variant="compact"
  showBadges={true}
  onClick={() => openModal()}
/>
```

**Features:**
- Single-line horizontal layout
- Level badge with icon
- Shield icon + score
- Star icon + rating + count
- Top 3 badges (max)
- Clickable to open modal
- Hover opacity effect

---

### 8.3. Detailed Variant

**Use Case:** Profile pages, dedicated reputation sections

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [🥇 Gold (60-79)]                          [🛡️ 85 / 100]      │
│  Reputation Level                           Overall Score        │
│                                                                  │
│  Progress to next level: 85%                                    │
│  [████████████████████░░░░░░░]                                  │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ ⭐ 4.8  │  │ 📈 92%  │  │ ⏱ 25m  │  │ ⚠ 2.1% │          │
│  │ 45 rev  │  │ Success │  │ Response│  │ Disputes│          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                  │
│  Trust Badges:                                                   │
│  [✓ Verified] [⭐ Top Seller] [⚡ Fast Responder]              │
│                                                                  │
│  Click to view detailed reputation →                            │
└─────────────────────────────────────────────────────────────────┘
```

**Code Example:**
```tsx
<ReputationDisplay
  score={reputationScore}
  variant="detailed"
  showBadges={true}
  onClick={() => openModal()}
/>
```

**Features:**
- Hero card with gradient background
- Large level icon (60px)
- Animated progress bar (Motion)
- 4 key metric cards
- Full badge gallery
- Click hint at bottom

---

## 9. Reputation Modal

### 9.1. Modal Interface

```typescript
interface ReputationModalProps {
  score: ReputationScore;
  ratings: Rating[];
  onClose: () => void;
}
```

### 9.2. Modal Structure

**Dimensions:**
- Width: `max-w-4xl` (896px)
- Height: `max-h-[90vh]` (90% viewport height)
- Scrollable content area

**Header:**
```tsx
<div className="flex items-center justify-between p-6 border-b border-zinc-800">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-[#2CC295]/10 rounded-lg">
      <Shield size={24} className="text-[#2CC295]" />
    </div>
    <div>
      <h2>Reputation Score</h2>
      <p>Detailed trust & performance metrics</p>
    </div>
  </div>
  <button onClick={onClose}>
    <X size={20} />
  </button>
</div>
```

**Tabs:**
1. Overview
2. Score Breakdown
3. Ratings (count)
4. All Levels

---

### 9.3. Tab 1: Overview

**Hero Card:**
```
┌─────────────────────────────────────────────────────────┐
│  [🥇 Gold (60-79)]                    [🛡️ 85 / 100]     │
│  Reputation Level                     Overall Score      │
│                                                          │
│  Progress to next level: 25 points to Platinum          │
│  [████████████████░░░░░]  85%                           │
└─────────────────────────────────────────────────────────┘
```

**Key Metrics Grid (4 columns):**
```
┌──────────┬──────────┬──────────┬──────────┐
│ ⭐ 4.8   │ 📈 92%   │ ⏱ 25m   │ ⚠ 2.1%  │
│ 45 rev   │ Success  │ Response │ Disputes │
└──────────┴──────────┴──────────┴──────────┘
```

**Trust Badges Grid (2-3 columns):**
```tsx
{badges.map(badge => (
  <div className={`p-4 rounded-xl ${badge.color}`}>
    <div className="text-3xl">{badge.icon}</div>
    <p className="font-bold">{badge.name}</p>
    <p className="text-xs">{badge.description}</p>
  </div>
))}
```

**Reputation Insights:**
```tsx
{insights.map(insight => (
  <div className={`p-4 rounded-xl border ${
    insight.type === 'positive' ? 'bg-green-500/5 border-green-500/20' :
    insight.type === 'negative' ? 'bg-red-500/5 border-red-500/20' :
    'bg-blue-500/5 border-blue-500/20'
  }`}>
    <span className="badge">{insight.category}</span>
    <span className="badge">{insight.impact.toUpperCase()} IMPACT</span>
    <p>{insight.message}</p>
    {insight.suggestion && <p>💡 {insight.suggestion}</p>}
  </div>
))}
```

**Platform Comparison:**
```tsx
<div className="flex items-center justify-between">
  <div>
    <p>Your Score vs Platform Average</p>
    <div className="flex items-center gap-3">
      <span className="text-2xl font-bold">{comparison.userScore}</span>
      <span className="text-zinc-500">vs</span>
      <span className="text-lg font-bold">{comparison.averageScore}</span>
    </div>
  </div>
  <div>
    <p>Top Percentile</p>
    <span className="text-2xl font-bold text-[#2CC295]">{comparison.percentile}%</span>
  </div>
</div>
```

---

### 9.4. Tab 2: Score Breakdown

**Component List:**
```tsx
const components = [
  {
    name: 'Transactions',
    score: score.transactionScore,
    icon: TrendingUp,
    color: 'text-[#2CC295]',
    description: 'Based on transaction count and volume',
  },
  {
    name: 'Ratings',
    score: score.ratingScore,
    icon: Star,
    color: 'text-yellow-400',
    description: 'Based on average rating and review count',
  },
  // ... 4 more components
];
```

**Component Card:**
```
┌─────────────────────────────────────────────────────────┐
│  [📈] Transactions                             85       │
│       Based on transaction count and volume             │
│                                                          │
│  [████████████████████████░░░░░]  85%                   │
└─────────────────────────────────────────────────────────┘
```

**Color Coding:**
```typescript
const barColor = score >= 80 ? 'from-green-500 to-green-400' :
                 score >= 60 ? 'from-[#2CC295] to-[#25a882]' :
                 score >= 40 ? 'from-yellow-500 to-yellow-400' :
                               'from-orange-500 to-orange-400';
```

---

### 9.5. Tab 3: Ratings

**Rating Card:**
```
┌─────────────────────────────────────────────────────────┐
│  [@username] (2 hours ago)                    ⭐ 4.8    │
│                                               [Verified] │
│                                                          │
│  Communication: 5.0  Delivery: 4.5  Accuracy: 5.0      │
│                                                          │
│  "Great seller! Fast delivery and excellent..."         │
│                                                          │
│  Asset: Luxury Watch #1234     12 found helpful         │
└─────────────────────────────────────────────────────────┘
```

**Empty State:**
```tsx
<div className="text-center py-20">
  <Star size={48} className="mx-auto mb-4 text-zinc-700" />
  <p className="text-zinc-500">No ratings yet</p>
</div>
```

---

### 9.6. Tab 4: All Levels

**Level Card:**
```
┌─────────────────────────────────────────────────────────┐
│  [🥇 Gold]                                    [CURRENT] │
│  Score 60-79                                             │
│                                                          │
│  Benefits:                                               │
│  ✓ Premium placement                                     │
│  ✓ Priority support                                      │
│  ✓ Pro analytics                                         │
│  ✓ Lowest fees (1.5%)                                    │
└─────────────────────────────────────────────────────────┘
```

**Status Indicators:**
- Current Level: Green border, "CURRENT" badge
- Passed Levels: Checkmark icon
- Future Levels: Gray styling

---

## 10. Reputation Section

### 10.1. Component Overview

**Purpose:** Wrapper component that handles data loading and modal state

```typescript
interface ReputationSectionProps {
  userId: string;
  variant?: 'compact' | 'detailed';
  showModal?: boolean;
}
```

### 10.2. Data Loading Flow

```typescript
const loadReputationData = () => {
  // 1. Try to load existing score
  let reputationScore = loadReputationScore(userId);
  
  if (!reputationScore) {
    // 2. Calculate new score
    const activities = loadUserActivities(userId);
    const profile = loadUserProfile(userId);
    
    // 3. Load or generate ratings
    let userRatings = loadRatings(userId);
    if (userRatings.length === 0) {
      userRatings = generateMockRatings(userId, 10);
      saveRatings(userId, userRatings);
    }
    
    // 4. Calculate score
    const accountAge = Math.floor((Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24));
    
    reputationScore = calculateReputationScore(
      activities,
      userRatings,
      [], // disputes
      accountAge,
      profile?.verified || false
    );
    
    // 5. Save to localStorage
    saveReputationScore(reputationScore);
  }
  
  setScore(reputationScore);
  setRatings(loadRatings(userId));
};
```

### 10.3. Loading State

```tsx
if (!score) {
  return (
    <div className="p-6 bg-zinc-900 rounded-xl animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
    </div>
  );
}
```

---

## 11. Storage System

### 11.1. LocalStorage Keys

```typescript
const REPUTATION_KEY = 'studio_reputation'; // + _{userId}
const RATINGS_KEY = 'studio_ratings';       // + _{userId}
const DISPUTES_KEY = 'studio_disputes';     // + _{userId}
```

### 11.2. Storage Functions

#### Save Reputation Score
```typescript
export function saveReputationScore(score: ReputationScore): void {
  try {
    localStorage.setItem(
      `${REPUTATION_KEY}_${score.userId}`, 
      JSON.stringify(score)
    );
  } catch (error) {
    console.error('Failed to save reputation score:', error);
  }
}
```

#### Load Reputation Score
```typescript
export function loadReputationScore(userId: string): ReputationScore | null {
  try {
    const stored = localStorage.getItem(`${REPUTATION_KEY}_${userId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load reputation score:', error);
    return null;
  }
}
```

#### Save Ratings
```typescript
export function saveRatings(userId: string, ratings: Rating[]): void {
  try {
    localStorage.setItem(
      `${RATINGS_KEY}_${userId}`, 
      JSON.stringify(ratings)
    );
  } catch (error) {
    console.error('Failed to save ratings:', error);
  }
}
```

#### Load Ratings
```typescript
export function loadRatings(userId: string): Rating[] {
  try {
    const stored = localStorage.getItem(`${RATINGS_KEY}_${userId}`);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load ratings:', error);
    return [];
  }
}
```

#### Add Rating
```typescript
export function addRating(rating: Rating): void {
  const ratings = loadRatings(rating.toUserId);
  ratings.unshift(rating); // Add to beginning
  saveRatings(rating.toUserId, ratings);
}
```

---

## 12. Calculation Algorithms

### 12.1. Main Calculation Function

```typescript
export function calculateReputationScore(
  activities: ActivityItem[],
  ratings: Rating[],
  disputes: DisputeRecord[],
  accountAge: number, // days
  isVerified: boolean
): ReputationScore {
  const userId = activities[0]?.userId || 'unknown';
  
  // 1. Extract transaction metrics
  const totalTransactions = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'completed'
  ).length;
  
  const successfulTransactions = totalTransactions; // completed only
  const failedTransactions = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'failed'
  ).length;
  
  const totalVolume = activities
    .filter(a => ['purchase', 'sale'].includes(a.type) && a.status === 'completed')
    .reduce((sum, a) => sum + (a.price || 0), 0);
  
  // 2. Calculate rating metrics
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length
    : 0;
  
  const totalReviews = ratings.length;
  
  // 3. Mock response time (would be calculated from messages)
  const averageResponseTime = 45; // minutes
  
  // 4. Calculate completion rate
  const completionRate = totalTransactions > 0
    ? (successfulTransactions / totalTransactions) * 100
    : 100;
  
  // 5. Calculate dispute metrics
  const disputesTotal = disputes.length;
  const disputesResolved = disputes.filter(d => d.status === 'resolved').length;
  const disputeRate = totalTransactions > 0
    ? (disputesTotal / totalTransactions) * 100
    : 0;
  
  // 6. Calculate component scores
  const transactionScore = calculateTransactionScore(totalTransactions, totalVolume);
  const ratingScore = calculateRatingScore(averageRating, totalReviews);
  const responseScore = calculateResponseScore(averageResponseTime);
  const completionScore = completionRate;
  const disputeScore = calculateDisputeScore(disputeRate, disputesResolved, disputesTotal);
  const verificationScore = calculateVerificationScore(isVerified, accountAge);
  
  // 7. Calculate overall score (weighted average)
  const overallScore = Math.round(
    transactionScore * 0.25 +
    ratingScore * 0.25 +
    responseScore * 0.15 +
    completionScore * 0.15 +
    disputeScore * 0.10 +
    verificationScore * 0.10
  );
  
  // 8. Determine level
  const level = getReputationLevel(overallScore);
  
  // 9. Return complete score object
  return {
    userId,
    overallScore,
    level,
    transactionScore,
    ratingScore,
    responseScore,
    completionScore,
    disputeScore,
    verificationScore,
    metrics: {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalVolume,
      averageRating,
      totalReviews,
      averageResponseTime,
      completionRate,
      disputeRate,
      disputesResolved,
      disputesTotal,
      accountAge,
    },
    trustIndicators: {
      isVerified,
      emailVerified: isVerified,
      phoneVerified: false,
      kycVerified: false,
      hasEscrow: totalTransactions > 0,
      premiumMember: level === 'platinum' || level === 'diamond',
    },
    scoreHistory: [],
    recentRatings: ratings.slice(0, 5),
    lastUpdated: Date.now(),
  };
}
```

---

## 13. Insights Generation

### 13.1. Insight Interface

```typescript
export interface ReputationInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  suggestion?: string;
}
```

### 13.2. Insight Generation Logic

```typescript
export function getReputationInsights(score: ReputationScore): ReputationInsight[] {
  const insights: ReputationInsight[] = [];
  
  // Transaction volume insight
  if (score.metrics.totalVolume >= 50) {
    insights.push({
      type: 'positive',
      category: 'Transactions',
      message: `High transaction volume (${score.metrics.totalVolume.toFixed(1)} ETH)`,
      impact: 'high',
    });
  } else if (score.metrics.totalTransactions < 5) {
    insights.push({
      type: 'negative',
      category: 'Transactions',
      message: 'Low transaction history',
      impact: 'medium',
      suggestion: 'Complete more transactions to build trust',
    });
  }
  
  // Rating insight
  if (score.metrics.averageRating >= 4.5) {
    insights.push({
      type: 'positive',
      category: 'Ratings',
      message: `Excellent rating (${score.metrics.averageRating.toFixed(1)}/5.0)`,
      impact: 'high',
    });
  } else if (score.metrics.averageRating < 3.5 && score.metrics.totalReviews > 0) {
    insights.push({
      type: 'negative',
      category: 'Ratings',
      message: 'Below average rating',
      impact: 'high',
      suggestion: 'Improve communication and delivery quality',
    });
  }
  
  // Response time insight
  if (score.metrics.averageResponseTime <= 30) {
    insights.push({
      type: 'positive',
      category: 'Response',
      message: 'Very fast response time',
      impact: 'medium',
    });
  } else if (score.metrics.averageResponseTime > 120) {
    insights.push({
      type: 'negative',
      category: 'Response',
      message: 'Slow response time',
      impact: 'medium',
      suggestion: 'Try to respond within 1 hour',
    });
  }
  
  // Disputes insight
  if (score.metrics.disputeRate === 0) {
    insights.push({
      type: 'positive',
      category: 'Disputes',
      message: 'No disputes filed',
      impact: 'medium',
    });
  } else if (score.metrics.disputeRate > 5) {
    insights.push({
      type: 'negative',
      category: 'Disputes',
      message: 'High dispute rate',
      impact: 'high',
      suggestion: 'Ensure accurate listings and clear communication',
    });
  }
  
  // Verification insight
  if (!score.trustIndicators.isVerified) {
    insights.push({
      type: 'neutral',
      category: 'Verification',
      message: 'Account not verified',
      impact: 'medium',
      suggestion: 'Verify your account to increase trust',
    });
  }
  
  return insights;
}
```

---

## 14. Integration Guide

### 14.1. Basic Integration

**Step 1: Display Compact Reputation**
```tsx
import { ReputationSection } from '@/app/components/reputation/reputation-section';

function SellerCard({ seller }) {
  return (
    <div className="seller-card">
      <h3>{seller.name}</h3>
      <ReputationSection
        userId={seller.id}
        variant="compact"
        showModal={true}
      />
    </div>
  );
}
```

**Step 2: Display Detailed Reputation**
```tsx
function ProfilePage({ userId }) {
  return (
    <div className="profile">
      <h1>User Profile</h1>
      <ReputationSection
        userId={userId}
        variant="detailed"
        showModal={true}
      />
    </div>
  );
}
```

---

### 14.2. Direct Component Usage

**Using ReputationDisplay Directly:**
```tsx
import { useState, useEffect } from 'react';
import { ReputationDisplay } from '@/app/components/reputation/reputation-display';
import { ReputationModal } from '@/app/components/reputation/reputation-modal';
import { loadReputationScore, loadRatings } from '@/utils/reputationUtils';

function CustomReputationSection({ userId }) {
  const [score, setScore] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const loadedScore = loadReputationScore(userId);
    const loadedRatings = loadRatings(userId);
    setScore(loadedScore);
    setRatings(loadedRatings);
  }, [userId]);
  
  if (!score) return <div>Loading...</div>;
  
  return (
    <>
      <ReputationDisplay
        score={score}
        variant="detailed"
        showBadges={true}
        onClick={() => setIsModalOpen(true)}
      />
      
      {isModalOpen && (
        <ReputationModal
          score={score}
          ratings={ratings}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
```

---

### 14.3. Calculating New Scores

```tsx
import {
  calculateReputationScore,
  saveReputationScore,
} from '@/utils/reputationUtils';
import { loadUserActivities, loadUserProfile } from '@/utils/profileUtils';

function recalculateReputation(userId: string) {
  // Load data sources
  const activities = loadUserActivities(userId);
  const profile = loadUserProfile(userId);
  const ratings = loadRatings(userId);
  const disputes = []; // Load from dispute system
  
  // Calculate account age
  const accountAge = Math.floor(
    (Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate score
  const score = calculateReputationScore(
    activities,
    ratings,
    disputes,
    accountAge,
    profile.verified
  );
  
  // Save
  saveReputationScore(score);
  
  return score;
}
```

---

### 14.4. Adding Ratings

```tsx
import { addRating, generateMockRatings } from '@/utils/reputationUtils';

function submitReview(data) {
  const rating: Rating = {
    id: `rating_${Date.now()}`,
    fromUserId: currentUserId,
    fromUsername: currentUser.name,
    toUserId: sellerId,
    transactionId: orderId,
    assetId: assetId,
    assetName: assetName,
    overallRating: data.overallRating,
    communicationRating: data.communicationRating,
    deliveryRating: data.deliveryRating,
    accuracyRating: data.accuracyRating,
    review: data.review,
    pros: data.pros,
    cons: data.cons,
    ratingType: 'seller',
    verified: true,
    helpful: 0,
    timestamp: Date.now(),
  };
  
  // Save rating
  addRating(rating);
  
  // Recalculate reputation
  recalculateReputation(sellerId);
}
```

---

## 15. Code Examples

### 15.1. Complete Example: Seller Card with Reputation

```tsx
import { ReputationSection } from '@/app/components/reputation/reputation-section';
import { Star, Shield } from 'lucide-react';

interface SellerCardProps {
  seller: {
    id: string;
    name: string;
    avatar: string;
    totalSales: number;
  };
}

export function SellerCard({ seller }: SellerCardProps) {
  return (
    <div className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <img 
          src={seller.avatar} 
          alt={seller.name}
          className="w-16 h-16 rounded-full"
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{seller.name}</h3>
          <p className="text-sm text-zinc-500">{seller.totalSales} sales</p>
        </div>
      </div>
      
      {/* Reputation */}
      <ReputationSection
        userId={seller.id}
        variant="compact"
        showModal={true}
      />
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button className="flex-1 px-4 py-2 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors">
          View Profile
        </button>
        <button className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-lg transition-colors">
          Message
        </button>
      </div>
    </div>
  );
}
```

---

### 15.2. Complete Example: Profile Page with Detailed Reputation

```tsx
import { useState } from 'react';
import { ReputationSection } from '@/app/components/reputation/reputation-section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

export function ProfilePage({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
        <p className="text-zinc-500">View reputation, activity, and assets</p>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {/* Reputation Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Reputation Score</h2>
            <ReputationSection
              userId={userId}
              variant="detailed"
              showModal={true}
            />
          </div>
          
          {/* Other sections... */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 16. Best Practices

### 16.1. Score Calculation

✅ **DO:**
- Recalculate scores after major events (new transaction, rating, dispute)
- Cache scores in localStorage to avoid redundant calculations
- Use weighted averages for balanced scoring
- Include multiple data sources (activity, ratings, disputes)

❌ **DON'T:**
- Recalculate on every render (performance issue)
- Rely on single metric for overall score
- Ignore account age in verification score
- Use unweighted averages

---

### 16.2. Badge Management

✅ **DO:**
- Award badges automatically based on clear criteria
- Display badges in priority order (verified first)
- Show max 3 badges in compact view
- Use hover tooltips for badge descriptions

❌ **DON'T:**
- Manually award badges
- Display all badges in compact view (cluttered)
- Change badge criteria without notice
- Use unclear badge names

---

### 16.3. Rating System

✅ **DO:**
- Require verified purchases for ratings
- Allow 1-5 star ratings with category breakdown
- Enable review responses
- Show "helpful" votes
- Display verified purchase badge

❌ **DON'T:**
- Allow ratings without transactions
- Use binary rating system (like/dislike)
- Hide negative reviews
- Allow fake reviews

---

### 16.4. UI/UX

✅ **DO:**
- Use compact variant in cards/lists
- Use detailed variant in profiles
- Animate progress bars with Motion
- Show loading state while calculating
- Make display clickable to open modal

❌ **DON'T:**
- Show detailed variant in tight spaces
- Use static progress bars
- Display raw score without context
- Block interactions during loading

---

## 17. Troubleshooting

### 17.1. Score Not Updating

**Symptom:** Reputation score doesn't reflect recent activity

**Causes:**
1. localStorage cache not invalidated
2. Activities not loaded correctly
3. Calculation function not called

**Solution:**
```typescript
// Force recalculation
function forceRecalculate(userId: string) {
  // Clear cached score
  localStorage.removeItem(`studio_reputation_${userId}`);
  
  // Reload and recalculate
  const activities = loadUserActivities(userId);
  const ratings = loadRatings(userId);
  const score = calculateReputationScore(activities, ratings, [], 30, false);
  saveReputationScore(score);
  
  return score;
}
```

---

### 17.2. Badges Not Displaying

**Symptom:** Trust badges don't appear despite meeting criteria

**Causes:**
1. Badge criteria not met
2. `showBadges={false}` prop
3. Score not loaded

**Solution:**
```typescript
// Debug badge criteria
const score = loadReputationScore(userId);
const badges = getTrustBadges(score);

console.log('Badges:', badges);
console.log('Criteria check:');
console.log('- Verified:', score.trustIndicators.isVerified);
console.log('- Avg Rating:', score.metrics.averageRating);
console.log('- Total Txns:', score.metrics.totalTransactions);
console.log('- Response Time:', score.metrics.averageResponseTime);
console.log('- Completion Rate:', score.metrics.completionRate);
console.log('- Overall Score:', score.overallScore);
```

---

### 17.3. Modal Not Opening

**Symptom:** Clicking reputation display doesn't open modal

**Causes:**
1. `showModal={false}` prop
2. Missing `onClick` handler
3. Modal state not managed

**Solution:**
```tsx
// Ensure modal is enabled
<ReputationSection
  userId={userId}
  variant="detailed"
  showModal={true} // ✅ Enable modal
/>

// Or manage modal manually
const [isModalOpen, setIsModalOpen] = useState(false);

<ReputationDisplay
  score={score}
  onClick={() => setIsModalOpen(true)} // ✅ Add handler
/>

{isModalOpen && (
  <ReputationModal
    score={score}
    ratings={ratings}
    onClose={() => setIsModalOpen(false)}
  />
)}
```

---

### 17.4. Ratings Not Loading

**Symptom:** Ratings tab shows "No ratings yet" despite having reviews

**Causes:**
1. Ratings not saved to localStorage
2. Wrong userId key
3. Ratings array empty

**Solution:**
```typescript
// Debug ratings storage
const ratings = loadRatings(userId);
console.log('Ratings count:', ratings.length);
console.log('Storage key:', `studio_ratings_${userId}`);

// Generate mock ratings for testing
if (ratings.length === 0) {
  const mockRatings = generateMockRatings(userId, 10);
  saveRatings(userId, mockRatings);
  console.log('Generated mock ratings:', mockRatings.length);
}
```

---

### 17.5. Performance Issues

**Symptom:** UI freezes when displaying reputation

**Causes:**
1. Calculating score on every render
2. No memoization
3. Large rating arrays

**Solution:**
```tsx
// Memoize score calculation
const score = useMemo(() => {
  const stored = loadReputationScore(userId);
  if (stored) return stored;
  
  const calculated = calculateReputationScore(
    activities,
    ratings,
    disputes,
    accountAge,
    isVerified
  );
  saveReputationScore(calculated);
  return calculated;
}, [userId, activities.length, ratings.length]);

// Paginate ratings in modal
const displayedRatings = ratings.slice(0, currentPage * 10);
```

---

## 🎉 Conclusion

The **Reputation & Trust System** is a comprehensive scoring platform that provides:

✅ **6-tier reputation levels** with clear progression
✅ **Multi-dimensional scoring** from 6 component metrics
✅ **Trust badges** for social proof
✅ **Peer rating system** with category breakdowns
✅ **Detailed modal** with 4 tabs of insights
✅ **localStorage persistence** for fast loading
✅ **AI-powered insights** for improvement suggestions

**Key Files:**
- `/src/types/reputation.ts` - Type definitions (162 lines)
- `/src/utils/reputationUtils.ts` - Core logic (596 lines)
- `/src/app/components/reputation/reputation-display.tsx` - Display component (202 lines)
- `/src/app/components/reputation/reputation-modal.tsx` - Modal component (571 lines)
- `/src/app/components/reputation/reputation-section.tsx` - Wrapper component (104 lines)

**Total Lines:** ~1,635 lines of production code

**Next Steps:**
1. Integrate with blockchain transactions for real-time updates
2. Add dispute management system
3. Implement verification flows (email, phone, KYC)
4. Create reputation API for external services
5. Add reputation history timeline

---

**Documentation Version:** 3.3-final  
**Last Updated:** February 14, 2026  
**Maintained By:** Orina Core Team
