# CanteenExpress 🍛🎙️

A real-time, voice-first ordering system built to help teachers skip the queue at the PICT canteen. Instead of fumbling with menus, just speak your order and let the AI handle the rest.

## How it works
1. **Voice Input:** Teachers record their order naturally (e.g., "Give me two chais and one poha... wait, make it three chais").
2. **AI Processing:** - **Whisper-large-v3 (via Groq):** Transcribes audio with near-zero latency.
   - **Llama-3.1-8b (via Groq):** Standardizes food names, fixes typos, and groups duplicate items into a clean JSON structure.
3. **Real-time Dashboard:** The kitchen staff sees the order appear instantly via WebSockets—no refreshing required.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Real-time:** Socket.io
- **AI Inference:** Groq LPU (Whisper + Llama 3.1)

## Future Scope
- **Auth:** Authentication specifically for PICT faculty.
- **Payments:** Monthly "tab" system or UPI integration.
- **Confirmation:** Text-to-Speech loop to read back orders before they are finalized.

---
*Built for the Activate AI Fellowship.*
