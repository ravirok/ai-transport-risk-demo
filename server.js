const express = require("express")
const fs = require("fs")
const path = require("path")
const app = express()

const PORT = process.env.PORT || 3000

// Serve dashboard UI
app.use(express.static("public"))

// /risk API
app.get("/risk", (req, res) => {

    let transportId = null

    try {
        // Read the pipeline log artifact (generated automatically by default CI/CD pipeline)
        const logFile = path.join(__dirname, "pipeline.log") // ensure pipeline.log is in app folder
        const logData = fs.readFileSync(logFile, "utf8")

        // Extract createdTransportRequestID from log
        const match = logData.match(/createdTransportRequestID:\s*(\S+)/)
        if (match) transportId = match[1]
    } catch (err) {
        console.error("Error reading pipeline log:", err.message)
        return res.status(500).json({
            error: "Cannot read transport ID from pipeline log",
            details: err.message
        })
    }

    if (!transportId) {
        return res.status(500).json({
            error: "Transport ID not found in pipeline log"
        })
    }

    // Generate realistic random risk score (0.3–0.9)
    const riskScore = Number((Math.random() * 0.6 + 0.3).toFixed(2))

    // Determine risk level
    let riskLevel = "LOW"
    if (riskScore > 0.7) riskLevel = "HIGH"
    else if (riskScore > 0.4) riskLevel = "MEDIUM"

    // Return JSON response
    res.json({
        transport_id: transportId,
        risk_score: riskScore,
        risk_level: riskLevel
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
