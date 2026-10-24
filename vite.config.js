import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LIVE_PATH = path.join(__dirname, 'src/data/live.json')
const SCRIPT_PATH = path.join(__dirname, 'scripts/refresh-catalog.mjs')
const REFRESH_TIMEOUT_MS = 120_000

function readCatalogMeta() {
  try {
    const data = JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8'))
    return {
      updatedAt: data.updatedAt || null,
      region: data.region || 'SE',
      sources: data.sources || ['IMDb', 'JustWatch'],
    }
  } catch {
    return { updatedAt: null, region: 'SE', sources: ['IMDb', 'JustWatch'] }
  }
}

function runRefresh() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk)
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      process.stderr.write(chunk)
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('catalog refresh timed out'))
    }, REFRESH_TIMEOUT_MS)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `refresh exited ${code}`))
    })
  })
}

function catalogPlugin() {
  let refreshing = false
  return {
    name: 'catalog-refresh',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url === '/__catalog-meta' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(readCatalogMeta()))
          return
        }
        if (url === '/__refresh-catalog' && req.method === 'POST') {
          await new Promise((resolve) => {
            req.on('data', () => {})
            req.on('end', resolve)
            req.on('error', resolve)
          })
          res.setHeader('Content-Type', 'application/json')
          if (refreshing) {
            res.statusCode = 409
            res.end(JSON.stringify({ ok: false, error: 'busy' }))
            return
          }
          refreshing = true
          try {
            await runRefresh()
            const meta = readCatalogMeta()
            res.end(JSON.stringify({ ok: true, updatedAt: meta.updatedAt }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: String(err.message || err) }))
          } finally {
            refreshing = false
          }
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), catalogPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@base44/sdk': path.resolve(__dirname, './src/lib/base44-sdk-stub.js'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      // Tonight Together realtime server (npm run server)
      '/ws': {
        target: process.env.WS_PROXY_TARGET || 'ws://127.0.0.1:8787',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
