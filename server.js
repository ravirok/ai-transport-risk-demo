const express = require("express");
const axios = require("axios");
const qs = require("qs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// --------------------------------------------
// Helper: Get OAuth token (AI Core or Destination)
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
  // Read VCAP_SERVICES for Connectivity
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");
  const connectivity = vcapServices.connectivity?.[0]?.credentials;

  if (!connectivity) throw new Error("Connectivity service not found in VCAP_SERVICES");

  // 1️⃣ Get token for the destination
  const destToken = await getToken(
    connectivity.tokenServiceURL,
    connectivity.clientId,
    connectivity.clientSecret
  );

  // 2️⃣ Fetch transports
  const response = await axios.get(`${connectivity.url}/v1/transportRequests`, {
    headers: { Authorization: `Bearer ${destToken}` }
  });

  return response.data.transports || [];
}

// --------------------------------------------
// AI Core Health check
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
    // Fetch transports from BTP destination
    const transportList = await fetchTransportsFromDestination();

    if (transportList.length === 0) {
      return res.json({ message: "No transports found", raw_response: transportList });
    }

    const transport = transportList[0]; // take the first transport

    // Fetch AI Core status
    const aiStatus = await fetchAiCoreStatus();

    // Generate demo risk score
    const riskScore = Math.random().toFixed(2);
    let riskLevel = "LOW";
    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    // Respond with structured JSON
    res.json({
      transport_id: transport.id,
      description: transport.description,
      origin: transport.origin,
      owner: transport.owner,
      state: transport.state,
      risk_score: riskScore,
      risk_level: riskLevel,
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
