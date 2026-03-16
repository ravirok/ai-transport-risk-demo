const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

async function getToken(uaaUrl, clientId, clientSecret) {

  const response = await axios.post(
    `${uaaUrl}/oauth/token`,
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    console.log("Fetching CTMS token...");

    const ctmsToken = await getToken(
      process.env.CTMS_UAA_URL,
      process.env.CTMS_CLIENT_ID,
      process.env.CTMS_CLIENT_SECRET
    );

    console.log("Token received");

    console.log("Calling CTMS transport API...");

    const transports = await axios.get(
      `${process.env.CTMS_URL}/v1/transportRequests`,
      {
        headers: {
          Authorization: `Bearer ${ctmsToken}`
        }
      }
    );

    console.log("CTMS response received");

    // FIXED PART
    const transportList = Array.isArray(transports.data)
      ? transports.data
      : transports.data.transports || [];

    if (transportList.length === 0) {
      return res.json({
        message: "No transports found"
      });
    }

    const transportId =
      transportList[0].id ||
      transportList[0].transportRequestId ||
      "UNKNOWN";

    // Demo Risk
    const riskScore = Math.random().toFixed(2);

    let riskLevel = "LOW";

    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    res.json({
      transport_id: transportId,
      risk_score: riskScore,
      risk_level: riskLevel
    });

  } catch (error) {

    console.error("Risk Service Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Risk service failed",
      details: error.response?.data || error.message
    });

  }

});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
