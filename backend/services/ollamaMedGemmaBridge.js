/**
 * Node bridge to the Python MedGemma/Ollama clinical reasoning service.
 *
 * Spawns backend/services/medgemma_service.py with structured lab JSON on stdin,
 * reads result JSON from stdout. Returns { concerns } only (no qa). No cloud LLM fallback.
 *
 * Requires: Ollama running locally with model gemma:7b, Python 3 with requests.
 * Enable via: USE_OLLAMA_MEDGEMMA=true
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_PATH = path.join(__dirname, 'medgemma_service.py');
/** Use backend venv Python; do not use system Python. */
const PYTHON_PATH = path.join(__dirname, '..', '.venv', 'bin', 'python3');

/**
 * Call Python MedGemma service with structured lab input.
 * @param {Object} structuredLabInput - Lab values as plain object (e.g. reportData)
 * @returns {Promise<{ concerns: Array<{ title: string, reason: string, doctorQuestions: string[] }> }>}
 * @throws {Error} If Python unavailable, script fails, or response has error: true (structured error, no cloud fallback)
 */
function generateMedGemmaReasoningViaOllama(structuredLabInput) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PYTHON_PATH)) {
      console.error('[Ollama MedGemma] Python venv not found. Run setup first.');
      reject(new Error('Ollama MedGemma: Python venv not found. Run setup first.'));
      return;
    }

    console.log('[Ollama MedGemma] Using Python:', PYTHON_PATH);

    const inputJson = JSON.stringify(structuredLabInput ?? {});

    // Explicit logging: Python process is being spawned
    console.log('[Ollama MedGemma] Spawning Python process:', SCRIPT_PATH);

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
      // Log error clearly; no cloud fallback
      console.error('[Ollama MedGemma] Process error:', err.message);
      reject(new Error(`Ollama MedGemma: failed to run Python: ${err.message}`));
    });

    child.on('close', (code) => {
      // Explicit logging: response received from Python
      console.log('[Ollama MedGemma] Response received from Python process (exit code:', code, ')');

      // Do NOT treat non-zero exit as success; log and reject with structured error
      if (code !== 0 && code != null) {
        console.error('[Ollama MedGemma ERROR] stderr:');
        console.error(stderr || '(empty)');
        console.error('[Ollama MedGemma ERROR] stdout:');
        console.error(stdout || '(empty)');
        const errPayload = {
          error: true,
          message: 'MedGemma process failed',
          details: stderr || stdout || `Process exited with code ${code}`
        };
        reject(Object.assign(new Error(errPayload.message), errPayload));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim() || '{}');
      } catch (e) {
        console.error('[Ollama MedGemma] Invalid JSON from script. stderr:', stderr || '(none)');
        reject(new Error(`Ollama MedGemma: invalid JSON from script. ${stderr ? `stderr: ${stderr}` : ''}`));
        return;
      }

      if (parsed.error === true) {
        console.error('[Ollama MedGemma] Service returned error:', parsed.message);
        reject(new Error(parsed.message || 'Ollama MedGemma reasoning failed'));
        return;
      }

      const concerns = Array.isArray(parsed.concerns) ? parsed.concerns : [];
      const doctorQuestionsTotal = concerns.reduce((sum, c) => sum + (Array.isArray(c.doctorQuestions) ? c.doctorQuestions.length : 0), 0);
      console.log('[Ollama MedGemma] concerns =', concerns.length, ', doctorQuestions total =', doctorQuestionsTotal);
      resolve({ concerns });
    });

    child.stdin.write(inputJson, 'utf8');
    child.stdin.end();
  });
}

module.exports = { generateMedGemmaReasoningViaOllama };
