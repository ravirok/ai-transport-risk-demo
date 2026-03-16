const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// Disable caching (prevents 304 issue)
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

async function getToken(uaaUrl, clientId, clientSecret) {

  const response = await axios.post(
    `${uaaUrl}/oauth/token`,
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      auth: {
        username: clientId,
        password: clientSecret
      }
    }
  );

  return response.data.access_token;
}

app.get("/risk", async (req, res) => {

  try {

    console.log("Getting CTMS token...");

    const ctmsToken = await getToken(
      process.env.CTMS_UAA_URL,
      process.env.CTMS_CLIENT_ID,
      process.env.CTMS_CLIENT_SECRET
    );

    console.log("Fetching transport requests...");

    const response = await axios.get(
      `${process.env.CTMS_URL}/v1/transportRequests`,
      {
        headers: {
          Authorization: `Bearer ${ctmsToken}`
        }
      }
    );

    console.log("CTMS RESPONSE:", JSON.stringify(response.data));

    // Handle multiple CTMS response formats
    let transports = [];

    if (Array.isArray(response.data)) {
      transports = response.data;
    }
    else if (Array.isArray(response.data.transports)) {
      transports = response.data.transports;
    }
    else if (Array.isArray(response.data.content)) {
      transports = response.data.content;
    }

    if (!transports.length) {

      return res.json({
        message: "No transports found",
        raw_response: response.data
      });

    }

    // Create risk for each transport
    const results = transports.map((t) => {

      const id =
        t.id ||
        t.transportRequestId ||
        t.transportId ||
        "UNKNOWN";

      const riskScore = Math.random().toFixed(2);

      let riskLevel = "LOW";

      if (riskScore > 0.7) riskLevel = "HIGH";
      else if (riskScore > 0.4) riskLevel = "MEDIUM";

      return {
        transport_id: id,
        risk_score: riskScore,
        risk_level: riskLevel
      };

    });

    res.json({
      total_transports: results.length,
      transports: results
    });

  } catch (error) {

    console.error("Risk Service Error:", error.message);

    res.status(500).json({
      error: "Risk service failed",
      details: error.message
    });

  }

});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
