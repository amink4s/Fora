// lib/generation-worker.ts

import { kv } from '@vercel/kv';
import { JobStatus, VideoJob } from '~/lib/db';
import { put } from '@vercel/blob'; // Vercel Blob SDK
import { client } from './neynar-api'; // We'll define this Neynar client next

// --- MOCK CONSTANTS ---
const DB_PREFIX = 'job:';
const MOCK_VIDEO_FILE = Buffer.from('mock video content', 'utf8'); // A small mock buffer
const MOCK_VIDEO_MIME_TYPE = 'video/mp4'; 

// --- MOCK HELPER: Neynar Client (to be fully implemented in Step 4) ---
// For now, this is a placeholder to prevent errors.
const mockNeynarClient = {
    // This mocks the function to send a native push notification
    sendUserNotification: async (fid: number, message: string, url: string) => {
        console.log(`[NEYNAR MOCK] Sending notification to FID ${fid}: "${message}" linking to ${url}`);
        // In Step 4, we will replace this with the real Neynar API call.
        return { success: true }; 
    }
};

/**
 * Simulates the AI service returning a video file.
 * In a real scenario, this would involve HTTP request to the download URL.
 */
async function downloadVideoFromAI(taskId: string): Promise<Buffer> {
    console.log(`[WORKER] Downloading asset for task: ${taskId}...`);
    // Simulate latency for download
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_VIDEO_FILE;
}

/**
 * The core async process triggered when the AI generation is complete.
 * Handles upload to Vercel Blob and user notification.
 */
export async function handleGenerationCompletion(jobId: string, taskId: string) {
    console.log(`\n--- Generation Completion Handler Initiated for Job ID: ${jobId} ---`);

    // 1. Fetch Job from DB
    const jobData = await kv.get<VideoJob>(DB_PREFIX + jobId);
    if (!jobData) {
        console.error(`[WORKER] Job not found: ${jobId}`);
        return;
    }

    try {
        // 2. Download Video from AI Service
        const videoBuffer = await downloadVideoFromAI(taskId);

        // 3. Upload to Vercel Blob (Status: Ready - Private URL)
        console.log('[WORKER] Uploading to Vercel Blob...');
        
        // We use { access: 'public' } so the URL can be used as a Farcaster embed.
        const blob = await put(`pfp-animation-${jobId}.mp4`, videoBuffer, {
            access: 'public', 
            contentType: MOCK_VIDEO_MIME_TYPE,
            cacheControlMaxAge: 48 * 60 * 60, // Cache for 48 hours as per spec
        });

        // 4. Update DB Entry (Status: READY)
        const updatedJob: VideoJob = {
            ...jobData,
            status: 'READY' as JobStatus,
            vercel_blob_url: blob.url,
            ready_at: new Date(),
        };
        await kv.set(DB_PREFIX + jobId, updatedJob);
        console.log(`[WORKER] Job ${jobId} updated. Blob URL: ${blob.url}`);

        // 5. User Notification via Neynar
        const notificationMessage = "Your PFP Animation is ready! Tap to view/share.";
        // The notification links directly to the Account View for the user.
        // NOTE: NEXT_PUBLIC_HOST_URL must be correctly set in .env.local
        const notificationUrl = `${process.env.NEXT_PUBLIC_HOST_URL}/my-videos`; 
        
        await mockNeynarClient.sendUserNotification(jobData.user_fid, notificationMessage, notificationUrl);
        
        console.log(`[WORKER] Notification sent to FID ${jobData.user_fid}.`);

    } catch (error) {
        console.error(`[WORKER] Failed to process generation for Job ${jobId}:`, error);
        // Update DB status to FAILED
        await kv.set(DB_PREFIX + jobId, { ...jobData, status: 'FAILED' as JobStatus });
    }
    console.log(`--- Generation Completion Handler Finished for Job ID: ${jobId} ---\n`);
}