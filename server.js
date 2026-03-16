const express = require("express");
const axios = require("axios");
const qs = require("qs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

/**
 * Get OAuth token using client credentials (for XSUAA / CTMS or AI Core)
 */
async function getToken(uaaUrl, clientId, clientSecret) {
  try {
    const data = qs.stringify({ grant_type: "client_credentials" });

    const response = await axios.post(`${uaaUrl}/oauth/token`, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: {
        username: clientId,
        password: clientSecret
      }
    });

    return response.data.access_token;
  } catch (err) {
    console.error("Token fetch error:", err.response?.data || err.message);
    throw err;
  }
}

app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Get CTMS token
    const ctmsToken = await getToken(
      process.env.CTMS_UAA_URL,
      process.env.CTMS_CLIENT_ID,
      process.env.CTMS_CLIENT_SECRET
    );

    // 2️⃣ Fetch transport requests from CTMS
    const transportsResponse = await axios.get(
      `${process.env.CTMS_URL}/v1/transportRequests`,
      {
        headers: { Authorization: `Bearer ${ctmsToken}` }
      }
    );

    const transportList = transportsResponse.data.transports || [];

    if (transportList.length === 0) {
      return res.json({
        message: "No transports found",
        raw_response: transportsResponse.data
      });
    }

    // Take the first transport for demo
    const transport = transportList[0];

    // 3️⃣ Get AI Core token
    const aiToken = await getToken(
      process.env.AI_CORE_UAA_URL,
      process.env.AI_CORE_CLIENT_ID,
      process.env.AI_CORE_CLIENT_SECRET
    );

    // 4️⃣ Check AI Core health (optional)
    const aiResponse = await axios.get(`${process.env.AI_API_URL}/v2/health`, {
      headers: { Authorization: `Bearer ${aiToken}` }
    });

    // 5️⃣ Generate demo risk score
    const riskScore = Math.random().toFixed(2);
    let riskLevel = "LOW";
    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    // 6️⃣ Return JSON
    res.json({
      transport_id: transport.id,
      description: transport.description,
      origin: transport.origin,
      owner: transport.owner,
      state: transport.state,
      risk_score: riskScore,
      risk_level: riskLevel,
      ai_status: aiResponse.data
    });

  } catch (err) {
    console.error("Risk Service Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Risk service failed",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
