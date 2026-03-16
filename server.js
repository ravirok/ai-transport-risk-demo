const express = require("express");
const axios = require("axios");
const xsenv = require("@sap/xsenv");

const app = express();
const port = process.env.PORT || 3000;

// Load bound destinations from BTP
const services = xsenv.getServices({ ctms: { tag: "destination" } });
const ctmsDest = services.ctms;

// Extract credentials and URL
const CTMS_URL = ctmsDest.credentials.URL + "/v1/transportRequests";
const CLIENT_ID = ctmsDest.credentials.clientid;
const CLIENT_SECRET = ctmsDest.credentials.clientsecret;
const TOKEN_URL = ctmsDest.credentials.tokenServiceURL;

app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Get OAuth token using client credentials
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

    // 3️⃣ Return JSON to frontend
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
