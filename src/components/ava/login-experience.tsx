"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import styles from "@/app/ava/login/login.module.css";

export function LoginExperience({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const motionEnabled = !reduceMotion && !paused;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <section className={styles.page} data-motion={motionEnabled ? "on" : "off"}>
      {motionEnabled ? (
        <video aria-hidden="true" className={styles.video} autoPlay loop muted playsInline preload="metadata" disablePictureInPicture>
          <source src="/brand/ava-login.mp4" type="video/mp4" />
        </video>
      ) : null}
      <div aria-hidden="true" className={styles.backdrop} />
      {children}
      <footer className={styles.footer}>
        <p>Candy English <span aria-hidden="true">·</span> Inglês do seu jeito.</p>
        {!reduceMotion ? (
          <button type="button" className={styles.motionControl} onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
            {paused ? "Ativar animações" : "Pausar animações"}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
