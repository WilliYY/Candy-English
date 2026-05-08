"use client";

import { usePathname } from "next/navigation";

export function AvaStudentBackdrop() {
  const pathname = usePathname();

  if (!pathname.startsWith("/ava/student")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-sky-700">
      <video
        aria-hidden="true"
        autoPlay
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src="/brand/ava-student.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
