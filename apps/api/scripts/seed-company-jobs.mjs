/* eslint-disable no-console */
import { supabaseRest } from '../src/utils/supabaseClient.js';
import { companyJobs } from '../src/data/company-jobs.js';

// Idempotent company hiring seed. Run from the repo root:
//   node --env-file=apps/api/.env apps/api/scripts/seed-company-jobs.mjs
// Existing postings are never edited or deleted; only missing titles are added.

const existing = await supabaseRest('/rest/v1/job_postings', {
  query: { select: 'id,title', limit: 500 },
});
const have = new Set((existing || []).map((row) => String(row.title || '').trim().toLowerCase()));
const missing = companyJobs.filter((job) => !have.has(String(job.title).trim().toLowerCase()));

console.log(`Existing postings: ${existing?.length || 0}`);
console.log(`Company roles in seed: ${companyJobs.length}`);
console.log(`Missing roles: ${missing.length}`);

let inserted = 0;
for (const job of missing) {
  try {
    await supabaseRest('/rest/v1/job_postings', {
      method: 'POST',
      body: {
        title: job.title,
        department: job.department,
        employmentType: job.employmentType,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
        status: 'open',
        auto_accept: false,
        hiring: job.hiring,
      },
      prefer: 'return=representation',
      query: { select: 'id' },
    });
    inserted += 1;
    console.log(`  + ${job.title}`);
  } catch (err) {
    console.error(`  ! ${job.title}: ${err.message}`);
  }
}
console.log(`Inserted ${inserted} of ${missing.length}.`);
