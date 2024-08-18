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