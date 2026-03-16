// server.js
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Utility function to fetch OAuth token from Connectivity service
async function getToken(tokenUrl, clientId, clientSecret) {
  const response = await axios.post(
    tokenUrl,
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
    // --- 1️⃣ Read Connectivity Service from VCAP_SERVICES ---
    const vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
    if (!vcap.connectivity || vcap.connectivity.length === 0) {
      throw new Error("Connectivity service not found in VCAP_SERVICES");
    }

    const conn = vcap.connectivity[0].credentials;
    console.log("Using CTMS URL:", conn.url);
    console.log("Token URL:", conn.tokenurl);

    // --- 2️⃣ Get OAuth Token ---
    const token = await getToken(conn.tokenurl, conn.clientid, conn.clientsecret);
    console.log("Token fetched successfully");

    // --- 3️⃣ Call CTMS /v1/transportRequests ---
    const transportsRes = await axios.get(conn.url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("CTMS Response:", transportsRes.data);

    const transportList = transportsRes.data.transports || [];
    if (transportList.length === 0) {
      return res.json({
        message: "No transports found",
        raw_response: transportsRes.data
      });
    }

    const transportId = transportList[0].id || transportList[0].transportRequestId || "UNKNOWN";

    // --- 4️⃣ Generate demo risk score ---
    const riskScore = Math.random().toFixed(2);
    let riskLevel = "LOW";
    if (riskScore > 0.7) riskLevel = "HIGH";
    else if (riskScore > 0.4) riskLevel = "MEDIUM";

    res.json({
      transport_id: transportId,
      risk_score: riskScore,
      risk_level: riskLevel,
      transport_count: transportList.length
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
  console.log(`Server running on port ${PORT}`);
});
