const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Simple standalone test runner for blood report (generic) flows.
// Run from backend directory with: node test/blood.test.js

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5009';

// For demonstration we send structured lab JSON to the MedGemma endpoint
// and (optionally) hit the generic PDF-based endpoint if a sample file exists.

const STRUCTURED_TEST_CASES = [
  {
    name: 'Mild Abnormal Blood Report',
    payload: {
      structuredLabInput: {
        hemoglobin: 10.8,
        wbc: 12000,
        platelets: 150000,
        creatinine: 0.9
      }
    },
    expect: (status, data) => status === 200 && data && typeof data === 'object'
  },
  {
    name: 'Normal Blood Report',
    payload: {
      structuredLabInput: {
        hemoglobin: 13.5,
        wbc: 7000,
        platelets: 250000
      }
    },
    expect: (status, data) => status === 200 && data && typeof data === 'object'
  }
];

async function runStructuredTestCase(testCase) {
  const url = `${BASE_URL}/api/thirdop/medgemma`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: process.env.TEST_JWT ? `Bearer ${process.env.TEST_JWT}` : ''
  };

  console.log(`Running: ${testCase.name}`);

  const start = Date.now();
  let passed = false;

  try {
    const response = await axios.post(url, testCase.payload, { headers });
    const duration = Date.now() - start;

    passed = !!testCase.expect(response.status, response.data);

    console.log(`Response Time: ${duration} ms`);
    if (passed) {
      console.log('✅ PASS\n');
    } else {
      console.log('❌ FAIL (unexpected response shape)\n');
    }

    return { duration, passed };
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`Response Time: ${duration} ms`);
    console.log('❌ FAIL (request error)');
    if (err.response) {
      console.log(`Status: ${err.response.status}`);
      if (typeof err.response.data === 'object') {
        console.log('Body:', JSON.stringify(err.response.data, null, 2));
      }
    } else {
      console.log('Error:', err.message);
    }
    console.log();
    return { duration, passed: false };
  }
}

async function runGenericPdfTestIfAvailable() {
  const samplePath =
    process.env.TEST_PDF ||
    path.join(__dirname, '..', 'sample-data', 'sample-blood-report.pdf');

  if (!fs.existsSync(samplePath)) {
    return null;
  }

  const url = `${BASE_URL}/api/thirdop/analyze-generic`;
  const form = new FormData();
  form.append('file', fs.createReadStream(samplePath));
  form.append('gender', 'female');

  const headers = {
    ...form.getHeaders(),
    Authorization: process.env.TEST_JWT ? `Bearer ${process.env.TEST_JWT}` : ''
  };

  const name = 'Generic PDF Blood Report';
  console.log(`Running: ${name}`);

  const start = Date.now();
  let passed = false;

  try {
    const response = await axios.post(url, form, { headers });
    const duration = Date.now() - start;

    passed = response.status === 200 && response.data && response.data.status;

    console.log(`Response Time: ${duration} ms`);
    if (passed) {
      console.log('✅ PASS\n');
    } else {
      console.log('❌ FAIL (unexpected response shape)\n');
    }

    return { duration, passed };
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`Response Time: ${duration} ms`);
    console.log('❌ FAIL (request error)');
    if (err.response) {
      console.log(`Status: ${err.response.status}`);
      if (typeof err.response.data === 'object') {
        console.log('Body:', JSON.stringify(err.response.data, null, 2));
      }
    } else {
      console.log('Error:', err.message);
    }
    console.log();
    return { duration, passed: false };
  }
}

async function runAllTests() {
  console.log('===== Blood Report Flow Tests =====\n');

  const results = [];

  for (const testCase of STRUCTURED_TEST_CASES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runStructuredTestCase(testCase);
    results.push(result);
  }

  // Optional PDF-based test if sample file is available
  // eslint-disable-next-line no-await-in-loop
  const pdfResult = await runGenericPdfTestIfAvailable();
  if (pdfResult) {
    results.push(pdfResult);
  }

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const avgTime =
    total > 0
      ? Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total)
      : 0;

  console.log('-------------------------');
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Average Response Time: ${avgTime} ms`);
  console.log('=========================\n');
}

runAllTests().catch(err => {
  console.error('Unexpected error in blood tests:', err);
  process.exit(1);
});

