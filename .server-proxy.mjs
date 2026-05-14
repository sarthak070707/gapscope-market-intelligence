import http from 'http';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const PORT = 3000;
let nextServer = null;
let isStarting = false;

function startNextServer() {
  if (isStarting) return;
  isStarting = true;
  
  console.log(`[${new Date().toISOString()}] Starting Next.js server...`);
  
  nextServer = spawn('node', ['node_modules/.bin/next', 'start', '-p', PORT], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  nextServer.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  nextServer.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  nextServer.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited (code=${code}, signal=${signal}), restarting in 3s...`);
    nextServer = null;
    isStarting = false;
    setTimeout(startNextServer, 3000);
  });

  // Wait a bit for server to start
  setTimeout(() => { isStarting = false; }, 3000);
}

// Start the server
startNextServer();

// Create a simple proxy that forwards requests to the Next.js server
const proxy = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    // Server might be down, try restarting
    if (!nextServer) startNextServer();
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end('<html><body><h2>Server is starting...</h2><p>Please refresh in a few seconds.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>');
  });

  req.pipe(proxyReq);
});

// Listen on a different port and update Caddy
proxy.listen(3001, () => {
  console.log(`[${new Date().toISOString()}] Proxy server listening on port 3001`);
});
