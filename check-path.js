const { app } = require('electron')
const path = require('path')

app.whenReady().then(() => {
  console.log('process.resourcesPath:', process.resourcesPath)
  app.quit()
})
