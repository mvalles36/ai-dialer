// src/app/api/vapi/publish/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Path to the publish-vapi-config.js script
const PUBLISH_SCRIPT_PATH = path.join(process.cwd(), 'vapi', 'publish-vapi-config.js');

export async function POST() {
  try {
    // First reconstruct the config from the edited prompt files
    await execPromise(`node ${path.join(process.cwd(), 'vapi', 'manage-prompts.js')} reconstruct ${path.join(process.cwd(), 'vapi', 'assistant_config.extracted.json')}`);
    
    // Then publish the updated config to VAPI API
    const { stdout, stderr } = await execPromise(`node ${PUBLISH_SCRIPT_PATH} update`);
    
    if (stderr && !stderr.includes('Warning:')) {
      throw new Error(stderr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'VAPI settings published successfully',
      details: stdout
    });
  } catch (error) {
    console.error('Error publishing VAPI settings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
