//voice Agent (google cloud speech to text API)
const speech = require('@google-cloud/speech');
const axios = require('axios');
const fs = require('fs');

async function processVoice(voiceFilePath) {
    const client = new speech.SpeechClient();

    const audio = {
        content: fs.readFileSync(voiceFilePath).toString('base64'),
    };

    const config = {
        encoding: 'LINEAR16',
        languageCode: 'en-US',
    };

    const request = {
        audio: audio,
        config: config,
    };

    const [response] = await client.recognize(request);
    const transcript = response.results.map(result => result.alternatives[0].transcript).join(' ');

    // Send the transcript to the central aggregator
    await axios.post('http://central-aggregator-service/aggregate', {
        type: 'voice',
        content: transcript
    });

    return transcript;
}

//Text agent(openAI API)
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

async function processText(complaintText) {
    const configuration = new Configuration({
        apiKey: 'your_openai_api_key',
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createCompletion({
        model: "gpt-4",
        prompt: `Categorize and summarize this complaint: ${complaintText}`,
        max_tokens: 150,
    });

    const summary = response.data.choices[0].text.trim();

    // Send the summary to the central aggregator
    await axios.post('http://central-aggregator-service/aggregate', {
        type: 'text',
        content: summary
    });

    return summary;
}


//Image Agent (AWS Rekognition)
const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');

const rekognition = new AWS.Rekognition();

async function processImage(imageFilePath) {
    const imageBytes = fs.readFileSync(imageFilePath);

    const params = {
        Image: {
            Bytes: imageBytes
        }
    };

    const response = await rekognition.detectText(params).promise();
    const detectedText = response.TextDetections.map(text => text.DetectedText).join(' ');

    // Send the detected text to the central aggregator
    await axios.post('http://central-aggregator-service/aggregate', {
        type: 'image',
        content: detectedText
    });

    return detectedText;
}


//Video Agent (google cloud video intelligence API)
const videoIntelligence = require('@google-cloud/video-intelligence').v1;
const axios = require('axios');
const fs = require('fs');

async function processVideo(videoFilePath) {
    const client = new videoIntelligence.VideoIntelligenceServiceClient();

    const inputContent = fs.readFileSync(videoFilePath).toString('base64');

    const request = {
        inputContent: inputContent,
        features: ['TEXT_DETECTION'],
    };

    const [operation] = await client.annotateVideo(request);
    const [operationResult] = await operation.promise();
    const annotationResults = operationResult.annotationResults[0];

    const detectedTexts = annotationResults.textAnnotations.map(annotation => annotation.text).join(' ');

    // Send the detected text to the central aggregator
    await axios.post('http://central-aggregator-service/aggregate', {
        type: 'video',
        content: detectedTexts
    });

    return detectedTexts;
}

//Central Aggreator (Express.js)
const express = require('express');
const { Client } = require('pg');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');

const app = express();
app.use(express.json());

// PostgreSQL Client Setup
const pgClient = new Client({
    user: 'db_user',
    host: 'db_host',
    database: 'complaints_db',
    password: 'db_pass',
    port: 5432,
});
pgClient.connect();

// Elasticsearch Client Setup
const esClient = new ElasticsearchClient({ node: 'http://localhost:9200' });

app.post('/aggregate', async (req, res) => {
    const { type, content } = req.body;

    // Store in PostgreSQL
    await pgClient.query('INSERT INTO complaints (type, content) VALUES ($1, $2)', [type, content]);

    // Index in Elasticsearch
    await esClient.index({
        index: 'complaints',
        body: {
            type: type,
            content: content
        }
    });

    res.status(200).json({ status: 'success' });
});

app.listen(5000, () => {
    console.log('Central Aggregator running on port 5000');
});