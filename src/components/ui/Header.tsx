"use client";

import { useState } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";
import { useQuickAuth } from "~/hooks/useQuickAuth";

type HeaderProps = {
  neynarUser?: {
    fid: number;
    score: number;
  } | null;
};

export function Header({ neynarUser }: HeaderProps) {
  const { context } = useMiniApp();
  const { signIn, status, authenticatedUser } = useQuickAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="relative">
      <div
        className="mt-4 mb-4 mx-4 px-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between border-[3px] border-double border-primary"
      >
        <div className="text-lg font-light">Welcome to {APP_NAME}!</div>

        {/* Avatar slot: show user pfp when available, otherwise show placeholder.
            When not authenticated show a small Connect button next to the avatar. */}
        <div className="flex items-center space-x-3">
          <div
            className="cursor-pointer flex items-center"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            title={context?.user ? `FID ${context.user.fid}` : 'Not connected'}
          >
            <img
              src={context?.user?.pfpUrl ?? '/placeholder.png'}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-primary object-cover bg-gray-200"
            />
          </div>

          {!context?.user && (
            <button
              onClick={async () => {
                try {
                  await signIn();
                } catch (e) {
                  console.warn('QuickAuth signIn failed', e);
                }
              }}
              className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
              disabled={status === 'authenticated'}
            >
              {status === 'authenticated' ? 'Connected' : 'Connect'}
            </button>
          )}
        </div>
      </div>
  {context?.user && (
        <>      
          {isUserDropdownOpen && (
            <div className="absolute top-full right-0 z-50 w-fit mt-1 mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-3 space-y-2">
                <div className="text-right">
                  <h3 
                    className="font-bold text-sm hover:underline cursor-pointer inline-block"
                    onClick={() => sdk.actions.viewProfile({ fid: context.user.fid })}
                  >
                    {context.user.displayName || context.user.username}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    @{context.user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    FID: {context.user.fid}
                  </p>
                  {neynarUser && (
                    <>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Neynar Score: {neynarUser.score}
                      </p>
                    </>
                  )}
                {/* Debug overlay toggle */}
                <div className="absolute left-4 bottom-4">
                  <button
                    onClick={() => setShowDebug(s => !s)}
                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
                  >
                    {showDebug ? 'Hide debug' : 'Show debug'}
                  </button>
                </div>

                {showDebug && (
                  <div className="fixed left-4 bottom-12 z-50 w-96 max-h-96 overflow-auto p-3 bg-white dark:bg-gray-900 border rounded shadow-lg text-xs font-mono">
                    <div className="flex justify-between items-center mb-2">
                      <strong>Debug</strong>
                      <div className="space-x-2">
                        <button onClick={() => window.location.reload()} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Reload</button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] text-gray-500">useMiniApp context:</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(context, null, 2)}</pre>
                      <div className="mt-2 text-[11px] text-gray-500">QuickAuth status & user:</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify({ status, authenticatedUser }, null, 2)}</pre>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
