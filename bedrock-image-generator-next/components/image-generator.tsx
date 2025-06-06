"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

// Local assets
import VersentLogo from "@/assets/V-mark-Green.svg";
import SydneyImage from "@/assets/summit-sydney.jpg";

// Versent green and logo
const VERSENT_GREEN = "#6ee43b";

const PREDEFINED_PROMPTS = [
  "Sydney Opera House in 2050 with advanced sustainable architecture, AWS Summit banners",
  "AI and human collaboration building the future of Sydney skyline, digital art style",
  "Quantum computing center in Sydney Harbor with iconic bridge in background, futuristic",
  "Sydney AWS Summit 2025 keynote with holographic displays and diverse audience",
  "Australian wildlife integrated with smart city technology in Sydney CBD",
  "Drone view of Sydney in 2040 with renewable energy infrastructure and green buildings",
];

// Type for generated images
interface GeneratedImage {
  id: string;
  prompt: string;
  image: string;
  timestamp: number;
}

const MAX_IMAGES = 10; // Increased from 3 to allow more images

const STEPS = [
  "Request received...",
  "Generating AWS creds...",
  "Waiting for image...",
  "Image ready!"
];

const STEP_ICONS = [
  <img src="/react.svg" alt="React" className="w-24 h-24 object-contain mx-auto" />,
  <img src="/hashicorp-vault.svg" alt="Vault" className="w-16 h-166 object-contain mx-auto mt-2" />,
  <img src="/bedrock.svg" alt="Bedrock" className="w-24 h-24 object-contain mx-auto" />,
  <img src="/amazon-web-services.svg" alt="AWS" className="w-24 h-24 object-contain mx-auto" />,
];

function getStepIndex(status: string) {
  return STEPS.findIndex((step) => status && status.startsWith(step));
}

