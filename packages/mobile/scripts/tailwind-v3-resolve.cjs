/**
 * Preload hook (NODE_OPTIONS="--require ...") that forces every `tailwindcss`
 * require to resolve from packages/mobile/node_modules (Tailwind v3).
 *
 * Why: nativewind/metro forks a child Node process to run the Tailwind CLI
 * (nativewind/dist/metro/tailwind/v3/child.js). That child resolves
 * `tailwindcss` from nativewind's own location — the workspace root — where
 * the web app keeps Tailwind v4. Tailwind v4 has no `lib/cli/build`, so the
 * child dies silently and NativeWind's getCSSForPlatform promise never
 * settles: Metro hangs at 0% on any bundle that includes global.css.
 * The equivalent hook inside metro.config.js only patches the Metro main
 * process; a preload in NODE_OPTIONS is inherited by forked children
 * (Tailwind CLI child and jest-worker transformers alike).
 */
/* global __dirname */
const path = require('path');
const Module = require('module');

const mobileRoot = path.resolve(__dirname, '..');
const mobileRequireParent = {
  id: path.join(mobileRoot, 'package.json'),
  filename: path.join(mobileRoot, 'package.json'),
  paths: Module._nodeModulePaths(mobileRoot),
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveMobileTailwind(request, parent, isMain, options) {
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/')) {
    return originalResolveFilename.call(this, request, mobileRequireParent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
