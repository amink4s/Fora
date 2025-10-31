// src/app/page.tsx
// This is a Server Component to fetch the public feed data efficiently.

import { kv } from '~/lib/kv-adapter';
import { VideoJob, JobStatus } from '~/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// --- CONSTANTS ---
const DB_PREFIX = 'job:';
const MAX_FEED_ITEMS = 200;

// --- Components (Server-Side) ---

interface FeedItemProps {
  job: VideoJob;
}

const FeedItem: React.FC<FeedItemProps> = ({ job }) => {
  const videoUrl = job.final_farcaster_cdn_url || job.vercel_blob_url;

  if (!videoUrl) return null;

  return (
    <div className="border p-3 rounded-lg shadow-md mb-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-700 font-medium">
          Creator: **FID {job.user_fid}**
        </p>
        <p className="text-xs text-gray-500">
          Posted: {job.cast_at ? new Date(job.cast_at).toLocaleDateString() : 'N/A'}
        </p>
      </div>

      {/* Video Player */}
      <video
        src={videoUrl}
        controls
        loop
        muted
        className="w-full h-auto rounded-md bg-gray-900 aspect-square object-contain"
        poster="/placeholder.png" // Use a placeholder image while loading
      />

      {/* Cast Link */}
      {job.farcaster_cast_url && (
        <a 
          href={job.farcaster_cast_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-600 hover:underline text-sm mt-2 block"
        >
          View Cast ↗️
        </a>
      )}
    </div>
  );
};

// --- Main Feed Component (Server-Side) ---

export default async function FeedPage() {
  let publicFeed: VideoJob[] = [];
  let error: string | null = null;

  try {
    // 1. Fetch all job keys
  const jobKeys = await kv.keys(DB_PREFIX + '*');

  // 2. Fetch all job data
  const allJobs = (await kv.mget<VideoJob>(...jobKeys)) as (VideoJob | null)[];

    // 3. Filter for public/shared videos and sort
    publicFeed = allJobs
      .filter((job): job is VideoJob => !!job && job.status !== 'PENDING' && (!!job.final_farcaster_cdn_url || !!job.vercel_blob_url))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_FEED_ITEMS) as VideoJob[];

  } catch (e: any) {
    console.error("Failed to load public feed:", e);
    error = "Failed to connect to the database to load the feed.";
  }

  return (
    <div className="p-4 mobile-optimized">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Fora Feed</h1>
        {/* FAB Placeholder (Will be a real FAB in layout/global components) */}
        <Link href="/generate" passHref>
          <button className="text-3xl bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition">+</button>
        </Link>
      </div>
      
      {/* Disclaimer Banner (Persistent banner/toast) */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4 text-sm rounded-md">
        **Disclaimer:** Feed shows the last {MAX_FEED_ITEMS} public generations. Please save your videos as they may be archived.
      </div>
      
      {error && <div className="text-red-600 text-center">{error}</div>}

      <div className="space-y-6">
        {publicFeed.length > 0 ? (
          publicFeed.map(job => <FeedItem key={job.id} job={job} />)
        ) : (
          <div className="text-center p-8 border-dashed border-2 m-4 rounded-lg">
            <h2 className="text-xl font-bold">The Feed is Empty 🥺</h2>
            <p className="text-gray-500 mt-2">Be the first to create and share an animation!</p>
          </div>
        )}
      </div>
    </div>
  );
}