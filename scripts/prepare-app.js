// scripts/prepare-app.js
const fs = require('fs-extra');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..'); // Points to your password-manager/ directory
const buildAppDir = path.join(projectRoot, 'build-app');
const electronSrcDir = path.join(projectRoot, 'electron'); // Points to your electron/ folder
const reactDistDir = path.join(projectRoot, 'app', 'dist'); // Points to your app/dist/ folder
const projectNodeModules = path.join(projectRoot, 'node_modules'); // Points to your project's main node_modules

console.log('--- Preparing build-app directory for Electron packaging ---');

try {
  // 1. Clean (or create) the build-app directory
  fs.emptyDirSync(buildAppDir);
  console.log(`Cleaned and ensured build-app directory: ${buildAppDir}`);

  // 2. Copy main.js and preload.js to build-app root
  fs.copyFileSync(path.join(electronSrcDir, 'main.js'), path.join(buildAppDir, 'main.js'));
  fs.copyFileSync(path.join(electronSrcDir, 'preload.js'), path.join(buildAppDir, 'preload.js'));
  console.log('Copied main.js and preload.js to build-app root.');

  // 3. Copy the compiled React app (app/dist) into build-app/app/dist
  fs.copySync(reactDistDir, path.join(buildAppDir, 'app', 'dist'), { overwrite: true });
  console.log(`Copied React app from ${reactDistDir} to ${path.join(buildAppDir, 'app', 'dist')}.`);

  // 4. Create a stripped-down package.json for the bundled app
  const originalPackageJson = fs.readJsonSync(path.join(projectRoot, 'package.json'));
  const appPackageJson = {
    name: originalPackageJson.name,
    version: originalPackageJson.version,
    main: 'main.js', // This tells the *bundled* Electron app where its main script is located
    dependencies: originalPackageJson.dependencies || {} // Copy only runtime dependencies
  };
  fs.writeJsonSync(path.join(buildAppDir, 'package.json'), appPackageJson, { spaces: 2 });
  console.log('Created stripped-down package.json for build-app.');

  // 5. Copy icons to build-app root
  fs.copyFileSync(path.join(projectRoot, 'icon.ico'), path.join(buildAppDir, 'icon.ico'));
  fs.copyFileSync(path.join(projectRoot, 'icon.icns'), path.join(buildAppDir, 'icon.icns'));
  fs.copyFileSync(path.join(projectRoot, 'icon.png'), path.join(buildAppDir, 'icon.png'));
  console.log('Copied icons to build-app root.');

  // 6. Copy node_modules to build-app
  // This is essential for `asar: false` and ensures all runtime dependencies are present.
  fs.copySync(projectNodeModules, path.join(buildAppDir, 'node_modules'), { overwrite: true });
  console.log('Copied node_modules to build-app (this might take a while).');

  console.log('--- build-app preparation complete. ---');
} catch (err) {
  console.error('Error during build-app preparation:', err);
  process.exit(1); // Exit with an error code if something goes wrong
}