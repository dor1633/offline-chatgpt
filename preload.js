const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('api', {
  sendPrompt: async (prompt) => {
    const res = await fetch('http://localhost:3011/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })
    const data = await res.json()
    return data.answer
  },
  getServerURL: () => 'http://localhost:3011'  // you can make this dynamic later
})
