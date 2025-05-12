import type { NextApiRequest, NextApiResponse } from 'next';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

function sendSSE(res: NextApiResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (typeof (res as any).flush === 'function') (res as any).flush();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  sendSSE(res, { status: 'Request received...' });
  await sleep(700); // Add a short delay for smoother UX

  try {
    sendSSE(res, { status: 'Generating AWS creds...' });
    const credsRes = await fetch('http://localhost:3000/api/vault-creds');
    const creds = await credsRes.json();

    sendSSE(res, { status: 'Waiting for image...' });
    const client = new BedrockRuntimeClient({
      region: creds.region || 'us-east-1',
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    });

    const prompt = typeof req.query.prompt === 'string' ? req.query.prompt : 'A koala in a tree';

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

    const bedrockRes = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(bedrockRes.body));
    const image = body.images?.[0];

    if (image) {
      sendSSE(res, { status: 'Image ready!', image });
    } else {
      sendSSE(res, { status: 'No image returned from model.' });
    }
  } catch (err: any) {
    sendSSE(res, { status: err.message || 'An error occurred.' });
  }
  res.end();
} 