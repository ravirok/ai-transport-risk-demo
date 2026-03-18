// server.js without workspace
const express = require("express");
const axios = require("axios");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// ------------------------ Load AI Core key ------------------------
const config = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
const ai_api_url = config.serviceurls.AI_API_URL; // AI Core endpoint
const TOKEN_URL = config.url + "/oauth/token";
const CLIENT_ID = config.clientid;
const CLIENT_SECRET = config.clientsecret;
 
// ------------------------ LM Deployment ------------------------
const LM_DEPLOYMENT_ID = "dd219ec1aca776c3"; // replace with your deployment ID
const RESOURCE_GROUP = "default"; // your resource group
 
// ------------------------ Get Access Token ------------------------
async function getToken() {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return res.data.access_token;
}
 
// ------------------------ GET /check-deployment ------------------------
app.get("/check-deployment", async (req, res) => {
  try {
    const token = await getToken();
    const url = `${ai_api_url}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
 
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "AI-Resource-Group": RESOURCE_GROUP
      },
    });
 
    res.json({ message: "Deployment reachable", data: response.data });
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});
 
// ------------------------ POST /test-ai ------------------------
app.post("/test-ai", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing 'prompt'" });
 
    const token = await getToken();
    const url = `${ai_api_url}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
 
    const response = await axios.post(
      url,
      { input: [{ role: "user", content: prompt }] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": RESOURCE_GROUP,
          "Content-Type": "application/json",
        },
      }
    );
 
    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});
 
// ------------------------ Start Server ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Core server running externally on port ${PORT}`);
});
 
