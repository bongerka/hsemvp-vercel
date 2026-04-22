"use client";

import { useEffect } from "react";

function sendEvent(eventName: string, payload: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    eventName,
    source: "web",
    ...payload,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/public-event", blob);
    return;
  }

  void fetch("/api/public-event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  });
}

export function LandingEventTracker() {
  useEffect(() => {
    sendEvent("landing_view", {
      pathname: window.location.pathname,
    });
  }, []);

  return null;
}

export function TrackedExternalLink({
  href,
  eventName,
  className,
  children,
}: {
  href?: string;
  eventName: string;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span
        className={`${className} pointer-events-none opacity-50`}
        aria-disabled="true"
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => sendEvent(eventName, { href })}
      className={className}
    >
      {children}
    </a>
  );
}
