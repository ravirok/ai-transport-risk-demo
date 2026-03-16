const axios = require("axios");

// Using your existing BTP environment variables
const CTMS_URL = process.env.CTMS_URL + "/v1/transportRequests";
const TOKEN_URL = process.env.CTMS_UAA_URL + "/oauth/token";
const CLIENT_ID = process.env.CTMS_CLIENT_ID;
const CLIENT_SECRET = process.env.CTMS_CLIENT_SECRET;

async function getToken() {
  try {
    const response = await axios.post(
      TOKEN_URL,
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        }
      }
    );
    return response.data.access_token;
  } catch (err) {
    console.error("Error fetching token:", err.response?.data || err.message);
  }
}

async function testCTMS() {
  try {
    const token = await getToken();
    if (!token) return;

    const response = await axios.get(CTMS_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("CTMS Response:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Error fetching transports:", err.response?.data || err.message);
  }
}

testCTMS();
