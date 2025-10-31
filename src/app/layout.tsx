import type { Metadata } from 'next';

import '~/app/globals.css';
import { Providers } from '~/app/providers';
import { APP_NAME, APP_DESCRIPTION, APP_HERO_URL } from '~/lib/constants';
import { getMiniAppEmbedMetadata } from '~/lib/utils';

// Include Open Graph tags and the Farcaster `fc:frame` embed JSON on the
// root HTML so Farcaster dev tools can read the values from the page meta tags.
export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_HERO_URL],
  },
  other: {
    'fc:frame': JSON.stringify(getMiniAppEmbedMetadata(APP_HERO_URL)),
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
