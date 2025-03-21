#!/usr/bin/env node

/**
 * MCP Client Installation Script
 * 
 * This script simplifies installation and configuration of the Gemini Context MCP
 * server for different MCP clients (Claude Desktop, Cursor, VS Code, etc.)
 */

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { config } from './config.js';
import readline from 'readline';

// Define supported client types
const SUPPORTED_CLIENTS = ['cursor', 'claude', 'vscode', 'generic'];

// Get package.json version
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for confirmation
function confirmOverwrite(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`File ${filePath} already exists. Overwrite? (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Helper function to safely write file (checking if it exists first)
async function safeWriteFile(filePath: string, content: string, options?: fs.WriteFileOptions): Promise<boolean> {
  // Check if file exists
  if (fs.existsSync(filePath)) {
    const overwrite = await confirmOverwrite(filePath);
    if (!overwrite) {
      console.log(`Skipping existing file: ${filePath}`);
      return false;
    }
  }
  
  // Ensure directory exists
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(filePath, content, options);
  console.log(`File created: ${filePath}`);
  return true;
}

// Helper function to merge JSON objects intelligently
function deepMerge(target: any, source: any) {
  // Create a new object to avoid modifying either original
  const result = { ...target };
  
  for (const key in source) {
    // Handle arrays specifically (don't want to merge, want to add entries)
    if (Array.isArray(source[key])) {
      // If target already has this key as array, merge them without duplicates
      if (Array.isArray(result[key])) {
        // For MCP server configs, check if a config with the same name already exists
        if (key === 'ai.mcpServerConfigurations' || key === 'mcp.servers') {
          const existingNames = result[key].map((item: any) => item.name);
          // Only add new items that don't exist with the same name
          source[key].forEach((item: any) => {
            if (!existingNames.includes(item.name)) {
              result[key].push(item);
            } else {
              console.log(`Configuration for "${item.name}" already exists, skipping`);
            }
          });
        } else {
          // For other arrays, concat and remove duplicates if they're primitive values
          result[key] = [...new Set([...result[key], ...source[key]])];
        }
      } else {
        // Target doesn't have this key as array, so use source's array
        result[key] = [...source[key]];
      }
    } 
    // Handle nested objects
    else if (typeof source[key] === 'object' && source[key] !== null) {
      // If target has this key as an object too, merge them
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        // Otherwise, just use source's object
        result[key] = { ...source[key] };
      }
    } 
    // For all other cases, overwrite with source value
    else {
      result[key] = source[key];
    }
  }
  
  return result;
}

program
  .name('gemini-context-mcp')
  .description('Gemini Context MCP server installer for various clients')
  .version(packageJson.version);

program
  .command('install')
  .description('Install and configure the MCP server for a specific client')
  .argument('<client>', `Client to install for (${SUPPORTED_CLIENTS.join(', ')})`)
  .option('-p, --port <port>', 'Port number for HTTP server mode', '3000')
  .option('-d, --directory <path>', 'Directory to install configuration files', process.cwd())
  .option('--no-build', 'Skip building the project')
  .option('-f, --force', 'Force overwrite existing files without prompting', false)
  .action(async (clientType: string, options: any) => {
    // Normalize client type
    clientType = clientType.toLowerCase();
    
    // Check if client type is supported
    if (!SUPPORTED_CLIENTS.includes(clientType)) {
      console.error(`Error: Unsupported client type "${clientType}". Supported types: ${SUPPORTED_CLIENTS.join(', ')}`);
      process.exit(1);
    }
    
    // Build project if not skipped
    if (options.build) {
      console.log('Building project...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
      } catch (error) {
        console.error('Error building project:', error);
        process.exit(1);
      }
    }
    
    // Create client-specific configuration
    console.log(`Configuring for ${clientType}...`);
    
    try {
      switch (clientType) {
        case 'cursor':
          await configureCursor(options);
          break;
        case 'claude':
          await configureClaude(options);
          break;
        case 'vscode':
          await configureVSCode(options);
          break;
        case 'generic':
          await configureGeneric(options);
          break;
      }
      
      console.log(`\n✅ Configuration for ${clientType} completed successfully!`);
      
      // Print next steps
      printNextSteps(clientType, options);
    } catch (error) {
      console.error(`Error during configuration: ${error}`);
    } finally {
      // Close readline interface
      rl.close();
    }
  });

program.parse();

/**
 * Configure for Cursor IDE
 */
async function configureCursor(options: any) {
  const cursorConfigDir = path.join(os.homedir(), '.cursor', 'config');
  const settingsPath = path.join(cursorConfigDir, 'settings.json');
  const serverPath = path.resolve(process.cwd());
  
  console.log(`Setting up Cursor configuration...`);
  
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(cursorConfigDir)) {
      fs.mkdirSync(cursorConfigDir, { recursive: true });
    }
    
    // Read existing settings or create new ones
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(content);
        console.log(`Found existing Cursor settings at ${settingsPath}`);
      } catch (e) {
        console.warn(`Warning: Couldn't parse existing Cursor settings. Creating new file.`);
      }
    }
    
    // New MCP server configuration
    const newMcpConfig = {
      "ai.mcpServerConfigurations": [{
        "name": "Gemini Context MCP",
        "directory": serverPath,
      }]
    };
    
    // Merge configurations
    const mergedSettings = deepMerge(settings, newMcpConfig);
    
    // Write settings file
    const settingsContent = JSON.stringify(mergedSettings, null, 2);
    await safeWriteFile(settingsPath, settingsContent);
    
    // Create start script for Cursor
    const cursorStartScript = path.join(options.directory, 'start-cursor.sh');
    const startScriptContent = `#!/bin/bash
# Start Gemini Context MCP server for Cursor
cd "${serverPath}"
npm run build
npm run start
`;
    
    await safeWriteFile(cursorStartScript, startScriptContent, { mode: 0o755 });
  } catch (error) {
    console.error('Error configuring Cursor:', error);
    throw error;
  }
}

