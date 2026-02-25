# Next Steps: IPFS Upload Integration

## ✅ What's Been Completed

Đã implement hoàn chỉnh:
- ✅ Backend IPFS upload API (Supabase Edge Functions)
- ✅ Frontend upload components (single & multiple)
- ✅ Setup wizard & configuration tools
- ✅ Documentation & guides
- ✅ Test page
- ✅ Error handling & validation

## 🔧 Required Action: Configure PINATA_JWT

**Bạn cần làm ngay:**

### Quick Setup (3 phút)

1. **Get Pinata JWT**
   ```
   https://app.pinata.cloud/register
   → API Keys → New Key
   → Enable "pinFileToIPFS"
   → Copy JWT (eyJhbG...)
   ```

2. **Set in Supabase**
   ```
   Trong dialog box đang hiển thị:
   → Paste JWT vào "Secret value"
   → Click "Create secret"
   ```

3. **Verify**
   ```
   Đợi 1-2 phút cho functions restart
   → Test upload trong app
   ```

**Chi tiết**: Xem `/QUICK_START_IPFS.md`

## 🧪 Testing the Implementation

### Option 1: Use Test Page (Recommended)

Tạo route mới để access test page:

```tsx
// In your router/App.tsx
import { IPFSTestPage } from './components/ipfs-test-page';

// Add route:
case 'ipfs-test':
  return <IPFSTestPage />;
```

Navigate to: `#ipfs-test`

### Option 2: Test in Existing Pages

Upload locations đã sẵn sàng:
- Profile page (avatar/banner) - cần update component
- Minting page - cần update component
- Orders disputes - cần update component

## 🎯 Integration Steps

### 1. Update Profile Page

**File**: `/src/app/components/profile/edit-profile-modal.tsx`

Replace upload placeholders with:

```tsx
import { ImageUpload } from '@/app/components/image-upload';

// Replace banner upload section (lines 57-69)
<ImageUpload
  variant="banner"
  onUploadSuccess={(image) => {
    // Save to profile
    onSave({ bannerUrl: image.url, bannerIpfsHash: image.ipfsHash });
  }}
  label="Profile Banner"
  description="Recommended: 1500x500px"
/>

// Replace avatar upload section (lines 71-90)
<ImageUpload
  variant="avatar"
  onUploadSuccess={(image) => {
    onSave({ avatarUrl: image.url, avatarIpfsHash: image.ipfsHash });
  }}
  label="Profile Picture"
  description="Recommended: 400x400px"
/>
```

### 2. Update Minting Page

**File**: `/src/app/components/minting.tsx`

Replace media upload section (lines 150-166):

```tsx
import { ImageUpload } from '@/app/components/image-upload';

<ImageUpload
  variant="asset"
  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
  maxSizeMB={100}
  onUploadSuccess={(image) => {
    // Store in minting form
    setAssetImage(image.url);
    setAssetIpfsHash(image.ipfsHash);
  }}
  label="Asset Media"
  description="Supports JPG, PNG, GIF, MP4 (Max 100MB)"
/>
```

### 3. Update Dispute Evidence Upload

**File**: `/src/app/components/open-dispute-modal.tsx`

Replace file upload section (lines 204-216):

```tsx
import { MultiImageUpload } from '@/app/components/multi-image-upload';

<MultiImageUpload
  maxFiles={5}
  maxSizeMB={10}
  onUploadSuccess={(images) => {
    const urls = images.map(img => img.url);
    setEvidenceUrls(urls);
  }}
  label="Upload Evidence"
  description="PNG, JPG up to 10MB (max 5 images)"
/>
```

### 4. Add Setup Banner (Optional)

Show warning in pages that need upload:

```tsx
import { IPFSSetupBanner } from '@/app/components/ipfs-setup-banner';

// Add at top of page content
<IPFSSetupBanner />
```

## 📋 Database Schema Updates

Nếu cần lưu IPFS hashes riêng:

```typescript
interface UserProfile {
  avatarUrl?: string;
  avatarIpfsHash?: string;  // NEW
  bannerUrl?: string;
  bannerIpfsHash?: string;  // NEW
  // ...
}

interface Asset {
  imageUrl: string;
  ipfsHash?: string;  // NEW
  // ...
}
```

## 🔍 Verification Checklist

Sau khi setup PINATA_JWT:

- [ ] Banner không còn hiện "IPFS not configured"
- [ ] Upload avatar thành công
- [ ] Upload banner thành công
- [ ] Upload asset image thành công
- [ ] Upload multiple evidence images thành công
- [ ] IPFS URLs accessible từ browser
- [ ] All 4 gateways working
- [ ] Preview hiển thị đúng
- [ ] Error handling works (wrong file type, too large)

## 📚 Documentation

Reference docs:

1. **`/QUICK_START_IPFS.md`** - 3 minute setup
2. **`/IPFS_SETUP.md`** - Complete guide
3. **`/IPFS_IMPLEMENTATION_SUMMARY.md`** - Technical details

## 🆘 Troubleshooting

### Upload fails with "not configured"
→ Check PINATA_JWT is set in Supabase
→ Wait 2 minutes for function restart
→ Clear browser cache

### Upload succeeds but image not accessible
→ Try different gateway URLs
→ Wait a few seconds for IPFS propagation
→ Check IPFS hash in explorer: https://ipfs.io/ipfs/YOUR_HASH

### Slow uploads
→ Compress images before upload
→ Use recommended sizes
→ Check network connection

## 💡 Tips

1. **Start with test page** - verify everything works before integration
2. **Use recommended image sizes** - faster uploads, better UX
3. **Store IPFS hashes** - for verification and alternative gateways
4. **Monitor Pinata dashboard** - track usage and storage
5. **Free tier is enough** - 1GB for most prototypes

## 🎨 Optional Enhancements

After basic integration:

1. **Image Preview Modal** - show full size on click
2. **Crop Tool** - resize before upload
3. **Compression** - auto-optimize images
4. **Upload Queue** - manage multiple uploads
5. **Gallery View** - view all uploaded assets

## 📞 Support

Issues? Check:
1. Browser console errors
2. Supabase function logs
3. Network tab in DevTools
4. `/IPFS_SETUP.md` troubleshooting section

---

**Priority**: 🔴 HIGH - Setup PINATA_JWT now to enable uploads
**Estimated Time**: 5-10 minutes total
**Difficulty**: 🟢 Easy - follow quick start guide
