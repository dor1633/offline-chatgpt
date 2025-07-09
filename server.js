const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())

app.post('/chat', async (req, res) => {
  const { prompt } = req.body
console.log("Received prompt:", prompt)
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.2:latest', prompt, stream: false })
    })

    const data = await ollamaRes.json()
    res.json({ answer: data.response })
  } catch (e) {
    console.log("here", e)
    console.error(e)
    res.status(500).json({ error: 'Failed to talk to LLM' })
  }
})

app.listen(3011, () => {
  console.log('✅ Server running on http://localhost:3011')
})
