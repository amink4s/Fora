// src/app/api/process-pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processOnePendingJob } from '~/lib/generation-worker';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('Authorization')?.split(' ')[1];
  if (secret !== process.env.CRON_JOB_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized Cron Job Access' }, { status: 401 });
  }

  try {
    const result = await processOnePendingJob();
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    console.error('Process pending job failed:', err);
    return NextResponse.json({ success: false, message: 'Processing failed' }, { status: 500 });
  }
}
