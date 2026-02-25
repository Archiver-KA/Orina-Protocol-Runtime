import { Hono } from "npm:hono";

const ipfsRouter = new Hono();

/**
 * Check IPFS configuration status
 * GET /make-server-b0d68fc8/ipfs/check
 */
ipfsRouter.get("/check", async (c) => {
  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    return c.json({
      configured: !!PINATA_JWT,
      message: PINATA_JWT 
        ? "IPFS upload is configured and ready" 
        : "IPFS not configured. Set PINATA_JWT environment variable."
    });
  } catch (error) {
    console.error("IPFS check error:", error);
    return c.json({ 
      configured: false,
      error: "Failed to check IPFS configuration",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Upload image to IPFS via Pinata
 * POST /make-server-b0d68fc8/ipfs/upload
 */
ipfsRouter.post("/upload", async (c) => {
  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    if (!PINATA_JWT) {
      console.error("IPFS upload error: PINATA_JWT environment variable not set");
      return c.json({ 
        error: "IPFS service not configured. Please set PINATA_JWT in environment variables." 
      }, 500);
    }

    // Get form data from request
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      return c.json({ error: "File size exceeds 100MB limit" }, 400);
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` 
      }, 400);
    }

    // Prepare form data for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    // Optional metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Orina",
      },
    });
    pinataFormData.append("pinataMetadata", metadata);

    // Upload to Pinata
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: pinataFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pinata API error: ${response.status} - ${errorText}`);
      return c.json({ 
        error: `Failed to upload to IPFS: ${response.status}`,
        details: errorText 
      }, response.status);
    }

    const result = await response.json();

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
      error: "Internal server error during IPFS upload",
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
  }
});

/**
 * Upload multiple images to IPFS
 * POST /make-server-b0d68fc8/ipfs/upload-multiple
 */
ipfsRouter.post("/upload-multiple", async (c) => {
  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    
    if (!PINATA_JWT) {
      console.error("IPFS upload error: PINATA_JWT environment variable not set");
      return c.json({ 
        error: "IPFS service not configured. Please set PINATA_JWT in environment variables." 
      }, 500);
    }

    const formData = await c.req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return c.json({ error: "No files provided" }, 400);
    }

    // Limit to 10 files
    if (files.length > 10) {
      return c.json({ error: "Maximum 10 files allowed per upload" }, 400);
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
        // Validate file
        const MAX_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          errors.push({ index: i, fileName: file.name, error: "File exceeds 100MB" });
          continue;
        }

        const allowedTypes = [
          "image/jpeg", "image/jpg", "image/png", 
          "image/gif", "image/webp", "video/mp4"
        ];
        if (!allowedTypes.includes(file.type)) {
          errors.push({ index: i, fileName: file.name, error: "Invalid file type" });
          continue;
        }

        // Upload to Pinata
        const pinataFormData = new FormData();
        pinataFormData.append("file", file);
        
        const metadata = JSON.stringify({
          name: file.name,
          keyvalues: {
            uploadedAt: new Date().toISOString(),
            uploadedBy: "Orina",
            batchIndex: i,
          },
        });
        pinataFormData.append("pinataMetadata", metadata);

        const response = await fetch(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PINATA_JWT}`,
            },
            body: pinataFormData,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          errors.push({ 
            index: i, 
            fileName: file.name, 
            error: `Upload failed: ${response.status}`,
            details: errorText 
          });
          continue;
        }

        const result = await response.json();

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

      } catch (error) {
        errors.push({ 
          index: i, 
          fileName: file instanceof File ? file.name : "unknown",
          error: error instanceof Error ? error.message : "Unknown error" 
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
      error: "Internal server error during batch IPFS upload",
      message: error instanceof Error ? error.message : "Unknown error" 
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
    
    if (!hash) {
      return c.json({ error: "IPFS hash is required" }, 400);
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
      error: "Failed to get IPFS info",
      message: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
  }
});

export default ipfsRouter;