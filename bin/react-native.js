#!/usr/bin/env node
/**
 * React Native CLI Compatibility Shim for RoadReady (Capacitor Native Engine)
 * Translates React Native CLI commands ('run-android', 'run-ios') into Capacitor platform commands.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const command = args[0] || '';

console.log(`\x1b[36m[RoadReady Mobile CLI]\x1b[0m Executing command: '${command}'`);

function runCommand(cmd, cmdArgs, cwd = rootDir) {
  const proc = spawn(cmd, cmdArgs, {
    cwd,
    stdio: 'inherit',
    shell: true
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });
}

if (command === 'run-android') {
  console.log('\x1b[32m[RoadReady Android]\x1b[0m Syncing assets & running Android build via Capacitor...');
  runCommand('npx', ['cap', 'run', 'android', ...args.slice(1)]);
} else if (command === 'run-ios') {
  console.log('\x1b[32m[RoadReady iOS]\x1b[0m Syncing assets & running iOS build via Capacitor...');
  runCommand('npx', ['cap', 'run', 'ios', ...args.slice(1)]);
} else {
  console.log(`Available commands:
  npx react-native run-android  (Runs RoadReady on Android device/emulator)
  npx react-native run-ios      (Runs RoadReady on iOS simulator/device)
  `);
  process.exit(0);
}
