const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Read your destination URL and credentials from env
const CTMS_URL = process.env.CTMS_URL; // must include /v1/transportRequests
const CTMS_TOKEN_URL = process.env.CTMS_UAA_URL + "/oauth/token";
const CLIENT_ID = process.env.CTMS_CLIENT_ID;
const CLIENT_SECRET = process.env.CTMS_CLIENT_SECRET;

app.get("/risk", async (req, res) => {
  try {
    // get OAuth token
    const tokenResp = await axios.post(
      CTMS_TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: CLIENT_ID, password: CLIENT_SECRET }
      }
    );

    const token = tokenResp.data.access_token;

    // get transport requests
    const transports = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(transports.data);
  } catch (err) {
    console.error("Error fetching transports:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
