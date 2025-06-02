import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import fs from 'fs';
import path from 'path';
// Removed fromStatic import

// Fetch AWS credentials from Vault-backed API
async function getAWSCreds() {
  try {
    const res = await fetch('http://localhost:3000/api/vault-creds');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.message || 'Failed to fetch AWS credentials from Vault API');
    }
    const data = await res.json();
    // Map Vault response to AWS credentials format
    return {
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      sessionToken: data.sessionToken,
      region: data.region || 'us-east-1', // Default region if not provided
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error fetching AWS credentials from Vault';
    throw new Error(msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // If prompt contains 'video', return a sample MP4 as base64
    if (typeof prompt === 'string' && prompt.toLowerCase().includes('video')) {
      const mp4Path = path.join(process.cwd(), 'bedrock-image-generator-next/public/architecture/nutanix.mp4.sample.b64');
      const mp4Base64 = fs.readFileSync(mp4Path, 'utf8').replace(/\n/g, '');
      return NextResponse.json({ image: mp4Base64, type: 'video' });
    }

    // Fetch AWS credentials from Vault
    const { accessKeyId, secretAccessKey, sessionToken, region } = await getAWSCreds();
    console.log('AWS Credentials Used:', { accessKeyId, secretAccessKey, sessionToken, region });
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    });

    const payload = {
      taskType: 'TEXT_IMAGE',
      textToImageParams: { text: prompt },
      imageGenerationConfig: {
        seed: Math.floor(Math.random() * 858993460),
        quality: 'standard',
        width: 1024,
        height: 1024,
        numberOfImages: 1,
      },
    };

    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-canvas-v1:0',
      body: JSON.stringify(payload),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const res = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(res.body));
    const image = body.images?.[0];        // PNG in base64

    if (!image) {
      return NextResponse.json(
        { error: 'No image returned from model.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ image, type: 'image' });
  } catch (err: unknown) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    // Return a user-friendly error for the UI
    return NextResponse.json({ error: msg || 'An error occurred while generating the image.' }, { status: 500 });
  }
}
