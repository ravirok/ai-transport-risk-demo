const express = require("express");
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
 
const app = express();
app.use(express.json());
 
// 🔹 Load key file
const key = JSON.parse(fs.readFileSync("./ai-core-key.json", "utf8"));
 
const AI_API_URL = key.serviceurls.AI_API_URL;
const TOKEN_URL = key.url + "/oauth/token";
const CLIENT_ID = key.clientid;
const CLIENT_SECRET = key.clientsecret;
 
const DEPLOYMENT_ID = "d98abe0ffe5cff8";
const RESOURCE_GROUP = "default";
 
// 🔐 Token
async function getToken() {
  const res = await axios.post(
    TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      }
    }
  );
  return res.data.access_token;
}
 
// 🧪 Test API
app.get("/test-ai", async (req, res) => {
  try {
    const token = await getToken();
 
    const response = await axios.post(
      `${AI_API_URL}/v2/inference/deployments/${DEPLOYMENT_ID}/invocations`,
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
    console.error("❌ ERROR:", e.response?.data || e.message);
    res.json(e.response?.data || { error: e.message });
  }
});
 
// Root
app.get("/", (req, res) => {
  res.send("App running ✅");
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
