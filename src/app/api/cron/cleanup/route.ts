// src/app/api/cron/cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { JobStatus, VideoJob } from '~/lib/db';
import { kv } from '@vercel/kv';
import { list, del } from '@vercel/blob';

// --- CONSTANTS & CONFIGURATION ---
const DB_PREFIX = 'job:';
// 48 hours in milliseconds, as per project specification
const ARCHIVE_AGE_MS = 48 * 60 * 60 * 1000; 
// 800 MB storage limit threshold in bytes (800 * 1024 * 1024)
const STORAGE_LIMIT_BYTES = 838860800; 

/**
 * The Vercel Cron Job endpoint responsible for deleting old Blob files
 * and updating their status in the database.
 */
export async function GET(req: NextRequest) {
  // 1. Security Check
  const secret = req.headers.get('Authorization')?.split(' ')[1];
  if (secret !== process.env.CRON_JOB_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized Cron Job Access' }, { status: 401 });
  }

  console.log('--- CRON JOB: Vercel Blob Cleanup Initiated ---');
  let deletedCount = 0;

  try {
    // 2. Fetch all active jobs for status checking
    // NOTE: In a real database, you would query only 'READY' and 'COMPLETED_PUBLIC' status jobs
    // Here we must fetch all keys from KV to simulate the query.
    const jobKeys = await kv.keys(DB_PREFIX + '*');
    const jobs = await kv.mget<VideoJob[]>(jobKeys);
    
    // Calculate current simulated usage (we'll rely on the time-based trigger)
    // NOTE: Vercel Blob SDK (list) can provide actual usage metrics if needed,
    // but the time-based rule is the most reliable way to enforce the 48-hour limit.
    
  const jobsToDelete = jobs.filter((job): job is VideoJob => {
    if (!job) return false;
    if (job.status === 'ARCHIVED') return false;
    if (!job.ready_at) return false;

    const readyDate = new Date(job.ready_at);
    const ageMs = Date.now() - readyDate.getTime();

    // Trigger A: Video is older than 48 hours AND still on the Blob store
    return ageMs > ARCHIVE_AGE_MS && !!job.vercel_blob_url;
  });

    console.log(`[CLEANUP] Found ${jobsToDelete.length} jobs ready for archival based on 48h rule.`);

    for (const job of jobsToDelete) {
        if (!job || !job.vercel_blob_url) continue;

        try {
            // 3. Delete the video file from Vercel Blob
            // We only delete the file, the final Farcaster CDN URL remains in the DB.
            await del(job.vercel_blob_url); 
            console.log(`[CLEANUP] Successfully deleted Blob asset for Job: ${job.id}`);
            deletedCount++;

            // 4. Update the DB status to Archived
            await kv.set(DB_PREFIX + job.id, {
                ...job,
                status: 'ARCHIVED' as JobStatus,
                vercel_blob_url: null, // Ensure the temporary URL is removed
            });

        } catch (blobError) {
            console.warn(`[CLEANUP WARNING] Failed to delete Blob for Job ${job.id}. It might have already been deleted or URL is invalid.`, blobError);
            // Even if deletion fails, update status to prevent immediate re-attempt
            await kv.set(DB_PREFIX + job.id, {
                ...job,
                status: 'ARCHIVED' as JobStatus,
                vercel_blob_url: null,
            });
        }
    }
    
    console.log(`--- CRON JOB: Cleanup Finished. ${deletedCount} assets archived. ---`);
    return NextResponse.json({ success: true, message: `Cleanup complete. ${deletedCount} assets archived.` });
  } catch (error) {
    console.error('CRON JOB FAILED:', error);
    return NextResponse.json({ success: false, message: 'Cron Job execution failed.' }, { status: 500 });
  }
}