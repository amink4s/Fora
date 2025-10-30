// src/lib/vercel-blob.ts

import { put, del } from '@vercel/blob';
import * as fs from 'fs';

/**
 * Uploads a file (or mock file content) to Vercel Blob storage.
 * @param filename The desired name for the file (e.g., 'video-123.mp4').
 * @param filePathOrContent The local path to the file OR the raw file content (Buffer/string).
 * @returns The public URL of the uploaded blob.
 */
export async function uploadBlob(filename: string, filePathOrContent: string | Buffer): Promise<string> {
  const isLocalFilePath = typeof filePathOrContent === 'string' && fs.existsSync(filePathOrContent);

  let fileContent: Buffer | string;
  let contentType: string;

  if (isLocalFilePath) {
    // Read content from a local file path (for mock worker)
    fileContent = fs.readFileSync(filePathOrContent as string);
    // Determine content type based on extension (simple check)
    contentType = filename.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';
  } else {
    // Treat as raw content (e.g., if generation API returns a buffer)
    fileContent = filePathOrContent;
    contentType = 'video/mp4'; 
  }

  try {
    const blob = await put(filename, fileContent, {
      access: 'public',
      contentType: contentType,
    });
    console.log(`Blob uploaded successfully: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('Error uploading blob:', error);
    throw new Error('Failed to upload video to Vercel Blob storage.');
  }
}

/**
 * Deletes a blob from Vercel Blob storage using its URL.
 * @param url The public URL of the blob to delete.
 */
export async function deleteBlob(url: string) {
  try {
    await del(url);
    console.log(`Blob deleted successfully: ${url}`);
  } catch (error) {
    console.warn(`Attempted to delete blob at ${url}, but an error occurred (may not exist):`, error);
  }
}