/**
 * Configure for Claude Desktop
 */
async function configureClaude(options: any) {
  const claudeConfigDir = path.join(options.directory, 'claude-config');
  const serverPath = path.resolve(process.cwd());
  const port = options.port;
  
  console.log(`Setting up Claude Desktop configuration...`);
  
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(claudeConfigDir)) {
      fs.mkdirSync(claudeConfigDir, { recursive: true });
    }
    
    // Create configuration file
    const claudeConfigPath = path.join(claudeConfigDir, 'gemini-context-mcp.json');
    const claudeConfig = {
      "name": "Gemini Context MCP",
      "endpointType": "http",
      "endpoint": `http://localhost:${port}`,
      "description": "Gemini context management with 2M token support and caching"
    };
    
    await safeWriteFile(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
    
    // Create start script for HTTP mode
    const claudeStartScript = path.join(options.directory, 'start-claude-server.sh');
    const scriptContent = `#!/bin/bash
# Start Gemini Context MCP server in HTTP mode for Claude Desktop
cd "${serverPath}"
npm run build
node dist/mcp-server.js --http --port ${port}
`;
    
    await safeWriteFile(claudeStartScript, scriptContent, { mode: 0o755 });
  } catch (error) {
    console.error('Error configuring Claude Desktop:', error);
    throw error;
  }
}

/**
 * Configure for VS Code
 */
