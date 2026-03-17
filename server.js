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
   SERVE FRONTEND
========================= */
app.use(express.static(path.join(__dirname, "public")));
 
/* =========================
   TOKEN FUNCTION
========================= */
async function getToken(uaa) {
  const res = await axios.get(uaa.url + "/oauth/token", {
    params: { grant_type: "client_credentials" },
    auth: {
      username: uaa.clientid,
      password: uaa.clientsecret
    }
  });
  return res.data.access_token;
}
 
/* =========================
   FETCH CTMS TRANSPORTS
========================= */
async function getTransports() {
  const token = await getToken(ctms.uaa);
 
  const res = await axios.get(
    `${ctms.uri}/v1/transportRequests`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
 
  // Handle different response formats
  return res.data?.transports || res.data || [];
}
 
/* =========================
   AI CORE CALL (GENAI)
========================= */
async function callAI(transports) {
  try {
    const token = await getToken(ai);
 
    // Limit data to avoid token errors
    const limited = transports.slice(0, 5);
 
    const prompt = `
Analyze SAP transports and return ONLY JSON array:
 
[
  {
    "id": "string",
    "risk_score": number (0 to 1),
    "risk_level": "LOW | MEDIUM | HIGH"
  }
]
 
Data:
${JSON.stringify(limited.map(t => ({
  id: t.id || t.transport_id,
  description: t.description || ""
})))}
`;
 
    const res = await axios.post(
      ai.serviceurls.AI_API_URL + "/v2/inference/generate",
      {
        model: "gpt-4",   // adjust if needed
        messages: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": "default",
          "Content-Type": "application/json"
        }
      }
    );
 
    const text = res.data?.choices?.[0]?.message?.content;
 
    console.log("✅ AI RESPONSE:", text);
 
    return JSON.parse(text);
 
  } catch (e) {
    console.error("❌ AI ERROR:", e.response?.data || e.message);
    return null;
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
   MAIN API
========================= */
app.get("/risk", async (req, res) => {
  try {
    const transports = await getTransports();
 
    if (!Array.isArray(transports)) {
      throw new Error("Transport data invalid");
    }
 
    const aiData = await callAI(transports);
 
    let finalData;
 
    if (aiData && Array.isArray(aiData)) {
      // AI SUCCESS
      finalData = transports.map(tr => {
        const match = aiData.find(
          a => a.id == (tr.id || tr.transport_id)
        );
 
        return {
          ...tr,
          risk_score: match?.risk_score || "0.5",
          risk_level: match?.risk_level || "MEDIUM",
          ai_status: { status: "AI_CORE" }
        };
      });
    } else {
      // FALLBACK
      finalData = transports.map(tr => ({
        ...tr,
        ...fallbackRisk(tr)
      }));
    }
 
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
  console.log(`🚀 Server running on port ${PORT}`);
});
