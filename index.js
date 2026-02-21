require('dotenv').config();

const connectDB = require('./src/database');
const startBot = require('./src/bot');

(async () => {
    await connectDB();
    startBot();
})();