const express = require("express");
const axios = require("axios");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// ------------------------ Load AI Core key ------------------------
const key = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
const AI_API_URL = key.serviceurls.AI_API_URL; // e.g., https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com
const TOKEN_URL = key.url + "/oauth/token";   // auth URL from key
const CLIENT_ID = key.clientid;
const CLIENT_SECRET = key.clientsecret;
 
// ------------------------ LM Deployment ------------------------
const LM_DEPLOYMENT_ID = "dd219ec1aca776c3"; // Replace with your deployment ID
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
 
// ------------------------ LM Endpoint ------------------------
app.get("/test-ai", async (req, res) => {
  try {
    const token = await getToken();
 
    const url = `${AI_API_URL}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
    console.log("Calling LM URL:", url);
 
    const response = await axios.post(
      url,
      {
        input: [
          { role: "user", content: "Hello from SAP AI Core" }
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
    console.error("LM ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || err.message);
  }
});
 
// ------------------------ Start Server ------------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`AI Core server running on port ${PORT}`));
 
