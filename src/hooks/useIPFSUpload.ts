import { useState, useCallback } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
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

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Single upload - Response status:', response.status);
      console.log('Single upload - Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          console.error('Single upload - Non-JSON error response:', errorText);
          throw new Error(`Upload failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Single upload - Success result:', result);

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

  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<MultiUploadResult> => {
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

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload-multiple`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/info/${ipfsHash}`,
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