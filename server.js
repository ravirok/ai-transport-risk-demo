const express = require("express");
const axios = require("axios");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// ------------------------ Load AI Core key ------------------------
const config = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
const AI_API_URL = config.serviceurls.AI_API_URL;
const ai_api_url = config['serviceurls']['AI_API_URL']; // RBAC fix
const TOKEN_URL = config.url + "/oauth/token";  
const CLIENT_ID = config.clientid;
const CLIENT_SECRET = config.clientsecret;
 
// ------------------------ LM Deployment ------------------------
const LM_DEPLOYMENT_ID = "dd219ec1aca776c3"; // replace with your deployment ID
const RESOURCE_GROUP = "default";
const WORKSPACE = "genai";
 
// ------------------------ Generate Access Token ------------------------
async function getToken() {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return res.data.access_token;
}
 
// ------------------------ Endpoint 1: Check Deployment ------------------------
app.get("/check-deployment", async (req, res) => {
  try {
    const token = await getToken();
    const url = `${ai_api_url}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
    console.log("Checking LM Deployment URL:", url);
 
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "AI-Resource-Group": RESOURCE_GROUP,
        "AI-Workspace": WORKSPACE,
      },
    });
 
    res.json({
      message: "Deployment reachable",
      data: response.data,
    });
  } catch (err) {
    console.error("Deployment CHECK ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || err.message);
  }
});
 
// ------------------------ Endpoint 2: Test AI (POST) ------------------------
// Dynamic input from request body
// { "prompt": "Your text here" }
app.post("/test-ai", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }
 
    const token = await getToken();
    const url = `${ai_api_url}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
    console.log("Calling LM URL (POST with dynamic input):", url);
 
    const response = await axios.post(
      url,
      {
        input: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": RESOURCE_GROUP,
          "AI-Workspace": WORKSPACE,
          "Content-Type": "application/json",
        },
      }
    );
 
    res.json(response.data);
  } catch (err) {
    console.error("LM POST ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || err.message);
  }
});
 
// ------------------------ Start Server (External Access) ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Core server running externally on port ${PORT}`);
});
