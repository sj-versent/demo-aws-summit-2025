"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import React from "react";

const VIEWS = [
  { key: "nutanix", label: "Nutanix", mp4: "/architecture/nutanix.mp4" },
  { key: "vault", label: "Vault", mp4: "/architecture/vault.mp4" },
  { key: "bedrock", label: "Bedrock", mp4: "/architecture/bedrock.mp4" },
  { key: "aws", label: "AWS Load Balancing", mp4: "/architecture/aws.mp4" },
];

export default function ArchitecturePage() {
  const [view, setView] = useState("nutanix");
  const current = VIEWS.find((v) => v.key === view);
  const hasMp4 = !!current?.mp4;
  const [playVideo, setPlayVideo] = useState(hasMp4);

  React.useEffect(() => {
    setPlayVideo(!!VIEWS.find((v) => v.key === view)?.mp4);
  }, [view]);

  return (
    <>
      <main className="flex flex-col items-center min-h-screen bg-gray-50 py-10 px-2 md:px-8">
        <div className="w-full max-w-7xl flex justify-start mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-medium shadow-sm transition-colors"
          >
            <span className="text-xl">←</span> Back to Demo
          </Link>
        </div>
        <h1 className="text-4xl font-bold mb-6 text-center">Solution Architecture</h1>
        <div className="flex gap-4 mb-8">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === v.key
                  ? "bg-[#6ee43b] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {current && (
          <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-4 md:p-8 flex flex-col items-center">
            <div className="w-full flex justify-center">
              {current.mp4 ? (
                <video
                  src={current.mp4}
                  width={1600}
                  height={800}
                  className="rounded-lg object-contain w-full h-auto"
                  style={{ maxHeight: 700 }}
                  controls
                  autoPlay
                  onEnded={e => e.currentTarget.currentTime = e.currentTarget.duration}
                />
              ) : (
                <div className="text-gray-500 text-lg">No video available for this architecture.</div>
              )}
            </div>
            <div className="mt-4 text-lg font-medium text-gray-700 text-center w-full">{current.label} Architecture</div>
          </div>
        )}
      </main>
      <style jsx global>{`
        video:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
} 