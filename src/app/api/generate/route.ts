// src/app/api/generate/route.ts - COMPLETE CORRECTED CODE

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { VideoJob, JobStatus } from '~/lib/db'; 
import { startGenerationWorker } from '~/lib/generation-worker'; 
// FIX: Removed the non-existent MiniAppSDK import.

const DB_PREFIX = 'job:';

export async function POST(req: NextRequest) {
  const { prompt, user, image_url } = await req.json();

  if (!prompt || typeof prompt !== 'string' || prompt.length < 10) {
    return NextResponse.json({ error: 'A prompt of at least 10 characters is required.' }, { status: 400 });
  }
  if (!user || !user.fid || typeof user.fid !== 'number') {
    return NextResponse.json({ error: 'Farcaster user authentication failed.' }, { status: 401 });
  }

  const userFid = user.fid;
  const jobId = `job-${userFid}-${Date.now()}`;

  const newJob: VideoJob = {
    id: jobId,
    user_fid: userFid,
    prompt: prompt,
    image_url: image_url, 
    status: 'PENDING' as JobStatus,
  // Store ISO timestamp string to match VideoJob.created_at
  created_at: new Date().toISOString(), 
    vercel_blob_url: null,
    final_farcaster_cdn_url: null,
    farcaster_cast_url: null,
    cast_at: null,
  };

  try {
    await kv.set(DB_PREFIX + jobId, newJob);

    startGenerationWorker(); 

    return NextResponse.json(
      { success: true, message: 'Generation request submitted.', jobId: jobId }, 
      { status: 202 } 
    );
  } catch (error) {
    console.error('Error creating generation job:', error);
    return NextResponse.json({ error: 'Failed to submit generation job.' }, { status: 500 });
  }
}