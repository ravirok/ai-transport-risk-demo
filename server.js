// =========================
// server.js - AI Transport Risk
// =========================
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
 
const app = express();
const PORT = process.env.PORT || 3000;
 
// =========================
// Load Config
// =========================
const ctms = JSON.parse(fs.readFileSync(path.join(__dirname, "ctms-key.json")));
const ai = JSON.parse(fs.readFileSync(path.join(__dirname, "ai-core-key.json")));
 
// =========================
// Serve Frontend
// =========================
app.use(express.static("public"));
 
// =========================
// Get Token Function
// =========================
async function getToken(uua) {
  const tokenUrl = uua.url + "/oauth/token";
 
  const res = await axios.get(tokenUrl, {
    params: { grant_type: "client_credentials" },
    auth: { username: uua.clientid, password: uua.clientsecret },
  });
 
  return res.data.access_token;
}
 
// =========================
// Fetch Transports from CTMS
// =========================
async function getTransports() {
  const token = await getToken(ctms.uaa);
  const res = await axios.get(`${ctms.uri}/v1/transportRequests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data || [];
}
 
// =========================
// Call AI Core / Foundation Model
// =========================
async function callAI(transports) {
  if (!transports.length) return null;
 
  try {
    const token = await getToken(ai);
    const AI_URL = `${ai.serviceurls.AI_API_URL}/v2/completions`; // Foundation model
 
    const payload = {
      model: ai.model_name || "gpt-4", // e.g., gpt-4
      input: transports.map(tr => `${tr.description || ""} ${tr.origin || ""}`)
    };
 
    console.log("➡ Sending to AI Core:", JSON.stringify(payload, null, 2));
 
    const res = await axios.post(AI_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });
 
    console.log("✅ AI Core Response:", JSON.stringify(res.data, null, 2));
    return res.data;
 
  } catch (e) {
    console.error("❌ AI Core Error:", e.response?.data || e.message);
    return null;
  }
}
 
// =========================
// Fallback Risk Scoring
// =========================
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
 
// =========================
// Main API
// =========================
app.get("/risk", async (req, res) => {
  try {
    const transports = await getTransports();
    const aiResult = await callAI(transports);
 
    const finalData = (aiResult && Array.isArray(aiResult.predictions))
      ? transports.map((tr, i) => ({
          ...tr,
          risk_score: aiResult.predictions[i]?.score || "0.5",
          risk_level: aiResult.predictions[i]?.label || "MEDIUM",
          ai_status: { status: "AI_CORE" }
        }))
      : transports.map(tr => ({ ...tr, ...fallbackRisk(tr) }));
 
    res.json(finalData); // Always proper JSON
  } catch (err) {
    console.error("❌ Error in /risk:", err.message);
    res.json([{
      id: "ERROR",
      description: "System failed",
      risk_level: "HIGH",
      risk_score: "1.0",
      ai_status: { status: "SYSTEM_ERROR" }
    }]);
  }
});
 
// =========================
// Start Server
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
 
