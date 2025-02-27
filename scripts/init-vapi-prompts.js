const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
/**
 * Initialize VAPI prompts by extracting them from the configuration file
 * This script should be run during application startup
 */
function initVapiPrompts() {
  try {
    console.log('Initializing VAPI prompts...');
    
    const configPath = path.join(process.cwd(), 'vapi', 'assistant_config.json');
    const extractedConfigPath = path.join(process.cwd(), 'vapi', 'assistant_config.extracted.json');
    
    // Check if the config file exists
    if (!fs.existsSync(configPath)) {
      console.log('VAPI config file not found');
      return;
    }
    
    // Check if prompts directory exists, if not create it
    const promptsDir = path.join(process.cwd(), 'prompts');
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    
    // Read and parse the config file
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Extract prompts from the config
    if (config.prompts && Array.isArray(config.prompts)) {
      console.log(`Found ${config.prompts.length} prompts to extract`);
      
      // Process each prompt
      config.prompts.forEach((prompt, index) => {
        if (prompt.id && prompt.content) {
          const promptPath = path.join(promptsDir, `${prompt.id}.txt`);
          console.log(`Extracting prompt: ${prompt.id}`);
          
          // Write prompt content to file
          fs.writeFileSync(promptPath, prompt.content, 'utf8');
          
          // Update the config to reference the file path instead of inline content
          config.prompts[index].file = `prompts/${prompt.id}.txt`;
          delete config.prompts[index].content;
        } else {
          console.log(`Skipping prompt at index ${index}: Missing id or content`);
        }
      });
      
      // Write the updated config back
      fs.writeFileSync(extractedConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`Updated config saved to ${extractedConfigPath}`);
    } else {
      console.log('No prompts found in config');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing VAPI prompts:', error);
    return false;
  }
}

// Export the function
module.exports = initVapiPrompts;

// If this file is run directly, execute the function
if (require.main === module) {
  const result = initVapiPrompts();
  process.exit(result ? 0 : 1);
}
