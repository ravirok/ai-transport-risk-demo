const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

/* =========================
   TOKEN GENERATION
========================= */

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

/* =========================
   RISK API
========================= */

app.get("/risk", async (req, res) => {
  try {

    /* 1️⃣ Get OAuth Token */

    const token = await getToken(
      process.env.CTMS_UAA_URL,
      process.env.CTMS_CLIENT_ID,
      process.env.CTMS_CLIENT_SECRET
    );

    /* 2️⃣ Call CTMS API */

    const ctmsResponse = await axios.get(
      `${process.env.CTMS_URL}/v1/transportRequests`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log("CTMS RESPONSE:", JSON.stringify(ctmsResponse.data));

    /* 3️⃣ Extract transports */

    const transports = ctmsResponse.data.transports || [];

    if (!Array.isArray(transports) || transports.length === 0) {
      return res.json({
        message: "No transports found",
        raw_response: ctmsResponse.data
      });
    }

    /* 4️⃣ Add Risk Score */

    const results = transports.map(t => {

      const riskScore = Math.random();
      let riskLevel = "LOW";

      if (riskScore > 0.7) riskLevel = "HIGH";
      else if (riskScore > 0.4) riskLevel = "MEDIUM";

      return {
        transport_id: t.id,
        description: t.description,
        owner: t.owner,
        createdAt: t.createdAt,
        risk_score: riskScore.toFixed(2),
        risk_level: riskLevel
      };
    });

    /* 5️⃣ Return response */

    res.json({
      total_transports: transports.length,
      transports: results
    });

  } catch (error) {

    console.error("Risk Service Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Risk service failed",
      details: error.response?.data || error.message
    });

  }
});

/* =========================
   SERVER START
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
