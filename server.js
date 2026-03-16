const express = require("express");
const { executeHttpRequest, Destination } = require("@sap/cloud-sdk-core");
const xsenv = require("@sap/xsenv");

const app = express();
const PORT = process.env.PORT || 3000;

// Load bound Connectivity service
const services = xsenv.getServices({ connectivity: { tag: "connectivity" } });

async function getCTMSTransports() {
    try {
        // Get destination by name
        const ctmsDest = await services.connectivity.getDestination("CTMS_TRANSPORT");

        if (!ctmsDest) throw new Error("Destination CTMS_TRANSPORT not found in Connectivity service");

        // Make HTTP GET request using the destination (token fetched automatically)
        const response = await executeHttpRequest(ctmsDest, {
            method: "GET",
            url: ctmsDest.URL // Ensure this ends with /v1/transportRequests
        });

        return response.data.transports || [];
    } catch (err) {
        console.error("Error fetching transports:", err.message);
        throw err;
    }
}

app.get("/risk", async (req, res) => {
    try {
        const transports = await getCTMSTransports();

        if (!transports || transports.length === 0) {
            return res.json({ message: "No transports found" });
        }

        const transportId = transports[0].id || "UNKNOWN";
        const riskScore = Math.random().toFixed(2);

        let riskLevel = "LOW";
        if (riskScore > 0.7) riskLevel = "HIGH";
        else if (riskScore > 0.4) riskLevel = "MEDIUM";

        res.json({
            transport_id: transportId,
            risk_score: riskScore,
            risk_level: riskLevel,
            transports
        });

    } catch (error) {
        console.error("Risk Service Error:", error.message);
        res.status(500).json({
            error: "Risk service failed",
            details: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
