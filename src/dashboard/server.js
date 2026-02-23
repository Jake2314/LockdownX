const express = require('express');
const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');

const app = express();
app.use(express.json());

app.get('/guild/:id', async (req, res) => {
    const config = await GuildConfig.findOne({ guildId: req.params.id });
    res.json(config);
});

app.post('/guild/:id', async (req, res) => {
    const config = await GuildConfig.findOneAndUpdate(
        { guildId: req.params.id },
        req.body,
        { upsert: true, new: true }
    );
    res.json(config);
});

app.listen(3000, () => console.log('Dashboard running on port 3000'));