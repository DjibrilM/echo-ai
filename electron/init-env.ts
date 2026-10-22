import path from 'node:path'
import fs from 'node:fs'

// Set up QVAC_WORKER_PATH before any @qvac/sdk modules are initialized
const workerCandidatePaths = [
  path.resolve(process.cwd(), 'node_modules/@qvac/sdk/dist/src/worker/index.js'),
  path.resolve(process.cwd(), 'node_modules/.pnpm/@qvac+sdk@0.22.0/node_modules/@qvac/sdk/dist/src/worker/index.js'),
]

for (const p of workerCandidatePaths) {
  if (fs.existsSync(p)) {
    process.env.QVAC_WORKER_PATH = p
    break
  }
}
