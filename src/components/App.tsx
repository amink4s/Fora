"use client";

import { useEffect, useRef, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { useQuickAuth } from "~/hooks/useQuickAuth";
import { Header } from "~/components/ui/Header";
import { Footer } from "~/components/ui/Footer";
import { HomeTab, ActionsTab, ContextTab, WalletTab } from "~/components/ui/tabs";
import { USE_WALLET } from "~/lib/constants";
import { useNeynarUser } from "../hooks/useNeynarUser";

// --- Types ---
export enum Tab {
  Home = "home",
  Actions = "actions",
  Context = "context",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

/**
 * App component serves as the main container for the mini app interface.
 * 
 * This component orchestrates the overall mini app experience by:
 * - Managing tab navigation and state
 * - Handling Farcaster mini app initialization
 * - Coordinating wallet and context state
 * - Providing error handling and loading states
 * - Rendering the appropriate tab content based on user selection
 * 
 * The component integrates with the Neynar SDK for Farcaster functionality
 * and Wagmi for wallet management. It provides a complete mini app
 * experience with multiple tabs for different functionality areas.
 * 
 * Features:
 * - Tab-based navigation (Home, Actions, Context, Wallet)
 * - Farcaster mini app integration
 * - Wallet connection management
 * - Error handling and display
 * - Loading states for async operations
 * 
 * @param props - Component props
 * @param props.title - Optional title for the mini app (defaults to "Neynar Starter Kit")
 * 
 * @example
 * ```tsx
 * <App title="My Mini App" />
 * ```
 */
export default function App(
  { title }: AppProps = { title: "Neynar Starter Kit" }
) {
  // --- Hooks ---
  const {
    isSDKLoaded,
    context,
    setInitialTab,
    setActiveTab,
    currentTab,
    composeCast,
    user,
  } = useMiniApp() as any;
  const [floatingPfp, setFloatingPfp] = useState<string | null>(null);

  // If the SDK context/user doesn't include a pfp URL, attempt to fetch it
  // from our /api/users endpoint so the floating avatar displays.
  useEffect(() => {
    const fid = context?.user?.fid ?? user?.fid;
    const hasPfp = context?.user?.pfpUrl ?? user?.pfpUrl;
    if (!fid || hasPfp) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users?fids=${fid}`);
        if (!res.ok) return;
        const json = await res.json();
        const fetched = json?.users?.[0];
        if (!cancelled && fetched) {
          setFloatingPfp(fetched.pfp_url || fetched.pfpUrl || null);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [context?.user?.fid, user?.fid, context?.user?.pfpUrl, user?.pfpUrl]);

  // --- Neynar user hook ---
  const { user: neynarUser } = useNeynarUser(context || undefined);

  // QuickAuth auto-signin: attempt sign-in once when the SDK loads and no
  // Farcaster user context is present. We guard with a ref to avoid repeated
  // prompts.
  const { signIn, status } = useQuickAuth();
  const attemptedAutoSignIn = useRef(false);

  useEffect(() => {
    if (isSDKLoaded && !context?.user && status !== 'authenticated' && !attemptedAutoSignIn.current) {
      attemptedAutoSignIn.current = true;
      // Fire-and-forget signIn; it will show QuickAuth UI inside the frame.
      signIn().catch((err) => {
        console.warn('Auto QuickAuth signIn failed:', err);
      });
    }
  }, [isSDKLoaded, context?.user, signIn, status]);

  // --- Effects ---
  /**
   * Sets the initial tab to "home" when the SDK is loaded.
   * 
   * This effect ensures that users start on the home tab when they first
   * load the mini app. It only runs when the SDK is fully loaded to
   * prevent errors during initialization.
   */
  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  // --- Early Returns ---
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p>Loading SDK...</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
  {/* Header should be full width */}
      <Header neynarUser={neynarUser} />

      {/* Floating avatar (top-right) as a fallback/always-visible element */}
      {isSDKLoaded && (
        <div className="fixed top-4 right-4 z-[9999]">
          <button
            onClick={async () => {
              try {
                // Try to open profile or trigger signIn if not connected
                if (context?.user?.fid || user?.fid) {
                  await (window as any).sdk?.actions?.viewProfile?.({ fid: context?.user?.fid ?? user?.fid });
                } else {
                  // trigger signIn via QuickAuth action
                  try {
                    await (window as any).sdk?.actions?.signIn?.({} as any);
                  } catch (e) {
                    // ignore
                  }
                }
              } catch (err) {
                // ignore errors
              }
            }}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-gray-100"
            aria-label="Profile"
          >
            <img
              src={context?.user?.pfpUrl ?? user?.pfpUrl ?? floatingPfp ?? '/placeholder.png'}
              alt="pfp"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      )}

      {/* Main content and footer should be centered */}
      <div className="container py-2 pb-20">
        {/* Main title */}
        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>

        {/* Tab content rendering */}
        {currentTab === Tab.Home && <HomeTab />}
        {currentTab === Tab.Actions && <ActionsTab />}
        {currentTab === Tab.Context && <ContextTab />}
        {currentTab === Tab.Wallet && <WalletTab />}

        {/* Footer with navigation */}
        <Footer activeTab={currentTab as Tab} setActiveTab={setActiveTab} showWallet={USE_WALLET} />
      </div>
        {/* Floating compose (+) button at bottom-right */}
        {isSDKLoaded && currentTab === Tab.Home && (
          <div className="fixed bottom-6 right-4 z-50">
            <button
              aria-label="Compose"
              onClick={async () => {
                try {
                  if (composeCast) {
                    await composeCast({ text: '' });
                  }
                } catch (err) {
                  console.warn('Compose action failed', err);
                }
              }}
              className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700"
            >
              <span className="text-2xl">+</span>
            </button>
          </div>
        )}
    </div>
  );
}

