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
    console.log("AI Core token fetched successfully")
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
    console.log("CTMS token fetched successfully")
    return response.data.access_token
}

// --------- Helper: Fetch all transport IDs from CTMS ---------
async function fetchCTMSTransportIDs() {
    const token = await getCTMSToken()
    const response = await axios.get(`${CTMS_URL}/v1/transports`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    console.log("Raw CTMS response:", response.data)
    const transportIds = response.data.map(t => t.id)
    console.log("Fetched transport IDs from CTMS:", transportIds)
    return transportIds
}

// --------- Endpoint: /risk ---------
app.get("/risk", async (req, res) => {
    try {
        const transportIds = await fetchCTMSTransportIDs()
        if (!transportIds.length) {
            console.warn("No transports found in CTMS")
            return res.json([])  // return empty array, no dummy
        }

        const aiToken = await getAICoreToken()
        const results = []

        for (const transportId of transportIds) {
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

                console.log(`AI Core response for ${transportId}:`, response.status, response.data)

                let riskScore = null
                let riskLevel = null

                if (response.status === 304) {
                    console.warn(`AI Core returned 304 for ${transportId}, skipping`)
                } else if (response.data && typeof response.data.risk_score === "number") {
                    riskScore = response.data.risk_score
                    if (riskScore > 0.7) riskLevel = "HIGH"
                    else if (riskScore > 0.4) riskLevel = "MEDIUM"
                    else riskLevel = "LOW"
                }

                results.push({
                    transport_id: transportId,
                    risk_score: riskScore,
                    risk_level: riskLevel
                })

            } catch (err) {
                console.error(`AI Core call failed for ${transportId}:`, err.response ? err.response.data : err.message)
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
