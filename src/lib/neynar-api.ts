// src/lib/neynar-api.ts

import { NeynarAPIClient, isApiErrorResponse } from '@neynar/nodejs-sdk';

// 1. Initialize the Neynar Client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set in environment variables.");
}

// Use the Configuration object expected by the modern SDK
export const neynarClient = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY }); 

/**
 * Sends a native Farcaster push notification to a user.
 * @param fid The Farcaster ID of the user to notify.
 * @param message The text message for the notification.
 * @param url The deep-link URL that the notification will open (should point to /my-videos).
 */
export async function sendUserNotification(fid: number, message: string, url: string): Promise<{ success: boolean; message: string }> {
  try {
    // The notification must be sent by the Mini App's verified FID
    const miniappFid = process.env.MINI_APP_FID;

    if (!miniappFid) {
        return { success: false, message: "MINI_APP_FID is not set." };
    }

    const senderFidInt = parseInt(miniappFid);
    if (isNaN(senderFidInt)) {
        return { success: false, message: "MINI_APP_FID is not a valid number." };
    }
    
    // FIX: Calling the method directly on the client object instead of using .v2.user
    // This assumes the SDK's internal versioning routes the call correctly.
    const response = await neynarClient.user.sendNotification({
      target_fid: fid, // Target user FID
      notification_text: message, // Text message
      target_url: url, // Deep-link URL
      sender_fid: senderFidInt // The notification must come from the Mini App's registered FID
    });

    console.log(`[NEYNAR] Notification sent response:`, response);
    
    return { success: true, message: `Notification sent to FID ${fid}.` };

  } catch (error) {
    if (isApiErrorResponse(error)) {
        console.error(`[NEYNAR ERROR] Failed to send notification:`, error.message);
        return { success: false, message: `Neynar API Error: ${error.message}` };
    }
    console.error(`[NEYNAR ERROR] Unknown error sending notification:`, error);
    return { success: false, message: "An unknown error occurred while sending notification." };
  }
}