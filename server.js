const express = require("express");
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// 🔹 Load AI Core key JSON
const key = JSON.parse(fs.readFileSync("./ai-core-key.json", "utf8"));
 
// 🔹 Config
const AI_API_URL = key.serviceurls.AI_API_URL;
const TOKEN_URL = key.url + "/oauth/token";
const CLIENT_ID = key.clientid;
const CLIENT_SECRET = key.clientsecret;
 
const DEPLOYMENT_ID = "dd219ec1aca776c3"; // Replace with your deployment ID
const RESOURCE_GROUP = "default";          // Replace with your resource group
const WORKSPACE = "genai";                 // Explicit workspace header
 
// 🔐 Get OAuth Token
async function getToken() {
  const res = await axios.post(
    TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      }
    }
  );
  return res.data.access_token;
}
 
// 🚀 Test AI endpoint
app.get("/test-ai", async (req, res) => {
  try {
    console.log("🚀 Calling AI Core...");
 
    const token = await getToken();
 
    const url = `${AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}/predict`;
    console.log("👉 URL:", url);
 
    const response = await axios.post(
      url,
      {
        input: {
          prompt: "Hello from SAP AI Core"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": RESOURCE_GROUP,
          "AI-Workspace": WORKSPACE,
          "Content-Type": "application/json"
        }
      }
    );
 
    res.json(response.data);
 
  } catch (e) {
    console.error("❌ FULL ERROR:", e.response?.data || e.message);
 
    res.status(500).json({
      error: e.response?.data || e.message
    });
  }
});
 
// 🟢 Root check
app.get("/", (req, res) => {
  res.send("✅ AI Core Mistral App Running");
});
 
// 🔥 Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
