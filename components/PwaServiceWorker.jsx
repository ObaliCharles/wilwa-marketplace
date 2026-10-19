"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return undefined;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // PWA remains optional if a host blocks service worker registration.
      });
    }, { once: true });
  }, []);

  return null;
}
