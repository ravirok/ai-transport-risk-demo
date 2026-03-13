const express = require("express")
const axios = require("axios")
const app = express()

const PORT = process.env.PORT || 3000
app.use(express.static("public"))

const AI_CORE_CLIENT_ID = process.env.AI_CORE_CLIENT_ID
const AI_CORE_CLIENT_SECRET = process.env.AI_CORE_CLIENT_SECRET
const AI_CORE_UAA_URL = process.env.AI_CORE_UAA_URL
const AI_CORE_URL = process.env.AI_CORE_URL

const CTMS_CLIENT_ID = process.env.CTMS_CLIENT_ID
const CTMS_CLIENT_SECRET = process.env.CTMS_CLIENT_SECRET
const CTMS_UAA_URL = process.env.CTMS_UAA_URL
const CTMS_URL = process.env.CTMS_URL

// --------- Get AI Core Token ---------
async function getAICoreToken() {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", AI_CORE_CLIENT_ID)
    params.append("client_secret", AI_CORE_CLIENT_SECRET)

    const response = await axios.post(`${AI_CORE_UAA_URL}/oauth/token`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    console.log("AI Core token fetched")
    return response.data.access_token
}

// --------- Get CTMS Token ---------
async function getCTMSToken() {
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", CTMS_CLIENT_ID)
    params.append("client_secret", CTMS_CLIENT_SECRET)

    const response = await axios.post(`${CTMS_UAA_URL}/oauth/token`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    console.log("CTMS token fetched")
    return response.data.access_token
}

// --------- Fetch CTMS Transport IDs ---------
async function fetchCTMSTransportIDs() {
    try {
        const token = await getCTMSToken()
        const response = await axios.get(`${CTMS_URL}/v1/transportRequests`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        console.log("CTMS response:", response.data)
        const transportIds = Array.isArray(response.data) ? response.data.map(t => t.id) : []
        console.log("Transport IDs:", transportIds)
        return transportIds
    } catch (err) {
        console.error("CTMS fetch error:", err.response ? err.response.data : err.message)
        return []
    }
}

// --------- AI Core Call with Retry ---------
async function fetchRiskWithRetry(transportId, aiToken, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                AI_CORE_URL,
                { transport_id: transportId },
                {
                    headers: {
                        Authorization: `Bearer ${aiToken}`,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache"
                    },
                    validateStatus: status => status >= 200 && status < 500
                }
            )

            console.log(`AI Core response for ${transportId} (attempt ${attempt}):`, response.status, response.data)

            if (response.status === 304) {
                console.warn(`AI Core returned 304 for ${transportId}, retrying...`)
                continue
            }

            if (response.data && typeof response.data.risk_score === "number") {
                const riskScore = response.data.risk_score
                let riskLevel = "LOW"
                if (riskScore > 0.7) riskLevel = "HIGH"
                else if (riskScore > 0.4) riskLevel = "MEDIUM"
                return { transport_id: transportId, risk_score: riskScore, risk_level: riskLevel }
            } else {
                console.warn(`AI Core response missing risk_score for ${transportId}, retrying...`)
            }
        } catch (err) {
            console.error(`AI Core call failed for ${transportId} (attempt ${attempt}):`, err.response ? err.response.data : err.message)
        }
    }

    console.warn(`All retries failed for ${transportId}, returning null risk`)
    return { transport_id: transportId, risk_score: null, risk_level: null }
}

// --------- /risk Endpoint (Parallel) ---------
app.get("/risk", async (req, res) => {
    try {
        const transportIds = await fetchCTMSTransportIDs()
        if (!transportIds.length) {
            console.warn("No transports found in CTMS")
            return res.json([])
        }

        const aiToken = await getAICoreToken()

        // Run all AI Core calls in parallel
        const riskPromises = transportIds.map(tid => fetchRiskWithRetry(tid, aiToken, 3))
        const results = await Promise.all(riskPromises)

        res.json(results)
    } catch (err) {
        console.error("Unexpected error:", err.message)
        res.status(500).json({ error: "Failed to fetch risk", details: err.message })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
