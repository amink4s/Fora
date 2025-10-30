// src/app/my-videos/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useMiniApp } from '@neynar/react';
import { VideoJob, JobStatus } from '~/lib/db';

type GroupedJobs = Record<JobStatus, VideoJob[]>;

const StatusDisplay: Record<JobStatus, string> = {
  PENDING: 'In Progress ⏳',
  PROCESSING: 'Processing... ⏳',
  READY: 'Completed & Ready to Share ✅',
  COMPLETED_PUBLIC: 'Shared to Farcaster 📢',
  ARCHIVED: 'Archived (Saved to Farcaster CDN) 🗑️',
  SHARED: 'Shared ✅',
  FAILED: 'Generation Failed ❌',
};

export default function MyVideosPage() {
  const { user, setMiniAppStatus, composeCast } = useMiniApp();
  const [jobs, setJobs] = useState<GroupedJobs>({} as GroupedJobs);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fid = user?.fid;

  useEffect(() => {
    if (!fid) {
      setIsLoading(false);
      return;
    }

    const fetchJobs = async () => {
      try {
        const response = await fetch(`/api/jobs?fid=${fid}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch job status.');
        }

        setJobs(data.groupedJobs as GroupedJobs);
      } catch (err: any) {
        console.error(err);
        setError('Error loading videos: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
    // Re-fetch every 10 seconds to update status for PENDING jobs
    const interval = setInterval(fetchJobs, 10000); 
    return () => clearInterval(interval);
  }, [fid]);

  // --- Core Share-for-Storage Logic ---
  const handleShare = async (job: VideoJob) => {
    if (!job.vercel_blob_url) {
      setMiniAppStatus({
        message: 'Video asset is missing or archived. Cannot share.',
        status: 'error',
      });
      return;
    }

    try {
      // 1. Execute the Farcaster SDK's composeCast action
      await composeCast({
        text: `Just made this personalized PFP animation on Fora! Get yours now on @[MiniAppHandle]. #AIArt #Farcaster`,
        embeds: [{ url: job.vercel_blob_url }], // 2. Critical: Embed the temporary Vercel Blob URL
      });

      // NOTE: The post-share update (capturing the final Farcaster CDN URL)
      // will be handled by the external Neynar webhook (which is Step 8, not yet built).

    } catch (err: any) {
      console.error('Cast composition failed:', err);
      setMiniAppStatus({
        message: 'Failed to compose cast. Please try again.',
        status: 'error',
      });
    }
  };

  const JobCard = ({ job }: { job: VideoJob }) => {
    const status = job.status;
    const isCompleted = status === 'READY' || status === 'COMPLETED_PUBLIC' || status === 'ARCHIVED';
    const isReadyToShare = status === 'READY' && job.vercel_blob_url;
    const videoUrl = job.final_farcaster_cdn_url || job.vercel_blob_url;

    return (
      <div className="border p-4 rounded-lg shadow-sm mb-4 bg-white">
        <h3 className="font-semibold mb-2">Prompt: {job.prompt}</h3>
        <p className="text-sm mb-2 text-gray-600">Status: **{StatusDisplay[status]}**</p>
        
        {/* Video Player/Placeholder */}
        {videoUrl ? (
          <video 
            src={videoUrl} 
            controls 
            loop 
            muted 
            className="w-full h-auto rounded-md bg-gray-200"
          />
        ) : (
          <div className="h-32 w-full bg-gray-100 flex items-center justify-center rounded-md">
            {isCompleted ? 'Video is archived or URL is missing.' : 'Video not ready yet.'}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-3 flex flex-col space-y-2">
          {isReadyToShare && (
            <button
              onClick={() => handleShare(job)}
              className="py-2 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600"
            >
              Share Now! (Offload Storage)
            </button>
          )}

          {isCompleted && (
            <a
              href={job.vercel_blob_url || job.final_farcaster_cdn_url || '#'}
              download={job.id + '.mp4'}
              className="py-2 px-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Asset
            </a>
          )}
          
          {status === 'PENDING' && (
            <div className="text-center py-2 text-sm text-yellow-600">
              Notifying when ready...
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render ---
  if (!fid) return <div className="p-4 text-center">Please connect your Farcaster account.</div>;
  if (isLoading) return <div className="p-4 text-center">Loading your videos...</div>;
  if (error) return <div className="p-4 text-red-600 text-center">Error: {error}</div>;

  const allJobs = Object.values(jobs).flat();
  if (allJobs.length === 0) {
    return (
      <div className="p-8 text-center border-dashed border-2 m-4 rounded-lg">
        <h2 className="text-xl font-bold">No Generations Found 🤷‍♂️</h2>
        <p className="text-gray-500 mt-2">Tap the **+** button to create your first PFP animation!</p>
      </div>
    );
  }

  return (
    <div className="p-4 mobile-optimized">
      <h1 className="text-2xl font-bold mb-6">My Videos (FID: {fid})</h1>

      <div className="space-y-6">
        {/* Section 1: Completed & Not Shared (READY) */}
        {jobs.READY && jobs.READY.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b pb-1 text-green-700">Ready to Share (Storage Offload Needed)</h2>
            {jobs.READY?.map((job: VideoJob) => <JobCard key={job.id} job={job} />)}
          </section>
        )}
        
        {/* Section 2: In Progress (PENDING) */}
        {jobs.PENDING && jobs.PENDING.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b pb-1 text-yellow-700">In Progress</h2>
            {jobs.PENDING?.map((job: VideoJob) => <JobCard key={job.id} job={job} />)}
          </section>
        )}

        {/* Section 3: Shared/Archived (COMPLETED_PUBLIC & ARCHIVED) */}
        {(jobs.COMPLETED_PUBLIC || jobs.ARCHIVED) && (jobs.COMPLETED_PUBLIC?.length || jobs.ARCHIVED?.length) > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 border-b pb-1 text-blue-700">Completed & Shared/Archived</h2>
            {jobs.COMPLETED_PUBLIC?.map((job: VideoJob) => <JobCard key={job.id} job={job} />)}
            {jobs.ARCHIVED?.map((job: VideoJob) => <JobCard key={job.id} job={job} />)}
          </section>
        )}
      </div>
    </div>
  );
}