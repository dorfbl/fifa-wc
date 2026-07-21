import { defineConfig } from 'cypress';
import pg from 'pg';

const { Pool } = pg;

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3011',
    viewportWidth: 390,
    viewportHeight: 844,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      on('task', {
        async dbQuery({ text, params }: { text: string; params?: unknown[] }) {
          const pool = new Pool({
            connectionString: 'postgresql://postgres:!Meggie4life@localhost:5432/mondial_2026',
          });
          try {
            const res = await pool.query(text, params);
            return res.rows;
          } finally {
            await pool.end();
          }
        },
      });
    },
  },
});
