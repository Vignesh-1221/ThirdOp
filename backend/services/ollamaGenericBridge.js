/**
 * Node bridge for Generic Engine (Any Report Analysis) via Ollama.
 * Spawns medgemma_service.py with mode "any_report" and structured abnormal payload.
 * Returns { concerns, recommendedDepartment, precautions }. Rejects on crash, non-zero exit, or invalid JSON.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_PATH = path.join(__dirname, 'medgemma_service.py');
const PYTHON_PATH = path.join(__dirname, '..', '.venv', 'bin', 'python3');

/**
 * Call Python Any Report reasoning with structured abnormal lab payload.
 * Rejects only on: Python venv missing, process error, non-zero exit, invalid JSON, or error: true in response.
 * @param {Array<{ testName: string, value: number|string, unit: string, referenceRange: string, status: string }>} abnormalPayload
 * @returns {Promise<{ concerns: Array, recommendedDepartment: string, precautions: string[] }>}
 */
function generateGenericConcernsViaOllama(abnormalPayload) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PYTHON_PATH)) {
      console.error('[GenericLab] Ollama: Python venv not found.');
      reject(new Error('Python venv not found. Run setup first.'));
      return;
    }

    const input = { mode: 'any_report', abnormalities: abnormalPayload };
    const inputJson = JSON.stringify(input);

    const child = spawn(PYTHON_PATH, [SCRIPT_PATH], {
      cwd: path.dirname(__dirname),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      console.error('[GenericLab] Ollama process error:', err.message);
      reject(err);
    });

    child.on('close', (code) => {
      if (code !== 0 && code != null) {
        console.error('[GenericLab] Ollama script exit code:', code, '| stderr:', stderr || '(none)');
        reject(new Error(`Ollama generic script failed (exit ${code})`));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim() || '{}');
      } catch (e) {
        console.error('[GenericLab] Ollama: invalid JSON from script.');
        reject(new Error('Invalid JSON from Ollama generic script'));
        return;
      }

      if (parsed.error === true) {
        console.error('[GenericLab] Ollama returned error:', parsed.message);
        reject(new Error(parsed.message || 'Ollama generic reasoning failed'));
        return;
      }

      resolve({
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        recommendedDepartment: typeof parsed.recommendedDepartment === 'string' ? parsed.recommendedDepartment : '',
        precautions: Array.isArray(parsed.precautions) ? parsed.precautions : []
      });
    });

    child.stdin.write(inputJson, 'utf8');
    child.stdin.end();
  });
}

module.exports = { generateGenericConcernsViaOllama };
