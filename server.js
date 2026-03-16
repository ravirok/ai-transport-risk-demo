const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

/*
Environment Variables (from manifest)

AI_CORE_CLIENT_ID
AI_CORE_CLIENT_SECRET
AI_CORE_UAA_URL
AI_CORE_URL

CTMS_CLIENT_ID
CTMS_CLIENT_SECRET
CTMS_UAA_URL
CTMS_URL
*/

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

    // Step 1 - Get CTMS Token
    const ctmsToken = await getToken(
      process.env.CTMS_UAA_URL,
      process.env.CTMS_CLIENT_ID,
      process.env.CTMS_CLIENT_SECRET
    );

    // Step 2 - Fetch Transport Requests
    const transports = await axios.get(
      `${process.env.CTMS_URL}/v1/transportRequests`,
      {
        headers: {
          Authorization: `Bearer ${ctmsToken}`
        }
      }
    );

    const transportList = transports.data;

    if (!transportList || transportList.length === 0) {
      return res.json({
        message: "No transports found"
      });
    }

    const transportId = transportList[0].id || "UNKNOWN";

    // Step 3 - Call AI Core
    const aiToken = await getToken(
      process.env.AI_CORE_UAA_URL,
      process.env.AI_CORE_CLIENT_ID,
      process.env.AI_CORE_CLIENT_SECRET
    );

    const aiResponse = await axios.get(
      `${process.env.AI_CORE_URL}/v2/health`,
      {
        headers: {
          Authorization: `Bearer ${aiToken}`
        }
      }
    );

    // Step 4 - Generate Risk Score
    const riskScore = Math.random().toFixed(2);

    let riskLevel = "LOW";

    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    res.json({
      transport_id: transportId,
      risk_score: riskScore,
      risk_level: riskLevel,
      ai_status: aiResponse.data
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
