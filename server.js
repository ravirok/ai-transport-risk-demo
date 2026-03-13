const express = require("express")
const app = express()

const PORT = process.env.PORT || 3000

app.use(express.static("public"))

app.get("/", (req,res)=>{
res.send("AI Transport Risk Dashboard")
})

app.get("/risk",(req,res)=>{

res.json({
transport_id:"TR123456",
risk_score:0.82,
risk_level:"HIGH"
})

})

app.listen(PORT,()=>{
console.log("Server running on port "+PORT)
})
