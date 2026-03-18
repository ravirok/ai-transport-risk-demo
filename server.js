app.get("/test-ai", async (req, res) => {
  try {
    const token = await getToken();
 
    const response = await axios.post(
      "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d98abe0ffe5cff8/invocations",
      {
        messages: [
          {
            role: "user",
            content: "Say HELLO"
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "AI-Resource-Group": "default",
          "Content-Type": "application/json"
        }
      }
    );
 
    res.json(response.data);
 
  } catch (e) {
    console.error("FULL ERROR:", e.response?.data);
    res.json(e.response?.data || e.message);
  }
});
 
