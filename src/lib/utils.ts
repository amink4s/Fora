import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Manifest } from '@farcaster/miniapp-core/src/manifest';
import {
  APP_BUTTON_TEXT,
  APP_DESCRIPTION,
  APP_ICON_URL,
  APP_NAME,
  APP_OG_IMAGE_URL,
  APP_PRIMARY_CATEGORY,
  APP_SPLASH_BACKGROUND_COLOR,
  APP_SPLASH_URL,
  APP_HERO_URL,
  APP_TAGS,
  APP_URL,
  APP_WEBHOOK_URL,
  APP_ACCOUNT_ASSOCIATION,
} from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMiniAppEmbedMetadata(ogImageUrl?: string) {
  return {
    version: 'next',
    imageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    ogTitle: APP_NAME,
    ogDescription: APP_DESCRIPTION,
    ogImageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
        description: APP_DESCRIPTION,
        primaryCategory: APP_PRIMARY_CATEGORY,
        tags: APP_TAGS,
      },
    },
  };
}

export async function getFarcasterDomainManifest(): Promise<Manifest> {
  // Ensure manifest URLs point to the deployed production host. If APP_URL still
  // references localhost (e.g., present in build env), override to the known
  // production domain so the Farcaster manifest is correct for verification.
  const baseHost = /localhost|127\.0\.0\.1/.test(APP_URL) ? 'https://fora-69.vercel.app' : APP_URL;

  const miniapp: any = {
    version: '1',
    name: APP_NAME ?? 'Neynar Starter Kit',
    homeUrl: `${baseHost}`,
    // Normalize URLs: prefer the constants but replace localhost host with the production baseHost
    iconUrl: (function (u: string) {
      try {
        const parsed = new URL(u);
        return /localhost|127\.0\.0\.1/.test(parsed.hostname) ? baseHost + parsed.pathname : u;
      } catch {
        return u;
      }
    })(APP_ICON_URL),
    imageUrl: (function (u: string) {
      try {
        const parsed = new URL(u);
        return /localhost|127\.0\.0\.1/.test(parsed.hostname) ? baseHost + parsed.pathname : u;
      } catch {
        return u;
      }
    })(APP_OG_IMAGE_URL),
    heroImageUrl: (function (u: string) {
      try {
        const parsed = new URL(u);
        return /localhost|127\.0\.0\.1/.test(parsed.hostname) ? baseHost + parsed.pathname : u;
      } catch {
        return u;
      }
    })(APP_HERO_URL),
    buttonTitle: APP_BUTTON_TEXT ?? 'Launch Mini App',
    splashImageUrl: `${baseHost}/splash.png`,
    splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
    webhookUrl: APP_WEBHOOK_URL,
  };

  const manifest: any = {
    accountAssociation: APP_ACCOUNT_ASSOCIATION!,
    miniapp,
  };

  return manifest as Manifest;
}
