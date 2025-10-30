// Usage: node scripts/create_test_job.mjs <FID>
const fid = process.argv[2] || process.env.TEST_FID || '477126';
const server = process.env.DEV_SERVER || 'http://localhost:3000';

async function run() {
  try {
    const res = await fetch(`${server}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Test PFP animation',
        user: { fid: Number(fid) },
        image_url: '/public/mock-pfp.png',
      }),
    });

    const data = await res.json();
    console.log('Server response:', res.status, data);
  } catch (err) {
    console.error('Failed to create test job via API:', err);
  }
}

run();
