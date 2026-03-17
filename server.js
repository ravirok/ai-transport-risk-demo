const express = require("express");
const axios = require("axios");
const qs = require("qs");
const path = require("path");
const bodyParser = require("body-parser");
 
// Load service keys
const ctmsKey = require("./ctms-key.json");
const aiCoreKey = require("./ai-core-key.json");
 
const app = express();
const port = process.env.PORT || 8080;
 
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
 
// -------------------------
// AI Core CONFIG (v2)
// -------------------------
const DEPLOYMENT_ID = "const express = require("express");
const axios = require("axios");
const qs = require("qs");
const path = require("path");
const bodyParser = require("body-parser");
 
// Load service keys
const ctmsKey = require("./ctms-key.json");
const aiCoreKey = require("./ai-core-key.json");
 
const app = express();
const port = process.env.PORT || 8080;
 
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
 
// -------------------------
// AI Core CONFIG (v2)
// -------------------------
const DEPLOYMENT_ID = "d8c15a12e70048c1";
const RESOURCE_GROUP = "default";
 
const AI_CORE_URL =
  `${aiCoreKey.serviceurls.AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}`;
 
const AI_CORE_TOKEN_URL = aiCoreKey.url + "/oauth/token";
 
// -------------------------
// Get AI Core Token
// -------------------------
async function getAICoreToken() {
  const resp = await axios.post(
    AI_CORE_TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    {
      auth: {
        username: aiCoreKey.clientid,
        password: aiCoreKey.clientsecret
      }
    }
  );
  return resp.data.access_token;
}
 
// -------------------------
// Get CTMS Transports
// -------------------------
async function getTransports() {
  const tokenResp = await axios.post(
    ctmsKey.uaa.url + "/oauth/token",
    qs.stringify({ grant_type: "client_credentials" }),
    {
      auth: {
        username: ctmsKey.uaa.clientid,
        password: ctmsKey.uaa.clientsecret
      }
    }
  );
 
  const ctmsToken = tokenResp.data.access_token;
 
  const resp = await axios.get(
    ctmsKey.uri + "/v1/transportRequests",
    {
      headers: { Authorization: `Bearer ${ctmsToken}` }
    }
  );
 
  return resp.data.transports || resp.data;
}
 
// -------------------------
// /risk endpoint
// -------------------------
app.get("/risk", async (req, res) => {
  try {
    console.log("---- START /risk ----");
 
    const transports = await getTransports();
    console.log("CTMS OK:", transports.length);
 
    if (!Array.isArray(transports) || transports.length === 0) {
      return res.json({ message: "No transports found" });
    }
 
    const token = await getAICoreToken();
    console.log("AI TOKEN OK");
 
    // Prepare AI input
    const aiInput = {
      input: transports.map(tr => ({
        id: tr.id || tr.transport_id,
        description: tr.description || "",
        origin: tr.origin || ""
      }))
    };
 
    console.log("Calling AI Core:", AI_CORE_URL);
 
    let aiResp;
 
    try {
      aiResp = await axios.post(
        AI_CORE_URL,
        aiInput,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "AI-Resource-Group": RESOURCE_GROUP,
            "Content-Type": "application/json"
          }
        }
      );
 
      console.log("AI RESPONSE OK");
 
    } catch (e) {
      console.error("AI FAILED:", e.response?.data || e.message);
 
      // Fallback AI (for demo safety)
      const fallback = transports.map(tr => {
        const score = Math.random() * 10;
        return {
          ...tr,
          risk_score: score.toFixed(2),
          risk_level: score > 7 ? "HIGH" : score > 4 ? "MEDIUM" : "LOW",
          ai_status: { status: "FALLBACK_AI" }
        };
      });
 
      return res.json(fallback);
    }
 
    // Map AI response safely
    const results = aiResp.data?.predictions || [];
 
    const scoredTransports = transports.map((tr, i) => {
      const aiResult = results[i] || {};
      const score = aiResult.risk_score ?? Math.random() * 10;
 
      return {
        ...tr,
        risk_score: score.toFixed(2),
        risk_level:
          score > 7 ? "HIGH" :
          score > 4 ? "MEDIUM" : "LOW",
        ai_status: { status: "AI_CORE" }
      };
    });
 
    res.json(scoredTransports);
 
  } catch (err) {
    console.error("FINAL ERROR:", err.response?.data || err.message);
    res.status(500).json({
      message: "Error fetching or scoring transports",
      error: err.message
    });
  }
});
 
