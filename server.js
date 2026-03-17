const express = require("express");
const axios = require("axios");
const path = require("path");
 
const app = express();
const port = process.env.PORT || 8080; // Cloud Foundry assigns PORT
 
// Hard-coded credentials
const CLIENT_ID = "sb-ddf0bce3-5cdc-4acd-a625-ac4baac0cdcc!b519913|alm-ts-backend!b1896";
const CLIENT_SECRET = "5236aeb1-1ab7-4966-89c1-98ba7af62b20$rmnJPclZPUV5R-6MTvoFrY6n7DNUYra7lakkIA18Gdk="; // put actual secret
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
