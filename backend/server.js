require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Order = require('./models/Order');

// New Voice Dependencies
const multer = require('multer');
const fs = require('fs');
const { OpenAI } = require('openai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Initialize APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Initialize OpenAI SDK, but point it to Groq's free servers
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// Setup Multer to keep the .webm extension so Groq accepts it
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Appends a unique timestamp and the required .webm extension
    cb(null, Date.now() + '.webm');
  }
});
const upload = multer({ storage: storage });
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

io.on('connection', (socket) => {
  console.log('Canteen dashboard connected:', socket.id);
});

// --- HELPER FUNCTION: AI PARSING (100% Groq / Llama 3.1 Version) ---
async function parseOrderWithGemini(orderText) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert Indian canteen order standardizer.
          Convert the messy text into JSON. 
          You MUST output a JSON object containing a single key "items" which holds an array.
          
          STANDARDIZATION RULES:
          - Fix typos: "Samosaaa" or "samos" -> "Samosa", "Chais" or "chaye" -> "Chai", "vda pav" -> "Vada Pav"
          - GROUP DUPLICATES: If they say "1 poha, 2 chai, and add 1 more poha", output ONE object for Poha with quantity 2.
          
          Example output format:
          {
            "items": [
              {"name": "Poha", "quantity": 1},
              {"name": "Chai", "quantity": 1},
              {"name": "Vada Pav", "quantity": 3}
            ]
          }`
        },
        { role: "user", content: orderText }
      ],
      model: "llama-3.1-8b-instant", // <--- THE ACTIVE, WORKING MODEL NAME
      temperature: 0,
      response_format: { type: "json_object" }
    });

    // Parse the guaranteed JSON object and extract JUST the array for the frontend
    const parsedData = JSON.parse(response.choices[0].message.content);
    return parsedData.items;

  } catch (error) {
    console.error("Groq Parsing Error:", error);
    // Safe fallback so the server never crashes
    return [{ name: orderText, quantity: 1 }];
  }
}



// --- HELPER FUNCTION: AI PARSING ---
// async function parseOrderWithGemini(orderText) {
//   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
//   const prompt = `
//     You are an expert Indian canteen order standardizer.
//     Convert the following messy text into a structured JSON array of items.

//     STANDARDIZATION RULES:
//     - "Samosaaa" or "samos" -> "Samosa"
//     - "Chais" or "chaye" -> "Chai"
//     - "Cofe" or "coffeeee" -> "Coffee"
//     - "Vda pav" -> "Vada Pav"

//     Output strictly JSON: [{"name": "Item Name", "quantity": X, "notes": "..."}]
//     Text: "${orderText}"
//   `;
//   const result = await model.generateContent(prompt);
//   let aiResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
//   return JSON.parse(aiResponse);
// }




// --- API ROUTES ---

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    // Step 1: Create the transcription
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      // Adding a very strong prompt to fix the "One summer shop" issue
      prompt: "This is a college canteen order. Indian food names: Samosa, Chai, Tea, Vada Pav, Poha, Maggi, Coffee, Dosa, Idli.",
      language: "en"
    });

    // Step 2: Handle the file deletion safely for Windows
    // We wait 500ms to ensure the file stream is fully closed before unlinking
    setTimeout(() => {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error("Cleanup error (ignoring):", err.message);
      }
    }, 500);

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription Error:", error);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});


// 2. Process Text Order (EXISTING)
app.post('/api/orders', async (req, res) => {
  try {
    const { orderText, destination } = req.body;
    const parsedItems = await parseOrderWithGemini(orderText);

    const newOrder = new Order({ rawText: orderText, parsedItems, destination });
    await newOrder.save();
    io.emit('new_order', newOrder);

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error("AI Parsing Error:", error);
    res.status(500).json({ error: 'Failed to process text order.' });
  }
});

// 3. Get Active Orders
app.get('/api/orders/active', async (req, res) => {
  const activeOrders = await Order.find({ status: { $ne: 'Delivered' } }).sort({ createdAt: 1 });
  res.json(activeOrders);
});

// 4. Update Order Status
app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  io.emit('order_updated', updatedOrder);
  res.json(updatedOrder);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));