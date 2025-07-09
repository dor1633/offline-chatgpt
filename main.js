const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const logToFile = require('./logger')
const fetch = require('node-fetch')

// 🔄 Poll Ollama to confirm it's running
const waitForOllamaReady = async (timeout = 15000) => {
  const start = Date.now()
  const url = 'http://127.0.0.1:11434/api/tags'

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        console.log('✅ Ollama is ready')
        return true
      }
    } catch (e) {
      // Wait and retry
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error('❌ Ollama did not start in time')
}


// 🚀 Start Express server
async function startEmbeddedServer() {
  const express = require('express')
  const bodyParser = require('body-parser')
  const server = express()

  server.use(bodyParser.json())

  server.post('/chat', async (req, res) => {
    const { prompt } = req.body
    console.log("Received prompt:", prompt)
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: prompt,
          stream: false
        })
      })
      const data = await ollamaRes.json()
      res.json({ answer: data.response || data.message?.content || 'No response' })
    } catch (e) {
      logToFile('❌ Failed to talk to LLM: ' + e.message)
      console.error('❌ Failed to talk to LLM:', e)
      res.status(500).json({ error: 'Failed to talk to LLM', details: e.message })
    }
  })

  server.listen(3011, () => {
    logToFile('✅ Embedded server running on http://localhost:3011')
    console.log('✅ Embedded server running on http://localhost:3011')
  })
}


function copyFileSync(source, target) {
  const realSource = fs.realpathSync(source)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(realSource, target)
  fs.chmodSync(target, 0o755)
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, file)
    const dest = path.join(destDir, file)
    if (fs.lstatSync(src).isDirectory()) {
      copyDirRecursive(src, dest)
    } else {
      copyFileSync(src, dest)
    }
  }
}

function launchOllama() {
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'
  
  let binaryName
  if (isWindows) {
    binaryName = 'ollama-win.exe'
  } else if (isMac) {
    binaryName = 'ollama-mac'
  } else if (isLinux) {
    binaryName = 'ollama-linux'
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }
  
  const basePath = app.isPackaged ? process.resourcesPath : __dirname
  const bundledOllamaPath = path.join(basePath, 'ollama', binaryName)
  const bundledModelsPath = path.join(basePath, 'models')
  const userOllamaDir = path.join(app.getPath('userData'), 'embedded-ollama')
  const userOllamaPath = path.join(userOllamaDir, binaryName)
  const userModelsPath = path.join(userOllamaDir, 'models')
  
  console.log(`🔍 Looking for Ollama at: ${bundledOllamaPath}`)
  console.log(`📁 User Ollama dir: ${userOllamaDir}`)
  
  copyFileSync(bundledOllamaPath, userOllamaPath)
  copyDirRecursive(bundledModelsPath, userModelsPath)
  
  // Copy Windows lib files if needed
  if (isWindows) {
    const bundledLibPath = path.join(basePath, 'ollama', 'lib')
    const userLibPath = path.join(userOllamaDir, 'lib')
    if (fs.existsSync(bundledLibPath)) {
      copyDirRecursive(bundledLibPath, userLibPath)
    }
  }
  
  logToFile(`🟡 Launching Ollama from ${userOllamaPath}`)
  console.log(`🟡 Launching Ollama from ${userOllamaPath}`)
  
  try {
    const ollamaProcess = spawn(userOllamaPath, ['serve'], {
      cwd: userOllamaDir,
      env: {
        ...process.env,
        OLLAMA_MODELS: userModelsPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    })
    ollamaProcess.stderr.on('data', (data) => {
      logToFile(`❌ Ollama stderr: ${data.toString()}`)
      console.log(`❌ Ollama stderr: ${data.toString()}`)
    })
    ollamaProcess.stdout.on('data', (data) => {
      logToFile(`📤 Ollama stdout: ${data.toString()}`)
      console.log(`📤 Ollama stdout: ${data.toString()}`)
    })
    ollamaProcess.unref()
    logToFile(`✅ Ollama started from "${userOllamaPath}"`)
    console.log(`✅ Ollama started from "${userOllamaPath}"`)
  } catch (e) {
    logToFile('❌ Failed to start Ollama: ' + e.message)
    console.error('❌ Failed to start Ollama:', e.message)
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(async () => {
  // Always launch Ollama and server for both dev and production
  await launchOllama()
  try {
    await waitForOllamaReady()
    await startEmbeddedServer()
    console.log('✅ All services started successfully')
  } catch (err) {
    logToFile(err.message)
    console.error('❌ Failed to start services:', err.message)
  }
  
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})