import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "กรุณาส่งรูปภาพสลิปที่ต้องการสแกนนะค้าบ" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "กรุณาระบุ GEMINI_API_KEY ใน Vercel Environment Variables ก่อนนะค้าบ" });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

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
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error("Vercel Gemini OCR Error:", err);
    return res.status(500).json({ error: err.message || "ไม่สามารถสแกนหรือวิเคราะห์สลิปได้น้า ลองอีกครั้งนะค้าบ" });
  }
}
