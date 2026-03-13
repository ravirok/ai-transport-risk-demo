const express = require("express")
const axios = require("axios")
const app = express()

const PORT = process.env.PORT || 3000
app.use(express.static("public"))

// Read transport IDs from environment variable (comma-separated)
const transportIds = process.env.TRANSPORT_IDS
  ? process.env.TRANSPORT_IDS.split(",")
  : []

// UAA / AI Core credentials from env
const CLIENT_ID = process.env.AI_CORE_CLIENT_ID
const CLIENT_SECRET = process.env.AI_CORE_CLIENT_SECRET
const UAA_URL = process.env.AI_CORE_UAA_URL
const AI_CORE_URL = process.env.AI_CORE_URL

// Function to get Bearer Token from UAA using client id + secret
async function getBearerToken() {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", CLIENT_ID)
    params.append("client_secret", CLIENT_SECRET)

    try {
        const response = await axios.post(`${UAA_URL}/oauth/token`, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        })
        return response.data.access_token
    } catch (err) {
        console.error("Error fetching Bearer Token:", err.message)
        throw err
    }
}

// API endpoint to get risk for all transports
app.get("/risk", async (req, res) => {
    if (!transportIds.length) {
        return res.status(500).json({
            error: "TRANSPORT_IDS not set",
            details: "Pipeline should inject CTMS transport IDs automatically"
        })
    }
    if (!CLIENT_ID || !CLIENT_SECRET || !UAA_URL || !AI_CORE_URL) {
        return res.status(500).json({
            error: "Missing AI Core credentials",
            details: "Set AI_CORE_CLIENT_ID, AI_CORE_CLIENT_SECRET, AI_CORE_UAA_URL, AI_CORE_URL"
        })
    }

    try {
        const token = await getBearerToken()
        const results = []

        for (const transportId of transportIds) {
            const response = await axios.post(
                AI_CORE_URL,
                { transport_id: transportId },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            const riskScore = response.data.risk_score
            let riskLevel = "LOW"
            if (riskScore > 0.7) riskLevel = "HIGH"
            else if (riskScore > 0.4) riskLevel = "MEDIUM"

            results.push({
                transport_id: transportId,
                risk_score: riskScore,
                risk_level: riskLevel
            })
        }

        res.json(results)
    } catch (err) {
        console.error("AI Core call failed:", err.message)
        res.status(500).json({ error: "AI Core call failed", details: err.message })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log("Transport IDs:", transportIds.join(", "))
})
