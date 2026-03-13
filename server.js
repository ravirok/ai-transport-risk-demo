const express = require("express")
const app = express()

const PORT = process.env.PORT || 3000

// Serve the dashboard UI
app.use(express.static("public"))

// /risk API
app.get("/risk",(req,res)=>{

    // Get the transport ID from environment variable (set from pipeline)
    const transportId = process.env.TRANSPORT_ID || "TR000001"

    // Generate risk score (placeholder for AI Core later)
    const riskScore = Math.random()

    // Determine risk level
    let riskLevel = "LOW"
    if(riskScore > 0.7){
        riskLevel = "HIGH"
    } else if(riskScore > 0.4){
        riskLevel = "MEDIUM"
    }

    // Send JSON response
    res.json({
        transport_id: transportId,
        risk_score: riskScore.toFixed(2),
        risk_level: riskLevel
    })
})

// Start server
app.listen(PORT,()=>{
    console.log("Server running on port "+PORT)
})
