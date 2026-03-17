const express = require("express");
const axios = require("axios");
const path = require("path");
const ctmsKey = require("./ctms-key.json"); // CTMS-DEMO-KEY JSON
 
const app = express();
const port = process.env.PORT || 8080;
 
// Extract OAuth info from service key
const CLIENT_ID = ctmsKey.uaa.clientid;
const CLIENT_SECRET = ctmsKey.uaa.clientsecret;
const TOKEN_URL = ctmsKey.uaa.url + "/oauth/token";
const CTMS_URL = ctmsKey.uri + "/ctms/v1/transportRequests";
 
// Endpoint to fetch transport requests
app.get("/risk", async (req, res) => {
  try {
    // Get OAuth token
    const tokenResp = await axios.post(
      TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: CLIENT_ID, password: CLIENT_SECRET }
      }
    );
 
    const token = tokenResp.data.access_token;
 
    // Fetch transports from CTMS
    const transportsResp = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
 
    res.json(transportsResp.data);
  } catch (err) {
    console.error("Error fetching transports:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});
 
// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));
 
app.listen(port, () => console.log(`Server running on port ${port}`));
