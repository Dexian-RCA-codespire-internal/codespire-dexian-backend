#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting build process...');

// Clean dist directory
const distPath = join(projectRoot, 'dist');
if (existsSync(distPath)) {
  console.log('🧹 Cleaning dist directory...');
  rmSync(distPath, { recursive: true, force: true });
}

// Create dist directory
mkdirSync(distPath, { recursive: true });

try {
  // Run Babel to transpile the code
  console.log('⚙️  Transpiling source code with Babel...');
  execSync('npx babel src --out-dir dist --copy-files --source-maps', {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  // Copy package.json to dist
  console.log('📦 Copying package.json to dist...');
  const copyFile = (source, dest) => {
    const sourcePath = join(projectRoot, source);
    const destPath = join(projectRoot, dest);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, destPath);
    }
  };

  copyFile('package.json', 'dist/package.json');

  // Copy any other necessary files
  const filesToCopy = [
    'README.md',
    'DOCKER_SETUP.md',
    'docker-compose.yml'
  ];

  filesToCopy.forEach(file => {
    const sourcePath = join(projectRoot, file);
    if (existsSync(sourcePath)) {
      console.log(`📄 Copying ${file} to dist...`);
      copyFile(file, `dist/${file}`);
    }
  });

  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: dist/');
  console.log('🚀 Run with: npm run start:prod');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
