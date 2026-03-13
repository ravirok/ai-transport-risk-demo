const express = require("express")
const axios = require("axios")

const app = express()

const token = process.env.AI_CORE_TOKEN
const aiUrl = process.env.AI_CORE_URL

app.get("/api/transports", async (req,res)=>{

const response = await axios.post(
aiUrl + "/v2/inference/deployments/risk-model/predict",
{
 transport_id:"TMS1001",
 code_complexity:0.5,
 test_coverage:80
},
{
 headers:{
  Authorization:`Bearer ${token}`
 }
})

res.json(response.data)

})

app.use(express.static("webapp"))

app.listen(8080)
