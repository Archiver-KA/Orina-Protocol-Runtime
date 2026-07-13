import { useState, useCallback } from 'react';
import { publicAnonKey } from '/utils/supabase/info';
import { getSupabaseFunctionUrl } from '/utils/supabase/functions';
import { getIpfsUploadAuthHeaders } from '@/utils/ipfsUploadAuth';
import { isBridgeAuthRequiredError } from '@/utils/supabaseAuthClaimBridge';

export interface UploadedFile {
  ipfsHash: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadResult {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

export interface MultiUploadResult {
  success: boolean;
  files: UploadedFile[];
  errors: Array<{ fileName: string; error: string }>;
}

/**
 * Hook for uploading files to IPFS via Pinata
 */
export function useIPFSUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, walletAddress: string): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 100MB limit');
      }

      const formData = new FormData();
      formData.append('file', file);
      const uploadUrl = getSupabaseFunctionUrl('ipfs/upload');
      if (!uploadUrl) {
        throw new Error('Supabase upload function is not configured.');
      }
      const authHeaders = await getIpfsUploadAuthHeaders(walletAddress);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        uploadUrl,
        {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);


      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          console.error('Single upload returned a non-JSON error response');
          throw new Error(`Upload failed: ${response.status}`);
        }
        
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const uploadedFile: UploadedFile = {
        ipfsHash: result.ipfsHash,
        url: result.urls.pinata, // Use Pinata gateway by default
        fileName: result.metadata.fileName,
        fileSize: result.metadata.fileSize,
        mimeType: result.metadata.mimeType,
      };

      return {
        success: true,
        file: uploadedFile,
      };

    } catch (err) {
      if (isBridgeAuthRequiredError(err)) {
        setError(null);
        return {
          success: false,
        };
      }
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('IPFS upload error:', err);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadMultipleFiles = useCallback(async (files: File[], walletAddress: string): Promise<MultiUploadResult> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate files count
      if (files.length > 10) {
        throw new Error('Maximum 10 files allowed per upload');
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const authHeaders = await getIpfsUploadAuthHeaders(walletAddress);
      const uploadUrl = getSupabaseFunctionUrl('ipfs/upload-multiple');
      if (!uploadUrl) {
        throw new Error('Supabase upload function is not configured.');
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        uploadUrl,
        {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();

      const uploadedFiles: UploadedFile[] = result.results?.map((item: any) => ({
        ipfsHash: item.ipfsHash,
        url: item.urls.pinata,
        fileName: item.fileName,
        fileSize: item.metadata.fileSize,
        mimeType: item.metadata.mimeType,
      })) || [];

      const errors = result.errors?.map((err: any) => ({
        fileName: err.fileName || 'unknown',
        error: err.error || 'Upload failed',
      })) || [];

      return {
        success: result.success,
        files: uploadedFiles,
        errors,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('IPFS multi-upload error:', err);
      
      return {
        success: false,
        files: [],
        errors: [{ fileName: 'batch', error: errorMessage }],
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const getIPFSInfo = useCallback(async (ipfsHash: string) => {
    try {
      const infoUrl = getSupabaseFunctionUrl(`ipfs/info/${ipfsHash}`);
      if (!infoUrl || !publicAnonKey) {
        throw new Error('Supabase IPFS info function is not configured.');
      }

      const response = await fetch(
        infoUrl,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get IPFS info: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (err) {
      console.error('IPFS info error:', err);
      return null;
    }
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    getIPFSInfo,
    isUploading,
    progress,
    error,
  };
}

/**
 * Helper function to get IPFS URLs for a hash
 */
export function getIPFSUrls(ipfsHash: string) {
  return {
    pinata: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    ipfs: `https://ipfs.io/ipfs/${ipfsHash}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
    dweb: `https://dweb.link/ipfs/${ipfsHash}`,
  };
}

/**
 * Helper function to extract IPFS hash from URL
 */
export function extractIPFSHash(url: string): string | null {
  const patterns = [
    /ipfs\/([a-zA-Z0-9]+)/,
    /\/ipfs\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
