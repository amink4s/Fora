// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv'; // Vercel KV for mock database
import { VideoJob, JobStatus } from '~/lib/db'; // Corrected import alias
import { handleGenerationCompletion } from '~/lib/generation-worker';

// --- CONSTANTS ---
const DB_PREFIX = 'job:';

// --- MOCK DATABASE HELPER FUNCTIONS ---
// Replaces actual Vercel Postgres/Supabase calls for the mock phase.
async function createJob(fid: number, prompt: string): Promise<VideoJob> {
  const newJob: VideoJob = {
    id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_fid: fid,
    prompt: prompt,
    status: 'PENDING' as JobStatus,
    vercel_blob_url: null,
    final_farcaster_cdn_url: null,
    farcaster_cast_url: null,
    created_at: new Date(),
    ready_at: null,
    cast_at: null,
    venice_job_id: null,
  };

  // Save the job to the KV store (Mocking DB insertion)
  await kv.set(DB_PREFIX + newJob.id, newJob);
  return newJob;
}

// --- HUGGING FACE INFERENCE MOCK ---
// This function simulates calling the external AI service and immediately
// triggers the internal worker asynchronously, without blocking the response.
async function callHuggingFace(prompt: string, jobId: string) {
  console.log(`[HUGGING FACE MOCK] Starting video generation for Job ID: ${jobId} with prompt: "${prompt}"`);
  
  // 1. Simulate the AI service taking time (5 seconds)
  // NOTE: We don't await this, ensuring the HTTP response is fast.
  const mockTaskID = `hf-task-${jobId}`; 
  
  (async () => {
      // Simulate external service latency
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Trigger the real completion worker asynchronously
      await handleGenerationCompletion(jobId, mockTaskID);
  })();
  
  return { taskId: mockTaskID };
}

// --- API Route Handler ---

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body (expecting FID and prompt)
    const { fid, prompt } = await req.json();

    if (!fid || typeof fid !== 'number' || !prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid fid or prompt.' }, { status: 400 });
    }

    // 2. *Payment Integration Mock*: Assuming 3 USDC payment was verified.
    console.log(`[PAYMENT MOCK] Successfully verified 3 USDC payment from FID: ${fid}`);

    // 3. Create Job Entry (Status: PENDING)
    const newJob = await createJob(fid, prompt);
    
    // 4. Call AI Generation (Async)
    const { taskId } = await callHuggingFace(newJob.prompt, newJob.id);

    // 5. Update Job with external Task ID (though callHuggingFace is async, this is safe)
    await kv.set(DB_PREFIX + newJob.id, { ...newJob, venice_job_id: taskId });
    
    // 6. Respond to client
    return NextResponse.json({ 
      success: true, 
      message: 'Generation job started. Check /my-videos for status.',
      jobId: newJob.id
    }, { status: 202 }); // 202 Accepted, job is processing
  } catch (error) {
    console.error('Error initiating generation job:', error);
    return NextResponse.json({ error: 'Failed to start generation job.' }, { status: 500 });
  }
}