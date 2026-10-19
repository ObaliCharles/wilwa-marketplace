"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// This treatment is intentionally restricted to phone-sized installed PWAs.
// Browser visits and desktop layouts never mount it, and it always removes
// itself automatically so it cannot interrupt routing or authentication.
export default function InitialLaunchScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const isInstalledPwa = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const isPhoneViewport = window.matchMedia?.("(max-width: 767px)").matches;

    if (!isInstalledPwa || !isPhoneViewport) return undefined;

    setVisible(true);
    const leaveTimer = window.setTimeout(() => setLeaving(true), 550);
    const removeTimer = window.setTimeout(() => setVisible(false), 800);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`initial-launch-screen ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-label="Loading Wilwa"
    >
      <Image
        src="/images/wilwa-launch-screen.png"
        alt=""
        width={1024}
        height={1536}
        priority
        sizes="100vw"
        className="initial-launch-artwork"
      />
    </div>
  );
}
