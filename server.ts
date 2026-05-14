import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/nutrition/explain", async (req, res) => {
    try {
      const { childData, statusResults } = req.body;
      
      const prompt = `
        Sebagai ahli gizi anak profesional menggunakan sistem BaPau GinBal (Barcode Pemantauan Gizi Anak Balita), berikan penjelasan singkat dan saran praktis untuk hasil status gizi balita berikut:
        
        Data Balita:
        - Nama: ${childData.name}
        - Jenis Kelamin: ${childData.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
        - Umur: ${childData.ageMonths} bulan
        - Berat Badan: ${childData.weight} kg
        - Tinggi/Panjang Badan: ${childData.height} cm
        
        Hasil Status Gizi (Standar Kemenkes):
        - BB/U (Berat Badan menurut Umur): ${statusResults.weightForAge.category}
        - TB/U (Tinggi Badan menurut Umur): ${statusResults.heightForAge.category}
        - BB/TB (Berat Badan menurut Tinggi Badan): ${statusResults.weightForHeight.category}
        
        Tolong berikan:
        1. Ringkasan singkat kondisi gizi anak.
        2. Rekomendasi langkah selanjutnya (makanan, konsultasi medis, pola asuh).
        3. Pesan penyemangat untuk orang tua.
        
        Gunakan bahasa Indonesia yang ramah, jelas, dan mudah dimengerti. Format menggunakan Markdown.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ explanation: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Spreadsheet Recap Logic
  app.post("/api/nutrition/recap", async (req, res) => {
    try {
      const data = req.body;
      const WEBHOOK_URL = process.env.SPREADSHEET_WEBHOOK;

      if (WEBHOOK_URL) {
        console.log("Sending data to real spreadsheet webhook...");
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`Webhook responded with status ${response.status}`);
        }
      } else {
        console.log("Recapping data (Mock - No WEBHOOK_URL configured):", data);
      }
      
      res.json({ 
        success: true, 
        message: WEBHOOK_URL ? "Data berhasil disinkronkan ke spreadsheet." : "Data terekap secara lokal (Webhook belum dikonfigurasi)." 
      });
    } catch (error: any) {
      console.error("Recap Error:", error);
      res.status(500).json({ error: error.message });
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
