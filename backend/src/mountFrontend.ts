import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDist = path.resolve(backendDir, '..', 'dist');

export function resolveFrontendDist(): string {
  return process.env.FRONTEND_DIST
    ? path.resolve(process.env.FRONTEND_DIST)
    : defaultDist;
}

export function frontendBuildExists(distDir = resolveFrontendDist()): boolean {
  return fs.existsSync(path.join(distDir, 'index.html'));
}

/** Serve Vite production build + SPA fallback (same origin as /api). */
export function mountFrontend(app: express.Application, distDir = resolveFrontendDist()): boolean {
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn(
      `[frontend] No build at ${distDir} — run "npm run build" from repo root, or use SERVE_FRONTEND=false`
    );
    return false;
  }

  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });

  return true;
}
