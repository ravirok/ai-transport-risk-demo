const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

/**
 * Get AI Core token
 */
async function getAiToken(uaaUrl, clientId, clientSecret) {
  const qs = require("qs");
  const data = qs.stringify({ grant_type: "client_credentials" });

  const response = await axios.post(`${uaaUrl}/oauth/token`, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: {
      username: clientId,
      password: clientSecret
    }
  });

  return response.data.access_token;
}

app.get("/risk", async (req, res) => {
  try {
    // 1️⃣ Mock transport list
    const transportList = [
      {
        id: 355,
        description: "3a3dc51 - Update server.js",
        origin: "AI_NODE",
        owner: "Piper-Pipeline",
        state: "RELEASED"
      },
      {
        id: 342,
        description: "2986e33 - Update server.js",
        origin: "AI_NODE",
        owner: "Piper-Pipeline",
        state: "RELEASED"
      }
    ];

    const transport = transportList[0];

    // 2️⃣ Get AI Core token
    const aiToken = await getAiToken(
      process.env.AI_CORE_UAA_URL,
      process.env.AI_CORE_CLIENT_ID,
      process.env.AI_CORE_CLIENT_SECRET
    );

    // 3️⃣ Check AI Core health
    const aiResponse = await axios.get(`${process.env.AI_API_URL}/v2/health`, {
      headers: { Authorization: `Bearer ${aiToken}` }
    });

    // 4️⃣ Generate risk score
    const riskScore = Math.random().toFixed(2);
    let riskLevel = "LOW";
    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    // 5️⃣ Return JSON
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
