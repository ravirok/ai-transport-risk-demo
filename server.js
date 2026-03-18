// =========================
// AI Transport Risk Dashboard - Deployment आधारित
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
// Get Token
// =========================
async function getToken(uaa) {
  const tokenUrl = uaa.url + "/oauth/token";

  const res = await axios.get(tokenUrl, {
    params: { grant_type: "client_credentials" },
    auth: {
      username: uaa.clientid,
      password: uaa.clientsecret
    }
  });

  return res.data.access_token;
}

// =========================
// Fetch Transports
// =========================
async function getTransports() {
  const token = await getToken(ctms.uaa);

  const res = await axios.get(`${ctms.uri}/v1/transportRequests`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // Ensure array
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.transports) return res.data.transports;

  return [];
}

// =========================
// AI CORE CALL (DEPLOYMENT)
// =========================
async function callAI(transports) {
  if (!Array.isArray(transports) || transports.length === 0) {
    console.log("⚠ No transports to send");
    return null;
  }

  try {
    const token = await getToken(ai.uaa);

    const AI_URL =
      `${ai.serviceurls.AI_API_URL}` +
      `/v2/inference/deployments/d986abe0ffe5cff8/invocations`;

    const payload = {
      input: transports.map(tr => ({
        text: `${tr.description || ""} ${tr.origin || ""}`
      }))
    };

    console.log("➡ Sending to AI Core:", JSON.stringify(payload, null, 2));

    const res = await axios.post(AI_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "AI-Resource-Group": "default", // 🔥 CHANGE if different
        "Content-Type": "application/json"
      }
    });

    console.log("✅ AI Response:", JSON.stringify(res.data, null, 2));

    return res.data;

  } catch (e) {
    console.error("❌ AI ERROR:", e.response?.data || e.message);
    return null; // fallback
  }
}

// =========================
// FALLBACK LOGIC
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
// MAIN API
// =========================
app.get("/risk", async (req, res) => {
  try {
    const transports = await getTransports();
    console.log("📦 Transports fetched:", transports.length);

    const aiResult = await callAI(transports);

    let finalData;

    // Adjust parsing depending on AI response
    if (aiResult && aiResult.predictions) {
      finalData = transports.map((tr, i) => ({
        ...tr,
        risk_score: aiResult.predictions[i]?.score || "0.5",
        risk_level: aiResult.predictions[i]?.label || "MEDIUM",
        ai_status: { status: "AI_CORE" }
      }));
    } else {
      console.log("⚠ Using fallback scoring");
      finalData = transports.map(tr => ({
        ...tr,
        ...fallbackRisk(tr)
      }));
    }

    res.json(finalData);

  } catch (err) {
    console.error("❌ MAIN ERROR:", err.message);

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
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
