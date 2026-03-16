const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

/**
 * Helper: Fetch transports from CTMS using Basic Auth
 */
async function getTransports() {
  const response = await axios.get(
    "https://hcl-integrationsuite-qxeoz78m.ts.cfapps.eu10.hana.ondemand.com/v1/transportRequests",
    {
      auth: {
        username: process.env.BASIC_USER,
        password: process.env.BASIC_PASS
      }
    }
  );
  return response.data.transports || [];
}

/**
 * Helper: Get AI Core token using client credentials
 */
async function getAiToken() {
  const response = await axios.post(
    `${process.env.AI_CORE_UAA_URL}/oauth/token`,
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: {
        username: process.env.AI_CORE_CLIENT_ID,
        password: process.env.AI_CORE_CLIENT_SECRET
      }
    }
  );
  return response.data.access_token;
}

/**
 * Risk endpoint
 */
app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Fetch transports from CTMS
    const transportList = await getTransports();

    if (transportList.length === 0) {
      return res.json({
        message: "No transports found"
      });
    }

    const transportId = transportList[0].id || transportList[0].transportRequestId || "UNKNOWN";

    // 2️⃣ Get AI Core token
    const aiToken = await getAiToken();

    // 3️⃣ Call AI Core health endpoint (demo)
    const aiResponse = await axios.get(`${process.env.AI_CORE_URL}/v2/health`, {
      headers: { Authorization: `Bearer ${aiToken}` }
    });

    // 4️⃣ Generate random risk score for demo
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
