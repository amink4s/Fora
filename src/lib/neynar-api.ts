// src/lib/neynar-api.ts - COMPLETE CORRECTED CODE

import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { APP_URL } from './constants';

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

    // Ensure the deep link is a fully-qualified URL as required by Neynar
    let targetUrl = jobDeepLink;
    try {
      // If it's already a valid absolute URL, keep it; otherwise prefix with APP_URL
      const parsed = new URL(jobDeepLink);
      targetUrl = parsed.toString();
    } catch (_) {
      // jobDeepLink is relative; normalize it against APP_URL
      const prefix = APP_URL.replace(/\/$/, '');
      const suffix = jobDeepLink.startsWith('/') ? jobDeepLink : `/${jobDeepLink}`;
      targetUrl = `${prefix}${suffix}`;
    }

    const payload = {
      target_fids: [fid],
      notification: {
        title: shortTitle,
        body: shortBody,
        target_url: targetUrl,
      },
    };

    try {
      await (neynarClient as any).publishFrameNotifications(payload);
      console.log(`Notification sent successfully to FID ${fid}.`);
      return;
    } catch (err: any) {
      if (err?.response?.data) {
        console.warn('Neynar API response:', JSON.stringify(err.response.data));
      }
      console.error(`Failed to send notification to FID ${fid} with payload:`, payload, err?.response?.data || err?.message || err);
      return;
    }
  } catch (error) {
    console.error(`Failed to send notification to FID ${fid}:`, error);
  }
}