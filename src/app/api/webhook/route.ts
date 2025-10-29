// src/app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { JobStatus, VideoJob } from '~/lib/db';
// Using the official Neynar SDK for webhook verification and types
import { isValidNeynarWebhook, Cast } from '@neynar/nodejs-sdk'; 

// --- CONSTANTS ---
const DB_PREFIX = 'job:';

// NOTE: Ensure these are set in your .env.local for deployment
const NEYNAR_WEBHOOK_SECRET = process.env.NEYNAR_WEBHOOK_SECRET;
const WEBHOOK_MONITOR_FID = parseInt(process.env.WEBHOOK_MONITOR_FID || '0');

/**
 * Handles incoming Neynar webhook events, specifically looking for casts
 * that contain a Vercel Blob URL to confirm storage offloading.
 */
export async function POST(req: NextRequest) {
  // Use .clone() to read the body twice (once for verification, once for logic)
  const reqBodyClone = await req.clone().json();

  // 1. Security Check: Verify the request origin using the secret
  // If the secret is not set, we cannot verify, so we deny access.
  if (!NEYNAR_WEBHOOK_SECRET) {
     console.error('[WEBHOOK] NEYNAR_WEBHOOK_SECRET is not set.');
     return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }

  const isVerified = await isValidNeynarWebhook(
    reqBodyClone,
    req.headers.get('x-neynar-signature') || '',
    NEYNAR_WEBHOOK_SECRET
  );

  if (!isVerified) {
    console.warn('[WEBHOOK] Invalid webhook signature received. Denying access.');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // 2. Filter for relevant events (Cast events)
  const cast = reqBodyClone.data as Cast;
  
  // We only care about casts from the monitored FID/channel
  if (cast.author.fid !== WEBHOOK_MONITOR_FID) {
    return NextResponse.json({ message: 'Not monitoring this FID' }, { status: 200 });
  }

  // 3. Search for the Temporary Vercel Blob URL
  // We look for a pattern that matches our generated Blob URL
  const vercelBlobUrlPattern = /^https:\/\/.*\.vercel-storage\.com\/pfp-animation-job-/;

  // Cast embeds can be complex; we map them to find any URL matching our pattern
  const temporaryBlobUrl = cast.embeds.find(embed => {
    // Check if the embed has a URL field and if it matches the pattern
    const url = (embed as any).url || (embed as any).media?.url; 
    return url && vercelBlobUrlPattern.test(url);
  }) as any;

  if (!temporaryBlobUrl) {
    return NextResponse.json({ message: 'No relevant Vercel Blob URL found in embeds' }, { status: 200 });
  }

  const temporaryUrlString = temporaryBlobUrl.url || temporaryBlobUrl.media.url;

  // 4. Extract Job ID and look up the job
  const jobIdMatch = temporaryUrlString.match(/pfp-animation-(job-\d+-\d+)/);
  if (!jobIdMatch) {
    console.error(`[WEBHOOK] Could not parse Job ID from URL: ${temporaryUrlString}`);
    return NextResponse.json({ message: 'Could not parse Job ID' }, { status: 200 });
  }

  const jobId = jobIdMatch[1];
  const job = await kv.get<VideoJob>(DB_PREFIX + jobId);

  if (!job) {
    return NextResponse.json({ message: `Job ${jobId} not found in DB` }, { status: 200 });
  }

  // 5. Find the Permanent Farcaster CDN URL
  // The permanent embed is the one where media.url is *not* the temporary blob URL
  const permanentEmbed = cast.embeds.find(embed => 
    (embed as any).media?.url && (embed as any).media.url !== temporaryUrlString
  );
  const finalFarcasterCdnUrl = (permanentEmbed as any)?.media?.url || null;

  // 6. Update Database for Storage Offload Confirmation
  if (finalFarcasterCdnUrl) {
    const updatedJob: VideoJob = {
      ...job,
      status: 'COMPLETED_PUBLIC' as JobStatus,
      final_farcaster_cdn_url: finalFarcasterCdnUrl,
      farcaster_cast_url: `https://warpcast.com/${cast.author.username}/${cast.hash}`,
      cast_at: new Date(),
    };
    await kv.set(DB_PREFIX + jobId, updatedJob);
    
    console.log(`[WEBHOOK SUCCESS] Job ${jobId} offloaded! CDN URL captured: ${finalFarcasterCdnUrl}`);
  } else {
    // Case where the CDN URL might be delayed or the embed structure is unexpected
    console.warn(`[WEBHOOK WARNING] Final CDN URL not immediately found for Job ${jobId}. Updating status only.`);
    await kv.set(DB_PREFIX + jobId, {
        ...job,
        status: 'COMPLETED_PUBLIC' as JobStatus,
        farcaster_cast_url: `https://warpcast.com/${cast.author.username}/${cast.hash}`,
        cast_at: new Date(),
    });
  }

  return NextResponse.json({ success: true, message: `Job ${jobId} updated successfully.` }, { status: 200 });
}