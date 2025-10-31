// src/app/generate/page.tsx

'use client';

import { useState } from 'react';
import { useMiniApp } from '@neynar/react';
import { useRouter } from 'next/navigation';
import sdk from '@farcaster/miniapp-sdk';

export default function GeneratePage() {
  const router = useRouter();
  const { user, context, setMiniAppStatus, composeCast } = useMiniApp();
  
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Support both return shapes from useMiniApp: some SDK versions expose `user`
  // at the top level, others provide `context.user`. Use whichever is present.
  const fid = user?.fid ?? context?.user?.fid;
  const price = '3 USDC';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fid) {
      setError('Please log in to initiate generation.');
      return;
    }
    if (!prompt.trim()) {
      setError('Prompt cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. **MOCK PAYMENT/TRANSACTION**: In a real app, you would initiate a
      // seamless Farcaster wallet transaction here first. For this phase, 
      // we mock success and proceed directly to the API call.
      console.log(`[FRONTEND MOCK] Initiating ${price} payment for FID ${fid}...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate payment latency
      console.log(`[FRONTEND MOCK] Payment successful!`);
      
      // 2. If an image file was provided, upload it first to get a public URL
      let image_url: string | undefined = undefined;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const upjson = await up.json();
        if (!up.ok) throw new Error(upjson.error || 'Image upload failed');
        image_url = upjson.url;
      }

      // 3. Call the backend API route to create the generation job
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: { fid: Number(fid) }, prompt, image_url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation job.');
      }

      // 3. Success: Notify user and redirect to the status page
      setMiniAppStatus({
        message: 'Job submitted! Check "My Videos" for status.',
        status: 'success',
      });
      router.push('/my-videos'); // Redirects to the Account View (to be built next)

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 mobile-optimized">
      <h1 className="text-xl font-bold mb-4">🎨 Generate My PFP Animation</h1>
      
      {fid ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={async () => {
                  // Try to navigate back in-app; fall back to Next router push to '/'
                  try {
                    router.back();
                  } catch (e) {
                    try {
                      await router.push('/');
                    } catch (err) {
                      // ignore
                    }
                  }
                }}
              className="px-3 py-1 rounded bg-gray-200 text-sm"
            >
              ← Back to feed
            </button>
            {/* top-right space is intentionally left for the Header avatar */}
            <div />
          </div>

  <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
              Describe your PFP Animation:
            </label>
            <textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A pixel art cat wearing a crown, glitching with neon colors."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Upload a source image (optional):
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              disabled={isLoading}
              className="mt-1 block w-full text-sm text-gray-500"
            />
          </div>

          {error && (
            <div className="text-red-600 p-2 border border-red-200 bg-red-50 rounded-md">
              **Error:** {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !fid}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-colors 
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
            `}
          >
            {isLoading ? 'Processing...' : `Generate My PFP Animation (${price})`}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Estimated wait time: 1-5 minutes. You will receive a notification when ready.
          </p>
        </form>
  </div>
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-lg font-medium">Please connect your Farcaster account to begin generating.</p>
        </div>
      )}
    </div>
  );
}