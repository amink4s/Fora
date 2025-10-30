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
    // The SDK exposes a "publishFrameNotifications" / frame notifications path.
    // Use a weakly-typed call to avoid depending on exact types in the SDK wrapper.
    await (neynarClient as any).publishFrameNotifications({
      target_fids: [fid],
      notification: {
        title: jobTitle.substring(0, 32),
        body: jobBody.substring(0, 128),
        target_url: jobDeepLink,
      },
    });

    console.log(`Notification sent successfully to FID ${fid}.`);
  } catch (error) {
    console.error(`Failed to send notification to FID ${fid}:`, error);
  }
}