async function configureVSCode(options: any) {
  const vscodeConfigDir = path.join(options.directory, 'vscode-config');
  const serverPath = path.resolve(process.cwd());
  const port = options.port;
  
  console.log(`Setting up VS Code configuration...`);
  
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(vscodeConfigDir)) {
      fs.mkdirSync(vscodeConfigDir, { recursive: true });
    }
    
    // Create or update settings file
    const vscodeSettingsPath = path.join(vscodeConfigDir, 'settings.json');
    let existingSettings = {};
    
    if (fs.existsSync(vscodeSettingsPath)) {
      try {
        const content = fs.readFileSync(vscodeSettingsPath, 'utf8');
        existingSettings = JSON.parse(content);
        console.log(`Found existing VS Code settings at ${vscodeSettingsPath}`);
      } catch (e) {
        console.warn(`Warning: Couldn't parse existing VS Code settings. Creating new file.`);
      }
    }
    
    // New MCP server configuration
    const newSettings = {
      "mcp.servers": [
        {
          "name": "Gemini Context MCP",
          "type": "external",
          "command": `node ${serverPath}/dist/mcp-server.js`,
          "httpEndpoint": `http://localhost:${port}`
        }
      ]
    };
    
    // Merge settings
    const mergedSettings = deepMerge(existingSettings, newSettings);
    
    await safeWriteFile(vscodeSettingsPath, JSON.stringify(mergedSettings, null, 2));
    
    // Create start script
    const vscodeStartScript = path.join(options.directory, 'start-vscode-server.sh');
    const scriptContent = `#!/bin/bash
# Start Gemini Context MCP server for VS Code
cd "${serverPath}"
npm run build
node dist/mcp-server.js --http --port ${port}
`;
    
    await safeWriteFile(vscodeStartScript, scriptContent, { mode: 0o755 });
  } catch (error) {
    console.error('Error configuring VS Code:', error);
    throw error;
  }
}

/**
 * Configure generic MCP client
 */
async function configureGeneric(options: any) {
  const genericConfigDir = path.join(options.directory, 'mcp-config');
  const serverPath = path.resolve(process.cwd());
  const port = options.port;
  
  console.log(`Setting up generic MCP client configuration...`);
  
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(genericConfigDir)) {
      fs.mkdirSync(genericConfigDir, { recursive: true });
    }
    
    // Create configuration file
    const genericConfigPath = path.join(genericConfigDir, 'config.json');
    const genericConfig = {
      "name": "Gemini Context MCP",
      "type": "stdio",
      "command": `node ${serverPath}/dist/mcp-server.js`,
      "httpEndpoint": `http://localhost:${port}`,
      "manifestPath": path.join(serverPath, "mcp-manifest.json")
    };
    
    await safeWriteFile(genericConfigPath, JSON.stringify(genericConfig, null, 2));
    
    // Create start script
    const genericStartScript = path.join(options.directory, 'start-mcp-server.sh');
    const scriptContent = `#!/bin/bash
# Start Gemini Context MCP server in generic mode
cd "${serverPath}"
npm run build
node dist/mcp-server.js --http --port ${port}
`;
    
    await safeWriteFile(genericStartScript, scriptContent, { mode: 0o755 });
  } catch (error) {
    console.error('Error configuring generic MCP client:', error);
    throw error;
  }
}

/**
 * Print next steps based on client type
 */
function printNextSteps(clientType: string, options: any) {
  console.log('\n📋 Next Steps:');
  
  switch (clientType) {
    case 'cursor':
      console.log('1. Ensure your GEMINI_API_KEY is set in .env file');
      console.log('2. Run ./start-cursor.sh to start the server');
      console.log('3. Open Cursor and verify the MCP server is connected in Settings > AI');
      break;
      
    case 'claude':
      console.log('1. Ensure your GEMINI_API_KEY is set in .env file');
      console.log('2. Run ./start-claude-server.sh to start the server in HTTP mode');
      console.log('3. Open Claude Desktop and add a new MCP server:');
      console.log(`   - Name: Gemini Context MCP`);
      console.log(`   - Endpoint: http://localhost:${options.port}`);
      break;
      
    case 'vscode':
      console.log('1. Ensure your GEMINI_API_KEY is set in .env file');
      console.log('2. Install an MCP-compatible VS Code extension');
      console.log('3. Run ./start-vscode-server.sh to start the server');
      console.log('4. Configure the VS Code extension with the settings in vscode-config/settings.json');
      break;
      
    case 'generic':
      console.log('1. Ensure your GEMINI_API_KEY is set in .env file');
      console.log('2. Run ./start-mcp-server.sh to start the server');
      console.log('3. Configure your MCP client to connect to the server using the settings in mcp-config/config.json');
      break;
  }
  
  console.log('\nFor more details, see the README-MCP.md documentation.');
} 