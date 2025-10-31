// src/app/api/jobs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv-adapter';
import { VideoJob } from '~/lib/db';

const DB_PREFIX = 'job:';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fidParam = url.searchParams.get('fid');

  if (!fidParam) {
    return NextResponse.json({ error: 'FID parameter is required.' }, { status: 400 });
  }

  const userFid = parseInt(fidParam);
  if (isNaN(userFid)) {
    return NextResponse.json({ error: 'Invalid FID format.' }, { status: 400 });
  }

  try {
    // 1. Fetch all job keys (Simulating querying a DB table)
    const jobKeys = await kv.keys(DB_PREFIX + '*');

    // 2. Fetch all job data in bulk
    const allJobs = (await kv.mget<VideoJob>(...jobKeys)) as (VideoJob | null)[];

    // 3. Filter jobs by the authenticated user's FID and sort by creation time
    const userJobs = allJobs
      .filter((job): job is VideoJob => !!job && job.user_fid === userFid)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Reverse chronological

    // 4. Group jobs by status
    const groupedJobs = userJobs.reduce(
      (acc, job) => {
        if (!job) return acc;
        acc[job.status] = acc[job.status] || [];
        acc[job.status].push(job);
        return acc;
      },
      {} as Record<string, VideoJob[]>
    );

    return NextResponse.json({ success: true, groupedJobs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    return NextResponse.json({ error: 'Failed to retrieve jobs.' }, { status: 500 });
  }
}