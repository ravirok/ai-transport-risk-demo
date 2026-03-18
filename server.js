const express = require("express");
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// 🔹 Load AI Core key JSON
const key = JSON.parse(fs.readFileSync("./ai-core-key.json", "utf8"));
 
// 🔥 SAFE CONFIG (no undefined errors)
const AI_API_URL =
  key?.serviceurls?.AI_API_URL ||
  "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com";
 
const TOKEN_URL =
  key?.url
    ? key.url + "/oauth/token"
    : "https://hclbuild-g03o2ijo.authentication.eu10.hana.ondemand.com/oauth/token";
 
const CLIENT_ID = key.clientid;
const CLIENT_SECRET = key.clientsecret;
 
const DEPLOYMENT_ID = "d986abe0ffe5cff8";
const RESOURCE_GROUP = "default";
 
// 🧪 Debug logs (remove later)
console.log("AI_API_URL:", AI_API_URL);
console.log("TOKEN_URL:", TOKEN_URL);
console.log("DEPLOYMENT_ID:", DEPLOYMENT_ID);
 
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
 
// 🚀 TEST API
app.get("/test-ai", async (req, res) => {
  try {
    console.log("🚀 Calling AI Core...");
 
    const token = await getToken();
 
    const url = `${AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}/invocations`;
    console.log("👉 URL:", url);
 
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: "user",
            content: "Say HELLO"
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": RESOURCE_GROUP,
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
  res.send("✅ AI Core App Running");
});
 
// 🔥 BTP Compatible PORT
const PORT = process.env.PORT || 3000;
 
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
 
