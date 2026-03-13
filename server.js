const express = require("express")
const axios = require("axios")
const app = express()

const PORT = process.env.PORT || 3000
app.use(express.static("public"))

// ---- AI Core Configuration ----
const AI_CORE_CLIENT_ID = process.env.AI_CORE_CLIENT_ID
const AI_CORE_CLIENT_SECRET = process.env.AI_CORE_CLIENT_SECRET
const AI_CORE_UAA_URL = process.env.AI_CORE_UAA_URL
const AI_CORE_URL = process.env.AI_CORE_URL

// ---- CTMS Configuration ----
const CTMS_CLIENT_ID = process.env.CTMS_CLIENT_ID
const CTMS_CLIENT_SECRET = process.env.CTMS_CLIENT_SECRET
const CTMS_UAA_URL = process.env.CTMS_UAA_URL
const CTMS_URL = process.env.CTMS_URL  // e.g., https://<ctms_instance>.hana.ondemand.com

// --------- Helper: Get AI Core Bearer Token ---------
async function getAICoreToken() {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", AI_CORE_CLIENT_ID)
    params.append("client_secret", AI_CORE_CLIENT_SECRET)

    const response = await axios.post(`${AI_CORE_UAA_URL}/oauth/token`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    return response.data.access_token
}

// --------- Helper: Get CTMS Bearer Token ---------
async function getCTMSToken() {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", CTMS_CLIENT_ID)
    params.append("client_secret", CTMS_CLIENT_SECRET)

    const response = await axios.post(`${CTMS_UAA_URL}/oauth/token`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    return response.data.access_token
}

// --------- Helper: Fetch all transport IDs from CTMS ---------
async function fetchCTMSTransportIDs() {
    const token = await getCTMSToken()
    const response = await axios.get(`${CTMS_URL}/v1/transports`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    // Assume response.data is an array of transports: [{ id: "TR123456" }, ...]
    return response.data.map(t => t.id)
}

// --------- Endpoint: /risk ---------
app.get("/risk", async (req, res) => {
    try {
        // Fetch all transports from CTMS
        const transportIds = await fetchCTMSTransportIDs()
        if (!transportIds.length) {
            return res.status(500).json({ error: "No transports found in CTMS" })
        }

        // Get AI Core token
        const aiToken = await getAICoreToken()
        const results = []

        // Call AI Core for each transport
        for (const transportId of transportIds) {
            const response = await axios.post(
                AI_CORE_URL,
                { transport_id: transportId },
                { headers: { Authorization: `Bearer ${aiToken}` } }
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
        console.error("Error fetching risk:", err.message)
        res.status(500).json({ error: "Failed to fetch risk", details: err.message })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
