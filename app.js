//Create the Express Server
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

//Replace 'db_user', 'db_host', 'complaints_db', and 'db_pass' with your actual PostgreSQL credentials
//Ensure Elasticsearch is running at 'http://localhost:9200' or update the URL if it's different.
pgClient.connect();

// Elasticsearch Client Setup
const esClient = new ElasticsearchClient({ node: 'http://localhost:9200' });

// Route to receive data from agents
app.post('/aggregate', async (req, res) => {
    const { type, content } = req.body;

    try {
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
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Central Aggregator running on port ${PORT}`);
});
