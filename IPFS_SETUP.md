# IPFS Upload Setup Guide for Orina

This guide will help you configure IPFS (InterPlanetary File System) uploads for the Orina Web3 Analytics Dashboard using Pinata as the IPFS provider.

## Why IPFS?

IPFS provides:
- **Decentralized Storage**: Files are distributed across the network
- **Permanent Availability**: Content-addressed storage ensures files never disappear
- **Multiple Gateways**: Access files through various gateways for redundancy
- **Censorship Resistance**: No single point of failure
- **Web3 Native**: Perfect for NFTs, RWAs, and blockchain applications

## Prerequisites

- Orina application deployed and running
- Access to Supabase dashboard
- A Pinata account (free tier available)

## Step 1: Create Pinata Account

1. Go to **https://app.pinata.cloud/register**
2. Sign up for a free account
3. Verify your email address
4. Complete the onboarding process

**Free Tier Limits:**
- 1 GB of storage
- Unlimited bandwidth
- Unlimited pinning operations
- Perfect for prototyping and testing

## Step 2: Generate Pinata API Key (JWT)

1. Log in to your Pinata dashboard
2. Navigate to **API Keys** in the sidebar
3. Click **"New Key"** button
4. Configure the API key:
   - **Name**: `Orina Upload` (or any descriptive name)
   - **Admin**: Leave unchecked
   - **Permissions**: Check the following:
     - ✅ **pinFileToIPFS** (REQUIRED)
     - ✅ **pinJSONToIPFS** (Optional, but recommended)
     - ✅ **unpin** (Optional, for cleanup)
5. Click **"Create Key"**
6. **IMPORTANT**: Copy the JWT token immediately
   - It starts with `eyJhbG...`
   - This is shown **only once** and cannot be retrieved later
   - Store it securely in a password manager

## Step 3: Configure Supabase Environment Variable

### Option A: Via Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **Edge Functions** → **Settings**
3. Scroll to **Environment Variables** section
4. Click **"Add variable"**
5. Enter the following:
   - **Variable name**: `PINATA_JWT`
   - **Variable value**: Paste your JWT token from Step 2
6. Click **"Save"**
7. Edge Functions will automatically restart

### Option B: Via Supabase CLI

If you're using the Supabase CLI locally:

```bash
# Set the environment variable
supabase secrets set PINATA_JWT=your_jwt_token_here

# Verify it was set
supabase secrets list
```

## Step 4: Verify Configuration

### Method 1: In-App Verification

1. Open the Orina application
2. Navigate to any page with image upload (Profile, Minting, etc.)
3. Click on the upload area
4. If you see an "IPFS Setup Guide" dialog, click through the verification step
5. Test by uploading a small image

### Method 2: API Test

You can test the IPFS endpoint directly:

```bash
# Create a test file
echo "test" > test.txt

# Upload to IPFS
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -F "file=@test.txt"

# Expected response:
# {
#   "success": true,
#   "ipfsHash": "Qm...",
#   "urls": {
#     "pinata": "https://gateway.pinata.cloud/ipfs/Qm...",
#     "ipfs": "https://ipfs.io/ipfs/Qm...",
#     ...
#   }
# }
```

## Step 5: Test Upload Functionality

Upload locations in Orina:

1. **Profile Page**:
   - Avatar upload (400x400px recommended)
   - Banner upload (1500x500px recommended)

2. **Minting Page**:
   - Asset media upload (images, videos up to 100MB)

3. **Orders/Disputes**:
   - Evidence upload (up to 5 images)

4. **Community Posts** (if enabled):
   - Post images

## Troubleshooting

### Error: "IPFS service not configured"

**Cause**: PINATA_JWT environment variable is not set or is incorrect

**Solution**:
1. Verify the JWT was copied correctly (no extra spaces)
2. Check it's named exactly `PINATA_JWT` (case-sensitive)
3. Restart Edge Functions after setting the variable
4. Wait 1-2 minutes for functions to fully restart

### Error: "Unauthorized" from Pinata

**Cause**: Invalid or expired JWT token

**Solution**:
1. Generate a new API key in Pinata dashboard
2. Update the PINATA_JWT environment variable
3. Ensure the JWT has `pinFileToIPFS` permission enabled

### Error: "File size exceeds limit"

**Cause**: Trying to upload a file larger than 100MB

**Solution**:
1. Compress or resize the image
2. Use a video compression tool for video files
3. Split large files if necessary

### Upload is slow

**Cause**: Large file size or network conditions

**Solution**:
1. Compress images before uploading
2. Use WebP format for better compression
3. Resize images to recommended dimensions
4. Check your internet connection

### Cannot access uploaded files

**Cause**: IPFS gateway may be temporarily unavailable

**Solution**:
1. The system provides multiple gateway URLs
2. Try accessing via different gateways:
   - Pinata: `https://gateway.pinata.cloud/ipfs/{hash}`
   - IPFS.io: `https://ipfs.io/ipfs/{hash}`
   - Cloudflare: `https://cloudflare-ipfs.com/ipfs/{hash}`
   - Dweb: `https://dweb.link/ipfs/{hash}`

## IPFS Gateways

The system uses multiple IPFS gateways for redundancy:

| Gateway | URL Pattern | Notes |
|---------|-------------|-------|
| Pinata | `https://gateway.pinata.cloud/ipfs/{hash}` | Primary (fastest for Pinata uploads) |
| IPFS.io | `https://ipfs.io/ipfs/{hash}` | Public gateway (may be slower) |
| Cloudflare | `https://cloudflare-ipfs.com/ipfs/{hash}` | Fast, reliable |
| Dweb | `https://dweb.link/ipfs/{hash}` | Alternative gateway |

## File Size Limits

- **Maximum file size**: 100 MB per file
- **Recommended sizes**:
  - Avatar: 400x400px, < 1MB
  - Banner: 1500x500px, < 2MB
  - Asset images: 1920x1080px, < 5MB
  - Asset videos: < 50MB

## Supported File Types

- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Videos**: MP4 (for NFT assets)

## Cost & Limits

**Pinata Free Tier:**
- 1 GB storage
- Unlimited bandwidth
- Unlimited pins
- No credit card required

**Paid Plans** (if you need more):
- Picnic: $20/mo - 100 GB
- Submarine: $100/mo - 1 TB
- Custom enterprise plans available

## Security Best Practices

1. **Never share your JWT token** publicly
2. **Rotate API keys** regularly (every 3-6 months)
3. **Use separate keys** for development and production
4. **Monitor usage** in Pinata dashboard
5. **Set up alerts** for unusual activity
6. **Keep backups** of important IPFS hashes

## Managing Uploads

### View Pinned Files

1. Go to Pinata dashboard
2. Navigate to **Files** section
3. View all uploaded files and their details

### Unpin Files (Free up storage)

1. Select files in Pinata dashboard
2. Click **Unpin** to remove from your account
3. Note: Files may still be available on IPFS if pinned by others

### Download Usage Reports

1. Go to **Account** → **Billing**
2. View storage and bandwidth usage
3. Download usage reports for auditing

## Additional Resources

- **Pinata Documentation**: https://docs.pinata.cloud
- **IPFS Documentation**: https://docs.ipfs.tech
- **Orina Support**: Contact your development team

## Need Help?

If you encounter issues not covered in this guide:

1. Check the browser console for detailed error messages
2. Review Supabase Edge Function logs
3. Contact Orina support with:
   - Error messages
   - Screenshot of the issue
   - Steps to reproduce
   - Browser and OS information

---

**Last Updated**: February 2026
**Version**: 1.0.0
