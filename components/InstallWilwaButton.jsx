"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "wilwa-install-dismissed";

const isAppleMobile = () => {
  const { userAgent, platform, maxTouchPoints } = navigator;
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
};

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export default function InstallWilwaButton({ className = "" }) {
  const [installEvent, setInstallEvent] = useState(null);
  const [helpPlatform, setHelpPlatform] = useState("");
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem(DISMISSED_KEY)) return undefined;

    // Keep a real install entry point visible even when Chromium withholds
    // `beforeinstallprompt` (for example on a first visit). The click then
    // gives honest browser-specific instructions instead of disappearing.
    setAvailable(true);

    if (isAppleMobile()) {
      return undefined;
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setAvailable(true);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setAvailable(false);
      setHelpPlatform("");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (isAppleMobile()) {
      setHelpPlatform("ios");
      return;
    }
    if (!installEvent) {
      setHelpPlatform("browser");
      return;
    }

    await installEvent.prompt();
    const result = await installEvent.userChoice;
    setInstallEvent(null);
    if (result.outcome !== "accepted") {
      sessionStorage.setItem(DISMISSED_KEY, "true");
      setAvailable(false);
    }
  };

  if (!available) return null;

  return (
    <>
      <button type="button" onClick={() => void install()} className={`inline-flex items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${className}`}>
        <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Install Wilwa
      </button>

      {helpPlatform ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="presentation" onClick={() => setHelpPlatform("")}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-help-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Install Wilwa</p>
                <h2 id="install-help-title" className="mt-1 text-lg font-bold text-slate-950">{helpPlatform === "ios" ? "Add Wilwa to your Home Screen" : "Install Wilwa from your browser menu"}</h2>
              </div>
              <button type="button" onClick={() => setHelpPlatform("")} aria-label="Close installation instructions" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            {helpPlatform === "ios" ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                <li>Open this page in Safari.</li>
                <li>Tap the Share button in Safari&apos;s toolbar.</li>
                <li>Select <strong className="font-semibold text-slate-900">Add to Home Screen</strong>, then tap Add.</li>
              </ol>
            ) : (
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Use Chrome or Edge&apos;s menu to choose <strong className="font-semibold text-slate-900">Install Wilwa</strong> or <strong className="font-semibold text-slate-900">Add to Home screen</strong>.</p>
                <p>If that option is not shown yet, refresh this secure page after it finishes loading. Some browsers decide install eligibility after the first visit.</p>
              </div>
            )}
            <button type="button" onClick={() => setHelpPlatform("")} className="mt-5 w-full rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">Got it</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
