import { Hono } from "npm:hono@4.12.29";
import { readBoundedJson } from "./bounded-response.ts";
import { requireAuthenticatedWallet } from "./request-auth.ts";
import { checkRateLimit, rateLimitExceededResponse } from "./rate-limiter.ts";

const ipfsRouter = new Hono();
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_BATCH_SIZE = 50 * 1024 * 1024;
const MAX_BATCH_FILES = 5;
const PINATA_TIMEOUT_MS = 60_000;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
]);

function maxSizeForType(type: string): number {
  return type === "video/mp4" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

function hasOversizedContentLength(c: { req: { header: (name: string) => string | undefined } }, maxBytes: number): boolean {
  const length = Number(c.req.header("Content-Length") || 0);
  return Number.isFinite(length) && length > maxBytes;
}

async function hasValidFileSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (file.type === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (file.type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
      && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  if (file.type === "video/mp4") {
    return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  }
  return false;
}

function isValidIpfsCid(value: unknown): value is string {
  const cid = String(value || "").trim();
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)
    || /^b[a-z2-7]{20,119}$/.test(cid);
}

async function uploadFileToPinata(file: File, pinataJwt: string, metadata: Record<string, unknown>) {
  const pinataFormData = new FormData();
  pinataFormData.append("file", file);
  pinataFormData.append("pinataMetadata", JSON.stringify(metadata));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: pinataFormData,
    signal: AbortSignal.timeout(PINATA_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Pinata upload failed with status ${response.status}`);
  const result = await readBoundedJson<any>(response, 64 * 1024);
  if (!isValidIpfsCid(result?.IpfsHash)) throw new Error("Pinata returned an invalid IPFS CID");
  return result as { IpfsHash: string; Timestamp?: string };
}

/**
 * Check IPFS configuration status
 * GET /make-server-b0d68fc8/ipfs/check
 */
ipfsRouter.get("/check", async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit("ipfs_check", auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    return c.json({
      configured: !!PINATA_JWT,
      message: PINATA_JWT
        ? "IPFS upload is configured and ready"
        : "IPFS upload is unavailable"
    });
  } catch (error) {
    console.error("IPFS check error:", error);
    return c.json({ 
      configured: false,
      error: "Failed to check IPFS configuration",
      message: "IPFS configuration check failed"
    }, 500);
  }
});

/**
 * Upload image to IPFS via Pinata
 * POST /make-server-b0d68fc8/ipfs/upload
 */
ipfsRouter.post("/upload", async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const rate = await checkRateLimit("ipfs_upload", auth.identity.walletAddress);
    if (!rate.allowed) {
      return rateLimitExceededResponse(c, rate);
    }
    const dailyRate = await checkRateLimit("ipfs_upload_daily", auth.identity.walletAddress);
    if (!dailyRate.allowed) return rateLimitExceededResponse(c, dailyRate);

    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    if (!PINATA_JWT) {
      console.error("IPFS upload error: PINATA_JWT environment variable not set");
      return c.json({ 
        error: "IPFS service not configured. Please set PINATA_JWT in environment variables." 
      }, 500);
    }

    if (hasOversizedContentLength(c, MAX_VIDEO_SIZE + 1024 * 1024)) {
      return c.json({ error: "Upload request exceeds the maximum allowed size" }, 413);
    }

    // Get form data from request
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (file.name.length > 255) {
      return c.json({ error: "File name exceeds 255 characters" }, 400);
    }
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return c.json({ error: "Invalid file type" }, 400);
    }
    if (file.size <= 0 || file.size > maxSizeForType(file.type)) {
      return c.json({ error: "File exceeds the allowed size for its media type" }, 413);
    }
    if (!await hasValidFileSignature(file)) {
      return c.json({ error: "File signature does not match its declared media type" }, 400);
    }

    // Optional metadata
    const metadata = {
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.identity.walletAddress,
      },
    };
    const result = await uploadFileToPinata(file, PINATA_JWT, metadata);

    // Return IPFS URLs
    return c.json({
      success: true,
      ipfsHash: result.IpfsHash,
      // Multiple gateway options for redundancy
      urls: {
        pinata: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        ipfs: `https://ipfs.io/ipfs/${result.IpfsHash}`,
        cloudflare: `https://cloudflare-ipfs.com/ipfs/${result.IpfsHash}`,
        dweb: `https://dweb.link/ipfs/${result.IpfsHash}`,
      },
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        timestamp: result.Timestamp,
      },
    });

  } catch (error) {
    console.error("IPFS upload error:", error);
    return c.json({ 
      error: "Internal server error during IPFS upload"
    }, 500);
  }
});

