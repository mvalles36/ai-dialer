// src/app/api/vapi/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Assume the same paths from your existing prompt-manager.js
const PATHS = {
  systemPrompt: path.join(process.cwd(), 'prompts', 'system-prompt.md'),
  firstMessage: path.join(process.cwd(), 'prompts', 'first-message.txt'),
  endCallMessage: path.join(process.cwd(), 'prompts', 'end-call-message.txt'),
  summaryPrompt: path.join(process.cwd(), 'prompts', 'summary-prompt.md'),
  successEvaluation: path.join(process.cwd(), 'prompts', 'success-evaluation.md'),
  structuredDataPrompt: path.join(process.cwd(), 'prompts', 'structured-data-prompt.md'),
  structuredDataSchema: path.join(process.cwd(), 'prompts', 'structured-data-schema.json')
};

// Ensure the prompts directory exists
async function ensurePromptsDir() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'prompts'), { recursive: true });
  } catch (error) {
    console.error('Error creating prompts directory:', error);
  }
}

// Helper to read a file with fallback for missing files
async function readFileWithFallback(filePath: string, fallback: string = ''): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    // Return empty string if file doesn't exist
    return fallback;
  }
}

// GET handler to fetch all VAPI settings
export async function GET() {
  try {
    await ensurePromptsDir();

    // Read all files
    const [
      systemPrompt,
      firstMessage,
      endCallMessage,
      summaryPrompt,
      successEvaluation,
      structuredDataPrompt,
      structuredDataSchemaRaw
    ] = await Promise.all([
      readFileWithFallback(PATHS.systemPrompt),
      readFileWithFallback(PATHS.firstMessage),
      readFileWithFallback(PATHS.endCallMessage),
      readFileWithFallback(PATHS.summaryPrompt),
      readFileWithFallback(PATHS.successEvaluation),
      readFileWithFallback(PATHS.structuredDataPrompt),
      readFileWithFallback(PATHS.structuredDataSchema, '{}')
    ]);

    return NextResponse.json({
      systemPrompt,
      firstMessage,
      endCallMessage,
      summaryPrompt,
      successEvaluation,
      structuredDataPrompt,
      structuredDataSchema: structuredDataSchemaRaw
    });
  } catch (error) {
    console.error('Error fetching VAPI settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VAPI settings' },
      { status: 500 }
    );
  }
}

// POST handler to update VAPI settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await ensurePromptsDir();

    // Update each file
    await Promise.all([
      fs.writeFile(PATHS.systemPrompt, body.systemPrompt || ''),
      fs.writeFile(PATHS.firstMessage, body.firstMessage || ''),
      fs.writeFile(PATHS.endCallMessage, body.endCallMessage || ''),
      fs.writeFile(PATHS.summaryPrompt, body.summaryPrompt || ''),
      fs.writeFile(PATHS.successEvaluation, body.successEvaluation || ''),
      fs.writeFile(PATHS.structuredDataPrompt, body.structuredDataPrompt || ''),
      fs.writeFile(PATHS.structuredDataSchema, body.structuredDataSchema || '{}')
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating VAPI settings:', error);
    return NextResponse.json(
      { error: 'Failed to update VAPI settings' },
      { status: 500 }
    );
  }
}
