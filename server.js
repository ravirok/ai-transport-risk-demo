const express = require("express");
const axios = require("axios");
const qs = require("qs");
const path = require("path");
const bodyParser = require("body-parser");
 
// Load service keys
const ctmsKey = require("./ctms-key.json");       // CTMS service key
const aiCoreKey = require("./ai-core-key.json");  // AI Core service key
 
const app = express();
const port = process.env.PORT || 8080;
 
// -------------------------
// Middleware
// -------------------------
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve public folder
 
// -------------------------
// AI Core config
// -------------------------
const AI_CORE_URL = aiCoreKey.serviceurls.AI_API_URL + "/v1/predict";
const AI_CORE_CLIENT_ID = aiCoreKey.clientid;
const AI_CORE_CLIENT_SECRET = aiCoreKey.clientsecret;
const AI_CORE_TOKEN_URL = aiCoreKey.url + "/oauth/token";
 
// -------------------------
// Helper: fetch AI Core token
// -------------------------
async function getAICoreToken() {
  const resp = await axios.post(
    AI_CORE_TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    { auth: { username: AI_CORE_CLIENT_ID, password: AI_CORE_CLIENT_SECRET } }
  );
  return resp.data.access_token;
}
 
// -------------------------
// Helper: fetch transports from CTMS
// -------------------------
async function getTransports() {
  const tokenResp = await axios.post(
    ctmsKey.uaa.url + "/oauth/token",
    qs.stringify({ grant_type: "client_credentials" }),
    { auth: { username: ctmsKey.uaa.clientid, password: ctmsKey.uaa.clientsecret } }
  );
  const ctmsToken = tokenResp.data.access_token;
 
  const resp = await axios.get(ctmsKey.uri + "/v1/transportRequests", {
    headers: { Authorization: `Bearer ${ctmsToken}` }
  });
 
  return resp.data.transports || resp.data;
}
 
// -------------------------
// Endpoint: GET /risk
// -------------------------
app.get("/risk", async (req, res) => {
  try {
    // Fetch transports
    const transports = await getTransports();
    if (!Array.isArray(transports) || transports.length === 0)
      return res.json({ message: "No transports found" });
 
    // Fetch AI Core token
    const token = await getAICoreToken();
 
    // Call AI Core scoring
    const aiResp = await axios.post(
      AI_CORE_URL,
      transports,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
 
    // Merge AI results
    const scoredTransports = transports.map((tr, i) => {
      const aiResult = aiResp.data[i] || {};
      const riskScore = aiResult.risk_score ?? 0;
      const riskLevel = aiResult.risk_level || (riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : "LOW");
      return { ...tr, risk_score: riskScore, risk_level: riskLevel, ai_status: aiResult.ai_status || { status: "OK" } };
    });
 
    res.json(scoredTransports);
 
  } catch (err) {
    console.error("Error fetching or scoring transports:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching or scoring transports", error: err.message });
  }
});
 
// -------------------------
// Serve index.html at root
// -------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
 
// -------------------------
// Start server
// -------------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
 