/**
 * Upload multiple images to IPFS
 * POST /make-server-b0d68fc8/ipfs/upload-multiple
 */
ipfsRouter.post("/upload-multiple", async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const rate = await checkRateLimit("ipfs_upload_batch", auth.identity.walletAddress);
    if (!rate.allowed) {
      return rateLimitExceededResponse(c, rate);
    }
    const dailyRate = await checkRateLimit("ipfs_upload_batch_daily", auth.identity.walletAddress);
    if (!dailyRate.allowed) return rateLimitExceededResponse(c, dailyRate);

    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    if (!PINATA_JWT) {
      console.error("IPFS upload error: PINATA_JWT environment variable not set");
      return c.json({ 
        error: "IPFS service not configured. Please set PINATA_JWT in environment variables." 
      }, 500);
    }

    if (hasOversizedContentLength(c, MAX_BATCH_SIZE + 2 * 1024 * 1024)) {
      return c.json({ error: "Batch upload request exceeds the maximum allowed size" }, 413);
    }
    const formData = await c.req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return c.json({ error: "No files provided" }, 400);
    }

    if (files.length > MAX_BATCH_FILES) {
      return c.json({ error: `Maximum ${MAX_BATCH_FILES} files allowed per upload` }, 400);
    }
    const totalSize = files.reduce(
      (sum, file) => sum + (file instanceof File ? file.size : 0),
      0,
    );
    if (totalSize > MAX_BATCH_SIZE) {
      return c.json({ error: "Combined batch size exceeds 50 MB" }, 413);
    }

    const uploadResults = [];
    const errors = [];

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!(file instanceof File)) {
        errors.push({ index: i, error: "Invalid file" });
        continue;
      }

      try {
        if (file.name.length > 255) {
          errors.push({ index: i, error: "File name exceeds 255 characters" });
          continue;
        }
        if (!ALLOWED_FILE_TYPES.has(file.type)) {
          errors.push({ index: i, error: "Invalid file type" });
          continue;
        }
        if (file.size <= 0 || file.size > maxSizeForType(file.type)) {
          errors.push({ index: i, error: "File exceeds the allowed media size" });
          continue;
        }
        if (!await hasValidFileSignature(file)) {
          errors.push({ index: i, error: "File signature mismatch" });
          continue;
        }

        const metadata = {
          name: file.name,
          keyvalues: {
            uploadedAt: new Date().toISOString(),
            uploadedBy: auth.identity.walletAddress,
            batchIndex: i,
          },
        };
        const result = await uploadFileToPinata(file, PINATA_JWT, metadata);

        uploadResults.push({
          index: i,
          fileName: file.name,
          ipfsHash: result.IpfsHash,
          urls: {
            pinata: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
            ipfs: `https://ipfs.io/ipfs/${result.IpfsHash}`,
            cloudflare: `https://cloudflare-ipfs.com/ipfs/${result.IpfsHash}`,
            dweb: `https://dweb.link/ipfs/${result.IpfsHash}`,
          },
          metadata: {
            fileSize: file.size,
            mimeType: file.type,
            timestamp: result.Timestamp,
          },
        });

      } catch {
        errors.push({ 
          index: i, 
          error: "Upload failed"
        });
      }
    }

    return c.json({
      success: uploadResults.length > 0,
      uploaded: uploadResults.length,
      failed: errors.length,
      results: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("IPFS batch upload error:", error);
    return c.json({ 
      error: "Internal server error during batch IPFS upload"
    }, 500);
  }
});

/**
 * Get IPFS file info
 * GET /make-server-b0d68fc8/ipfs/info/:hash
 */
ipfsRouter.get("/info/:hash", async (c) => {
  try {
    const hash = c.req.param("hash");
    
    if (!isValidIpfsCid(hash)) {
      return c.json({ error: "A valid IPFS CID is required" }, 400);
    }

    // Return available gateway URLs
    return c.json({
      ipfsHash: hash,
      urls: {
        pinata: `https://gateway.pinata.cloud/ipfs/${hash}`,
        ipfs: `https://ipfs.io/ipfs/${hash}`,
        cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
        dweb: `https://dweb.link/ipfs/${hash}`,
      },
    });

  } catch (error) {
    console.error("IPFS info error:", error);
    return c.json({ 
      error: "Failed to get IPFS info"
    }, 500);
  }
});

export default ipfsRouter;
