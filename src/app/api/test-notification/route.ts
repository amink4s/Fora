import { NextRequest, NextResponse } from 'next/server';
import { sendVideoReadyNotification } from '~/lib/neynar-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fid = Number(body?.fid || body?.FID || body?.user_fid);
    if (!fid || Number.isNaN(fid)) {
      return NextResponse.json({ error: 'Missing or invalid fid' }, { status: 400 });
    }

    await sendVideoReadyNotification({
      fid,
      jobTitle: body.jobTitle || 'Test Notification from Fora',
      jobBody: body.jobBody || 'This is a test notification sent via the Fora mini app.',
      jobDeepLink: body.jobDeepLink || '/',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Test notification error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send notification' }, { status: 500 });
  }
}
