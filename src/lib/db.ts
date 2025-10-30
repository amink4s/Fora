// src/lib/db.ts - COMPLETE CORRECTED CODE

// Define the available job statuses
export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'COMPLETED_PUBLIC'
  | 'ARCHIVED'
  | 'SHARED'
  | 'FAILED';

// Define the VideoJob interface used to store data in Vercel KV
export interface VideoJob {
  id: string;
  user_fid: number;
  prompt: string;
  // Optional image URL used as input for generation
  image_url?: string | null;
  status: JobStatus;
  // Store ISO timestamps (string) for easier KV serialization
  created_at: string;
  // When the generation became ready and was uploaded to Vercel Blob
  ready_at?: string | null;
  vercel_blob_url?: string | null;
  final_farcaster_cdn_url?: string | null;
  farcaster_cast_url?: string | null;
  cast_at?: string | null;
}

// Interface for grouping jobs by status in the frontend
// Allow a partial mapping so frontend can initialize with an empty object
export type GroupedJobs = Partial<Record<JobStatus, VideoJob[]>>;

// No other exports or initialization needed for the types file