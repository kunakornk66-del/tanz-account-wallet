import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing with a limit for base64 image uploads
  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini AI
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for Kuma OCR Scanner
  app.post("/api/scan-slip", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "กรุณาส่งรูปภาพสลิปที่ต้องการสแกนนะค้าบ" });
      }

      // Check API Key
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "กรุณาเปิดตั้งค่าหรือระบุ GEMINI_API_KEY ก่อนนะค้าบ" });
      }

      // Extract raw base64 data and mimeType
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      let mimeType = "image/png";
      let base64Data = imageBase64;
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      const prompt = `You are Kuma OCR Scanner, a helpful Thai bank slip scanner system.
Analyze the attached Thai bank transfer slip and extract:
1. amount: The transfer amount in Baht (number)
2. date: The transfer date in YYYY-MM-DD format. Check for Buddhist Year (e.g. 2567, 2568, 2569) and convert it to Christian Year (e.g. 2024, 2025, 2026).
3. time: The transfer time in HH:MM format (24-hour format).
4. description: A natural Thai description of the transfer (e.g. "โอนเงินให้ สมชาย", "โอนเงินพร้อมเพย์", "โอนจ่าย ชำระเงิน"). Keep it friendly and concise.
5. type: Must be "expense" or "income" (usually "expense" for transfer slips unless the user specifically has an income slip, default is "expense").
6. bank: The bank or wallet provider name if visible (e.g. "KBANK", "SCB", "Krungthai", "Bangkok Bank", "TTB", "GSB", "TrueMoney", "PromptPay", "Other Bank").

Return strictly valid JSON corresponding to the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Transaction amount in Thai Baht" },
              date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
              time: { type: Type.STRING, description: "Transaction time in HH:MM format" },
              description: { type: Type.STRING, description: "Concise description/memo in Thai" },
              type: { type: Type.STRING, description: "Should be 'expense' or 'income'" },
              bank: { type: Type.STRING, description: "Detected bank name or payment provider" },
            },
            required: ["amount", "date", "time", "description", "type", "bank"],
          }
        }
      });

      const textResult = response.text || "{}";
      const parsed = JSON.parse(textResult);
      res.json(parsed);
    } catch (err: any) {
      console.error("Gemini OCR Error:", err);
      res.status(500).json({ error: err.message || "ไม่สามารถสแกนหรือวิเคราะห์สลิปได้น้า ลองอีกครั้งนะค้าบ" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
