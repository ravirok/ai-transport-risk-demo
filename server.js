const express = require('express');
const basicAuth = require('express-basic-auth');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Read username/password from manifest environment variables
const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

// Basic Auth setup
app.use(basicAuth({
    users: { [BASIC_USER]: BASIC_PASS },
    challenge: true, // Prompts browser login dialog
}));

// Example route for AI Core
app.get('/ai-core', async (req, res) => {
    try {
        const response = await axios.get(process.env.AI_API_URL, {
            auth: {
                username: process.env.AI_CORE_CLIENT_ID,
                password: process.env.AI_CORE_CLIENT_SECRET
            }
        });
        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(err.response?.status || 500).send('AI Core request failed');
    }
});

// Example route for Transport Service
app.get('/transports', async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.CTMS_URL}/v1/transportRequests`,
            {
                auth: {
                    username: process.env.CTMS_CLIENT_ID,
                    password: process.env.CTMS_CLIENT_SECRET
                }
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(err.response?.status || 500).send('Transport Service request failed');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
