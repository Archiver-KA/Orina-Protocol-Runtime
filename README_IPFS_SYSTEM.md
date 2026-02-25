# 🌐 IPFS Upload System for Orina

> Decentralized image upload system using IPFS via Pinata API

---

## 🎯 Quick Links

| I want to... | Go to |
|--------------|-------|
| **Setup in 3 minutes** | [`QUICK_START_IPFS.md`](./QUICK_START_IPFS.md) ⭐ START HERE |
| **Read full guide** | [`IPFS_SETUP.md`](./IPFS_SETUP.md) |
| **Integrate components** | [`NEXT_STEPS_IPFS.md`](./NEXT_STEPS_IPFS.md) |
| **Technical details** | [`IPFS_IMPLEMENTATION_SUMMARY.md`](./IPFS_IMPLEMENTATION_SUMMARY.md) |
| **Overview** | [`IPFS_COMPLETE_SETUP.md`](./IPFS_COMPLETE_SETUP.md) |

---

## 📋 What is This?

Hệ thống upload ảnh **decentralized** cho Orina Web3 Analytics Dashboard:

- ✅ Upload images to IPFS (permanent storage)
- ✅ Secure (API keys server-side only)
- ✅ Multiple gateways (redundancy)
- ✅ Easy integration (2 components)
- ✅ Free tier (1GB storage)

---

## 🚀 Quick Start

### 1. Get Pinata JWT (2 min)
```
https://app.pinata.cloud → API Keys → New Key
→ Enable "pinFileToIPFS" → Copy JWT
```

### 2. Set Environment Variable (1 min)
```
Dialog box đang hiển thị → Paste JWT → Create secret
```

### 3. Test (30 sec)
```
Upload ảnh trong app → Verify thành công
```

**Chi tiết**: [`QUICK_START_IPFS.md`](./QUICK_START_IPFS.md)

---

## 📁 File Structure

### Backend
```
/supabase/functions/server/
├── ipfs-upload.tsx          # IPFS upload router
└── index.tsx                # Main server (updated)
```

### Frontend
```
/src/app/components/
├── image-upload.tsx         # Single upload component
├── multi-image-upload.tsx   # Multiple upload component
├── ipfs-setup-guide.tsx     # Setup wizard
├── ipfs-setup-banner.tsx    # Warning banner
└── ipfs-test-page.tsx       # Test interface
```

### Hooks & Utils
```
/src/hooks/
└── useIPFSUpload.ts         # Upload hook

/src/utils/
└── ipfs-config.ts           # Config utilities
```

### Documentation
```
/
├── QUICK_START_IPFS.md                # ⭐ START HERE
├── IPFS_SETUP.md                      # Complete guide
├── IPFS_COMPLETE_SETUP.md             # Overview
├── NEXT_STEPS_IPFS.md                 # Integration steps
├── IPFS_IMPLEMENTATION_SUMMARY.md     # Technical docs
└── README_IPFS_SYSTEM.md              # This file
```

---

## 💻 Usage Examples

### Single Image Upload

```tsx
import { ImageUpload } from '@/app/components/image-upload';

<ImageUpload
  variant="avatar"
  onUploadSuccess={(image) => {
    console.log('IPFS Hash:', image.ipfsHash);
    console.log('URL:', image.url);
    // Save to database
    updateProfile({ avatarUrl: image.url });
  }}
  label="Profile Picture"
/>
```

### Multiple Images Upload

```tsx
import { MultiImageUpload } from '@/app/components/multi-image-upload';

<MultiImageUpload
  maxFiles={5}
  onUploadSuccess={(images) => {
    const urls = images.map(img => img.url);
    // Save evidence URLs
    submitDispute({ evidenceUrls: urls });
  }}
/>
```

### Using Hook

```tsx
import { useIPFSUpload } from '@/hooks/useIPFSUpload';

function MyComponent() {
  const { uploadFile, isUploading, progress } = useIPFSUpload();

  const handleUpload = async (file: File) => {
    const result = await uploadFile(file);
    if (result.success) {
      console.log('Uploaded:', result.file?.url);
    }
  };

  return (
    <div>
      {isUploading && <p>Uploading... {progress}%</p>}
    </div>
  );
}
```

---

## 🎨 Components

### `<ImageUpload />`
Single image upload với preview và progress

**Props:**
- `variant`: 'avatar' | 'banner' | 'asset' | 'evidence'
- `onUploadSuccess`: Callback with file info
- `maxSizeMB`: Size limit (default 100MB)
- `accept`: File types (default images)

### `<MultiImageUpload />`
Multiple images với grid preview

**Props:**
- `maxFiles`: Max files (default 5)
- `onUploadSuccess`: Callback with array
- `maxSizeMB`: Size limit per file

### `<IPFSSetupGuide />`
Interactive 4-step setup wizard

### `<IPFSSetupBanner />`
Warning banner when not configured

---

## 🔧 API Endpoints

### POST `/ipfs/upload`
Upload single file

**Request:**
```
POST /make-server-b0d68fc8/ipfs/upload
Content-Type: multipart/form-data

file: [File]
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmYwAPJzv...",
  "urls": {
    "pinata": "https://gateway.pinata.cloud/ipfs/...",
    "ipfs": "https://ipfs.io/ipfs/...",
    "cloudflare": "https://cloudflare-ipfs.com/ipfs/...",
    "dweb": "https://dweb.link/ipfs/..."
  },
  "metadata": {
    "fileName": "image.png",
    "fileSize": 524288,
    "mimeType": "image/png"
  }
}
```

