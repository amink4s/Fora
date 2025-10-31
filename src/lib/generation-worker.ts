// src/lib/generation-worker.ts - COMPLETE CORRECTED CODE

import { kv } from '~/lib/kv-adapter';
// FIX: Use the working ~ alias for internal paths
import { uploadBlob, deleteBlob } from '~/lib/vercel-blob';
import { VideoJob, JobStatus } from '~/lib/db';
import { sendVideoReadyNotification } from '~/lib/neynar-api';
import { generatePfpAnimation } from '~/lib/ffmpeg-generator';
import * as fs from 'fs';
import { downloadFile } from '~/lib/http';
// FIX: Ensure this is the only line importing sendVideoReadyNotification

const DB_PREFIX = 'job:';
const POLLING_INTERVAL = 5000; // 5 seconds
const MOCK_VIDEO_DURATION = 10000; // 10 seconds mock generation time

// FIX: Export the function startGenerationWorker to satisfy import in route.ts
export function startGenerationWorker() {
    // Start a simple polling loop that processes pending jobs one-by-one.
    processPendingJobs();
}

async function processPendingJobs() {
    await processOnePendingJob();
    setTimeout(processPendingJobs, POLLING_INTERVAL);
}

/**
 * Process a single pending job, if one exists.
 * Returns an object describing whether a job was processed and a message.
 */
export async function processOnePendingJob(): Promise<{ processed: boolean; message: string }> {
    const jobKeys = await kv.keys(DB_PREFIX + '*');

    if (!jobKeys || jobKeys.length === 0) {
        return { processed: false, message: 'No job keys found' };
    }

    const allJobs = (await kv.mget<VideoJob>(...jobKeys)) as (VideoJob | null)[];
    const pendingJobs = allJobs.filter((job): job is VideoJob => !!job && job.status === 'PENDING');

    if (pendingJobs.length === 0) {
        return { processed: false, message: 'No pending jobs' };
    }

    const job = pendingJobs[0];
    console.log(`[WORKER] Processing job ${job.id}...`);

    try {
        await kv.set(DB_PREFIX + job.id, { ...job, status: 'PROCESSING' as JobStatus });

        // Determine input image path. Prefer job.image_url if present; otherwise use a placeholder.
        let inputImagePath = './public/mock-pfp.png';
        if (job.image_url) {
            if (job.image_url.startsWith('http')) {
                const tmpPath = `./.tmp/input-${job.id}-${Date.now()}.png`;
                await downloadFile(job.image_url, tmpPath);
                inputImagePath = tmpPath;
            } else if (job.image_url.startsWith('/')) {
                inputImagePath = `.${job.image_url}`;
            } else {
                inputImagePath = job.image_url;
            }
        }

        const generatedPath = await generatePfpAnimation(inputImagePath, './.tmp', 4);
        const blobUrl = await uploadBlob(`pfp-animation-${job.id}.mp4`, generatedPath);

        const completedJob: VideoJob = {
            ...job,
            status: 'READY' as JobStatus,
            vercel_blob_url: blobUrl,
            ready_at: new Date().toISOString(),
        };

        await kv.set(DB_PREFIX + job.id, completedJob);

        // Notify
        const notificationDeepLink = `/my-videos?jobId=${job.id}`;
        await sendVideoReadyNotification({
            fid: job.user_fid,
            jobTitle: '✨ Your Fora Animation is Ready!',
            jobBody: `View and share your video based on the prompt: "${(job.prompt || '').substring(0, 30)}..."`,
            jobDeepLink: notificationDeepLink,
        });

        try { fs.unlinkSync(generatedPath); } catch (_) { /* ignore */ }

        console.log(`[WORKER SUCCESS] Job ${job.id} completed and notification sent.`);
        return { processed: true, message: `Job ${job.id} processed` };
    } catch (error) {
        console.error(`[WORKER ERROR] Failed to process job ${job.id}:`, error);
        await kv.set(DB_PREFIX + job.id, { ...job, status: 'FAILED' as JobStatus });
        return { processed: false, message: 'Job processing failed' };
    }
}