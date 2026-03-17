const express = require("express");
const axios = require("axios");
const fs = require("fs");
 
const app = express();
const PORT = process.env.PORT || 3000;
 
/* =========================
   LOAD CONFIG
========================= */
const ctms = JSON.parse(fs.readFileSync("./ctms-key.json"));
const ai = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
/* =========================
   SERVE UI
========================= */
app.use(express.static("public"));
 
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
 
/* =========================
   TOKEN FUNCTION
========================= */
async function getToken(uua) {
  const res = await axios.get(uua.url + "/oauth/token", {
    params: { grant_type: "client_credentials" },
    auth: {
      username: uua.clientid,
      password: uua.clientsecret
    }
  });
  return res.data.access_token;
}
 
/* =========================
   FETCH CTMS
========================= */
async function getTransports() {
  const token = await getToken(ctms.uaa);
 
  const res = await axios.get(`${ctms.uri}/v1/transportRequests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
 
  return res.data;
}
 
/* =========================
   AI CORE CALL
========================= */
async function callAI(transports) {
  try {
    const token = await getToken(ai);
 
    const AI_URL =
      ai.serviceurls.AI_API_URL +
      "/v2/inference/deployments/d8c15a12e70048c1/invocations";
 
    const payload = {
      instances: transports.map(tr => ({
        text: `${tr.description || ""} ${tr.origin || ""}`
      }))
    };
 
    const res = await axios.post(AI_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "AI-Resource-Group": "default",
        "Content-Type": "application/json"
      }
    });
 
    console.log("✅ AI SUCCESS");
    return res.data;
 
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
 
    let aiResult = await callAI(transports);
 
    let finalData;
 
    if (aiResult && aiResult.predictions) {
      finalData = transports.map((tr, i) => ({
        ...tr,
        risk_score: aiResult.predictions[i]?.score || "0.5",
        risk_level: aiResult.predictions[i]?.label || "MEDIUM",
        ai_status: { status: "AI_CORE" }
      }));
    } else {
      finalData = transports.map(tr => ({
        ...tr,
        ...fallbackRisk(tr)
      }));
    }
 
    res.json(finalData);
 
  } catch (err) {
    console.error("❌ ERROR:", err.message);
 
    res.json([
      {
        id: "ERROR",
        description: "System failure",
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