// Helper to detect if a base64 string is an MP4 (very basic check)
function isMp4(base64: string) {
  // MP4s often start with 'AAAA' or 'AAAAFGZ0' in base64 (ftyp)
  // You may want to improve this check for your use case
  return base64.startsWith('AAAA') || base64.startsWith('GkXf');
}

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [status, setStatus] = useState<string>("");

  const currentStep = getStepIndex(status);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // Toggle fullscreen view for an image
  const toggleFullscreen = (imageData: string | null) => {
    setFullscreenImage(fullscreenImage === imageData ? null : imageData);
  };
  
  // Load saved images from localStorage on component mount
  useEffect(() => {
    try {
      const savedImages = localStorage.getItem('generatedImages');
      if (savedImages) {
        const parsed = JSON.parse(savedImages);
        // Silently validate the structure of saved images
        if (Array.isArray(parsed)) {
          // Filter out any invalid entries without logging errors
          const validImages = parsed.filter(img => 
            img && typeof img === 'object' && 
            'id' in img && 'prompt' in img && 'image' in img && 'timestamp' in img
          );
          setGeneratedImages(validImages);
        }
      }
    } catch (e) {
      // Silently handle parsing errors - no console logging
      // Just start with an empty gallery
    }
  }, []);

  // Save images to localStorage whenever the collection changes
  useEffect(() => {
    if (generatedImages.length > 0) {
      try {
        // Silently try to store all images
        localStorage.setItem('generatedImages', JSON.stringify(generatedImages));
      } catch (e) {
        // Silently handle storage errors - no console logging
        // Just keep the images in memory
      }
    } else {
      localStorage.removeItem('generatedImages');
    }
  }, [generatedImages]);

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
    setStatus("Request received...");

    const eventSource = new EventSource(`/api/generate/progress?prompt=${encodeURIComponent(prompt)}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      if (data.image) {
        setImage(data.image);
        
        // Create new image object
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          prompt,
          image: data.image,
          timestamp: Date.now()
        };
        
        // Add to generated images collection
        setGeneratedImages(prev => {
          // Create new array with the new image at the front, limited to MAX_IMAGES
          const updatedImages = [newImage, ...prev].slice(0, MAX_IMAGES);
          
          // Silently try to store in localStorage - no error logging
          try {
            localStorage.setItem('generatedImages', JSON.stringify(updatedImages));
          } catch (storageError) {
            // Storage failed - silently handle by reducing the number of images
            // Start with just the new image
            let storableImages = [newImage];
            
            // Try adding previous images one by one until we hit the limit
            for (let i = 0; i < prev.length && i < MAX_IMAGES - 1; i++) {
              const testImages = [...storableImages, prev[i]];
              try {
                localStorage.setItem('generatedImages', JSON.stringify(testImages));
                storableImages = updatedImages.slice(0, i + 2); // +2 because we include the new image
              } catch (e) {
                // Hit the limit, stop trying to add more (silently)
                break;
              }
            }
            
            // Return whatever we could store without logging errors
            return storableImages;
          }
          
          return updatedImages;
        });
        
        setStatus("Image ready!");
        setLoading(false);
        eventSource.close();
      }
      if (data.status && data.status.startsWith("No image")) {
        setError(data.status);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      setError("Failed to generate image");
      setLoading(false);
      eventSource.close();
    };
  };
  
  const clearGallery = () => {
    if (confirm('Are you sure you want to clear all generated images?')) {
      setGeneratedImages([]);
      localStorage.removeItem('generatedImages');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-4xl max-h-screen w-full flex flex-col items-center">
            {isMp4(fullscreenImage) ? (
              <video
                src={`data:video/mp4;base64,${fullscreenImage}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                controls
                autoPlay
                onEnded={e => e.currentTarget.pause()}
              />
            ) : (
              <img
                src={`data:image/png;base64,${fullscreenImage}`}
                alt="Fullscreen view"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            )}
            <button 
              className="mt-4 bg-white text-gray-800 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
              onClick={() => setFullscreenImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Hero Banner with background image */}
      <div className="w-full relative" style={{ background: VERSENT_GREEN }}>
        <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 0 }}>
          <Image
            src={SydneyImage}
            alt="AWS Summit Sydney"
            fill
            style={{ objectFit: "cover", opacity: 0.18 }}
            priority
          />
        </div>
        <div className="flex flex-col items-center py-10 px-6 relative z-10">
          <Image src={VersentLogo} alt="Versent Logo" className="h-16 w-auto mb-4" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }} />
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 text-center">Bedrock Nova Canvas Image Generator</h1>
          <p className="text-xl md:text-2xl text-white/90 font-light text-center">Powered by AWS Bedrock & Nova Canvas | Inspired by AWS Summit Sydney</p>
        </div>
      </div>
      {/* Main Content with Sidebar */}
      <div className="flex flex-1 w-full max-w-screen-2xl mt-[-4rem] z-10 items-stretch px-4 md:px-8 lg:px-12">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-80 bg-gray-50 rounded-2xl shadow-lg p-6 mr-8 mt-10 h-fit self-start">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span role="img" aria-label="palette">🎨</span> Saved Prompts
          </h3>
          <div className="flex flex-col gap-4">
            {PREDEFINED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                className="bg-[#6ee43b] hover:bg-[#4bbf2b] text-gray-800 font-medium rounded-xl px-4 py-3 transition-colors text-lg shadow"
                onClick={() => setPrompt(p)}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowGallery(!showGallery)}
              className="flex items-center justify-center gap-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl px-4 py-3 transition-colors text-lg"
            >
              <span role="img" aria-label="gallery">{showGallery ? '🎨' : '🖼️'}</span>
              {showGallery ? 'Hide Gallery' : 'View Gallery'}
            </button>
            <Link
              href="/architecture"
              className="flex items-center justify-center gap-2 w-full bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium rounded-xl px-4 py-3 transition-colors text-lg text-center mt-2"
            >
              <span role="img" aria-label="architecture">🏛️</span>
              View Architecture
            </Link>
            {generatedImages.length > 0 && (
              <button
                onClick={clearGallery}
                className="mt-3 w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-xl px-4 py-2 transition-colors text-sm"
              >
                Clear All Images
              </button>
            )}
          </div>
        </aside>
        {/* Main Card */}
        <main className="flex-1 flex flex-col items-start mt-10 w-full">
          <Card className="p-6 md:p-10 w-full h-full bg-white shadow-2xl border-0 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">Create Your Image</h2>
            {/* Stepper and Progress Bar */}
            <div className="w-full mx-auto mt-6 mb-4">
              <div className="flex justify-between w-full mb-2">
                {STEPS.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center
                        border-4
                        ${idx < currentStep ? "border-green-400 bg-white" : idx === currentStep ? "border-blue-500 bg-white animate-pulse" : "border-gray-200 bg-white"}
                        shadow
                        ${idx === 1 ? "flex items-center justify-center" : ""}
                      `}
                    >
                      {STEP_ICONS[idx]}
                    </div>
                    <span className={`text-xs mt-1 text-center block ${idx === currentStep ? "font-bold text-blue-700" : "text-gray-500"}`}>
                      {step.replace("...", "")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <Input
                placeholder="Describe your image..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="text-lg px-4 py-3 border-2 border-[#6ee43b] focus:border-[#4bbf2b] rounded-lg bg-white w-full"
              />
              <Button onClick={handleGenerate} disabled={loading || !prompt} className="bg-[#6ee43b] hover:bg-[#4bbf2b] text-white text-lg font-semibold py-3 rounded-lg shadow w-full">
                {loading ? "Generating..." : "Generate Image"}
              </Button>
              {status && (
                <div className="text-blue-600 text-center font-medium animate-pulse">{status}</div>
              )}
              {error && <div className="text-red-500 text-center font-medium">{error}</div>}
              {image && (
                <div className="flex flex-col items-center mt-6 w-full">
                  {isMp4(image) ? (
                    <video
                      src={`data:video/mp4;base64,${image}`}
                      className="rounded-xl shadow-lg max-h-80 object-contain border-2 border-[#6ee43b] cursor-pointer transition-all duration-300 hover:opacity-90"
                      controls
                      onEnded={e => e.currentTarget.pause()}
                      onClick={() => toggleFullscreen(image)}
                    />
                  ) : (
                    <img
                      src={`data:image/png;base64,${image}`}
                      alt="Generated"
                      className="rounded-xl shadow-lg max-h-80 object-contain border-2 border-[#6ee43b] cursor-pointer transition-all duration-300 hover:opacity-90"
                      onClick={() => toggleFullscreen(image)}
                    />
                  )}
                  <div className="mt-4 text-lg text-gray-700 italic text-center bg-[#eaffd6] px-4 py-2 rounded w-full">
                    {generateCaption(prompt)}
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Image Gallery Section */}
          {showGallery && (
            <div className="w-full mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Your Image Gallery</h2>
                <div className="flex items-center gap-2">
                  {/* Mobile gallery toggle */}
                  <button
                    onClick={() => setShowGallery(!showGallery)}
                    className="md:hidden flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl px-4 py-2 transition-colors"
                  >
                    {showGallery ? 'Hide Gallery' : 'View Gallery'}
                  </button>
                </div>
              </div>
              
              {generatedImages.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <p className="text-gray-500 text-lg">No images generated yet. Create your first image above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImages.map((genImage) => (
                    <div key={genImage.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                      <div className="p-1 bg-gradient-to-r from-[#6ee43b] to-[#4bbf2b]">
                        {isMp4(genImage.image) ? (
                          <video
                            src={`data:video/mp4;base64,${genImage.image}`}
                            className="w-full h-48 object-cover bg-white cursor-pointer hover:opacity-90 transition-all"
                            controls
                            onEnded={e => e.currentTarget.pause()}
                            onClick={() => toggleFullscreen(genImage.image)}
                          />
                        ) : (
                          <img
                            src={`data:image/png;base64,${genImage.image}`}
                            alt={genImage.prompt}
                            className="w-full h-48 object-cover bg-white cursor-pointer hover:opacity-90 transition-all"
                            onClick={() => toggleFullscreen(genImage.image)}
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-500 mb-1">
                          {new Date(genImage.timestamp).toLocaleString()}
                        </p>
                        <p className="text-gray-800 font-medium line-clamp-2">
                          {genImage.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      {/* Mobile Gallery Toggle Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-20">
        <button
          onClick={() => setShowGallery(!showGallery)}
          className="bg-[#6ee43b] hover:bg-[#4bbf2b] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
        >
          <span className="text-2xl" role="img" aria-label="gallery">
            {showGallery ? '🎨' : '🖼️'}
          </span>
        </button>
      </div>
      
      {/* Footer */}
      <footer className="w-full text-center py-6 mt-10 text-gray-500 text-sm bg-gray-50 border-t border-gray-100">
        Inspired by <a href="https://versent.com.au/" target="_blank" rel="noopener noreferrer" className="text-[#6ee43b] font-semibold hover:underline">Versent</a> &mdash; Modern Cloud, Security, and Digital Transformation
      </footer>
    </div>
  );
}