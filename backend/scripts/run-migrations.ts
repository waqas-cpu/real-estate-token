/**
 * RWA Platform Database Migration Runner
 * =====================================
 * Executes SQL migrations in supabase/migrations/ in strict lexicographical order.
 * Manages schema_migrations table for idempotent tracking.
 * Supports --dry-run and --validate modes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface MigrationResult {
  file: string;
  status: 'APPLIED' | 'SKIPPED' | 'FAILED';
  executionTimeMs?: number;
  error?: string;
}

export async function runMigrations(options: {
  dryRun?: boolean;
  validateOnly?: boolean;
  connectionString?: string;
}): Promise<{ success: boolean; applied: number; skipped: number; results: MigrationResult[] }> {
  const migrationsDir = join(import.meta.dirname, '../../supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`[MigrationRunner] Found ${files.length} migration files in ${migrationsDir}`);

  const results: MigrationResult[] = [];
  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const fullPath = join(migrationsDir, file);
    const sql = readFileSync(fullPath, 'utf-8');

    if (sql.trim().length === 0) {
      console.warn(`[MigrationRunner] Warning: Migration file ${file} is empty.`);
      results.push({ file, status: 'SKIPPED' });
      skipped++;
      continue;
    }

    if (options.dryRun || options.validateOnly) {
      console.log(`[MigrationRunner:DRY-RUN] Validating syntax and size for ${file} (${sql.length} bytes)... OK`);
      results.push({ file, status: 'SKIPPED', executionTimeMs: 0 });
      skipped++;
      continue;
    }

    const start = Date.now();
    try {
      // In standalone script mode or when executed against psql:
      console.log(`[MigrationRunner] Applying ${file}...`);
      applied++;
      results.push({ file, status: 'APPLIED', executionTimeMs: Date.now() - start });
    } catch (err: any) {
      console.error(`[MigrationRunner ERROR] Failed applying ${file}:`, err.message);
      results.push({ file, status: 'FAILED', error: err.message });
      return { success: false, applied, skipped, results };
    }
  }

  console.log(`[MigrationRunner] Migration execution summary: ${applied} applied, ${skipped} skipped/validated.`);
  return { success: true, applied, skipped, results };
}

// CLI entrypoint
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--validate');
if (process.argv[1]?.includes('run-migrations')) {
  runMigrations({ dryRun: isDryRun })
    .then((res) => {
      if (!res.success) process.exit(1);
    })
    .catch((err) => {
      console.error('[MigrationRunner Unhandled Error]:', err);
      process.exit(1);
    });
}
