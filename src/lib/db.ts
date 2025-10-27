// lib/db.ts

/**
 * Defines the status lifecycle for a video generation job.
 * * - PENDING: Payment confirmed, waiting for Venice AI to start/return.
 * - READY: Venice AI finished, video is on Vercel Blob, user is notified.
 * - COMPLETED_PUBLIC: User shared the video. Vercel Blob URL has been swapped
 * for the permanent Farcaster CDN URL.
 * - ARCHIVED: Vercel Blob asset has been deleted (either ready for too long
 * or shared and now deleted for storage control). The Farcaster
 * CDN URL might still exist if it was shared.
 * - FAILED: Job failed at any stage (e.g., Venice AI error, upload error).
 */
export type JobStatus = 
  | 'PENDING' 
  | 'READY' 
  | 'COMPLETED_PUBLIC' 
  | 'ARCHIVED' 
  | 'FAILED';

/**
 * Interface representing a video generation job stored in the database.
 */
export interface VideoJob {
  id: string; // Unique ID (UUID) for the job
  user_fid: number; // The Farcaster ID of the user who initiated the job
  prompt: string; // The text prompt used for generation
  status: JobStatus; // Current status of the job

  // --- Asset URLs ---
  vercel_blob_url: string | null; // Temporary Vercel Blob URL (Storage Staging Area)
  final_farcaster_cdn_url: string | null; // Permanent Farcaster CDN URL (Cost-free storage)
  farcaster_cast_url: string | null; // Public URL of the cast (e.g., warpcast.com/...)

  // --- Timestamps & Metadata ---
  created_at: Date; // When the job was initiated/paid
  ready_at: Date | null; // When the video was uploaded to Vercel Blob (Status: READY)
  cast_at: Date | null; // When the final cast was detected/captured (Status: COMPLETED_PUBLIC)
  venice_job_id: string | null; // Optional ID from the Venice AI service
}

// NOTE: For a real project, you'd use a database client (e.g., 'postgres' from Vercel Postgres)
// to interact with the database using this schema definition.