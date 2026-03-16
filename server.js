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
  try {
    const data = qs.stringify({ grant_type: "client_credentials" });
    const response = await axios.post(tokenUrl, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: clientId, password: clientSecret },
    });
    return response.data.access_token;
  } catch (err) {
    console.error("Error fetching token:", err.response?.data || err.message);
    throw new Error("Token fetch failed");
  }
}

// --------------------------------------------
// Fetch transports from CTMS via BTP Connectivity
// --------------------------------------------
async function fetchTransportsFromDestination() {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");
  const connectivity = vcapServices.connectivity?.[0]?.credentials;

  if (!connectivity) throw new Error("Connectivity service not found in VCAP_SERVICES");

  console.log("Using Connectivity service URL:", connectivity.url);

  // Verify the URL looks correct
  if (!connectivity.url.includes("/v1/transportRequests")) {
    throw new Error(
      "Destination URL invalid. Must point directly to /v1/transportRequests"
    );
  }

  // Get OAuth token for destination
  const destToken = await getToken(
    connectivity.tokenurl,
    connectivity.clientid,
    connectivity.clientsecret
  );

  // Call CTMS API via destination URL
  try {
    const response = await axios.get(connectivity.url, {
      headers: { Authorization: `Bearer ${destToken}` },
    });
    console.log("CTMS raw response:", response.data);
    return response.data.transports || [];
  } catch (err) {
    console.error("Error calling CTMS API:", err.response?.data || err.message);
    throw new Error("CTMS API call failed");
  }
}

// --------------------------------------------
// Fetch AI Core status
// --------------------------------------------
async function fetchAiCoreStatus() {
  const aiToken = await getToken(
    process.env.AI_CORE_UAA_URL,
    process.env.AI_CORE_CLIENT_ID,
    process.env.AI_CORE_CLIENT_SECRET
  );

  const aiResponse = await axios.get(`${process.env.AI_API_URL}/v2/health`, {
    headers: { Authorization: `Bearer ${aiToken}` },
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

    const transportsWithRisk = transportList.map((t) => {
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
        risk_level: riskLevel,
      };
    });

    res.json({
      transports: transportsWithRisk,
      ai_status: aiStatus,
    });
  } catch (err) {
    console.error("Risk Service Error:", err.message);
    res.status(500).json({
      error: "Risk service failed",
      details: err.message,
    });
  }
});

// --------------------------------------------
// Start server
// --------------------------------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
