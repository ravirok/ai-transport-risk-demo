const express = require("express")
const app = express()

const PORT = process.env.PORT || 3000
app.use(express.static("public"))

// /risk API
app.get("/risk", (req, res) => {

    const transportId = process.env.TRANSPORT_ID
    if (!transportId) {
        return res.status(500).json({
            error: "TRANSPORT_ID environment variable not set",
            details: "Set TRANSPORT_ID from pipeline or manually in BTP"
        })
    }

    // Random risk score for demo (0.3–0.9)
    const riskScore = Number((Math.random() * 0.6 + 0.3).toFixed(2))

    // Determine risk level
    let riskLevel = "LOW"
    if (riskScore > 0.7) riskLevel = "HIGH"
    else if (riskScore > 0.4) riskLevel = "MEDIUM"

    res.json({
        transport_id: transportId,
        risk_score: riskScore,
        risk_level: riskLevel
    })
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log("Current Transport ID:", process.env.TRANSPORT_ID || "Not set")
})
