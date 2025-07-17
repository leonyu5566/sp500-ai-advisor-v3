const functions = require("firebase-functions");
const fetch = require("node-fetch");
const { GoogleAuth } = require('google-auth-library');

// 建立一個可被 HTTPS 請求觸發的函式，作為我們的 API 代理
exports.apiProxy = functions.https.onRequest(async (request, response) => {
    // 設定 CORS，允許任何來源的請求
    response.set("Access-Control-Allow-Origin", "*");

    if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
    }

    // 從 Firebase 的環境變數中讀取金鑰
    const geminiApiKey = functions.config().gemini.key;
    if (!geminiApiKey) {
        response.status(500).send("GEMINI_API_KEY is not configured.");
        return;
    }

    const userPrompt = request.body?.prompt;
    if (!userPrompt) {
        response.status(400).send("Please provide a prompt.");
        return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }]
    };

    try {
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Google Gemini API responded with ${geminiResponse.status}: ${errorText}`);
        }

        const result = await geminiResponse.json();
        response.status(200).send(result);

    } catch (error) {
        console.error("Error calling Google Gemini API:", error);
        response.status(500).send(`Error calling Google Gemini API: ${error.message}`);
    }
});

// Vertex AI Gemini-pro Proxy
exports.vertexaiProxy = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
    }
    const projectId = functions.config().vertexai.project_id;
    if (!projectId) {
        response.status(500).send("VERTEXAI_PROJECT_ID is not configured.");
        return;
    }
    const userPrompt = request.body?.prompt;
    if (!userPrompt) {
        response.status(400).send("Please provide a prompt.");
        return;
    }
    // 產生 Bearer Token
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-pro:predict`;
    const payload = {
        instances: [{ prompt: userPrompt }]
    };
    try {
        const vertexResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.token || token}`
            },
            body: JSON.stringify(payload)
        });
        if (!vertexResponse.ok) {
            const errorText = await vertexResponse.text();
            throw new Error(`Vertex AI API responded with ${vertexResponse.status}: ${errorText}`);
        }
        const result = await vertexResponse.json();
        response.status(200).send(result);
    } catch (error) {
        console.error("Error calling Vertex AI API:", error);
        response.status(500).send(`Error calling Vertex AI API: ${error.message}`);
    }
});
