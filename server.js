const express = require("express");
const app = express();

// Demo endpoint (replace with AI Core call later)
app.get("/api/transports", (req,res)=>{

res.json({
 total:3,
 high:1,
 medium:1,
 safe:1,
 transports:[
  { transport_id:"TMS1001", environment:"QA", risk_score:0.22 },
  { transport_id:"TMS1002", environment:"PROD", risk_score:0.68 },
  { transport_id:"TMS1003", environment:"QA", risk_score:0.41 }
 ]
})

});

app.use(express.static("webapp"));

app.listen(8080, ()=>{
 console.log("Server running on port 8080");
});
