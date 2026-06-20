"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";

type ResponsiveDetailsProps = ComponentPropsWithoutRef<"details"> & {
  openOnMobile?: boolean;
};

export function ResponsiveDetails({
  children,
  openOnMobile = false,
  ...props
}: ResponsiveDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (
      openOnMobile &&
      window.matchMedia("(max-width: 639px)").matches &&
      detailsRef.current
    ) {
      detailsRef.current.open = true;
    }
  }, [openOnMobile]);

  return (
    <details ref={detailsRef} {...props}>
      {children}
    </details>
  );
}
