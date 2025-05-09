"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <Card className="p-6 max-w-lg mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Bedrock Image Generator</h1>
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <Button onClick={handleGenerate} disabled={loading || !prompt}>
          {loading ? "Generating..." : "Generate Image"}
        </Button>
        {error && <div className="text-red-500">{error}</div>}
        {image && (
          <img src={`data:image/png;base64,${image}`} alt="Generated" className="mt-4 rounded shadow" />
        )}
      </div>
    </Card>
  );
}