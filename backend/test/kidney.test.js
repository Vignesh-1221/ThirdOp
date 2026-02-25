const axios = require('axios');

/*
  HOW TO RUN:

  Terminal 1:
    cd backend
    NODE_ENV=test node server.js

  Terminal 2:
    cd backend
    NODE_ENV=test node test/kidney.test.js
*/

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5009';

const ANALYZE_PATH =
  process.env.NODE_ENV === 'test'
    ? '/api/thirdop/analyze-test'
    : '/api/thirdop/analyze';

const url = `${BASE_URL}${ANALYZE_PATH}`;

const TEST_CASES = [

  // 1
  {
    name: "Young Healthy Female",
    payload: {
      reportId: "TC1",
      reportData: { creatinine: 0.8, urea: 25, albumin: 4.5, egfr: 105, acr: 6 },
      mlPrediction: { status: "success", prediction: 0, probabilities: [0.92, 0.08] },
      reportMetadata: { age: 26, sex: "female" }
    },
    expectedRisk: "low"
  },

  // 2
  {
    name: "Healthy Male Adult",
    payload: {
      reportId: "TC2",
      reportData: { creatinine: 1.0, urea: 30, albumin: 4.3, egfr: 95, acr: 10 },
      mlPrediction: { status: "success", prediction: 0, probabilities: [0.88, 0.12] },
      reportMetadata: { age: 35, sex: "male" }
    },
    expectedRisk: "low"
  },

  // 3
  {
    name: "Borderline eGFR Case",
    payload: {
      reportId: "TC3",
      reportData: { creatinine: 1.5, urea: 42, albumin: 3.8, egfr: 62, acr: 70 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.4, 0.6] },
      reportMetadata: { age: 50, sex: "male" }
    },
    expectedRisk: "medium"
  },

  // 4
  {
    name: "Stage 3a Profile",
    payload: {
      reportId: "TC4",
      reportData: { creatinine: 1.9, urea: 55, albumin: 3.4, egfr: 48, acr: 120 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.35, 0.65] },
      reportMetadata: { age: 58, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 5
  {
    name: "Stage 3b CKD",
    payload: {
      reportId: "TC5",
      reportData: { creatinine: 2.4, urea: 70, albumin: 3.1, egfr: 38, acr: 180 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.2, 0.8] },
      reportMetadata: { age: 62, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 6
  {
    name: "Advanced CKD",
    payload: {
      reportId: "TC6",
      reportData: { creatinine: 3.5, urea: 90, albumin: 2.9, egfr: 25, acr: 300 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.1, 0.9] },
      reportMetadata: { age: 70, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 7
  {
    name: "Elderly CKD Moderate",
    payload: {
      reportId: "TC7",
      reportData: { creatinine: 2.0, urea: 60, albumin: 3.2, egfr: 45, acr: 150 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.3, 0.7] },
      reportMetadata: { age: 78, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 8
  {
    name: "Elevated ACR Only",
    payload: {
      reportId: "TC8",
      reportData: { creatinine: 1.2, urea: 35, albumin: 4.0, egfr: 80, acr: 90 },
      mlPrediction: { status: "success", prediction: 0, probabilities: [0.6, 0.4] },
      reportMetadata: { age: 45, sex: "male" }
    },
    expectedRisk: "medium"
  },

  // 9
  {
    name: "Critical Kidney Profile",
    payload: {
      reportId: "TC9",
      reportData: { creatinine: 4.8, urea: 110, albumin: 2.6, egfr: 15, acr: 400 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.05, 0.95] },
      reportMetadata: { age: 75, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 10
  {
    name: "Early Kidney Decline",
    payload: {
      reportId: "TC10",
      reportData: { creatinine: 1.4, urea: 40, albumin: 3.9, egfr: 68, acr: 60 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.45, 0.55] },
      reportMetadata: { age: 48, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 11
  {
    name: "Stable Mild CKD",
    payload: {
      reportId: "TC11",
      reportData: { creatinine: 1.6, urea: 48, albumin: 3.7, egfr: 58, acr: 85 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.42, 0.58] },
      reportMetadata: { age: 55, sex: "male" }
    },
    expectedRisk: "medium"
  },

  // 12
  {
    name: "Early Albumin Elevation",
    payload: {
      reportId: "TC12",
      reportData: { creatinine: 1.1, urea: 32, albumin: 3.8, egfr: 82, acr: 95 },
      mlPrediction: { status: "success", prediction: 0, probabilities: [0.55, 0.45] },
      reportMetadata: { age: 44, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 13
  {
    name: "Controlled Moderate CKD",
    payload: {
      reportId: "TC13",
      reportData: { creatinine: 2.1, urea: 62, albumin: 3.3, egfr: 46, acr: 140 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.28, 0.72] },
      reportMetadata: { age: 63, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 14
  {
    name: "Severe Decline Case",
    payload: {
      reportId: "TC14",
      reportData: { creatinine: 3.8, urea: 95, albumin: 2.8, egfr: 22, acr: 280 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.12, 0.88] },
      reportMetadata: { age: 68, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 15
  {
    name: "Borderline Young Adult",
    payload: {
      reportId: "TC15",
      reportData: { creatinine: 1.3, urea: 38, albumin: 4.1, egfr: 72, acr: 50 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.48, 0.52] },
      reportMetadata: { age: 32, sex: "male" }
    },
    expectedRisk: "medium"
  },

  // 16
  {
    name: "Stable High Risk Elderly",
    payload: {
      reportId: "TC16",
      reportData: { creatinine: 4.1, urea: 105, albumin: 2.7, egfr: 17, acr: 360 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.08, 0.92] },
      reportMetadata: { age: 80, sex: "female" }
    },
    expectedRisk: "high"
  },

  // 17
  {
    name: "Mild Functional Decline",
    payload: {
      reportId: "TC17",
      reportData: { creatinine: 1.4, urea: 41, albumin: 3.9, egfr: 66, acr: 75 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.46, 0.54] },
      reportMetadata: { age: 47, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 18
  {
    name: "Moderate Male Case",
    payload: {
      reportId: "TC18",
      reportData: { creatinine: 2.3, urea: 68, albumin: 3.2, egfr: 40, acr: 165 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.22, 0.78] },
      reportMetadata: { age: 59, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 19
  {
    name: "Albumin Driven Risk",
    payload: {
      reportId: "TC19",
      reportData: { creatinine: 1.2, urea: 36, albumin: 3.0, egfr: 74, acr: 110 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.39, 0.61] },
      reportMetadata: { age: 53, sex: "female" }
    },
    expectedRisk: "medium"
  },

  // 20
  {
    name: "Advanced Chronic Profile",
    payload: {
      reportId: "TC20",
      reportData: { creatinine: 4.6, urea: 115, albumin: 2.5, egfr: 14, acr: 420 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.04, 0.96] },
      reportMetadata: { age: 74, sex: "male" }
    },
    expectedRisk: "high"
  },

  // 21
  {
    name: "Mid-Level Risk",
    payload: {
      reportId: "TC21",
      reportData: { creatinine: 1.7, urea: 52, albumin: 3.6, egfr: 55, acr: 95 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.37, 0.63] },
      reportMetadata: { age: 49, sex: "male" }
    },
    expectedRisk: "medium"
  },

  // 22
  {
    name: "Controlled High Risk",
    payload: {
      reportId: "TC22",
      reportData: { creatinine: 3.2, urea: 88, albumin: 2.9, egfr: 28, acr: 240 },
      mlPrediction: { status: "success", prediction: 1, probabilities: [0.18, 0.82] },
      reportMetadata: { age: 66, sex: "female" }
    },
    expectedRisk: "high"
  }

];

async function runTestCase(testCase) {
  console.log(`Running: ${testCase.name}`);
  const start = Date.now();

  try {
    const response = await axios.post(url, testCase.payload, {
      headers: { "Content-Type": "application/json" }
    });

    const duration = Date.now() - start;
    const actualRisk = response.data?.riskTier;
    const status = response.data?.status;

    const passed =
      actualRisk === testCase.expectedRisk &&
      status !== "error" &&
      status !== "no_kidney_analysis";

    console.log(`Response Time: ${duration} ms`);
    console.log(`Expected Risk: ${testCase.expectedRisk}`);
    console.log(`Actual Risk:   ${actualRisk}`);
    console.log(`ThirdOp Status: ${status}`);
    console.log(passed ? "PASS\n" : "FAIL\n");

    return { duration, passed };

  } catch (err) {
    const duration = Date.now() - start;
    console.log(`Response Time: ${duration} ms`);
    console.log("FAIL (Runtime Error)\n");
    return { duration, passed: false };
  }
}

async function runAllTests() {
  console.log("\n===== Kidney ML + ThirdOp Evaluation =====\n");

  const results = [];

  for (const testCase of TEST_CASES) {
    const result = await runTestCase(testCase);
    results.push(result);
  }

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const accuracy = Math.round((passed / total) * 100);
  const avgTime =
    Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total);

  console.log("------------------------------------------------");
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Accuracy: ${accuracy}%`);
  console.log(`Average Response Time: ${avgTime} ms`);
  console.log("================================================\n");
}

runAllTests();
