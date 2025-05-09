"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Image from "next/image";

// Local assets
import VersentLogo from "@/assets/V-mark-Green.svg";
import SydneyImage from "@/assets/summit-sydney.jpg";

// Versent green and logo
const VERSENT_GREEN = "#6ee43b";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a creative caption based on the prompt
  const generateCaption = (prompt: string) => {
    if (!prompt) return "";
    // Simple creative caption logic (could be replaced with AI in the future)
    return `"${prompt.charAt(0).toUpperCase() + prompt.slice(1)}" — imagined by Nova Canvas`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.image) {
        setImage(data.image);
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err) {
      setError("Failed to generate image");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Hero Banner with background image */}
      <div className="w-full relative" style={{ background: VERSENT_GREEN }}>
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-b-2xl" style={{ zIndex: 0 }}>
          <Image
            src={SydneyImage}
            alt="AWS Summit Sydney"
            fill
            style={{ objectFit: "cover", opacity: 0.18 }}
            priority
          />
        </div>
        <div className="max-w-4xl mx-auto flex flex-col items-center py-10 px-6 rounded-b-2xl shadow-lg relative z-10">
          <Image src={VersentLogo} alt="Versent Logo" className="h-16 w-auto mb-4" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }} />
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 text-center">Bedrock Nova Canvas Image Generator</h1>
          <p className="text-xl md:text-2xl text-white/90 font-light text-center">Powered by AWS Bedrock & Nova Canvas | Inspired by AWS Summit Sydney</p>
        </div>
      </div>
      {/* Main Card */}
      <Card className="p-10 max-w-lg w-full mx-auto bg-white shadow-2xl border-0 rounded-2xl -mt-16 z-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">Create Your Image</h2>
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Describe your image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="text-lg px-4 py-3 border-2 border-[#6ee43b] focus:border-[#4bbf2b] rounded-lg bg-white"
          />
          <Button onClick={handleGenerate} disabled={loading || !prompt} className="bg-[#6ee43b] hover:bg-[#4bbf2b] text-white text-lg font-semibold py-3 rounded-lg shadow">
            {loading ? "Generating..." : "Generate Image"}
          </Button>
          {error && <div className="text-red-500 text-center font-medium">{error}</div>}
          {image && (
            <div className="flex flex-col items-center mt-6">
              <img src={`data:image/png;base64,${image}`} alt="Generated" className="rounded-xl shadow-lg max-h-80 object-contain border-2 border-[#6ee43b]" />
              <div className="mt-4 text-lg text-gray-700 italic text-center bg-[#eaffd6] px-4 py-2 rounded">
                {generateCaption(prompt)}
              </div>
            </div>
          )}
        </div>
      </Card>
      {/* Footer */}
      <footer className="w-full text-center py-6 mt-10 text-gray-500 text-sm bg-gray-50 border-t border-gray-100">
        Inspired by <a href="https://versent.com.au/" target="_blank" rel="noopener noreferrer" className="text-[#6ee43b] font-semibold hover:underline">Versent</a> &mdash; Modern Cloud, Security, and Digital Transformation
      </footer>
    </div>
  );
}