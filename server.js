const express = require("express");
const axios = require("axios");
const qs = require("qs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// --------------------------------------------
// Get OAuth token (AI Core or Destination)
// --------------------------------------------
async function getToken(tokenUrl, clientId, clientSecret) {
  const data = qs.stringify({ grant_type: "client_credentials" });

  const response = await axios.post(tokenUrl, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: { username: clientId, password: clientSecret }
  });

  return response.data.access_token;
}

// --------------------------------------------
// Fetch transports from CTMS via BTP Destination
// --------------------------------------------
async function fetchTransportsFromDestination() {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");
  const connectivity = vcapServices.connectivity?.[0]?.credentials;

  if (!connectivity) throw new Error("Connectivity service not found in VCAP_SERVICES");

  // Get OAuth token for destination
  const destToken = await getToken(
    connectivity.tokenurl,
    connectivity.clientid,
    connectivity.clientsecret
  );

  // Call CTMS API via destination URL
  const response = await axios.get(`${connectivity.url}/v1/transportRequests`, {
    headers: { Authorization: `Bearer ${destToken}` }
  });

  return response.data.transports || [];
}

// --------------------------------------------
// AI Core Health
// --------------------------------------------
async function fetchAiCoreStatus() {
  const aiToken = await getToken(
    process.env.AI_CORE_UAA_URL,
    process.env.AI_CORE_CLIENT_ID,
    process.env.AI_CORE_CLIENT_SECRET
  );

  const aiResponse = await axios.get(`${process.env.AI_API_URL}/v2/health`, {
    headers: { Authorization: `Bearer ${aiToken}` }
  });

  return aiResponse.data;
}

// --------------------------------------------
// /risk endpoint
// --------------------------------------------
app.get("/risk", async (req, res) => {
  try {
    const transportList = await fetchTransportsFromDestination();

    if (transportList.length === 0) {
      return res.json({ message: "No transports found" });
    }

    const aiStatus = await fetchAiCoreStatus();

    // Add risk score to each transport
    const transportsWithRisk = transportList.map(t => {
      const riskScore = Math.random().toFixed(2);
      let riskLevel = "LOW";
      if (riskScore > 0.7) riskLevel = "HIGH";
      else if (riskScore > 0.4) riskLevel = "MEDIUM";

      return {
        transport_id: t.id,
        description: t.description,
        origin: t.origin,
        owner: t.owner,
        state: t.state,
        risk_score: riskScore,
        risk_level: riskLevel
      };
    });

    res.json({
      transports: transportsWithRisk,
      ai_status: aiStatus
    });

  } catch (err) {
    console.error("Risk Service Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Risk service failed",
      details: err.response?.data || err.message
    });
  }
});

// --------------------------------------------
// Start server
// --------------------------------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
