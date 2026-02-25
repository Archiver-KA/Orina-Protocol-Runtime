# 🤖 Orina AI Agent - Tài Liệu Kỹ Thuật Đầy Đủ

> **Version:** 1.0  
> **Last Updated:** February 13, 2026  
> **Author:** Orina Development Team  
> **Engine:** Rule-based NLP with API Integration

---

## 📋 Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Architecture & Workflow](#2-architecture--workflow)
3. [Configuration](#3-configuration)
4. [Behavior Modes](#4-behavior-modes)
5. [Intent Recognition](#5-intent-recognition)
6. [Response Rules](#6-response-rules)
7. [API Integration](#7-api-integration)
8. [Frontend Components](#8-frontend-components)
9. [Testing & Debugging](#9-testing--debugging)
10. [Code Examples](#10-code-examples)
11. [Best Practices](#11-best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Tổng Quan

### 1.1. Giới Thiệu

**Orina AI Agent** là hệ thống AI chatbot tự động được thiết kế để:
- ✅ Trả lời câu hỏi của khách hàng 24/7
- ✅ Cung cấp thông tin về assets, pricing, shipping
- ✅ Tạo orders tự động
- ✅ Tích hợp với Messenger system
- ✅ Có thể customize behavior (conservative, moderate, aggressive)

**Key Features:**
- 🚀 **Real-time Response** - Instant replies to customer inquiries
- 🎯 **Intent Recognition** - Rule-based NLP for 7 categories
- 🔌 **API Integration** - Access seller's asset data via API keys
- 🎨 **Customizable** - 3 behavior modes + custom greeting
- 📊 **Analytics** - Track response confidence, API calls, and performance

---

### 1.2. Use Cases

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT USE CASES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🛍️  E-COMMERCE                                                 │
│  Customer: "What assets do you have available?"                │
│  AI Agent: Lists all assets with pricing                       │
│                                                                 │
│  💰  PRICING INQUIRY                                            │
│  Customer: "How much is the Miami Condo?"                      │
│  AI Agent: Provides detailed pricing + payment options         │
│                                                                 │
│  📦  SHIPPING INFO                                              │
│  Customer: "How long does delivery take?"                      │
│  AI Agent: Explains shipping options + tracking                │
│                                                                 │
│  🔐  PAYMENT SECURITY                                           │
│  Customer: "Is it safe to pay with crypto?"                    │
│  AI Agent: Explains escrow + blockchain security               │
│                                                                 │
│  🛒  ORDER CREATION                                             │
│  Customer: "I want to buy the Tesla Model 3"                   │
│  AI Agent: Guides through order process                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture & Workflow

### 2.1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI AGENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │   Customer   │                                              │
│  │   Message    │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  1. INTENT RECOGNITION                              │       │
│  │  - Match patterns (7 categories)                    │       │
│  │  - Calculate confidence score                       │       │
│  │  - Select best matching rule                        │       │
│  └──────┬──────────────────────────────────────────────┘       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  2. PERMISSION CHECK                                │       │
│  │  - Does rule require API call?                      │       │
│  │  - Does seller have API key?                        │       │
│  │  - Does key have required permissions?              │       │
│  └──────┬──────────────────────────────────────────────┘       │
│         │                                                       │
│    ┌────┴────┐                                                 │
│    │         │                                                 │
│    ▼         ▼                                                 │
│  ┌───┐    ┌──────────────────────────────────────┐            │
│  │No │    │  3. API CALL (if required)           │            │
│  └─┬─┘    │  - fetch_assets                      │            │
│    │      │  - get_pricing                       │            │
│    │      │  - check_availability                │            │
│    │      └──────┬───────────────────────────────┘            │
│    │             │                                             │
│    │             ▼                                             │
│    │      ┌─────────────────────────────────────┐             │
│    │      │  4. FORMAT RESPONSE                 │             │
│    │      │  - Insert API data into template    │             │
│    │      │  - Replace {variables}              │             │
│    │      └──────┬──────────────────────────────┘             │
│    │             │                                             │
│    └─────────────┘                                             │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  5. SAVE & RETURN                                   │       │
│  │  - Save message to conversation history             │       │
│  │  - Return response to customer                      │       │
│  │  - Log metadata (intent, confidence, API call)      │       │
│  └─────────────────────────────────────────────────────┘       │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │   Customer   │                                              │
│  │   Receives   │                                              │
│  │   Response   │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Message Flow

**1. Customer sends message:**
```typescript
POST /ai/chat
{
  "sellerAddress": "0x742d35Cc...",
  "message": "What assets do you sell?",
  "conversationId": "conv_buyer_seller"
}
```

**2. Intent recognition:**
```typescript
// Engine matches "assets" and "sell" patterns
matchIntent("What assets do you sell?")
// Returns: { rule: asset_inquiry_1, confidence: 0.9 }
```

**3. API call (if required):**
```typescript
// Rule requires 'read' permission
executeAction('fetch_assets', apiKey)
// Returns: { assetCount: 3, assetList: "1. Tesla...\n2. Condo..." }
```

**4. Format response:**
```typescript
formatResponse(
  "I have {assetCount} assets available...",
  { assetCount: 3, assetList: "..." }
)
// Returns: "I have 3 assets available. Here are some highlights:\n\n1. Tesla Model 3..."
```

**5. Return to customer:**
```typescript
{
  "success": true,
  "response": {
    "id": "msg_1707829522000_xyz",
    "content": "I have 3 assets available...",
    "timestamp": "2026-02-13T15:45:22.000Z",
    "metadata": {
      "intent": "asset_inquiry",
      "confidence": 0.9,
      "apiCallMade": true,
      "assetIds": ["asset_1", "asset_2", "asset_3"]
    }
  }
}
```

---

## 3. Configuration

### 3.1. AIAgentConfig Type

```typescript
export interface AIAgentConfig {
  id: string;                      // "ai_agent_1707829522000_xyz"
  walletAddress: string;           // Seller's wallet address
  enabled: boolean;                // AI Agent enabled/disabled
  name: string;                    // "Sales Assistant" (customer-facing)
  behavior: AIAgentBehavior;       // 'conservative' | 'moderate' | 'aggressive'
  autoReplyEnabled: boolean;       // Auto-reply to new messages
  greetingMessage?: string;        // Custom greeting (optional)
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}
```

### 3.2. Default Configuration

```typescript
const DEFAULT_CONFIG: AIAgentConfig = {
  id: `ai_agent_${Date.now()}_${randomString()}`,
  walletAddress: sellerAddress,
  enabled: false,                  // Disabled by default
  name: 'AI Assistant',
  behavior: 'moderate',            // Balanced approach
  autoReplyEnabled: true,          // Auto-reply on
  greetingMessage: undefined,      // Use default greeting
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

### 3.3. Configuration UI

**Location:** `/src/app/components/ai-agent-settings.tsx`

**Features:**
- ✅ Enable/Disable toggle
- ✅ Agent name input
- ✅ Behavior mode selector (3 options)
- ✅ Auto-reply toggle
- ✅ Custom greeting message
- ✅ Test AI Agent button
- ✅ API Key requirement warning

**Example UI:**
```tsx
<AIAgentSettings 
  walletAddress={address}
  onNavigateToTest={() => navigate('/test-ai-agent')}
/>
```

---

## 4. Behavior Modes

### 4.1. Conservative Mode

**Personality:** Cautious, helpful, avoids assumptions

**Use Case:** High-value assets, professional services

**Characteristics:**
- ✅ Clear, concise responses
- ✅ Always asks for clarification
- ✅ Minimal sales pressure
- ✅ Focuses on providing information

**Example Response:**
```
Customer: "I need something"

Conservative:
"I'm not sure I understand. Could you rephrase your question? 
I can help with viewing assets, pricing, orders, shipping, 
and payment methods."
```

**Best For:**
- Luxury goods ($100k+)
- Real estate
- High-ticket items
- Professional B2B sales

---

### 4.2. Moderate Mode (Recommended)

**Personality:** Balanced, friendly, helpful

**Use Case:** General e-commerce, most sellers

**Characteristics:**
- ✅ Friendly and approachable
- ✅ Provides options when unsure
- ✅ Gently guides towards purchase
- ✅ Balances information and sales

**Example Response:**
```
Customer: "I need something"

Moderate:
"I'm not entirely sure what you're asking about, but I'd be 
happy to help! Here are some things I can assist with:

• View available assets
• Get pricing information
• Create an order
• Shipping details
• Payment methods

What interests you most?"
```

**Best For:**
- Most sellers (60-70% of use cases)
- Mid-range products ($1k-$100k)
- Standard e-commerce
- Balanced approach

---

### 4.3. Aggressive Mode

**Personality:** Proactive, sales-focused, enthusiastic

**Use Case:** Flash sales, urgent inventory, promotional campaigns

**Characteristics:**
- ✅ Proactively suggests products
- ✅ Emphasizes value and urgency
- ✅ Direct calls-to-action
- ✅ Highlights featured items

**Example Response:**
```
Customer: "I need something"

Aggressive:
"Great question! While I process that, let me show you our 
featured assets:

✨ Tesla Model 3 (2023) - $35,000
✨ Miami Condo - $450,000
✨ Gold Reserve 1kg - $65,000

Any of these catch your eye? I can provide more details or 
start an order right away!"
```

**Best For:**
- Flash sales / limited inventory
- Promotional campaigns
- Lower-priced items (<$10k)
- High-volume sales

---

## 5. Intent Recognition

### 5.1. Intent Categories

AI Agent recognizes **7 intent categories**:

| Category | Keywords | Response Type | API Call? |
|----------|----------|---------------|-----------|
| `greeting` | hi, hello, hey, morning | Greeting + offer help | No |
| `asset_inquiry` | sell, asset, listing, product, have | List assets | Yes (read) |
| `pricing` | price, cost, much, expensive | Pricing info | Yes (read) |
| `order` | buy, purchase, order, checkout | Order flow | No |
| `shipping` | ship, deliver, arrive, tracking | Shipping info | No |
| `payment` | payment, crypto, escrow, pay | Payment methods | No |
| `general` | help, support, question, work | General help | No |

### 5.2. Pattern Matching Algorithm

```typescript
private static matchIntent(message: string): { rule: AIAgentRule | null; confidence: number } {
  const messageLower = message.toLowerCase().trim();
  let bestMatch: AIAgentRule | null = null;
  let highestConfidence = 0;

  for (const rule of AI_AGENT_RULES) {
    for (const pattern of rule.patterns) {
      const patternLower = pattern.toLowerCase();
      
      // 1. Substring matching (high confidence)
      if (messageLower.includes(patternLower)) {
        const confidence = 0.9;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = rule;
        }
      }
      
      // 2. Regex matching (medium confidence)
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(messageLower)) {
          const confidence = 0.85;
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = rule;
          }
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  return { rule: bestMatch, confidence: highestConfidence };
}
```

**Confidence Levels:**
- `0.9+` - High confidence (exact keyword match)
- `0.85+` - Medium confidence (regex match)
- `< 0.85` - Low confidence (no match, use fallback)

### 5.3. Example Matches

```typescript
// Example 1: Greeting
matchIntent("Hello there!")
// Returns: { rule: greeting_1, confidence: 0.9 }

// Example 2: Asset inquiry
matchIntent("What products do you sell?")
// Returns: { rule: asset_inquiry_1, confidence: 0.9 }
// (matched "sell" and "product")

// Example 3: Pricing
matchIntent("How much does the condo cost?")
// Returns: { rule: pricing_1, confidence: 0.9 }
// (matched "much" and "cost")

// Example 4: No match
matchIntent("What is the meaning of life?")
// Returns: { rule: null, confidence: 0 }
// Uses fallback response based on behavior mode
```

---

## 6. Response Rules

### 6.1. Rule Structure

```typescript
export interface AIAgentRule {
  id: string;                      // Unique rule ID
  patterns: string[];              // Keywords to match
  category: string;                // Intent category
  action?: string;                 // API action (optional)
  responseTemplate: string;        // Response with {variables}
  requiresApiCall: boolean;        // Requires API?
  permissions: string[];           // Required API permissions
}
```

### 6.2. All Rules

#### **Rule 1: Greeting**
```typescript
{
  id: 'greeting_1',
  patterns: ['hi', 'hello', 'hey', 'morning', 'afternoon', 'evening', 'greetings'],
  category: 'greeting',
  responseTemplate: "Hello! I'm {agentName}, your AI assistant. How can I help you today? Feel free to ask about available assets, pricing, or place an order.",
  requiresApiCall: false,
  permissions: []
}
```

**Example:**
```
Customer: "Hello!"
AI Agent: "Hello! I'm Sales Assistant, your AI assistant. How can I help you today? 
           Feel free to ask about available assets, pricing, or place an order."
```

---

#### **Rule 2: Asset Inquiry**
```typescript
{
  id: 'asset_inquiry_1',
  patterns: ['sell', 'asset', 'listing', 'product', 'have', 'inventory', 'catalog', 'show', 'available'],
  category: 'asset_inquiry',
  action: 'fetch_assets',
  responseTemplate: "I have {assetCount} assets available. Here are some highlights:\n\n{assetList}\n\nWould you like details on any of these?",
  requiresApiCall: true,
  permissions: ['read']
}
```

**Example:**
```
Customer: "What assets do you have?"
AI Agent: "I have 4 assets available. Here are some highlights:

1. Tesla Model 3 (2023) - $35,000
2. Miami Condo Unit 405 - $450,000
3. Gold Reserve 1kg Bar - $65,000
4. Rolex Submariner - $12,000

Would you like details on any of these?"
```

**⚠️ Requires:** API Key with `read` permission

---

#### **Rule 3: Pricing**
```typescript
{
  id: 'pricing_1',
  patterns: ['price', 'cost', 'much', 'expensive', 'cheap', 'affordable', 'pricing'],
  category: 'pricing',
  action: 'get_pricing',
  responseTemplate: "Here's the pricing information:\n\n{pricingDetails}\n\nAll prices include blockchain verification and smart contract escrow. Would you like to make an offer?",
  requiresApiCall: true,
  permissions: ['read']
}
```

**Example:**
```
Customer: "How much do your products cost?"
AI Agent: "Here's the pricing information:

• Base price includes on-chain verification
• Smart contract escrow fee: 1%
• Payment accepted in: ETH, USDC, USDT
• No hidden fees or charges

All prices include blockchain verification and smart contract escrow. 
Would you like to make an offer?"
```

---

#### **Rule 4: Order**
```typescript
{
  id: 'order_1',
  patterns: ['buy', 'purchase', 'order', 'checkout', 'want'],
  category: 'order',
  responseTemplate: "Great! I can help you create an order. To proceed, I'll need:\n\n1. Which asset you're interested in\n2. Your payment method (ETH, USDC, or USDT)\n\nWhich asset would you like to purchase?",
  requiresApiCall: false,
  permissions: []
}
```

---

#### **Rule 5: Shipping**
```typescript
{
  id: 'shipping_1',
  patterns: ['ship', 'deliver', 'arrive', 'delivery', 'tracking'],
  category: 'shipping',
  responseTemplate: "📦 Shipping Information:\n\n• Standard shipping: 3-5 business days\n• Express shipping: 1-2 business days (+$25)\n• Free shipping on orders over $100\n• Real-time tracking provided after shipment\n\nAll shipments are insured and require signature confirmation.",
  requiresApiCall: false,
  permissions: []
}
```

---

#### **Rule 6: Payment**
```typescript
{
  id: 'payment_1',
  patterns: ['payment', 'crypto', 'escrow', 'pay', 'accept'],
  category: 'payment',
  responseTemplate: "💰 Payment & Security:\n\n✅ Accepted: ETH, USDC, USDT\n✅ Smart contract escrow (1% fee)\n✅ Funds held until delivery confirmed\n✅ Automatic release after confirmation\n\nYour payment is protected by blockchain technology. Funds are only released when you confirm receipt.",
  requiresApiCall: false,
  permissions: []
}
```

---

#### **Rule 7: General Help**
```typescript
{
  id: 'general_help',
  patterns: ['help', 'support', 'question', 'work', 'explain'],
  category: 'general',
  responseTemplate: "I'm here to help! I can assist with:\n\n🔍 Viewing available assets\n💵 Pricing information\n🛒 Creating orders\n📦 Shipping details\n💳 Payment methods\n\nWhat would you like to know more about?",
  requiresApiCall: false,
  permissions: []
}
```

---

## 7. API Integration

### 7.1. API Actions

AI Agent can execute **3 API actions**:

#### **1. fetch_assets**

**Purpose:** Get list of seller's assets

**Permission Required:** `read`

**Mock Implementation:**
```typescript
private static async fetchAssets(apiKey: APIKey): Promise<any> {
  const mockAssets = [
    { id: 'asset_1', name: 'Tesla Model 3 (2023)', price: '$35,000', category: 'Vehicle' },
    { id: 'asset_2', name: 'Miami Condo Unit 405', price: '$450,000', category: 'Real Estate' },
    { id: 'asset_3', name: 'Gold Reserve 1kg Bar', price: '$65,000', category: 'Commodity' },
    { id: 'asset_4', name: 'Rolex Submariner', price: '$12,000', category: 'Luxury Goods' }
  ];

  const assetList = mockAssets
    .map((a, i) => `${i + 1}. ${a.name} - ${a.price}`)
    .join('\n');

  return {
    assetCount: mockAssets.length,
    assetList,
    assetIds: mockAssets.map(a => a.id)
  };
}
```

**Production Implementation:**
```typescript
// In production, call real API:
const response = await fetch(`${BASE_URL}/api/v1/assets`, {
  headers: { 'Authorization': `Bearer ${apiKey.key}` }
});
const data = await response.json();
return {
  assetCount: data.assets.length,
  assetList: data.assets.map((a, i) => `${i + 1}. ${a.name} - ${a.price}`).join('\n'),
  assetIds: data.assets.map(a => a.id)
};
```

---

#### **2. get_pricing**

**Purpose:** Get pricing information

**Permission Required:** `read`

**Implementation:**
```typescript
private static async getPricing(apiKey: APIKey): Promise<any> {
  return {
    pricingDetails: `• Base price includes on-chain verification
• Smart contract escrow fee: 1%
• Payment accepted in: ETH, USDC, USDT
• No hidden fees or charges`
  };
}
```

---

#### **3. check_availability**

**Purpose:** Check stock availability

**Permission Required:** `read`

**Implementation:**
```typescript
private static async checkAvailability(apiKey: APIKey): Promise<any> {
  return {
    available: true,
    stockCount: 3
  };
}
```

---

### 7.2. Permission Validation

**Before executing API action:**

```typescript
private static hasRequiredPermissions(apiKey: APIKey, permissions: string[]): boolean {
  return permissions.every(p => apiKey.permissions.includes(p as any));
}

// Usage:
if (!this.hasRequiredPermissions(apiKey, rule.permissions)) {
  return "I don't have the required permissions to perform this action. Please contact support.";
}
```

**Error Handling:**

```typescript
if (rule.requiresApiCall && rule.action) {
  if (!apiKey) {
    return "I'm sorry, but I'm not properly configured to access asset data. Please contact the seller directly.";
  }
  
  if (!hasRequiredPermissions(apiKey, rule.permissions)) {
    return "I don't have the required permissions to perform this action. Please contact support.";
  }
  
  // Execute action
  const apiResult = await executeAction(rule.action, apiKey);
}
```

---

## 8. Frontend Components

### 8.1. AIAgentSettings Component

**File:** `/src/app/components/ai-agent-settings.tsx`

**Props:**
```typescript
interface AIAgentSettingsProps {
  walletAddress: string;
  onNavigateToTest?: () => void;
}
```

**Features:**
- Enable/disable toggle with active badge
- Agent name input
- Behavior mode selector (3 radio buttons)
- Auto-reply toggle
- Custom greeting message textarea
- Save button with success feedback
- API key requirement warning
- Test AI Agent button

**Usage:**
```tsx
<AIAgentSettings 
  walletAddress={address}
  onNavigateToTest={() => setActiveTab('test-ai-agent')}
/>
```

---

### 8.2. AIAgentTest Component

**File:** `/src/app/components/ai-agent-test.tsx`

**Props:**
```typescript
interface AIAgentTestProps {
  sellerAddress: string;
}
```

**Features:**
- Full chat interface
- Real-time message display
- Agent status indicator (enabled/disabled)
- Quick question buttons
- Auto-scroll to bottom
- Loading states
- Error handling

**Usage:**
```tsx
<AIAgentTest sellerAddress={address} />
```

**Quick Questions:**
```typescript
const quickQuestions = [
  "Hello!",
  "What assets do you have?",
  "How much are they?",
  "How does payment work?"
];
```

---

### 8.3. AIAgentClient Utility

**File:** `/src/utils/aiAgentClient.ts`

**Methods:**

```typescript
class AIAgentClient {
  // Send message to AI Agent
  static async sendMessage(
    sellerAddress: string,
    message: string,
    conversationId: string
  ): Promise<AIConversationMessage | null>;
  
  // Get AI Agent config
  static async getConfig(
    walletAddress: string
  ): Promise<AIAgentConfig | null>;
  
  // Save AI Agent config
  static async saveConfig(
    config: Partial<AIAgentConfig> & { walletAddress: string }
  ): Promise<boolean>;
  
  // Get conversation history
  static async getConversationHistory(
    conversationId: string
  ): Promise<AIConversationMessage[]>;
  
  // Check if AI Agent is enabled
  static async isAIAgentEnabled(
    walletAddress: string
  ): Promise<boolean>;
}
```

**Usage:**
```typescript
import { AIAgentClient } from '@/utils/aiAgentClient';

// Send message
const response = await AIAgentClient.sendMessage(
  sellerAddress,
  "What assets do you have?",
  conversationId
);

// Get config
const config = await AIAgentClient.getConfig(walletAddress);

// Check if enabled
const isEnabled = await AIAgentClient.isAIAgentEnabled(walletAddress);
```

---

## 9. Testing & Debugging

### 9.1. Test Mode

**AI Agent Test page** provides isolated testing environment:

**Features:**
- ✅ Test without affecting real conversations
- ✅ Auto-creates config if missing
- ✅ Shows agent status (enabled/disabled)
- ✅ Displays response metadata (intent, confidence)
- ✅ Quick question buttons
- ✅ Conversation history persistence

**Conversation ID Format:**
```typescript
const conversationId = `test_conv_${sellerAddress}`;
```

**Test Flow:**
```
1. User opens Test page
2. System checks if AI Agent config exists
3. If not, auto-creates default config (enabled: true)
4. User sends test messages
5. AI Agent responds (with real API calls if key exists)
6. Messages saved to test conversation
7. Can reload and see history
```

---

### 9.2. Debug Logging

**Server-side logs:**
```typescript
console.log('🤖 AI Agent processing message:', message);
console.log('📊 Matched rule:', rule?.id, 'Category:', rule?.category, 'Confidence:', confidence);
console.log('⚙️ Rule requires API call. Action:', rule.action, 'Has API key:', !!apiKey);
console.log('✅ Executing action:', rule.action);
console.log('📦 API result:', apiResult);
console.log('💬 Simple text response (no API call needed)');
console.log('❓ No matching rule, using fallback response');
console.log('✉️ Final response:', responseContent.substring(0, 100) + '...');
console.log(`⏱️ AI Agent response time: ${responseTime}ms`);
```

**Client-side logs:**
```typescript
console.log('No AI Agent config found, creating default...');
console.log('Default AI Agent config created successfully');
console.error('Failed to create default AI Agent config');
console.error('Error loading AI Agent config:', error);
console.error('Error saving AI Agent config:', error);
```

---

### 9.3. Response Metadata

**Every AI response includes metadata:**
```typescript
{
  "id": "msg_1707829522000_xyz",
  "content": "I have 3 assets available...",
  "timestamp": "2026-02-13T15:45:22.000Z",
  "metadata": {
    "intent": "asset_inquiry",      // Recognized intent category
    "confidence": 0.9,               // Confidence score (0-1)
    "apiCallMade": true,             // Was API called?
    "assetIds": ["asset_1", ...]     // Returned asset IDs (if applicable)
  }
}
```

**Use metadata to:**
- Track which intents are most common
- Identify low-confidence responses
- Monitor API call frequency
- Debug response issues

---

## 10. Code Examples

### 10.1. Enable AI Agent

```typescript
import { AIAgentClient } from '@/utils/aiAgentClient';

async function enableAIAgent(walletAddress: string) {
  const config = {
    walletAddress,
    name: 'Sales Assistant',
    behavior: 'moderate',
    enabled: true,
    autoReplyEnabled: true,
    greetingMessage: 'Hello! How can I help you today?'
  };
  
  const success = await AIAgentClient.saveConfig(config);
  
  if (success) {
    console.log('AI Agent enabled successfully');
  } else {
    console.error('Failed to enable AI Agent');
  }
}
```

---

### 10.2. Send Test Message

```typescript
import { AIAgentClient } from '@/utils/aiAgentClient';

async function testAIAgent() {
  const sellerAddress = '0x742d35Cc...';
  const conversationId = `test_conv_${sellerAddress}`;
  
  // Send message
  const response = await AIAgentClient.sendMessage(
    sellerAddress,
    'What assets do you have?',
    conversationId
  );
  
  if (response) {
    console.log('AI Response:', response.content);
    console.log('Intent:', response.metadata?.intent);
    console.log('Confidence:', response.metadata?.confidence);
  } else {
    console.error('AI Agent did not respond');
  }
}
```

---

### 10.3. Check Agent Status

```typescript
import { AIAgentClient } from '@/utils/aiAgentClient';

async function checkAIAgentStatus(walletAddress: string) {
  const config = await AIAgentClient.getConfig(walletAddress);
  
  if (!config) {
    console.log('❌ AI Agent not configured');
    return;
  }
  
  if (!config.enabled) {
    console.log('⚠️ AI Agent is disabled');
    return;
  }
  
  console.log('✅ AI Agent is active');
  console.log('  Name:', config.name);
  console.log('  Behavior:', config.behavior);
  console.log('  Auto-reply:', config.autoReplyEnabled);
}
```

---

### 10.4. Integrate with Messages

```typescript
// In Messenger component
import { AIAgentClient } from '@/utils/aiAgentClient';

async function handleMessageReceived(message: Message) {
  // Check if seller has AI Agent enabled
  const isEnabled = await AIAgentClient.isAIAgentEnabled(message.receiver);
  
  if (!isEnabled) {
    console.log('AI Agent not enabled for this seller');
    return;
  }
  
  // Get config to check auto-reply
  const config = await AIAgentClient.getConfig(message.receiver);
  
  if (!config?.autoReplyEnabled) {
    console.log('Auto-reply is disabled');
    return;
  }
  
  // Send message to AI Agent
  const conversationId = `conv_${message.sender}_${message.receiver}`;
  
  const aiResponse = await AIAgentClient.sendMessage(
    message.receiver,
    message.text,
    conversationId
  );
  
  if (aiResponse) {
    // Send AI response back to customer via Messages API
    await sendMessage({
      sender: message.receiver,
      receiver: message.sender,
      text: aiResponse.content
    });
  }
}
```

---

## 11. Best Practices

### 11.1. Configuration

✅ **DO:**
- Start with `moderate` behavior for most sellers
- Use clear, professional agent names ("Sales Assistant", "Support Bot")
- Enable auto-reply for faster response times
- Customize greeting for brand voice
- Test in Test page before going live

❌ **DON'T:**
- Use aggressive mode for high-value items (>$100k)
- Set vague agent names ("Bot", "AI")
- Disable auto-reply unless necessary
- Use too-casual language for professional services

---

### 11.2. API Key Management

✅ **DO:**
- Create API key with `read` permission minimum
- Revoke unused keys regularly
- Monitor API usage in key stats
- Keep keys secure (never commit to git)

❌ **DON'T:**
- Share API keys publicly
- Grant unnecessary permissions
- Use same key for multiple purposes
- Forget to check key expiration

---

### 11.3. Response Optimization

✅ **DO:**
- Keep responses concise (under 200 words)
- Use bullet points and formatting
- Include clear next steps/CTAs
- Provide multiple options when appropriate

❌ **DON'T:**
- Write long paragraphs
- Use technical jargon
- Overwhelm with too many options
- Be vague or unhelpful

---

### 11.4. Testing

✅ **DO:**
- Test all behavior modes before choosing
- Try edge cases (typos, unclear questions)
- Verify API integration works
- Check response times (should be <2s)

❌ **DON'T:**
- Skip testing phase
- Test only happy paths
- Assume AI understands everything
- Deploy without verifying API key

---

## 12. Troubleshooting

### 12.1. AI Agent Not Responding

**Symptoms:**
- Customer sends message, no AI reply
- Error: "AI Agent is not responding"

**Causes & Solutions:**

1. **AI Agent Disabled**
   ```
   Solution: Go to Settings → Enable AI Agent
   ```

2. **No API Key**
   ```
   Symptom: Responses work for greetings but not asset inquiries
   Solution: Create API key with 'read' permission in API Keys settings
   ```

3. **Insufficient Permissions**
   ```
   Symptom: "I don't have the required permissions..."
   Solution: Update API key to include 'read' permission
   ```

4. **Server Error**
   ```
   Solution: Check browser console for errors
            Check server logs: /supabase/functions/server/index.tsx
   ```

---

### 12.2. Low Confidence Responses

**Symptoms:**
- AI Agent says "I'm not sure I understand"
- Generic fallback responses

**Causes & Solutions:**

1. **No Pattern Match**
   ```
   Customer message doesn't match any rule patterns
   Solution: Use Test page to identify common unmatched queries
            Add new rules or expand existing patterns
   ```

2. **Typos/Misspellings**
   ```
   Solution: Add common misspellings to patterns
            Example: ['price', 'pric', 'pricing', 'priсe']
   ```

3. **Complex Questions**
   ```
   Solution: Encourage customers to ask simpler questions
            Add "general_help" responses guiding users
   ```

---

### 12.3. API Call Failures

**Symptoms:**
- "I'm sorry, but I'm not properly configured..."
- Asset inquiries don't show data

**Causes & Solutions:**

1. **API Key Not Found**
   ```
   Check: Does seller have active API key?
   Solution: Create key in API Keys settings
   ```

2. **Key Expired**
   ```
   Check: API key expiration date
   Solution: Revoke old key, generate new one
   ```

3. **Network Issues**
   ```
   Check: Browser console for fetch errors
   Solution: Retry request, check Supabase status
   ```

---

### 12.4. Conversation History Not Loading

**Symptoms:**
- Test page shows no previous messages
- Messages disappear after reload

**Causes & Solutions:**

1. **KV Store Error**
   ```
   Check: Server logs for "Error saving message"
   Solution: Check Supabase connection, verify kv_store.tsx
   ```

2. **Wrong Conversation ID**
   ```
   Check: conversationId format: `test_conv_{walletAddress}`
   Solution: Verify wallet address is correct
   ```

---

### 12.5. Debug Checklist

```
☐ AI Agent enabled in Settings?
☐ API key created with 'read' permission?
☐ API key active (not revoked/expired)?
☐ Behavior mode set appropriately?
☐ Auto-reply enabled?
☐ Server logs show no errors?
☐ Browser console shows no errors?
☐ Test page working?
☐ Conversation ID correct format?
☐ Messages API working?
```

---

## 📚 Appendix

### A. File Locations

```
Backend:
/supabase/functions/server/
├── ai-agent-engine.tsx          # Core AI engine
├── ai-chat.tsx                  # API endpoints
├── types.ts                     # Type definitions
└── kv_store.tsx                 # Storage (DO NOT EDIT)

Frontend:
/src/app/components/
├── ai-agent-settings.tsx        # Settings UI
└── ai-agent-test.tsx            # Test UI

/src/app/types/
└── ai-agent.ts                  # Frontend types

/src/utils/
└── aiAgentClient.ts             # API client
```

### B. API Endpoints

```
POST /make-server-b0d68fc8/ai/chat
     Body: { sellerAddress, message, conversationId }
     Response: { success, response: AIConversationMessage }

GET  /make-server-b0d68fc8/ai/config/:walletAddress
     Response: { success, config: AIAgentConfig }

POST /make-server-b0d68fc8/ai/config
     Body: { walletAddress, name, behavior, enabled, ... }
     Response: { success, config: AIAgentConfig }

GET  /make-server-b0d68fc8/ai/conversation/:conversationId
     Response: { success, messages: AIConversationMessage[] }
```

### C. Type Definitions

```typescript
type AIAgentBehavior = 'conservative' | 'moderate' | 'aggressive';

interface AIAgentConfig {
  id: string;
  walletAddress: string;
  enabled: boolean;
  name: string;
  behavior: AIAgentBehavior;
  autoReplyEnabled: boolean;
  greetingMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface AIConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'ai_agent' | 'seller';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    apiCallMade?: boolean;
    assetIds?: string[];
  };
}

interface AIAgentRule {
  id: string;
  patterns: string[];
  category: string;
  action?: string;
  responseTemplate: string;
  requiresApiCall: boolean;
  permissions: string[];
}
```

### D. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-13 | Initial AI Agent documentation |

---

## 📞 Support

- **Documentation:** This file + `/API_DOCUMENTATION.md`
- **GitHub:** [Report Issues](https://github.com/orina/issues)
- **Discord:** [Join Community](https://discord.gg/orina)
- **Email:** ai-support@orina.io

---

**Last Updated:** February 13, 2026  
**Document Version:** 1.0  
**Maintained By:** Orina Development Team  
**AI Engine:** Rule-based NLP v1.0
