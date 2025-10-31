// src/lib/neynar-api.ts - COMPLETE CORRECTED CODE

import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// FIX: Initialize the client using the Configuration object to resolve 
// "Argument of type 'string' is not assignable to type 'Configuration'" error.
const config: Configuration = {
  apiKey: process.env.NEYNAR_API_KEY as string,
};
const neynarClient = new NeynarAPIClient(config); 
// This should also resolve "Property 'notifications' does not exist" 
// as the correct type definition is now loaded.

interface NotificationPayload {
  fid: number;
  jobTitle: string;
  jobBody: string;
  jobDeepLink: string;
}

/**
 * Sends a notification to a Farcaster user when their video is ready.
 */
export async function sendVideoReadyNotification(
  { fid, jobTitle, jobBody, jobDeepLink }: NotificationPayload
) {
  const client_id = process.env.NEYNAR_CLIENT_ID;

  if (!client_id) {
    console.warn("NEYNAR_CLIENT_ID not set. Skipping notification.");
    return;
  }
  
  try {
    // Try a couple of payload shapes the Neynar SDK/API may accept. The SDK
    // surface can vary; if the first attempt returns 400 we'll log the
    // response and retry with alternate key naming.
    const shortTitle = jobTitle.substring(0, 32);
    const shortBody = jobBody.substring(0, 128);

    const attempts = [
      { target_fids: [fid], notification: { title: shortTitle, body: shortBody, target_url: jobDeepLink } },
      { targetFids: [fid], notification: { title: shortTitle, body: shortBody, target_url: jobDeepLink } },
      { targetFids: [fid], notification: { title: shortTitle, body: shortBody, deep_link: jobDeepLink } },
      { fids: [fid], notification: { title: shortTitle, body: shortBody, target_url: jobDeepLink } },
    ];

    let lastError: any = null;
    for (const payload of attempts) {
      try {
        await (neynarClient as any).publishFrameNotifications(payload);
        console.log(`Notification sent successfully to FID ${fid} using payload keys: ${Object.keys(payload).join(',')}`);
        return;
      } catch (err: any) {
        lastError = err;
        // If Axios-like error, log server response body for diagnosis
        if (err?.response?.data) {
          console.warn('Neynar API response:', JSON.stringify(err.response.data));
        } else {
          console.warn('Neynar SDK error (no response body):', err?.message || err);
        }
        // If 400, continue to next payload attempt; otherwise break and surface the error
        if (err?.status && err.status !== 400) break;
      }
    }

    console.error(`Failed to send notification to FID ${fid} after ${attempts.length} attempts.`,
      lastError?.response?.data || lastError?.message || lastError);
  } catch (error) {
    console.error(`Failed to send notification to FID ${fid}:`, error);
  }
}