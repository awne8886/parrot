const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const framesDir = path.join(__dirname, 'parrot');
const frames = fs
  .readdirSync(framesDir)
  .filter((f) => f.endsWith('.ansi'))
  .sort()
  .map((f) => fs.readFileSync(path.join(framesDir, f), 'utf8'));

const delayMs =
  parseInt(fs.readFileSync(path.join(framesDir, 'delay.env'), 'utf8'), 10) || 70;

// Clear screen, clear scrollback, move cursor home.
const CLEAR = '\x1b[2J\x1b[3J\x1b[H';
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const isTerminalClient = (req) =>
  /curl|wget|httpie|powershell/i.test(req.get('user-agent') || '');

function streamParrot(req, res) {
  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });

  let i = 0;
  const timer = setInterval(() => {
    res.write(CLEAR + frames[i] + '\x1b[0m');
    i = (i + 1) % frames.length;
  }, delayMs);

  req.on('close', () => clearInterval(timer));
}

// Plain-text frames for the browser page to animate.
app.get('/frames.json', (req, res) => {
  res.json({ delay: delayMs, frames: frames.map(stripAnsi) });
});

app.get(['/', '/parrot'], (req, res) => {
  if (isTerminalClient(req)) return streamParrot(req, res);
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
