const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
 
const app = express();
const PORT = process.env.PORT || 3000;
 
/* =========================
   LOAD CONFIG FILES
========================= */
const ctms = JSON.parse(fs.readFileSync("./ctms-key.json"));
const ai = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
/* =========================
   SERVE FRONTEND (SUBPATH SAFE)
========================= */
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
 
/* =========================
   GET UAA TOKEN FUNCTION
========================= */
async function getToken(uua) {
  const tokenUrl = `${uua.url}/oauth/token`;
  const res = await axios.post(
    tokenUrl,
    "grant_type=client_credentials",
    {
      auth: {
        username: uua.clientid,
        password: uua.clientsecret
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
  );
  return res.data.access_token;
}
 
/* =========================
   FETCH CTMS TRANSPORTS
========================= */
async function getTransports() {
  const token = await getToken(ctms.uaa);
  const res = await axios.get(`${ctms.uri}/v1/transportRequests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
 
/* =========================
   AI RISK SCORING (Foundation GPT / Gemini)
========================= */
async function callAI(transports) {
  try {
    const token = await getToken(ai);
 
    const AI_URL = `${ai.serviceurls.AI_API_URL}/v2/completions`;
 
    const finalResults = [];
 
    for (const tr of transports) {
      const payload = {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a transport risk analyst." },
          {
            role: "user",
            content: `Analyze transport risk. Description: "${tr.description || ""}", Origin: "${tr.origin || ""}". Respond JSON: { "risk_level": "LOW|MEDIUM|HIGH", "risk_score": 0-1 }`
          }
        ],
        max_tokens: 50
      };
 
      const res = await axios.post(AI_URL, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
 
      // Parse GPT response JSON safely
      let aiData;
      try {
        aiData = JSON.parse(res.data.choices[0].message.content);
      } catch (e) {
        aiData = null;
      }
 
      finalResults.push({
        ...tr,
        risk_score: aiData?.risk_score?.toFixed(2) || 0.3,
        risk_level: aiData?.risk_level || "LOW",
        ai_status: { status: aiData ? "AI_CORE" : "FALLBACK_AI" }
      });
    }
 
    return finalResults;
 
  } catch (e) {
    console.error("❌ AI ERROR:", e.response?.data || e.message);
    return null; // trigger fallback
  }
}
 
/* =========================
   FALLBACK LOGIC
========================= */
function fallbackRisk(tr) {
  let score = 0.3;
  const text = (tr.description || "").toLowerCase();
  if (text.includes("urgent")) score += 0.3;
  if (text.includes("prod")) score += 0.3;
  if (text.includes("bug")) score += 0.2;
  if (text.includes("hotfix")) score += 0.4;
  if (score > 1) score = 1;
 
  let level = "LOW";
  if (score > 0.7) level = "HIGH";
  else if (score > 0.4) level = "MEDIUM";
 
  return {
    risk_score: score.toFixed(2),
    risk_level: level,
    ai_status: { status: "FALLBACK_AI" }
  };
}
 
/* =========================
   MAIN /risk API
========================= */
app.get("/risk", async (req, res) => {
  try {
    const transports = await getTransports();
    let aiResult = await callAI(transports);
 
    let finalData = aiResult
      ? aiResult
      : transports.map(tr => ({
          ...tr,
          ...fallbackRisk(tr)
        }));
 
    res.json(finalData);
  } catch (err) {
    console.error("❌ MAIN ERROR:", err.message);
    res.json([
      {
        id: "ERROR",
        description: "System failed",
        risk_level: "HIGH",
        risk_score: "1.0",
        ai_status: { status: "SYSTEM_ERROR" }
      }
    ]);
  }
});
 
/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