### POST `/ipfs/upload-multiple`
Upload multiple files (max 10)

### GET `/ipfs/info/:hash`
Get gateway URLs for hash

---

## 📊 Specifications

### File Limits
- **Max size**: 100MB per file
- **Max files**: 10 per batch
- **Types**: JPG, PNG, GIF, WebP, MP4

### Pinata Free Tier
- **Storage**: 1 GB
- **Bandwidth**: Unlimited
- **Cost**: $0/month

### IPFS Gateways
4 gateways for redundancy:
1. Pinata (primary)
2. IPFS.io (fallback)
3. Cloudflare (fast CDN)
4. Dweb (decentralized)

---

## 🔐 Security

- ✅ API key stored server-side only
- ✅ File validation (type + size)
- ✅ CORS protection
- ✅ Authorization required
- ✅ No sensitive data in responses

---

## 📍 Integration Points

### Profile Page
- Avatar upload (400x400px)
- Banner upload (1500x500px)

### Minting Page
- Asset media (images/videos)
- Up to 100MB

### Disputes
- Evidence photos (max 5)
- Up to 10MB each

### Community
- Post attachments (future)

---

## 🧪 Testing

### Option 1: Test Page
Access `<IPFSTestPage />` component for full testing UI

### Option 2: Manual Test
```bash
curl -X POST \
  https://PROJECT.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload \
  -H "Authorization: Bearer ANON_KEY" \
  -F "file=@test.jpg"
```

### Option 3: Browser
Use setup wizard's built-in verification

---

## 🚨 Troubleshooting

### "IPFS service not configured"
→ Set PINATA_JWT in Supabase environment variables

### Upload fails
→ Check file size < 100MB
→ Verify file type is supported
→ Check browser console

### Slow uploads
→ Compress images
→ Use recommended sizes
→ Check network speed

### Image not accessible
→ Try different gateways
→ Wait for IPFS propagation
→ Check hash in IPFS explorer

**Full troubleshooting**: [`IPFS_SETUP.md`](./IPFS_SETUP.md)

---

## 📖 Documentation

### For Users
1. [`QUICK_START_IPFS.md`](./QUICK_START_IPFS.md) - 3-min setup
2. [`IPFS_COMPLETE_SETUP.md`](./IPFS_COMPLETE_SETUP.md) - Overview

### For Developers
1. [`NEXT_STEPS_IPFS.md`](./NEXT_STEPS_IPFS.md) - Integration
2. [`IPFS_IMPLEMENTATION_SUMMARY.md`](./IPFS_IMPLEMENTATION_SUMMARY.md) - Technical

### Complete Guide
1. [`IPFS_SETUP.md`](./IPFS_SETUP.md) - Everything

---

## ✅ Checklist

### Setup
- [ ] Get Pinata account
- [ ] Generate API key (JWT)
- [ ] Set PINATA_JWT in Supabase
- [ ] Wait for function restart (2 min)
- [ ] Test upload

### Integration
- [ ] Import components
- [ ] Add to forms
- [ ] Test all upload points
- [ ] Update database schema
- [ ] Monitor Pinata usage

---

## 🎯 Benefits

### For Users
- ✅ Permanent storage (files never disappear)
- ✅ Fast uploads with progress
- ✅ Preview before upload
- ✅ Multiple gateway access

### For Developers
- ✅ Easy integration (2 components)
- ✅ Secure by default
- ✅ Well documented
- ✅ Error handling built-in

### For Business
- ✅ Free tier (1GB)
- ✅ Decentralized (no single point of failure)
- ✅ Web3 native
- ✅ Scalable

---

## 🔄 Workflow

```
User selects file
    ↓
Frontend validation
    ↓
Preview shown
    ↓
Upload to backend
    ↓
Backend validates
    ↓
Upload to Pinata
    ↓
Get IPFS hash
    ↓
Generate gateway URLs
    ↓
Return to frontend
    ↓
Store URL in app
```

---

## 💡 Tips

1. **Start small** - Test with 1 image first
2. **Use recommended sizes** - Faster uploads
3. **Store IPFS hash** - For verification
4. **Monitor usage** - Pinata dashboard
5. **Free tier is enough** - For prototypes

---

## 📞 Support

### Check First
1. Documentation files above
2. Browser console errors
3. Supabase function logs
4. Pinata dashboard

### Still Stuck?
- Review setup steps
- Test with smaller files
- Try different browsers
- Check network connectivity

---

## 🚀 Current Status

**Implementation**: ✅ Complete
**Testing**: ⏳ Awaiting PINATA_JWT setup
**Documentation**: ✅ Complete
**Ready for use**: ✅ Yes (after setup)

---

## 📝 Version

- **Version**: 1.0.0
- **Date**: February 10, 2026
- **Author**: Orina Development Team
- **Status**: Production Ready

---

## 🎓 Learn More

- **IPFS**: https://docs.ipfs.tech
- **Pinata**: https://docs.pinata.cloud
- **Web3 Storage**: https://web3.storage/docs

---

**⭐ Quick Start: [`QUICK_START_IPFS.md`](./QUICK_START_IPFS.md)**

**❓ Questions: Check documentation files above**
