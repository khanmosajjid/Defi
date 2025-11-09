import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ShieldCheck } from "lucide-react";

const WALLET_LOCAL_KEY = "ethan:registeredWallet";
const WALLET_SESSION_KEY = "ethan:registeredWalletSession";
const WALLET_CACHE_NAME = "ethan-wallet-cache";
const WALLET_CACHE_URL = "/ethan-wallet-address";

const shortenAddress = (addr?: string | null) => {
  if (!addr) return null;
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function Register() {
  const { address, isConnected } = useAccount();
  const [storedAddress, setStoredAddress] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const local = window.localStorage.getItem(WALLET_LOCAL_KEY);
      const session = window.sessionStorage.getItem(WALLET_SESSION_KEY);
      const initial = local || session || null;
      if (initial) setStoredAddress(initial);
    } catch (err) {
      console.warn("Unable to read stored wallet from storage", err);
    }

    if (typeof window !== "undefined" && "caches" in window) {
      setCacheStatus("saving");
      caches
        .open(WALLET_CACHE_NAME)
        .then((cache) => cache.match(WALLET_CACHE_URL))
        .then((match) => (match ? match.json() : null))
        .then((json) => {
          if (json && typeof json.address === "string") {
            setStoredAddress((prev) => prev ?? json.address);
            setCacheStatus("saved");
          } else {
            setCacheStatus("idle");
          }
        })
        .catch((err) => {
          console.warn("Unable to restore wallet cache", err);
          setCacheStatus("error");
        });
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !address || typeof window === "undefined") return;

    setStoredAddress(address);
    try {
      window.localStorage.setItem(WALLET_LOCAL_KEY, address);
      window.sessionStorage.setItem(WALLET_SESSION_KEY, address);
    } catch (err) {
      console.warn("Unable to persist wallet in storage", err);
    }

    if (typeof window !== "undefined" && "caches" in window) {
      setCacheStatus("saving");
      const response = new Response(JSON.stringify({ address }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });

      caches
        .open(WALLET_CACHE_NAME)
        .then((cache) => cache.put(WALLET_CACHE_URL, response))
        .then(() => setCacheStatus("saved"))
        .catch((err) => {
          console.warn("Unable to save wallet cache", err);
          setCacheStatus("error");
        });
    }
  }, [address, isConnected]);

  const activeAddress = useMemo(() => {
    if (address) return address;
    return storedAddress;
  }, [address, storedAddress]);

  const handleClearStoredWallet = async () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(WALLET_LOCAL_KEY);
      window.sessionStorage.removeItem(WALLET_SESSION_KEY);
    } catch (err) {
      console.warn("Unable to clear stored wallet", err);
    }
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await caches.open(WALLET_CACHE_NAME);
        await cache.delete(WALLET_CACHE_URL);
      } catch (err) {
        console.warn("Unable to clear wallet cache", err);
      }
    }
    setStoredAddress(null);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-yellow-500/10 blur-3xl" />
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-300">
                Start your ETHAN journey
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Register your wallet in a single tap
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-gray-300 leading-relaxed">
                Connect your preferred wallet to secure your spot in the ETHAN
                ecosystem. We safely remember your address so you can pick up
                exactly where you left off.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center text-sm text-gray-400">
                  <ShieldCheck className="mr-2 h-5 w-5 text-yellow-400" />
                  Non-custodial & privacy-respecting storage.
                </div>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-yellow-400">
                  Connect Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-gray-400">
                  Use the button below to connect your wallet. Once connected,
                  we will store the address securely in your browser so that it
                  persists between visits.
                </p>

                <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-6 text-center space-y-4">
                  <ConnectButton
                    label="Connect & Save"
                    chainStatus="icon"
                    showBalance={{ smallScreen: false, largeScreen: false }}
                  />
                  {activeAddress ? (
                    <p className="text-sm text-green-400">
                      Saved wallet:{" "}
                      <span className="font-mono text-base text-yellow-300">
                        {shortenAddress(activeAddress)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No wallet stored yet.
                    </p>
                  )}
                  {cacheStatus === "saving" && (
                    <p className="text-xs text-gray-500">Persisting address…</p>
                  )}
                  {cacheStatus === "error" && (
                    <p className="text-xs text-red-400">
                      We could not sync cache, but local storage is still
                      active.
                    </p>
                  )}
                  {activeAddress && (
                    <Button
                      variant="ghost"
                      className="w-full border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/10"
                      onClick={handleClearStoredWallet}
                    >
                      Clear stored wallet
                    </Button>
                  )}
                </div>

                <Separator className="bg-yellow-500/20" />

                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Once you are connected, you can jump straight into staking
                    or explore the dashboard for more insights.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/dashboard" className="flex-1">
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/stake" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                      >
                        Start Staking
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
