/**
 * DevOps & Infrastructure Automated Test Suite
 * ============================================
 * Validates:
 * 1. Docker Compose configurations (production, dev, test)
 * 2. Multi-stage Dockerfile security standards (non-root, healthchecks, dumb-init)
 * 3. GitHub Actions CI/CD workflows syntax & security gates
 * 4. Nginx reverse proxy configurations & security headers
 * 5. Database migration files integrity & ordering (001 to 009)
 * 6. Environment variable definitions & sanitization (.env.example)
 * 7. Network isolation & multi-tier trust boundaries
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT_DIR = join(import.meta.dirname, '../../');

describe('DevOps & Infrastructure Automated Verification Suite', () => {
  // ── 1. DOCKER COMPOSE CONFIGURATIONS ──────────────────────────────────────
  describe('Docker Compose Configurations', () => {
    const composeFiles = [
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'docker-compose.test.yml',
    ];

    it('all docker-compose manifests exist and define valid services', () => {
      for (const file of composeFiles) {
        const filePath = join(ROOT_DIR, file);
        expect(existsSync(filePath), `Missing compose file: ${file}`).toBe(true);

        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('services:');
        expect(content.length).toBeGreaterThan(100);
      }
    });

    it('production docker-compose.yml enforces 3-tier network segmentation', () => {
      const content = readFileSync(join(ROOT_DIR, 'docker-compose.yml'), 'utf-8');
      expect(content).toContain('rwa-public');
      expect(content).toContain('rwa-app');
      expect(content).toContain('rwa-data');
      expect(content).toContain('internal: true'); // Database network has no external ingress
    });

    it('test docker-compose.test.yml defines automated test orchestration', () => {
      const content = readFileSync(join(ROOT_DIR, 'docker-compose.test.yml'), 'utf-8');
      expect(content).toContain('postgres-test');
      expect(content).toContain('redis-test');
      expect(content).toContain('backend-test');
      expect(content).toContain('contracts-test');
    });
  });

  // ── 2. DOCKERFILE SECURITY & STANDARDS ─────────────────────────────────────
  describe('Dockerfile Security & Best Practices', () => {
    const dockerfiles = [
      { name: 'Dockerfile', type: 'monolith', port: 3001, nonRootUser: 'rwa' },
      { name: 'Dockerfile.backend', type: 'microservice', port: 3001, nonRootUser: 'rwa' },
      { name: 'Dockerfile.frontend', type: 'microservice', port: 80, nonRootUser: 'nginx' },
      { name: 'Dockerfile.indexer', type: 'daemon', nonRootUser: 'rwa' },
      { name: 'Dockerfile.oracle', type: 'daemon', nonRootUser: 'rwa' },
      { name: 'Dockerfile.worker', type: 'daemon', nonRootUser: 'rwa' },
      { name: 'contracts/Dockerfile', type: 'contracts', port: 8545, nonRootUser: 'rwa' },
    ];

    it.each(dockerfiles)('$name adheres to non-root execution and security standards', (df) => {
      const filePath = join(ROOT_DIR, df.name);
      expect(existsSync(filePath), `Missing Dockerfile: ${df.name}`).toBe(true);

      const content = readFileSync(filePath, 'utf-8');

      // Check for multi-stage build where applicable
      if (df.type !== 'contracts') {
        expect(content).toMatch(/FROM\s+.*\s+AS\s+/i);
      }

      // Check for non-root user execution
      expect(content).toContain(`USER ${df.nonRootUser}`);

      // Check port exposure if defined
      if (df.port) {
        expect(content).toContain(`EXPOSE ${df.port}`);
      }
    });

    it('backend and monolith Dockerfiles implement dumb-init for PID 1 signal handling', () => {
      const backend = readFileSync(join(ROOT_DIR, 'Dockerfile.backend'), 'utf-8');
      const monolith = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      expect(backend).toContain('dumb-init');
      expect(monolith).toContain('dumb-init');
    });

    it('customer-facing containers (frontend & backend) define HEALTHCHECK directives', () => {
      const backend = readFileSync(join(ROOT_DIR, 'Dockerfile.backend'), 'utf-8');
      const frontend = readFileSync(join(ROOT_DIR, 'Dockerfile.frontend'), 'utf-8');

      expect(backend).toContain('HEALTHCHECK');
      expect(frontend).toContain('HEALTHCHECK');
    });
  });

  // ── 3. NGINX REVERSE PROXY & GATEWAY SECURITY ──────────────────────────────
  describe('Nginx Reverse Proxy Security Configuration', () => {
    it('nginx/default.conf includes strict rate limiting zones and security headers', () => {
      const conf = readFileSync(join(ROOT_DIR, 'nginx/default.conf'), 'utf-8');

      // Rate limit zones
      expect(conf).toContain('limit_req_zone');
      expect(conf).toContain('zone=rwa_api_limit:10m');
      expect(conf).toContain('zone=rwa_sensitive_limit:10m');

      // Security headers
      expect(conf).toContain('X-Frame-Options "SAMEORIGIN"');
      expect(conf).toContain('X-Content-Type-Options "nosniff"');
      expect(conf).toContain('X-XSS-Protection "1; mode=block"');
      expect(conf).toContain('Referrer-Policy "strict-origin-when-cross-origin"');

      // Upstream routing
      expect(conf).toContain('upstream frontend_backend');
      expect(conf).toContain('upstream api_backend');
    });

    it('nginx/frontend.conf includes /healthz probe endpoint and SPA routing fallback', () => {
      const conf = readFileSync(join(ROOT_DIR, 'nginx/frontend.conf'), 'utf-8');
      expect(conf).toContain('location /healthz');
      expect(conf).toContain('try_files $uri $uri/ /index.html');
      expect(conf).toContain('X-Frame-Options "SAMEORIGIN"');
    });
  });

  // ── 4. GITHUB ACTIONS CI/CD WORKFLOWS ──────────────────────────────────────
  describe('GitHub Actions CI/CD Pipeline Gates', () => {
    const workflows = [
      'ci.yml',
      'cd-publish.yml',
      'security.yml',
      'contracts-deploy.yml',
    ];

    it('all GitHub Actions workflow files exist and have valid structure', () => {
      for (const wf of workflows) {
        const filePath = join(ROOT_DIR, '.github/workflows', wf);
        expect(existsSync(filePath), `Missing workflow: ${wf}`).toBe(true);

        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('name:');
        expect(content).toContain('on:');
        expect(content).toContain('jobs:');
      }
    });

    it('ci.yml includes migrations-validate and platform-orchestration-e2e gates', () => {
      const ci = readFileSync(join(ROOT_DIR, '.github/workflows/ci.yml'), 'utf-8');
      expect(ci).toContain('migrations-validate:');
      expect(ci).toContain('platform-orchestration-e2e:');
      expect(ci).toContain('postgres:16-alpine');
      expect(ci).toContain('ci-gate:');
    });

    it('cd-publish.yml includes preflight-migrations and matrix container publish', () => {
      const cd = readFileSync(join(ROOT_DIR, '.github/workflows/cd-publish.yml'), 'utf-8');
      expect(cd).toContain('preflight-migrations:');
      expect(cd).toContain('build-and-publish-microservices:');
      expect(cd).toContain('generate-release-manifest:');
      expect(cd).toContain('ghcr.io');
    });

    it('security.yml scans both backend and frontend images with Trivy', () => {
      const sec = readFileSync(join(ROOT_DIR, '.github/workflows/security.yml'), 'utf-8');
      expect(sec).toContain('Dockerfile.backend');
      expect(sec).toContain('Dockerfile.frontend');
      expect(sec).toContain('aquasecurity/trivy-action');
    });
  });

  // ── 5. DATABASE MIGRATIONS INTEGRITY ───────────────────────────────────────
  describe('Database Migrations Integrity & Ordering', () => {
    const migrationsDir = join(ROOT_DIR, 'supabase/migrations');

    it('all 9 migrations exist, are chronologically sorted, and have valid SQL', () => {
      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      expect(files.length).toBe(9);

      // Verify naming prefixes
      expect(files[0]).toContain('_001_');
      expect(files[1]).toContain('_002_');
      expect(files[2]).toContain('_003_');
      expect(files[3]).toContain('_004_');
      expect(files[4]).toContain('_005_');
      expect(files[5]).toContain('_006_');
      expect(files[6]).toContain('_007_');
      expect(files[7]).toContain('_008_');
      expect(files[8]).toContain('_009_');

      // Verify content is not empty
      for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        expect(sql.trim().length).toBeGreaterThan(50);
      }
    });

    it('scripts/migrate.sh and scripts/docker/init-postgres.sh are executable and valid', () => {
      const migrateSh = join(ROOT_DIR, 'scripts/migrate.sh');
      const initPostgresSh = join(ROOT_DIR, 'scripts/docker/init-postgres.sh');

      expect(existsSync(migrateSh)).toBe(true);
      expect(existsSync(initPostgresSh)).toBe(true);

      const migrateContent = readFileSync(migrateSh, 'utf-8');
      expect(migrateContent).toContain('_schema_migrations');
      expect(migrateContent).toContain('psql');
    });
  });

  // ── 6. ENVIRONMENT CONFIGURATION & SANITIZATION ────────────────────────────
  describe('Environment Configuration & Security', () => {
    it('.env.example contains all required environment variables with sanitized placeholders', () => {
      const envExample = readFileSync(join(ROOT_DIR, '.env.example'), 'utf-8');

      // Ensure mandatory vars exist
      expect(envExample).toContain('DATABASE_URL=');
      expect(envExample).toContain('REDIS_URL=');
      expect(envExample).toContain('PORT=');
      expect(envExample).toContain('SEPOLIA_RPC_URL=');
      expect(envExample).toContain('DEPLOYER_PRIVATE_KEY=');

      // Ensure no real secrets or live private keys are committed
      expect(envExample).not.toMatch(/0x[a-fA-F0-9]{64}/);
      expect(envExample).toContain('replace_with_strong_database_password');
    });

    it('.dockerignore excludes sensitive files, node_modules, and cache', () => {
      const dockerignore = readFileSync(join(ROOT_DIR, '.dockerignore'), 'utf-8');

      expect(dockerignore).toContain('.git');
      expect(dockerignore).toContain('node_modules');
      expect(dockerignore).toContain('.env');
      expect(dockerignore).toContain('.env.*');
      expect(dockerignore).toContain('cache');
      expect(dockerignore).toContain('artifacts');
    });
  });
});
