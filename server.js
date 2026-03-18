// test-aicore.js
const axios = require("axios");
const fs = require("fs");
 
// ------------------------ Load AI Core key ------------------------
const config = JSON.parse(fs.readFileSync("./ai-core-key.json"));
 
const ai_api_url = config['serviceurls']['AI_API_URL'];
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
 
// ------------------------ Test LM deployment ------------------------
async function testLM() {
  try {
    const token = await getToken();
    const url = `${ai_api_url}/v2/lm/deployments/${LM_DEPLOYMENT_ID}`;
 
    const prompt = "Hello, test SAP AI Core";
    console.log("Sending prompt:", prompt);
 
    const response = await axios.post(
      url,
      { input: [{ role: "user", content: prompt }] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": RESOURCE_GROUP,
          "AI-Workspace": WORKSPACE,
          "Content-Type": "application/json",
        },
      }
    );
 
    console.log("LM Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("LM Test ERROR:", err.response?.data || err.message);
  }
}
 
testLM();
