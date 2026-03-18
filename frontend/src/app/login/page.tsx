"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function LoginPage() {
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

      {/* Hero — static image */}
      <div className="w-full max-w-[430px] mx-auto">
        <Image
          src="/coach_login.png"
          alt="Coffee Coach"
          width={430}
          height={430}
          className="w-full h-auto"
          priority
        />
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
            Coach Kapi learns your taste and fixes your brew - one cup at a time.
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
