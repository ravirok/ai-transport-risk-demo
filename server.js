const express = require("express")
const axios = require("axios")

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.static("public"))

async function getCTMSToken(){

const response = await axios.post(
process.env.CTMS_TOKEN_URL,
`grant_type=client_credentials&client_id=${process.env.CTMS_CLIENT_ID}&client_secret=${process.env.CTMS_CLIENT_SECRET}`,
{
headers:{
"Content-Type":"application/x-www-form-urlencoded"
}
})

return response.data.access_token
}

async function getTransports(){

const token = await getCTMSToken()

const response = await axios.get(
process.env.CTMS_API_URL + "/v2/transports",
{
headers:{
Authorization:`Bearer ${token}`
}
})

return response.data
}

app.get("/risk", async (req,res)=>{

try{

const transports = await getTransports()

const transportId = transports[0].id || "No transport found"

const riskScore = Math.random()

let riskLevel="LOW"

if(riskScore > 0.7){
riskLevel="HIGH"
}else if(riskScore > 0.4){
riskLevel="MEDIUM"
}

res.json({
transport_id:transportId,
risk_score:riskScore.toFixed(2),
risk_level:riskLevel
})

}catch(error){

console.error(error)

res.status(500).json({
error:"Risk service unavailable"
})

}

})

app.listen(PORT,()=>{
console.log("Server running on port "+PORT)
})
