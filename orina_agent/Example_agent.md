## 🚀 **Kiến trúc Ecommerce Platform với Supabase + Cloudflare Workers AI**

### 📐 **Kiến trúc tổng thể **

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Cloudflare Pages)                  │
│              (Next.js/React + Supabase Client)                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Supabase Edge Function (ai-orchestrator-v2)          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Auth + Role Detection                                 │   │
│  │  • Vector Search (pgvector)                              │   │
│  │  • Image Captioning (@cf/meta/llama-3.2-11b-vision)     │   │
│  │  • Route to appropriate Cloudflare Worker                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         Cloudflare Worker (AI Agent Gateway)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pre-filter: KA-like silent detection                    │   │
│  │  Vision pre-processor: @cf/meta/llama-3.2-11b-vision    │   │
│  │  Main LLM: @cf/nvidia/nemotron-3-120b-a12b              │   │
│  │  Denoising Layer (sampling params + logprobs check)     │   │
│  │  Embedded Function Calling (tools)                      │   │
│  │  AI Gateway: rate-limit, caching, logging, fallback      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4 Specialized Agents                                   │   │
│  │  • Customer Service Agent                               │   │
│  │  • Seller Agent                                          │   │
│  │  • Buyer Agent                                           │   │
│  │  • Admin Agent                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Postgres + pgvector + Storage              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Auth (auth.users)                                       │   │
│  │  Profiles (profiles)                                     │   │
│  │  Products (products)                                     │   │
│  │  Chat History (chat_history)                             │   │
│  │  Orders (orders)                                         │   │
│  │  Disputes (disputes)                                     │   │
│  │  Market Trends (market_trends)                           │   │
│  │  Agent Messages (agent_messages)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🗄️ **Database Schema (Updated)**

```sql
-- Auth tables (auto-created by Supabase)
-- auth.users
-- auth.identities
-- auth.sessions
-- auth.account_linking

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  inventory INTEGER DEFAULT 0,
  category TEXT,
  image_urls TEXT[],
  embedding vector(1024),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'pending', 'disputed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat history table
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  image_url TEXT,
  agent_type TEXT, -- 'customer_service', 'seller', 'buyer', 'admin'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  shipping_address JSONB,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  evidence JSONB,
  admin_notes TEXT,
  admin_decision TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Market trends table
CREATE TABLE market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  trend_type TEXT NOT NULL, -- 'price', 'demand', 'volume'
  trend_value NUMERIC,
  trend_data JSONB,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent messages table (for agent-to-user communication)
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'customer_service', 'seller', 'buyer', 'admin'
  message_type TEXT NOT NULL, -- 'notification', 'recommendation', 'alert', 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_chat_history_agent ON chat_history(agent_type);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_market_trends_category ON market_trends(category);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 🤖 **Supabase Edge Function: ai-orchestrator-v2**

```typescript
// supabase/functions/ai-orchestrator-v2/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ChatRequest {
  userId: string
  message: string
  agentType?: 'customer_service' | 'seller' | 'buyer' | 'admin'
  context?: {
    products?: any[]
    orders?: any[]
    marketTrends?: any[]
  }
}

interface ChatResponse {
  response: string
  agentType: string
  suggestions?: string[]
  metadata?: {
    toolsUsed?: string[]
    confidence?: number
  }
}

serve(async (req) => {
  try {
    const { userId, message, agentType, context } = await req.json() as ChatRequest

    // 1. Verify user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(userId)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // 2. Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
    }

    // 3. Determine agent type if not provided
    const selectedAgentType = agentType || getAgentByRole(profile.role)

    // 4. Get products and context data
    let products = context?.products || []
    let marketTrends = context?.marketTrends || []
    let orders = context?.orders || []

    if (!products.length) {
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(20)
      products = productsData || []
    }

    if (!marketTrends.length) {
      const { data: trendsData } = await supabase
        .from('market_trends')
        .select('*')
        .gte('period_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10)
      marketTrends = trendsData || []
    }

    // 5. Store user message in chat_history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      agent_type: selectedAgentType,
      metadata: { context }
    })

    // 6. Route to Cloudflare Worker
    const cfResponse = await fetch('https://your-worker.workers.dev/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('CLOUDFLARE_API_TOKEN')}`
      },
      body: JSON.stringify({
        userId: user.id,
        message,
        agentType: selectedAgentType,
        context: {
          products,
          orders,
          marketTrends,
          userProfile: profile
        }
      })
    })

    const cfData = await cfResponse.json()

    // 7. Store agent response in chat_history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'assistant',
      content: cfData.response,
      agent_type: selectedAgentType,
      metadata: cfData.metadata
    })

    // 8. Return response
    return new Response(
      JSON.stringify({
        response: cfData.response,
        agentType: selectedAgentType,
        suggestions: cfData.suggestions,
        metadata: cfData.metadata
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in ai-orchestrator-v2:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
})

// Helper function to get agent type by role
function getAgentByRole(role: string): 'customer_service' | 'seller' | 'buyer' | 'admin' {
  switch (role) {
    case 'seller':
      return 'seller'
    case 'buyer':
      return 'buyer'
    case 'admin':
      return 'admin'
    default:
      return 'customer_service'
  }
}
```

---

### ⚡ **Cloudflare Worker: AI Agent Gateway**

```typescript
// worker/src/index.ts
import { createWorkersAI } from 'workers-ai-provider'

// AI Gateway client (optional, if you have AI Gateway configured)
const aiGateway = {
  async chat(payload: any) {
    // Rate limiting, caching, logging, fallback logic
    return await createWorkersAI()(payload)
  }
}

// Pre-filter: KA-like silent detection
async function detectSilentQueries(message: string): Promise<boolean> {
  const silentPatterns = [
    /^\s*$/,
    /^\s*(?:hi|hello|hey|greetings)\s*$/i,
    /^\s*(?:thanks?|thank you)\s*$/i,
    /^\s*(?:ok|okay|alright)\s*$/i
  ]
  return silentPatterns.some(pattern => pattern.test(message.trim()))
}

// Vision pre-processor
async function processImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const imageBuffer = await response.arrayBuffer()
  
  // Send to Workers AI vision model
  const model = createWorkersAI()('@cf/meta/llama-3.2-11b-vision-instruct')
  const result = await model.run({
    prompt: 'Describe this product image in detail',
    image: imageBuffer
  })
  
  return result.description
}

