const express = require("express")
const app = express()

const PORT = process.env.PORT || 3000

// Serve frontend dashboard files from 'public' folder
app.use(express.static("public"))

// /risk API
app.get("/risk", (req, res) => {

    // Read transport ID from environment variable
    const transportId = process.env.TRANSPORT_ID

    if (!transportId) {
        // If missing, return error
        return res.status(500).json({
            error: "TRANSPORT_ID environment variable not set",
            details: "Please set TRANSPORT_ID in your BTP app or CI/CD pipeline."
        })
    }

    // Generate a realistic random risk score between 0.3 and 0.9
    const riskScore = Number((Math.random() * 0.6 + 0.3).toFixed(2))

    // Determine risk level based on score
    let riskLevel = "LOW"
    if (riskScore > 0.7) {
        riskLevel = "HIGH"
    } else if (riskScore > 0.4) {
        riskLevel = "MEDIUM"
    }

    // Send JSON response
    res.json({
        transport_id: transportId,
        risk_score: riskScore,
        risk_level: riskLevel
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log("Current Transport ID:", process.env.TRANSPORT_ID || "Not set")
})
