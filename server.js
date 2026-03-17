const express = require("express");
const axios = require("axios");
const path = require("path");
 
// Read service key JSONs from root
const ctmsKey = require("./ctms-key.json");       // CTMS-DEMO-KEY
const aiCoreKey = require("./ai-core-key.json");  // AI Core service key
 
const app = express();
const port = process.env.PORT || 8080;
 
// -------------------------
// CTMS OAuth / URL
// -------------------------
const CLIENT_ID = ctmsKey.uaa.clientid;
const CLIENT_SECRET = ctmsKey.uaa.clientsecret;
const TOKEN_URL = ctmsKey.uaa.url + "/oauth/token";
const CTMS_URL = ctmsKey.uri + "/v1/transportRequests";
 
// -------------------------
// AI Core endpoint / auth
// -------------------------
const AI_CORE_URL = aiCoreKey.ai_core_endpoint;  // e.g., "https://<ai-core-app>.cfapps.eu10.hana.ondemand.com/predict-risk"
const AI_CORE_TOKEN = aiCoreKey.token;           // Bearer token or API key
 
// -------------------------
// Endpoint: /risk
// -------------------------
app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Get CTMS OAuth token
    const tokenResp = await axios.post(
      TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: CLIENT_ID, password: CLIENT_SECRET }
      }
    );
 
    const token = tokenResp.data.access_token;
 
    // 2️⃣ Fetch transports from CTMS
    const transportsResp = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
 
    const transports = transportsResp.data;
 
    // 3️⃣ Send transports to AI Core for risk scoring
    const aiResp = await axios.post(
      AI_CORE_URL,
      transports,
      { headers: { Authorization: `Bearer ${AI_CORE_TOKEN}`, "Content-Type": "application/json" } }
    );
 
    const scoredTransports = aiResp.data;
 
    // 4️⃣ Return transports with risk scores
    res.json(scoredTransports);
 
  } catch (err) {
    console.error("Error fetching or scoring transports:", err.response?.data || err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});
 
// -------------------------
// Serve static files from 'public' folder
// -------------------------
app.use(express.static(path.join(__dirname, "public")));
 
// -------------------------
// Start server
// -------------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
 
