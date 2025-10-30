// src/lib/generation-worker.ts - COMPLETE CORRECTED CODE

import { kv } from '@vercel/kv';
// FIX: Use the working ~ alias for internal paths
import { uploadBlob, deleteBlob } from '~/lib/vercel-blob'; 
import { VideoJob, JobStatus } from '~/lib/db'; 
import { sendVideoReadyNotification } from '~/lib/neynar-api'; 
// FIX: Ensure this is the only line importing sendVideoReadyNotification

const DB_PREFIX = 'job:';
const POLLING_INTERVAL = 5000; // 5 seconds
const MOCK_VIDEO_DURATION = 10000; // 10 seconds mock generation time

// FIX: Export the function startGenerationWorker to satisfy import in route.ts
export function startGenerationWorker() {
    processPendingJobs();
}

async function processPendingJobs() {
    const jobKeys = await kv.keys(DB_PREFIX + '*');
    
    const pendingJobs = (await kv.mget<VideoJob[]>(jobKeys))
        .filter(job => job && job.status === 'PENDING');

    if (pendingJobs.length === 0) {
        return;
    }

    console.log(`[WORKER] Found ${pendingJobs.length} pending jobs. Processing first one...`);
    const job = pendingJobs[0];

    try {
        await kv.set(DB_PREFIX + job.id, { ...job, status: 'PROCESSING' as JobStatus });
        
        await new Promise(resolve => setTimeout(resolve, MOCK_VIDEO_DURATION));
        
        // MOCK: Generate a temporary Vercel Blob URL. 
        const mockBlobUrl = await uploadBlob(
            `pfp-animation-${job.id}.mp4`,
            './public/mock-video.mp4' // Placeholder file path
        );
        
        // 3. Update job status
        const completedJob: VideoJob = {
            ...job,
            status: 'READY_FOR_SHARE' as JobStatus,
            vercel_blob_url: mockBlobUrl,
            final_farcaster_cdn_url: null,
            farcaster_cast_url: null,
            cast_at: null,
        };

        await kv.set(DB_PREFIX + job.id, completedJob);
        
        // 4. Send Notification to User
        const notificationDeepLink = `/my-videos?jobId=${job.id}`;
        
        await sendVideoReadyNotification({
            fid: job.user_fid,
            jobTitle: '✨ Your Fora Animation is Ready!',
            jobBody: `View and share your video based on the prompt: "${job.prompt.substring(0, 30)}..."`,
            jobDeepLink: notificationDeepLink,
        });

        console.log(`[WORKER SUCCESS] Job ${job.id} completed and notification sent.`);

    } catch (error) {
        console.error(`[WORKER ERROR] Failed to process job ${job.id}:`, error);
        await kv.set(DB_PREFIX + job.id, { ...job, status: 'FAILED' as JobStatus });
    }

    setTimeout(processPendingJobs, POLLING_INTERVAL);
}