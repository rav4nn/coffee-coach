"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const HERO_IMAGES = [
  "/aeropress.png",
  "/moka_pot.png",
  "/french_press.png",
  "/pour_over.png",
];

// Slides: clone last before start and first after end for seamless loop
// Order: [last, 0, 1, 2, 3, first]
const SLIDES = [
  HERO_IMAGES[HERO_IMAGES.length - 1],
  ...HERO_IMAGES,
  HERO_IMAGES[0],
];
const FIRST_REAL = 1; // index of first real slide in SLIDES

export default function LoginPage() {
  const [index, setIndex] = useState(FIRST_REAL);
  const [animated, setAnimated] = useState(true);

  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    const INTERVAL = 4000;
    const TRANSITION = 800;

    const timer = setInterval(() => {
      const next = indexRef.current + 1;
      setAnimated(true);
      setIndex(next);

      // If we landed on the cloned first slide, jump back instantly
      if (next === SLIDES.length - 1) {
        setTimeout(() => {
          setAnimated(false);
          setIndex(FIRST_REAL);
        }, TRANSITION + 50);
      }
    }, INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background-dark font-display flex flex-col overflow-hidden">
      <style>{`
        @keyframes kapiFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kapi-fadein {
          animation: kapiFadeIn 0.6s ease forwards;
        }
      `}</style>

      {/* Hero — auto-scrolling images */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: "52vh" }}>
        <div
          className="flex h-full"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(-${(index / SLIDES.length) * 100}%)`,
            transition: animated ? "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
        >
          {SLIDES.map((src, i) => (
            <div
              key={i}
              className="relative bg-center bg-no-repeat bg-cover flex-shrink-0"
              style={{
                width: `${100 / SLIDES.length}%`,
                minHeight: "52vh",
                backgroundImage: `url('${src}')`,
              }}
            >
              <div className="absolute bottom-0 left-0 right-0" style={{ height: "35%", background: "linear-gradient(to top, #221a10 40%, transparent)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pb-10">
        {/* Kapi emerging from hero */}
        <div className="-mt-14 mb-2 flex justify-center">
          <Image
            src="/img3_waving.png"
            alt="Coach Kapi"
            width={120}
            height={120}
            className="kapi-fadein object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        <div className="w-full text-center mb-8">
          <h1 className="text-[44px] leading-[1.1] tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            <span className="text-slate-100">Your beans deserve</span><br />
            <span className="text-primary">better brewing.</span>
          </h1>
          <p className="text-slate-400 text-base mt-4">
            Coach Kapi learns your taste and fixes your brew — one cup at a time.
          </p>
        </div>

        <div className="w-full max-w-[400px] mt-auto">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-primary text-background-dark font-bold h-14 px-5 rounded-xl text-lg shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px]">login</span>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 px-8">
            By continuing, you agree to our{" "}
            <a className="text-primary/80 hover:underline" href="#">Terms of Service</a>{" "}
            and{" "}
            <a className="text-primary/80 hover:underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
