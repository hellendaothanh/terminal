const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('Starting Electron download and extraction...');
  const zipPath = await downloadArtifact({
    version: '33.4.11',
    artifactName: 'electron',
    platform: 'darwin',
    arch: process.arch
  });
  console.log('Zip file cached at:', zipPath);

  const electronDir = path.resolve(__dirname, '../node_modules/electron');
  const distDir = path.resolve(electronDir, 'dist');

  console.log('Cleaning dist directory:', distDir);
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  console.log('Extracting Electron zip archive...');
  await extract(zipPath, { dir: distDir });

  console.log('Writing path.txt...');
  fs.writeFileSync(
    path.join(electronDir, 'path.txt'),
    'Electron.app/Contents/MacOS/Electron',
    'utf-8'
  );

  console.log('Electron successfully installed!');
}

main().catch((err) => {
  console.error('Error installing Electron:', err);
  process.exit(1);
});
