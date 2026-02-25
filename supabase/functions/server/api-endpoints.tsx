import { Hono } from 'npm:hono';
import { authenticateAPIKey, hasPermission, logAPIUsage } from './api-auth.tsx';
import * as kv from './kv_store.tsx';

const api = new Hono();

// Authentication middleware
api.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const startTime = Date.now();
  
  const authResult = await authenticateAPIKey(apiKey);
  
  if (!authResult.valid) {
    await logAPIUsage('unknown', c.req.path, false, Date.now() - startTime);
    return c.json({ error: authResult.error }, 401);
  }

  // Store key in context for later use
  c.set('apiKey', authResult.key);
  
  await next();
  
  // Log successful request
  await logAPIUsage(
    authResult.key!.id,
    c.req.path,
    true,
    Date.now() - startTime
  );
});

// GET /api/v1/assets - List all assets
api.get('/assets', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'read')) {
    return c.json({ error: 'Insufficient permissions. Requires: read' }, 403);
  }

  // Mock assets data
  const assets = await kv.get<any[]>(`assets:${apiKey.walletAddress}`) || [
    {
      id: 'asset_1',
      name: 'Tesla Model 3 (2023)',
      description: 'Long Range, Autopilot, Pearl White',
      type: 'vehicle',
      price: 35000,
      currency: 'USD',
      status: 'available',
      metadata: {
        year: 2023,
        mileage: 12000,
        condition: 'excellent',
        location: 'California, USA'
      },
      tokenId: 'rwa_vehicle_001',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-02-01T14:30:00Z'
    },
    {
      id: 'asset_2',
      name: 'Miami Condo Unit 405',
      description: '2BR/2BA Ocean View, Brickell District',
      type: 'real_estate',
      price: 450000,
      currency: 'USD',
      status: 'available',
      metadata: {
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1200,
        location: 'Miami, FL'
      },
      tokenId: 'rwa_realestate_002',
      createdAt: '2024-01-20T12:00:00Z',
      updatedAt: '2024-02-05T09:15:00Z'
    },
    {
      id: 'asset_3',
      name: 'Gold Reserve 1kg Bar',
      description: '99.99% Pure Gold, LBMA Certified',
      type: 'commodity',
      price: 65000,
      currency: 'USD',
      status: 'available',
      metadata: {
        weight: '1kg',
        purity: '99.99%',
        certification: 'LBMA',
        serialNumber: 'GLD-2024-001'
      },
      tokenId: 'rwa_commodity_003',
      createdAt: '2024-02-01T08:00:00Z',
      updatedAt: '2024-02-08T16:45:00Z'
    }
  ];

  return c.json({
    success: true,
    count: assets.length,
    assets
  });
});

// GET /api/v1/assets/:id - Get single asset
api.get('/assets/:id', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'read')) {
    return c.json({ error: 'Insufficient permissions. Requires: read' }, 403);
  }

  const assetId = c.req.param('id');
  const asset = await kv.get(`asset:${apiKey.walletAddress}:${assetId}`);

  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  return c.json({
    success: true,
    asset
  });
});

// POST /api/v1/assets/mint - Create new asset
api.post('/assets/mint', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'mint')) {
    return c.json({ error: 'Insufficient permissions. Requires: mint' }, 403);
  }

  const body = await c.req.json();
  const { name, description, type, price, currency, metadata } = body;

  if (!name || !type || !price) {
    return c.json({ error: 'Missing required fields: name, type, price' }, 400);
  }

  // Generate new asset
  const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tokenId = `rwa_${type}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newAsset = {
    id: assetId,
    name,
    description: description || '',
    type,
    price,
    currency: currency || 'USD',
    status: 'available',
    metadata: metadata || {},
    tokenId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: apiKey.walletAddress
  };

  // Save asset
  await kv.set(`asset:${apiKey.walletAddress}:${assetId}`, newAsset);

  // Mock blockchain transaction
  const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

  return c.json({
    success: true,
    asset: newAsset,
    transaction: {
      hash: txHash,
      status: 'confirmed',
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000
    }
  }, 201);
});

// PUT /api/v1/assets/:id - Update asset
api.put('/assets/:id', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'write')) {
    return c.json({ error: 'Insufficient permissions. Requires: write' }, 403);
  }

  const assetId = c.req.param('id');
  const body = await c.req.json();

  const asset = await kv.get<any>(`asset:${apiKey.walletAddress}:${assetId}`);

  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  // Update fields
  const updatedAsset = {
    ...asset,
    ...body,
    id: assetId, // Prevent ID change
    owner: apiKey.walletAddress, // Prevent owner change
    updatedAt: new Date().toISOString()
  };

  await kv.set(`asset:${apiKey.walletAddress}:${assetId}`, updatedAsset);

  return c.json({
    success: true,
    asset: updatedAsset
  });
});

// DELETE /api/v1/assets/:id - Delete asset
api.delete('/assets/:id', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'delete')) {
    return c.json({ error: 'Insufficient permissions. Requires: delete' }, 403);
  }

  const assetId = c.req.param('id');
  const asset = await kv.get(`asset:${apiKey.walletAddress}:${assetId}`);

  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  await kv.del(`asset:${apiKey.walletAddress}:${assetId}`);

  return c.json({
    success: true,
    message: 'Asset deleted successfully'
  });
});

// GET /api/v1/analytics - Get analytics
api.get('/analytics', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'read')) {
    return c.json({ error: 'Insufficient permissions. Requires: read' }, 403);
  }

  // Mock analytics data
  const analytics = {
    totalVolume: 2340000,
    assetsCount: 12,
    activeListings: 8,
    soldAssets: 4,
    averagePrice: 195000,
    topCategory: 'real_estate',
    recentSales: [
      {
        assetId: 'asset_5',
        name: 'Luxury Yacht 45ft',
        price: 850000,
        soldAt: '2024-02-05T14:30:00Z'
      }
    ],
    monthlyRevenue: {
      january: 1200000,
      february: 1140000
    }
  };

  return c.json({
    success: true,
    analytics
  });
});

// GET /api/v1/orders - Get orders
api.get('/orders', async (c) => {
  const apiKey = c.get('apiKey');
  
  if (!hasPermission(apiKey, 'read')) {
    return c.json({ error: 'Insufficient permissions. Requires: read' }, 403);
  }

  // Mock orders data
  const orders = await kv.get<any[]>(`orders:${apiKey.walletAddress}`) || [
    {
      id: 'order_1',
      assetId: 'asset_1',
      buyerAddress: '0x123...abc',
      price: 35000,
      currency: 'USDC',
      status: 'pending',
      createdAt: '2024-02-08T10:00:00Z'
    },
    {
      id: 'order_2',
      assetId: 'asset_3',
      buyerAddress: '0x456...def',
      price: 65000,
      currency: 'ETH',
      status: 'completed',
      createdAt: '2024-02-06T15:30:00Z',
      completedAt: '2024-02-07T09:15:00Z'
    }
  ];

  return c.json({
    success: true,
    count: orders.length,
    orders
  });
});

export default api;
