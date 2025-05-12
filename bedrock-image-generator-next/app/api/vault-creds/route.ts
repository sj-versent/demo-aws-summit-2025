export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import vault from 'node-vault';

// Types for Vault credentials
interface VaultCredentials {
  username: string;
  password: string;
  lease_duration: number;
  access_key: string;
  secret_key: string;
  security_token?: string;
}

interface CachedCreds {
  creds: VaultCredentials;
  fetchedAt: number; // ms since epoch
}

// Types for error response
interface ErrorResponse {
  error: string;
  message: string;
  context?: string;
}

// AppRole login cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Helper: login with AppRole and cache token
async function getVaultToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry - 5000) {
    return cachedToken;
  }
  const role_id = process.env.VAULT_ROLE_ID;
  const secret_id = process.env.VAULT_SECRET_ID;
  const vault_addr = process.env.VAULT_ADDR;
  
  // Debug logging
  console.log('Debug - Vault Configuration:', {
    vault_addr,
    role_id_exists: !!role_id,
    secret_id_exists: !!secret_id,
    role_id_length: role_id?.length,
    secret_id_length: secret_id?.length
  });
  
  if (!role_id || !secret_id) {
    throw new Error('[AppRole Login] VAULT_ROLE_ID and VAULT_SECRET_ID must be set in environment');
  }
  
  try {
    const vaultClient = vault({ endpoint: vault_addr });
    
    // Check if Vault is accessible
    try {
      console.log('Debug - Checking Vault server health');
      await vaultClient.health();
      console.log('Debug - Vault server is healthy');
    } catch (healthErr) {
      console.error('Debug - Vault server health check failed:', healthErr);
      throw new Error('Unable to connect to Vault server');
    }
    
    console.log('Debug - Attempting Vault login with AppRole');
    const res = await vaultClient.approleLogin({
      role_id,
      secret_id,
    }).catch(error => {
      console.error('Debug - AppRole login error details:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    });
    
    if (!res?.auth?.client_token) {
      console.error('Debug - No client token in response:', res);
      throw new Error('No client token received from Vault');
    }
    
    const token = res.auth.client_token;
    cachedToken = token;
    // Set expiry based on lease_duration (in seconds)
    tokenExpiry = now + (res.auth.lease_duration || 3600) * 1000;
    console.log('Debug - Successfully obtained Vault token with lease duration:', res.auth.lease_duration);
    return token;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Debug - Vault login error:', msg);
    throw new Error(`[AppRole Login] Vault AppRole authentication failed: ${msg}`);
  }
}

// Initialize Vault client with dynamic token
function getVaultClient(token: string) {
  if (!token) throw new Error('[Vault Client] Vault token is null');
  return vault({
    endpoint: process.env.VAULT_ADDR,
    token,
  });
}

// In-memory cache (per serverless instance)
const credsCache: Record<string, CachedCreds> = {};

// Helper function to handle errors
function handleError(error: unknown, context?: string): ErrorResponse {
  console.error('Vault API Error:', error);
  return {
    error: 'Failed to fetch credentials',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    context,
  };
}

// Helper to get (and refresh if needed) credentials
async function getValidCreds(path: string): Promise<VaultCredentials> {
  const cache = credsCache[path];
  const now = Date.now();
  if (cache) {
    const expiresAt = cache.fetchedAt + cache.creds.lease_duration * 1000 - 5000; // 5s early
    if (now < expiresAt) {
      return cache.creds;
    }
  }
  // Get a valid Vault token
  let token: string;
  try {
    token = await getVaultToken();
  } catch (err) {
    throw new Error(`[Token Retrieval] ${err instanceof Error ? err.message : String(err)}`);
  }
  // Use token to fetch AWS credentials
  try {
    const client = getVaultClient(token);
    const res = await client.read(path);
    const creds = res.data as VaultCredentials;
    credsCache[path] = { creds, fetchedAt: now };
    return creds;
  } catch (err) {
    throw new Error(`[AWS Credentials Fetch] ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function GET() {
  try {
    const path = 'aws/creds/bedrock-app';
    const creds = await getValidCreds(path);
    return NextResponse.json({
      accessKeyId: creds.access_key,
      secretAccessKey: creds.secret_key,
      sessionToken: creds.security_token, // may be undefined
      ttl: creds.lease_duration,
    });
  } catch (error) {
    const errorResponse = handleError(error, 'GET /api/vault-creds');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Path is required', context: 'POST /api/vault-creds' },
        { status: 400 }
      );
    }
    const creds = await getValidCreds(path);
    return NextResponse.json({
      accessKeyId: creds.access_key,
      secretAccessKey: creds.secret_key,
      sessionToken: creds.security_token, // may be undefined
      ttl: creds.lease_duration,
    });
  } catch (error) {
    const errorResponse = handleError(error, 'POST /api/vault-creds');
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 