// Denoising Layer
async function denoiseResponse(response: string, logprobs: any[]): Promise<string> {
  // Check for low confidence tokens
  const lowConfidenceTokens = logprobs.filter(
    token => token.probability < 0.1
  )
  
  if (lowConfidenceTokens.length > 5) {
    // Regenerate response
    return await regenerateResponse()
  }
  
  return response
}

// Embedded Function Calling
const tools = {
  searchProducts: async (query: string) => {
    // Vector similarity search in Supabase
    const response = await fetch('https://your-supabase-url.supabase.co/rest/v1/products?embedding=vector_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      },
      body: JSON.stringify({ query })
    })
    return await response.json()
  },
  
  getMarketTrends: async (category: string) => {
    const response = await fetch(`https://your-supabase-url.supabase.co/rest/v1/market_trends?category=eq.${category}`)
    return await response.json()
  },
  
  createOrder: async (productId: string, quantity: number) => {
    const response = await fetch('https://your-supabase-url.supabase.co/rest/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      },
      body: JSON.stringify({ product_id: productId, quantity })
    })
    return await response.json()
  },
  
  handleDispute: async (disputeId: string, decision: string, notes: string) => {
    const response = await fetch(`https://your-supabase-url.supabase.co/rest/v1/disputes?id=eq.${disputeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      },
      body: JSON.stringify({ 
        status: decision === 'resolved' ? 'resolved' : 'closed',
        admin_decision: decision,
        admin_notes: notes
      })
    })
    return await response.json()
  }
}

// Main handler
export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url)
    
    // Handle chat requests
    if (url.pathname === '/chat' && request.method === 'POST') {
      return await handleChat(request, env)
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request, env)
    }
    
    return new Response('Not found', { status: 404 })
  }
}

async function handleChat(request: Request, env: any) {
  const { userId, message, agentType, context } = await request.json()
  
  // Pre-filter: detect silent queries
  if (await detectSilentQueries(message)) {
    return Response.json({
      response: 'Hello! How can I help you today?',
      agentType,
      suggestions: ['Browse products', 'Search for something specific', 'Ask a question']
    })
  }
  
  // Get main LLM
  const model = createWorkersAI()('@cf/nvidia/nemotron-3-120b-a12b')
  
  // Build prompt based on agent type
  const prompt = buildAgentPrompt(agentType, message, context)
  
  // Generate response with streaming
  const response = await model.run({
    messages: prompt.messages,
    tools: prompt.tools,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 500,
    stream: true
  })
  
  // Denoise response
  const denoisedResponse = await denoiseResponse(response, response.logprobs || [])
  
  // Extract tool calls
  const toolsUsed = response.tool_calls || []
  
  // Execute tool calls if any
  const toolResults = await executeToolCalls(toolsUsed)
  
  // Return final response
  return Response.json({
    response: denoisedResponse,
    agentType,
    suggestions: generateSuggestions(agentType, context),
    metadata: {
      toolsUsed: toolsUsed.map(t => t.name),
      confidence: calculateConfidence(response)
    }
  })
}

function buildAgentPrompt(
  agentType: string,
  message: string,
  context: any
): { messages: any[], tools: any[] } {
  const basePrompt = {
    role: 'system',
    content: getAgentSystemPrompt(agentType)
  }
  
  const tools = getAgentTools(agentType)
  
  return {
    messages: [
      basePrompt,
      ...context.chatHistory?.slice(-10) || [],
      {
        role: 'user',
        content: message
      }
    ],
    tools
  }
}

function getAgentSystemPrompt(agentType: string): string {
  const prompts: Record<string, string> = {
    customer_service: `
You are a Customer Service Agent for an ecommerce platform.
Your role is to help users with:
- Product questions and recommendations
- Order tracking and status updates
- Returns and refunds
- General platform inquiries

Always be friendly, professional, and helpful.
If you don't know something, say so and suggest contacting support.
`,
    seller: `
You are a Seller Agent for an ecommerce platform.
Your role is to help sellers with:
- Creating and managing product listings
- Understanding market trends and pricing
- Optimizing product descriptions
- Managing inventory and orders
- Maximizing sales and visibility

Provide actionable advice based on market data.
`,
    buyer: `
You are a Buyer Agent for an ecommerce platform.
Your role is to help buyers with:
- Product recommendations based on preferences
- Finding the best deals and discounts
- Comparing products and prices
- Making informed purchasing decisions
- Understanding product features and specifications

Be helpful, objective, and provide detailed information.
`,
    admin: `
You are an Admin Agent for an ecommerce platform.
Your role is to:
- Handle disputes between buyers and sellers
- Make fair decisions based on evidence
- Enforce platform policies
- Provide insights and analytics
- Coordinate with support team

Be fair, objective, and data-driven in your decisions.
`
  }
  
  return prompts[agentType] || prompts.customer_service
}

function getAgentTools(agentType: string): any[] {
  const tools: Record<string, any[]> = {
    customer_service: [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Search for products by keyword or category',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              category: { type: 'string' },
              max_results: { type: 'number', default: 10 }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_order_status',
          description: 'Get order status and details',
          parameters: {
            type: 'object',
            properties: {
              order_id: { type: 'string' }
            }
          }
        }
      }
    ],
    seller: [
      {
        type: 'function',
        function: {
          name: 'create_product',
          description: 'Create a new product listing',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number' },
              category: { type: 'string' },
              inventory: { type: 'number', default: 0 }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_market_trends',
          description: 'Get market trends for a category',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_product',
          description: 'Update product information',
          parameters: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              description: { type: 'string' }
            }
          }
        }
      }
    ],
    buyer: [
      {
        type: 'function',
        function: {
          name: 'recommend_products',
          description: 'Get personalized product recommendations',
          parameters: {
            type: 'object',
            properties: {
              preferences: { type: 'string' },
              category: { type: 'string' },
              max_price: { type: 'number' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compare_products',
          description: 'Compare multiple products',
          parameters: {
            type: 'object',
            properties: {
              product_ids: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_deals',
          description: 'Get current deals and discounts',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ],
    admin: [
      {
        type: 'function',
        function: {
          name: 'handle_dispute',
          description: 'Handle a dispute between buyer and seller',
          parameters: {
            type: 'object',
            properties: {
              dispute_id: { type: 'string' },
              decision: { type: 'string' },
              notes: { type: 'string' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_disputes',
          description: 'Get list of open disputes',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'open' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_platform_stats',
          description: 'Get platform statistics and analytics',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ]
  }
  
  return tools[agentType] || []
}

async function executeToolCalls(toolCalls: any[]) {
  const results = []
  
  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall
    const result = await tools[name](args)
    results.push({ name, result })
  }
  
  return results
}

function generateSuggestions(agentType: string, context: any): string[] {
  const suggestions: Record<string, string[]> = {
    customer_service: [
      'Browse our products',
      'Check order status',
      'Contact customer support'
    ],
    seller: [
      'Create new product',
      'View market trends',
      'Manage inventory'
    ],
    buyer: [
      'View recommended products',
      'Search products',
      'See current deals'
    ],
    admin: [
      'Review open disputes',
      'View platform analytics',
      'Manage users'
    ]
  }
  
  return suggestions[agentType] || []
}

function calculateConfidence(response: any): number {
  // Calculate confidence based on response quality
  const avgLogProb = response.logprobs?.reduce((sum, token) => sum + token.probability, 0) || 0
  return Math.min(avgLogProb / response.logprobs?.length || 0, 1)
}
```

---

### 📊 **Workers AI Configuration**

```typescript
// wrangler.toml
name = "ecommerce-agent-gateway"
main = "src/index.ts"
compatibility_date = "2025-03-19"

# D1 Database (optional, if you need it)
# [[d1_databases]]
# binding = "DB"
# database_name = "ecommerce-db"
# database_id = "your-database-id"

# KV Namespaces (optional, for caching)
# [[kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-namespace-id"

# AI Gateway (optional, for enhanced features)
# [ai]
# binding = "AI"
# gateway = { account_id = "your-account-id" }

# Environment variables
[vars]
SUPABASE_URL = "your-supabase-url"
SUPABASE_ANON_KEY = "your-supabase-anon-key"
```

---

### 🔌 **Supabase Edge Function: Image Captioning**

```typescript
// supabase/functions/image-captioning/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { imageUrl } = await req.json()
    
    // Process image with Workers AI vision model
    const response = await fetch(imageUrl)
    const imageBuffer = await response.arrayBuffer()
    
    const model = createWorkersAI()('@cf/meta/llama-3.2-11b-vision-instruct')
    const result = await model.run({
      prompt: 'Describe this product in detail, including features, materials, and use cases',
      image: imageBuffer
    })
    
    return new Response(
      JSON.stringify({ description: result.description }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in image-captioning:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process image' }),
      { status: 500 }
    )
  }
})
```

---

### 📱 **Frontend Integration (Next.js)**

```typescript
// app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const { message, agentType } = await request.json()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Call Supabase Edge Function
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      userId: user.id,
      message,
      agentType
    })
  })
  
  const data = await response.json()
  
  return Response.json(data)
}
```

---

### 🚀 **Deployment Commands**

```bash
# 1. Deploy Supabase Edge Function
supabase functions deploy ai-orchestrator-v2
supabase functions deploy image-captioning

# 2. Deploy Cloudflare Worker
npx wrangler deploy

# 3. Deploy Frontend (Cloudflare Pages)
npm run build
npx wrangler pages deploy .next
```

---

### 📊 **Dashboard URLs**

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Cloudflare Workers**: https://dash.cloudflare.com/37ffca2f3565ad661c81ced689b4e2ad/workers-and-pages
- **Workers AI**: https://dash.cloudflare.com/37ffca2f3565ad661c81ced689b4e2ad/ai

---

### 💡 **Tính năng nâng cao**

1. **Vector Search** - Sử dụng pgvector để tìm kiếm sản phẩm tương tự
2. **Streaming Responses** - Trả lời chat theo thời gian thực
3. **Function Calling** - Agents có thể gọi các API functions thực tế
4. **Image Processing** - Tự động tạo description cho hình ảnh sản phẩm
5. **Market Trends Analysis** - Phân tích xu hướng thị trường
6. **Dispute Resolution** - Xử lý disputes tự động với AI
7. **Personalized Recommendations** - Gợi ý sản phẩm dựa trên lịch sử mua hàng

---
Tôi sẽ tạo code chi tiết cho cả hai tính năng này.

---

## 🖼️ **1. Image Captioning Workers AI Vision Model**

### **Supabase Edge Function: Image Captioning**

```typescript
// supabase/functions/image-captioning/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CaptionRequest {
  imageUrl: string
  productId?: string
  category?: string
}

interface CaptionResponse {
  description: string
  features: string[]
  suggestedTags: string[]
  confidence: number
}

serve(async (req) => {
  try {
    const { imageUrl, productId, category } = await req.json() as CaptionRequest
    
    // Validate image URL
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid image URL' }),
        { status: 400 }
      )
    }

    // Fetch and process image
    const imageBuffer = await fetchImage(imageUrl)
    const captionData = await generateCaption(imageBuffer, category)

    // Store caption in database if product ID is provided
    let metadata = {
      productId,
      category,
      imageUrl,
      confidence: captionData.confidence
    }

    if (productId) {
      await storeProductCaption(productId, captionData)
    }

    // Generate suggested tags
    const suggestedTags = generateTags(captionData.description, category)

    return new Response(
      JSON.stringify({
        description: captionData.description,
        features: captionData.features,
        suggestedTags,
        confidence: captionData.confidence
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in image-captioning:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process image',
        details: error.message 
      }),
      { status: 500 }
    )
  }
})

// Validate image URL
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Fetch image from URL
async function fetchImage(imageUrl: string): Promise<Uint8Array> {
  const response = await fetch(imageUrl)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

// Generate caption using Workers AI vision model
async function generateCaption(
  imageBuffer: Uint8Array, 
  category?: string
): Promise<CaptionResponse> {
  const model = createWorkersAI()('@cf/meta/llama-3.2-11b-vision-instruct')

  // Build prompt based on category
  const prompt = category
    ? `Analyze this product image and provide a detailed description. 
       Product category: ${category}
       Focus on: materials, features, design, durability, and use cases.`
    : `Analyze this product image and provide a detailed description.
       Focus on: materials, features, design, durability, and use cases.`

  const result = await model.run({
    prompt,
    image: imageBuffer
  })

  // Parse response into structured data
  const description = result.description
  const features = extractFeatures(description)
  const confidence = calculateConfidence(result.logprobs || [])

  return {
    description,
    features,
    suggestedTags: [],
    confidence
  }
}

// Extract features from caption
function extractFeatures(description: string): string[] {
  const features = []
  const featureKeywords = [
    'made of',
    'material',
    'fabric',
    'durable',
    'waterproof',
    'breathable',
    'lightweight',
    'comfortable',
    'sturdy',
    'easy to clean',
    'eco-friendly',
    'recycled',
    'handmade',
    'customizable',
    'adjustable',
    'washable',
    'quick-drying'
  ]

  const sentences = description.split(/[.!?]+/)
  
  for (const sentence of sentences) {
    for (const keyword of featureKeywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        features.push(sentence.trim())
        break
      }
    }
  }

  return features.slice(0, 5) // Return top 5 features
}

// Generate tags from caption
function generateTags(description: string, category?: string): string[] {
  const tags = new Set<string>()
  
  // Add category tag
  if (category) {
    tags.add(category.toLowerCase())
  }

  // Extract potential tags (2-4 words)
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && word.length < 15)

  // Add words that appear multiple times
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  for (const [word, count] of Object.entries(wordCounts)) {
    if (count >= 2 && !isStopWord(word)) {
      tags.add(word)
    }
  }

  // Add feature-based tags
  const featureTags = [
    'popular',
    'trending',
    'bestseller',
    'new arrival',
    'exclusive',
    'limited edition',
    'premium',
    'affordable'
  ]

  for (const tag of featureTags) {
    if (description.toLowerCase().includes(tag)) {
      tags.add(tag)
    }
  }

  return Array.from(tags).slice(0, 10)
}

// Check if word is a stop word
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'and', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ])

  return stopWords.has(word)
}

// Calculate confidence from log probabilities
function calculateConfidence(logprobs: any[]): number {
  if (!logprobs || logprobs.length === 0) {
    return 0.7 // Default confidence
  }

  // Calculate average log probability
  const avgLogProb = logprobs.reduce((sum, token) => {
    return sum + (token.probability || 0)
  }, 0) / logprobs.length

  // Convert to confidence (0-1)
  const confidence = Math.min(avgLogProb * 1.5, 0.99)
  
  return confidence
}

// Store caption in database
async function storeProductCaption(
  productId: string, 
  captionData: any
): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  await supabase.from('products').update({
    description: captionData.description,
    metadata: {
      caption_generated: true,
      caption_confidence: captionData.confidence,
      caption_features: captionData.features
    }
  }).eq('id', productId)
}
```

---

## 🔍 **2. Vector Search với pgvector**

### **Supabase Edge Function: Vector Search**

```typescript
// supabase/functions/vector-search/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http.server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface VectorSearchRequest {
  queryVector: number[]
  category?: string
  minSimilarity?: number
  limit?: number
  filters?: {
    priceRange?: { min: number; max: number }
    inStock?: boolean
    sellerId?: string
  }
}

interface VectorSearchResponse {
  products: Array<{
    id: string
    name: string
    description: string
    price: number
    category: string
    image_urls: string[]
    similarity: number
  }>
  metadata: {
    totalResults: number
    queryVector: number[]
  }
}

serve(async (req) => {
  try {
    const { queryVector, category, minSimilarity = 0.7, limit = 10, filters } = 
      await req.json() as VectorSearchRequest

    // Validate query vector
    if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid query vector' }),
        { status: 400 }
      )
    }

    // Build SQL query for vector similarity search
    const products = await performVectorSearch(
      queryVector,
      category,
      minSimilarity,
      limit,
      filters
    )

    return new Response(
      JSON.stringify({
        products,
        metadata: {
          totalResults: products.length,
          queryVector
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in vector-search:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Vector search failed',
        details: error.message 
      }),
      { status: 500 }
    )
  }
})

// Perform vector similarity search
async function performVectorSearch(
  queryVector: number[],
  category?: string,
  minSimilarity: number = 0.7,
  limit: number = 10,
  filters?: any
): Promise<any[]> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Build dynamic WHERE clause based on filters
  let whereClause = 'status = \'active\''
  const params: any[] = []
  let paramIndex = 1

  if (filters?.priceRange) {
    whereClause += ` AND price BETWEEN $${paramIndex} AND $${paramIndex + 1}`
    params.push(filters.priceRange.min, filters.priceRange.max)
    paramIndex += 2
  }

  if (filters?.inStock !== undefined) {
    whereClause += ` AND inventory > 0`
  }

  if (filters?.sellerId) {
    whereClause += ` AND seller_id = $${paramIndex}`
    params.push(filters.sellerId)
    paramIndex++
  }

  if (category) {
    whereClause += ` AND category = $${paramIndex}`
    params.push(category)
    paramIndex++
  }

  // Perform vector similarity search using pgvector
  const { data, error } = await supabase.rpc('match_products', {
    query_embedding: queryVector,
    match_threshold: minSimilarity,
    match_count: limit,
    filter: whereClause,
    filter_params: params
  })

  if (error) {
    console.error('Vector search error:', error)
    throw new Error(`Vector search failed: ${error.message}`)
  }

  return data || []
}
```

---

### **Supabase SQL: Vector Search Functions**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Function: match_products
-- Tìm kiếm sản phẩm dựa trên vector embedding
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter text DEFAULT NULL,
  filter_params jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  image_urls text[],
  embedding vector(1024),
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  base_query text;
  query_with_filters text;
  filtered_count int;
BEGIN
  -- Base query with vector similarity
  base_query := format('
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.image_urls,
      p.embedding,
      1 - (p.embedding % query_embedding) AS similarity
    FROM products p
    WHERE p.embedding IS NOT NULL
      AND p.status = ''active''
  ', query_embedding);

  -- Add category filter if provided
  IF filter IS NOT NULL THEN
    -- Parse filter params and apply them
    query_with_filters := base_query || ' ' || filter;
  ELSE
    query_with_filters := base_query;
  END IF;

  -- Return results ordered by similarity
  RETURN QUERY EXECUTE query_with_filters USING query_embedding;
  
  -- Limit results
  RETURN QUERY EXECUTE (
    SELECT query_with_filters || ' ORDER BY similarity DESC LIMIT $1' 
    FROM unnest(array[match_count])
  ) USING match_count;
END;
$$;

-- Function: match_products_by_category
-- Tìm kiếm sản phẩm trong một category cụ thể
CREATE OR REPLACE FUNCTION match_products_by_category(
  query_embedding vector(1024),
  category text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  image_urls text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.image_urls,
      1 - (p.embedding % query_embedding) AS similarity
    FROM products p
    WHERE p.embedding IS NOT NULL
      AND p.status = 'active'
      AND p.category = category
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Function: get_similar_products
-- Lấy N sản phẩm tương tự nhất với một sản phẩm cụ thể
CREATE OR REPLACE FUNCTION get_similar_products(
  product_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_embedding vector(1024);
BEGIN
  -- Get embedding của sản phẩm mục tiêu
  SELECT embedding INTO target_embedding
  FROM products
  WHERE id = product_id
  LIMIT 1;

  IF target_embedding IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Return similar products (excluding the product itself)
  RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      1 - (p.embedding % target_embedding) AS similarity
    FROM products p
    WHERE p.id != product_id
      AND p.embedding IS NOT NULL
      AND p.status = 'active'
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Function: get_product_recommendations
-- Gợi ý sản phẩm dựa trên lịch sử mua hàng (ví dụ: user_id)
CREATE OR REPLACE FUNCTION get_product_recommendations(
  user_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  seller_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get average embedding của sản phẩm đã mua
  RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.seller_id,
      1 - (p.embedding % avg_embedding) AS similarity
    FROM products p
    CROSS JOIN LATERAL (
      SELECT AVG(embedding) as avg_embedding
      FROM products
      WHERE id IN (
        SELECT DISTINCT product_id
        FROM orders
        WHERE buyer_id = user_id
      )
    ) avg
    WHERE p.embedding IS NOT NULL
      AND p.status = 'active'
      AND p.id NOT IN (
        SELECT DISTINCT product_id
        FROM orders
        WHERE buyer_id = user_id
      )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Function: batch_insert_embeddings
-- Chèn nhiều embeddings vào database
CREATE OR REPLACE FUNCTION batch_insert_embeddings(
  products_data jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  product_record jsonb;
BEGIN
  FOR product_record IN SELECT * FROM jsonb_array_elements(products_data)
  LOOP
    INSERT INTO products (
      id,
      seller_id,
      name,
      description,
      price,
      category,
      image_urls,
      embedding,
      status
    )
    VALUES (
      product_record->>'id',
      product_record->>'seller_id',
      product_record->>'name',
      product_record->>'description',
      (product_record->>'price')::numeric,
      product_record->>'category',
      product_record->'image_urls',
      (product_record->>'embedding')::vector(1024),
      'pending'
    )
    ON CONFLICT (id) DO UPDATE SET
      embedding = EXCLUDED.embedding,
      description = EXCLUDED.description,
      status = CASE 
        WHEN EXCLUDED.embedding IS NOT NULL THEN 'active'
        ELSE 'pending'
      END;
  END LOOP;
END;
$$;

-- Function: calculate_product_embedding
-- Tính embedding cho một sản phẩm từ description và name
CREATE OR REPLACE FUNCTION calculate_product_embedding(
  name text,
  description text,
  category text
)
RETURNS vector(1024)
LANGUAGE plpgsql
AS $$
DECLARE
  full_text text;
  embedding vector(1024);
BEGIN
  -- Combine all text fields
  full_text := name || ' ' || description || ' ' || category;
  
  -- Call OpenAI API để generate embedding
  -- (Trong thực tế, bạn sẽ gọi API từ Supabase Edge Function)
  -- embedding := call_openai_embedding_api(full_text);
  
  -- Placeholder: return empty vector
  embedding := '[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]'::vector;
  
  RETURN embedding;
END;
$$;

-- Function: get_top_products_by_category
-- Lấy top sản phẩm phổ biến nhất trong category
CREATE OR REPLACE FUNCTION get_top_products_by_category(
  category text,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  seller_id uuid,
  total_sales numeric,
  avg_rating numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.seller_id,
      COALESCE(SUM(o.quantity), 0) as total_sales,
      COALESCE(AVG(r.rating), 0) as avg_rating
    FROM products p
    LEFT JOIN orders o ON p.id = o.product_id AND o.status IN ('delivered', 'confirmed')
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.category = category
      AND p.status = 'active'
    GROUP BY p.id, p.name, p.description, p.price, p.category, p.seller_id
    ORDER BY total_sales DESC, avg_rating DESC
    LIMIT limit_count;
END;
$$;

-- Function: search_products_with_vector_and_filters
// Tìm kiếm với cả vector similarity và filters
CREATE OR REPLACE FUNCTION search_products_with_vector_and_filters(
  query_embedding vector(1024),
  price_min numeric DEFAULT NULL,
  price_max numeric DEFAULT NULL,
  category text DEFAULT NULL,
  min_similarity float DEFAULT 0.7,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  image_urls text[],
  seller_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.image_urls,
      p.seller_id,
      1 - (p.embedding % query_embedding) AS similarity
    FROM products p
    WHERE p.embedding IS NOT NULL
      AND p.status = 'active'
      AND (price_min IS NULL OR p.price >= price_min)
      AND (price_max IS NULL OR p.price <= price_max)
      AND (category IS NULL OR p.category = category)
      AND 1 - (p.embedding % query_embedding) >= min_similarity
    ORDER BY similarity DESC
    LIMIT limit_count;
END;
$$;

-- Function: get_embedding_stats
// Lấy thống kê về embeddings trong database
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  total_products int,
  products_with_embedding int,
  average_similarity float,
  category_stats jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      COUNT(*) as total_products,
      COUNT(embedding) as products_with_embedding,
      (
        SELECT AVG(1 - (p.embedding % q.embedding))
        FROM products p
        CROSS JOIN LATERAL (
          SELECT embedding
          FROM products
          WHERE embedding IS NOT NULL
          ORDER BY RANDOM()
          LIMIT 100
        ) q
      ) as average_similarity,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'category', category,
            'count', COUNT(*),
            'with_embedding', COUNT(embedding)
          )
        )
        FROM products
        GROUP BY category
      ) as category_stats;
END;
$$;
```

---

### **Supabase Edge Function: Generate Embedding**

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http.server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmbeddingRequest {
  name: string
  description: string
  category: string
}

interface EmbeddingResponse {
  embedding: number[]
}

serve(async (req) => {
  try {
    const { name, description, category } = await req.json() as EmbeddingRequest

    // Validate input
    if (!name || !description || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      )
    }

    // Generate embedding using OpenAI API
    const embedding = await generateEmbedding(name, description, category)

    return new Response(
      JSON.stringify({ embedding }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-embedding:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate embedding',
        details: error.message 
      }),
      { status: 500 }
    )
  }
})

// Generate embedding using OpenAI API
async function generateEmbedding(
  name: string,
  description: string,
  category: string
): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const fullText = `${name}. ${description}. Category: ${category}`

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: fullText
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API error: ${error.error?.message}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}
```

---

### **Supabase Edge Function: Batch Process Images**

```typescript
// supabase/functions/batch-process-images/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http.server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface BatchProcessRequest {
  productIds: string[]
}

interface BatchProcessResponse {
  processed: number
  failed: number
  results: Array<{
    productId: string
    success: boolean
    description?: string
    error?: string
  }>
}

serve(async (req) => {
  try {
    const { productIds } = await req.json() as BatchProcessRequest

    if (!productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ error: 'Invalid product IDs' }),
        { status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results: any[] = []
    let processed = 0
    let failed = 0

    // Process each product
    for (const productId of productIds) {
      try {
        // Get product details
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) {
          throw new Error('Product not found')
        }

        // Get first image URL
        const imageUrl = product.image_urls?.[0]
        if (!imageUrl) {
          throw new Error('No image found')
        }

        // Generate caption
        const captionResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/image-captioning`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({ imageUrl, productId })
          }
        )

        const captionData = await captionResponse.json()

        if (!captionResponse.ok) {
          throw new Error(captionData.error || 'Failed to generate caption')
        }

        // Generate embedding
        const embeddingResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embedding`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              name: product.name,
              description: captionData.description,
              category: product.category
            })
          }
        )

        const embeddingData = await embeddingResponse.json()

        if (!embeddingResponse.ok) {
          throw new Error(embeddingData.error || 'Failed to generate embedding')
        }

        // Update product with caption and embedding
        const updateResponse = await supabase
          .from('products')
          .update({
            description: captionData.description,
            embedding: embeddingData.embedding,
            status: 'active'
          })
          .eq('id', productId)

        if (updateResponse.error) {
          throw new Error(updateResponse.error.message)
        }

        results.push({
          productId,
          success: true,
          description: captionData.description
        })
        processed++

      } catch (error: any) {
        results.push({
          productId,
          success: false,
          error: error.message
        })
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        failed,
        results
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error in batch-process-images:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Batch processing failed',
        details: error.message 
      }),
      { status: 500 }
    )
  }
})
```

---

### **Supabase Edge Function: Get Product Recommendations**

```typescript
// supabase/functions/get-product-recommendations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http.server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RecommendationRequest {
  userId: string
  limit?: number
  category?: string
}

interface RecommendationResponse {
  recommendations: Array<{
    id: string
    name: string
    description: string
    price: number
    category: string
    image_urls: string[]
    similarity: number
    reason: string
  }>
  metadata: {
    totalRecommendations: number
  }
}

serve(async (req) => {
  try {
    const { userId, limit = 10, category } = 
      await req.json() as RecommendationRequest

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get product recommendations
    const recommendations = await getProductRecommendations(
      userId,
      limit,
      category
    )

    return new Response(
      JSON.stringify({
        recommendations,
        metadata: {
          totalRecommendations: recommendations.length
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-product-recommendations:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get recommendations',
        details: error.message 
      }),
      { status: 500 }
    )
  }
})

async function getProductRecommendations(
  userId: string,
  limit: number,
  category?: string
): Promise<any[]> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Get user's purchase history
  const { data: purchaseHistory } = await supabase
    .from('orders')
    .select('product_id')
    .eq('buyer_id', userId)
    .in('status', ['delivered', 'confirmed'])

  if (!purchaseHistory || purchaseHistory.length === 0) {
    // If no purchase history, return popular products in category
    return await getPopularProducts(category, limit)
  }

  const productIds = purchaseHistory.map(order => order.product_id)

  // Get embeddings of purchased products
  const { data: purchasedProducts } = await supabase
    .from('products')
    .select('id, embedding')
    .in('id', productIds)

  if (!purchasedProducts || purchasedProducts.length === 0) {
    return await getPopularProducts(category, limit)
  }

  // Calculate average embedding
  const avgEmbedding = purchasedProducts.reduce(
    (sum, product) => {
      return sum.map((val: number, i: number) => 
        val + (product.embedding?.[i] || 0)
      )
    },
    Array(1024).fill(0)
  ).map(val => val / purchasedProducts.length)

  // Search for similar products
  const { data: similarProducts } = await supabase.rpc('match_products', {
    query_embedding: avgEmbedding,
    match_threshold: 0.6,
    match_count: limit * 3, // Get more results to filter
    filter: category ? `category = $1` : undefined,
    filter_params: category ? [category] : undefined
  })

  if (!similarProducts) {
    return await getPopularProducts(category, limit)
  }

  // Filter out already purchased products
  const filteredProducts = similarProducts.filter(
    product => !productIds.includes(product.id)
  )

  // Add reason for recommendation
  return filteredProducts.slice(0, limit).map(product => ({
    ...product,
    reason: 'Similar to products you purchased'
  }))
}

async function getPopularProducts(
  category?: string,
  limit: number
): Promise<any[]> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      category,
      image_urls
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return data.map(product => ({
    ...product,
    similarity: 0,
    reason: 'Popular product'
  }))
}
```

---

### **Frontend: Vector Search Component**

```typescript
// components/VectorSearch.tsx
'use client'

import { useState } from 'react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_urls: string[]
  similarity: number
}

export function VectorSearch() {
  const [query, setQuery] = useState('')
  const [queryVector, setQueryVector] = useState<number[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<string>('')

  // Generate embedding from text query
  const generateEmbedding = async (text: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          name: text,
          description: text,
          category: category || 'general'
        })
      }
    )

    const data = await response.json()
    return data.embedding
  }

  // Search products using vector similarity
  const searchProducts = async () => {
    if (!query) return

    setLoading(true)

    try {
      // Generate embedding from query
      const embedding = await generateEmbedding(query)
      setQueryVector(embedding)

      // Search products
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vector-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            queryVector: embedding,
            category: category || undefined,
            minSimilarity: 0.7,
            limit: 20
          })
        }
      )

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await searchProducts()
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Vector Search</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="home">Home & Garden</option>
            <option value="sports">Sports</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Results */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="border rounded-lg overflow-hidden"
            >
              {product.image_urls?.[0] && (
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${product.price.toFixed(2)}
                </p>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    Similarity: {(product.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && !loading && query && (
        <p className="text-gray-500 text-center py-8">
          No products found. Try a different search.
        </p>
      )}
    </div>
  )
}
```

---

### **Supabase: Database Migrations**

```sql
-- Migrations for vector search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create products table (updated with embedding)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  inventory integer DEFAULT 0,
  category text,
  image_urls text[],
  embedding vector(1024),
  status text DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'sold', 'pending', 'disputed')),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Create vector search functions (see above)

-- Create indexes for vector search
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_seller ON products(seller_id);

-- Create index for fast similarity search
CREATE INDEX idx_products_similarity ON products
  USING ivfflat (embedding vector_l2_ops)
  WITH (lists = 100);

-- Create index for composite search
CREATE INDEX idx_products_category_embedding ON products
  USING ivfflat (embedding vector_cosine_ops, category)
  WITH (lists = 100);

-- Create index for filtering
CREATE INDEX idx_products_price ON products(price);

-- Create index for time-based filtering
CREATE INDEX idx_products_created_at ON products(created_at DESC);
```

---

### **Deployment Commands**

```bash
# Deploy Supabase Edge Functions
supabase functions deploy image-captioning
supabase functions deploy vector-search
supabase functions deploy generate-embedding
supabase functions deploy batch-process-images
supabase functions deploy get-product-recommendations

# Deploy Cloudflare Worker (if needed)
npx wrangler deploy

# Run batch process for existing products
supabase functions invoke batch-process-images \
  --body '{"productIds": ["uuid1", "uuid2", "uuid3"]}'
```

---

### **Dashboard URLs**

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Cloudflare Workers**: https://dash.cloudflare.com/37ffca2f3565ad661c81ced689b4e2ad/workers-and-pages

---

### **Tính năng chính**

1. **Image Captioning**:
   - Tự động tạo description cho hình ảnh sản phẩm
   - Extract features từ ảnh
   - Generate suggested tags
   - Store caption với confidence score

2. **Vector Search**:
   - Tìm kiếm sản phẩm dựa trên semantic meaning
   - Vector similarity search với pgvector
   - Multi-filter support (category, price, inventory)
   - Personalized recommendations
   - Get similar products

3. **Batch Processing**:
   - Process nhiều sản phẩm cùng lúc
   - Generate caption và embedding
   - Update database

4. **Recommendations**:
   - Dựa trên lịch sử mua hàng
   - Dựa trên category
   - Dựa trên popular products



