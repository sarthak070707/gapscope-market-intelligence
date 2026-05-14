import { spawn } from 'child_process';
import { appendFileSync } from 'fs';

const LOG = '/home/z/my-project/dev.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  appendFileSync(LOG, line);
  console.log(line.trim());
}

function startServer() {
  log('Starting Next.js dev server...');
  
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    appendFileSync(LOG, data.toString());
  });

  child.stderr.on('data', (data) => {
    appendFileSync(LOG, `[STDERR] ${data.toString()}`);
  });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
    // Restart after 3 seconds
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}`);
  });

  log(`Server started with PID=${child.pid}`);
}

startServer();
