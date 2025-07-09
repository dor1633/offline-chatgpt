const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Get the correct path (outside the .asar archive)
const userDataPath = app.getPath('userData')
const logsDir = path.join(userDataPath, 'logs')

// Ensure logs folder exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const logFilePath = path.join(logsDir, 'main.log')

function logToFile(message, data = null) {
  const timestamp = new Date().toISOString()
  const logEntry = `${timestamp} - ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write log:', err)
  })
}

module.exports = logToFile
