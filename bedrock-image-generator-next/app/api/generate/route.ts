import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

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
    return NextResponse.json({ image });
  } catch (err: unknown) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
