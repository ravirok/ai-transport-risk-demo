const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Env variables (set these in BTP Cockpit)
const CTMS_URL = process.env.CTMS_URL + "/v1/transportRequests"; // API URL
const TOKEN_URL = process.env.CTMS_UAA_URL + "/oauth/token";      // token endpoint
const CLIENT_ID = process.env.CTMS_CLIENT_ID;
const CLIENT_SECRET = process.env.CTMS_CLIENT_SECRET;

// /risk endpoint
app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Get OAuth token
    const tokenResp = await axios.post(
      TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: CLIENT_ID, password: CLIENT_SECRET }
      }
    );

    const token = tokenResp.data.access_token;
    if (!token) return res.status(500).json({ error: "No access token received" });

    // 2️⃣ Call CTMS transport API
    const transportsResp = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 3️⃣ Return JSON
    res.json(transportsResp.data);
  } catch (err) {
    console.error("Error fetching transports:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("AI Transport Risk Demo Backend Running");
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