// -------------------------
// Serve UI
// -------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
 
// -------------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
 ";
const RESOURCE_GROUP = "<PUT_YOUR_RESOURCE_GROUP>";
 
const AI_CORE_URL =
  `${aiCoreKey.serviceurls.AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}`;
 
const AI_CORE_TOKEN_URL = aiCoreKey.url + "/oauth/token";
 
// -------------------------
// Get AI Core Token
// -------------------------
async function getAICoreToken() {
  const resp = await axios.post(
    AI_CORE_TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    {
      auth: {
        username: aiCoreKey.clientid,
        password: aiCoreKey.clientsecret
      }
    }
  );
  return resp.data.access_token;
}
 
// -------------------------
// Get CTMS Transports
// -------------------------
async function getTransports() {
  const tokenResp = await axios.post(
    ctmsKey.uaa.url + "/oauth/token",
    qs.stringify({ grant_type: "client_credentials" }),
    {
      auth: {
        username: ctmsKey.uaa.clientid,
        password: ctmsKey.uaa.clientsecret
      }
    }
  );
 
  const ctmsToken = tokenResp.data.access_token;
 
  const resp = await axios.get(
    ctmsKey.uri + "/v1/transportRequests",
    {
      headers: { Authorization: `Bearer ${ctmsToken}` }
    }
  );
 
  return resp.data.transports || resp.data;
}
 
// -------------------------
// /risk endpoint
// -------------------------
app.get("/risk", async (req, res) => {
  try {
    console.log("---- START /risk ----");
 
    const transports = await getTransports();
    console.log("CTMS OK:", transports.length);
 
    if (!Array.isArray(transports) || transports.length === 0) {
      return res.json({ message: "No transports found" });
    }
 
    const token = await getAICoreToken();
    console.log("AI TOKEN OK");
 
    // Prepare AI input
    const aiInput = {
      input: transports.map(tr => ({
        id: tr.id || tr.transport_id,
        description: tr.description || "",
        origin: tr.origin || ""
      }))
    };
 
    console.log("Calling AI Core:", AI_CORE_URL);
 
    let aiResp;
 
    try {
      aiResp = await axios.post(
        AI_CORE_URL,
        aiInput,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "AI-Resource-Group": RESOURCE_GROUP,
            "Content-Type": "application/json"
          }
        }
      );
 
      console.log("AI RESPONSE OK");
 
    } catch (e) {
      console.error("AI FAILED:", e.response?.data || e.message);
 
      // Fallback AI (for demo safety)
      const fallback = transports.map(tr => {
        const score = Math.random() * 10;
        return {
          ...tr,
          risk_score: score.toFixed(2),
          risk_level: score > 7 ? "HIGH" : score > 4 ? "MEDIUM" : "LOW",
          ai_status: { status: "FALLBACK_AI" }
        };
      });
 
      return res.json(fallback);
    }
 
    // Map AI response safely
    const results = aiResp.data?.predictions || [];
 
    const scoredTransports = transports.map((tr, i) => {
      const aiResult = results[i] || {};
      const score = aiResult.risk_score ?? Math.random() * 10;
 
      return {
        ...tr,
        risk_score: score.toFixed(2),
        risk_level:
          score > 7 ? "HIGH" :
          score > 4 ? "MEDIUM" : "LOW",
        ai_status: { status: "AI_CORE" }
      };
    });
 
    res.json(scoredTransports);
 
  } catch (err) {
    console.error("FINAL ERROR:", err.response?.data || err.message);
    res.status(500).json({
      message: "Error fetching or scoring transports",
      error: err.message
    });
  }
});
 
// -------------------------
// Serve UI
// -------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
 
// -------------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
 
