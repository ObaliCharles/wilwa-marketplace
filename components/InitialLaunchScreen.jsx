"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// A short launch treatment for both a new browser visit and an installed PWA.
// It lives above the routed UI and removes itself automatically, so it cannot
// interfere with authentication or navigation.
export default function InitialLaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
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
        src="/images/wilwa-icon.png"
        alt=""
        width={1024}
        height={1024}
        className="initial-launch-emblem"
      />
    </div>
  );
}
