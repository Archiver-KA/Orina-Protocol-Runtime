# Quick Start: IPFS Upload Configuration

## 🚀 3-Minute Setup

### 1️⃣ Get Pinata JWT (2 minutes)

1. Go to **https://app.pinata.cloud/register** (or login)
2. Navigate to **API Keys**
3. Click **New Key**
4. Enable: `pinFileToIPFS` permission
5. Name it: "Orina Upload"
6. Click **Create Key**
7. **COPY THE JWT** (starts with `eyJhbG...`) - only shown once!

### 2️⃣ Set Environment Variable (1 minute)

**In Supabase Dashboard:**

```
1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
2. Go to: Edge Functions → Settings
3. Add variable:
   - Name: PINATA_JWT
   - Value: [paste your JWT]
4. Click Save
```

### 3️⃣ Done! ✅

Test by uploading an image in:
- Profile page (avatar/banner)
- Minting page (asset image)
- Orders page (dispute evidence)

---

## 💡 What You Get

- ✅ Decentralized storage via IPFS
- ✅ Multiple gateway redundancy
- ✅ Permanent file availability
- ✅ 1GB free storage (Pinata)
- ✅ Unlimited bandwidth
- ✅ Perfect for NFTs & RWAs

---

## ⚠️ Important Notes

- **JWT is shown only once** - save it securely!
- **Free tier**: 1GB storage (plenty for prototyping)
- **Variable name must be**: `PINATA_JWT` (exact case)
- **Functions restart automatically** after saving

---

## 🔧 Troubleshooting

**"IPFS service not configured" error?**
- Check PINATA_JWT is set correctly
- Wait 1-2 minutes for functions to restart
- No spaces in the JWT value

**Upload failed?**
- Check file size < 100MB
- Verify file type (JPG, PNG, GIF, WebP, MP4)
- Check browser console for errors

---

## 📖 Full Documentation

See [IPFS_SETUP.md](/IPFS_SETUP.md) for detailed guide.

---

**Need the Supabase URL?** 
Check your project settings or contact your dev team.
