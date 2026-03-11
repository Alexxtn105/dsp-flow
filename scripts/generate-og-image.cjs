/**
 * Generates OG image (1200x630 PNG) from canvas.
 * Run: node scripts/generate-og-image.cjs
 * Requires: npm install canvas (dev dependency)
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1200, H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0d1117';
ctx.fillRect(0, 0, W, H);

// Subtle grid
ctx.strokeStyle = 'rgba(255,255,255,0.04)';
ctx.lineWidth = 1;
for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
}
for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
}

// Sine wave (large, background)
ctx.beginPath();
ctx.strokeStyle = 'rgba(0, 229, 160, 0.12)';
ctx.lineWidth = 3;
for (let x = 0; x < W; x++) {
    const y = H / 2 + Math.sin((x / W) * Math.PI * 4) * 180;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
}
ctx.stroke();

// Second wave
ctx.beginPath();
ctx.strokeStyle = 'rgba(0, 200, 255, 0.08)';
ctx.lineWidth = 2;
for (let x = 0; x < W; x++) {
    const y = H / 2 + Math.cos((x / W) * Math.PI * 6 + 1) * 120;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
}
ctx.stroke();

// Accent sine wave (foreground)
const grad = ctx.createLinearGradient(0, 0, W, 0);
grad.addColorStop(0, '#00e5a0');
grad.addColorStop(1, '#00c8ff');
ctx.beginPath();
ctx.strokeStyle = grad;
ctx.lineWidth = 4;
for (let x = 100; x < W - 100; x++) {
    const t = (x - 100) / (W - 200);
    const y = H / 2 + Math.sin(t * Math.PI * 3) * 100;
    x === 100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
}
ctx.stroke();

// Node dots on the wave
const nodes = [
    { x: 100, phase: 0 },
    { x: 375, phase: Math.PI * 0.75 },
    { x: 650, phase: Math.PI * 1.5 },
    { x: 925, phase: Math.PI * 2.25 },
    { x: 1100, phase: Math.PI * 3 },
];
for (const n of nodes) {
    const t = (n.x - 100) / (W - 200);
    const y = H / 2 + Math.sin(t * Math.PI * 3) * 100;
    // Glow
    const rg = ctx.createRadialGradient(n.x, y, 0, n.x, y, 20);
    rg.addColorStop(0, 'rgba(0, 229, 160, 0.3)');
    rg.addColorStop(1, 'rgba(0, 229, 160, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(n.x, y, 20, 0, Math.PI * 2); ctx.fill();
    // Dot
    ctx.fillStyle = '#00e5a0';
    ctx.beginPath(); ctx.arc(n.x, y, 5, 0, Math.PI * 2); ctx.fill();
}

// Title: "DSP"
ctx.font = 'bold 72px "Segoe UI", "SF Pro", system-ui, sans-serif';
ctx.fillStyle = '#00e5a0';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('DSP', W / 2 - 120, 120);

// Title: "Flow Editor"
ctx.font = '500 52px "Segoe UI", "SF Pro", system-ui, sans-serif';
ctx.fillStyle = '#e6edf3';
ctx.fillText('Flow Editor', W / 2 + 80, 120);

// Subtitle
ctx.font = '400 22px "Segoe UI", "SF Pro", system-ui, sans-serif';
ctx.fillStyle = '#8b949e';
ctx.textAlign = 'center';
ctx.fillText('Visual Digital Signal Processing Simulator', W / 2, 175);

// Feature pills at bottom
const pills = ['59+ DSP Blocks', 'FIR/IIR Filters', 'FFT Spectrum', 'AM/FM/PSK', 'PLL', 'Real-time Audio'];
const pillY = H - 80;
ctx.font = '600 14px "Segoe UI", "SF Pro", system-ui, sans-serif';
const pillWidths = pills.map(p => ctx.measureText(p).width + 24);
const totalPillW = pillWidths.reduce((a, b) => a + b, 0) + (pills.length - 1) * 10;
let px = (W - totalPillW) / 2;

for (let i = 0; i < pills.length; i++) {
    const pw = pillWidths[i];
    const ph = 28;
    // Pill background
    ctx.fillStyle = 'rgba(0, 229, 160, 0.08)';
    ctx.strokeStyle = 'rgba(0, 229, 160, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const r = 14;
    ctx.moveTo(px + r, pillY);
    ctx.lineTo(px + pw - r, pillY);
    ctx.arcTo(px + pw, pillY, px + pw, pillY + r, r);
    ctx.lineTo(px + pw, pillY + ph - r);
    ctx.arcTo(px + pw, pillY + ph, px + pw - r, pillY + ph, r);
    ctx.lineTo(px + r, pillY + ph);
    ctx.arcTo(px, pillY + ph, px, pillY + ph - r, r);
    ctx.lineTo(px, pillY + r);
    ctx.arcTo(px, pillY, px + r, pillY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Pill text
    ctx.fillStyle = '#7ee8c0';
    ctx.textAlign = 'center';
    ctx.fillText(pills[i], px + pw / 2, pillY + ph / 2 + 1);
    px += pw + 10;
}

// "Free & Open Source" badge
ctx.font = '600 13px "Segoe UI", "SF Pro", system-ui, sans-serif';
ctx.fillStyle = '#8b949e';
ctx.textAlign = 'center';
ctx.fillText('Free & Open Source  ·  github.com/Alexxtn105/dsp-flow', W / 2, H - 30);

// Write
const out = path.join(__dirname, '..', 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(out, buffer);
console.log(`OG image saved: ${out} (${(buffer.length / 1024).toFixed(0)} KB)`);
