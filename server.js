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
const CTMS_URL = process.env.CTMS_URL

// --------- Helper: Get AI Core Bearer Token ---------
async function getAICoreToken() {
    try {
        const params = new URLSearchParams()
        params.append("grant_type", "client_credentials")
        params.append("client_id", AI_CORE_CLIENT_ID)
        params.append("client_secret", AI_CORE_CLIENT_SECRET)

        const response = await axios.post(`${AI_CORE_UAA_URL}/oauth/token`, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        })
        console.log("AI Core token fetched successfully")
        return response.data.access_token
    } catch (err) {
        console.error("AI Core token fetch error:", err.response ? err.response.data : err.message)
        throw err
    }
}

// --------- Helper: Get CTMS Bearer Token ---------
async function getCTMSToken() {
    try {
        const params = new URLSearchParams()
        params.append("grant_type", "client_credentials")
        params.append("client_id", CTMS_CLIENT_ID)
        params.append("client_secret", CTMS_CLIENT_SECRET)

        const response = await axios.post(`${CTMS_UAA_URL}/oauth/token`, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        })
        console.log("CTMS token fetched successfully")
        return response.data.access_token
    } catch (err) {
        console.error("CTMS token fetch error:", err.response ? err.response.data : err.message)
        throw err
    }
}

// --------- Helper: Fetch all transport IDs from CTMS ---------
async function fetchCTMSTransportIDs() {
    try {
        const token = await getCTMSToken()
        const response = await axios.get(`${CTMS_URL}/v1/transports`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        const transportIds = response.data.map(t => t.id)
        console.log("Fetched transport IDs from CTMS:", transportIds)
        return transportIds
    } catch (err) {
        console.error("Error fetching transports from CTMS:", err.response ? err.response.data : err.message)
        return []
    }
}

// --------- Endpoint: /risk ---------
app.get("/risk", async (req, res) => {
    try {
        const transportIds = await fetchCTMSTransportIDs()
        if (!transportIds.length) {
            console.warn("No transports found, returning dummy data")
            return res.json([
                { transport_id: "TR_DUMMY_001", risk_score: 0.5, risk_level: "MEDIUM" }
            ])
        }

        const aiToken = await getAICoreToken()
        const results = []

        for (const transportId of transportIds) {
            try {
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
            } catch (err) {
                console.error(`AI Core call failed for ${transportId}:`, err.response ? err.response.data : err.message)
                // Add fallback for this transport
                results.push({
                    transport_id: transportId,
                    risk_score: 0.5,
                    risk_level: "MEDIUM",
                    note: "Fallback value due to AI Core error"
                })
            }
        }

        res.json(results)

    } catch (err) {
        console.error("Unexpected error in /risk endpoint:", err.message)
        res.status(500).json({ error: "Failed to fetch risk", details: err.message })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
