const express = require("express");
const axios = require("axios");
const path = require("path");
const qs = require("qs");
 
// -------------------------
// Load service keys
// -------------------------
const ctmsKey = require("./ctms-key.json");
const aiCoreKey = require("./ai-core-key.json");
 
const app = express();
const port = process.env.PORT || 8080;
 
// -------------------------
// CTMS config
// -------------------------
const CTMS_CLIENT_ID = ctmsKey.uaa.clientid;
const CTMS_CLIENT_SECRET = ctmsKey.uaa.clientsecret;
const CTMS_TOKEN_URL = ctmsKey.uaa.url + "/oauth/token";
const CTMS_URL = ctmsKey.uri + "/v1/transportRequests";
 
// -------------------------
// AI Core config
// -------------------------
const AI_CORE_URL = aiCoreKey.serviceurls.AI_API_URL;
const AI_CORE_CLIENT_ID = aiCoreKey.clientid;
const AI_CORE_CLIENT_SECRET = aiCoreKey.clientsecret;
const AI_CORE_TOKEN_URL = aiCoreKey.url + "/oauth/token";
 
// -------------------------
// Helper: fetch OAuth token
// -------------------------
async function getOAuthToken(clientId, clientSecret, tokenUrl) {
  const resp = await axios.post(
    tokenUrl,
    qs.stringify({ grant_type: "client_credentials" }),
    { auth: { username: clientId, password: clientSecret } }
  );
  return resp.data.access_token;
}
 
// -------------------------
// /risk endpoint
// -------------------------
app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Get CTMS token
    const ctmsToken = await getOAuthToken(CTMS_CLIENT_ID, CTMS_CLIENT_SECRET, CTMS_TOKEN_URL);
 
    // 2️⃣ Fetch transports from CTMS
    const ctmsResp = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${ctmsToken}`, Accept: "application/json" }
    });
    const transports = Array.isArray(ctmsResp.data) ? ctmsResp.data : [ctmsResp.data];
 
    if (!transports.length) return res.json([]);
 
    // 3️⃣ Get AI Core token
    const aiCoreToken = await getOAuthToken(AI_CORE_CLIENT_ID, AI_CORE_CLIENT_SECRET, AI_CORE_TOKEN_URL);
 
    // 4️⃣ Map CTMS transports to AI Core expected input
    const aiInput = transports.map(tr => ({
      id: tr.id || tr.transport_id,
      description: tr.description || "",
      origin: tr.origin || ""
    }));
 
    // 5️⃣ Call AI Core scoring endpoint
    const aiResp = await axios.post(
      AI_CORE_URL,
      aiInput,
      { headers: { Authorization: `Bearer ${aiCoreToken}`, "Content-Type": "application/json" } }
    );
 
    // 6️⃣ Merge AI Core results with original CTMS fields
    const scoredTransports = transports.map((tr, i) => {
      const aiResult = aiResp.data[i] || {};
      const riskScore = aiResult.risk_score !== undefined ? aiResult.risk_score : 0;
      const riskLevel = aiResult.risk_level || (riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : "LOW");
      return {
        ...tr,
        risk_score: riskScore,
        risk_level: riskLevel,
        ai_status: aiResult.ai_status || { status: "OK" }
      };
    });
 
    res.json(scoredTransports);
 
  } catch (err) {
    console.error("Error fetching or scoring transports:", err.response?.data || err.message);
    if (err.response) res.status(err.response.status).json(err.response.data);
    else res.status(500).json({ error: err.message });
  }
});
 
// -------------------------
// Serve static files from /public
// -------------------------
app.use(express.static(path.join(__dirname, "public")));
 
// -------------------------
// Start server
// -------------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
