const express = require("express");
const axios = require("axios");
const path = require("path");
 
const app = express();
const port = process.env.PORT || 8080; // Cloud Foundry assigns PORT
 
// Hard-coded credentials
const CLIENT_ID = "sb-5815b58b-c90b-4116-84b8-487862d5bd0c!b519913|alm-ts-backend!b1896";
const CLIENT_SECRET = "76959eb9-a3c7-460e-8ef3-a62f6d1685a6$Klc0xzqacbuzDMiqzcQTSA8t5AokTl0qYS407tJQtXs="; // put actual secret
const TOKEN_URL = "https://hcl-integrationsuite-qxeoz78m.authentication.eu10.hana.ondemand.com/oauth/token";
const CTMS_URL = "https://hcl-integrationsuite-qxeoz78m.ts.cfapps.eu10.hana.ondemand.com/v1/transportRequests";
 
// Endpoint to fetch transports
app.get("/risk", async (req, res) => {
  try {
    const tokenResp = await axios.post(
      TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: CLIENT_ID, password: CLIENT_SECRET }
      }
    );
 
    const token = tokenResp.data.access_token;
 
    const transportsResp = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
 
    res.json(transportsResp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});
 
// Serve Fiori dashboard
app.use(express.static(path.join(__dirname)));
 
app.listen(port, () => console.log(`Server running on port ${port}`));
