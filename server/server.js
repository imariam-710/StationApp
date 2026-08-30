require('dotenv').config();
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// On some Windows setups, Node's built-in DNS resolver (used for the SRV
// lookups that mongodb+srv:// needs) fails even when the OS itself resolves
// DNS fine. Pointing Node explicitly at public DNS servers works around it.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const authRouter = require('./routes/auth');
const monthsRouter = require('./routes/months');
const settingsRouter = require('./routes/settings');
const { verifyToken } = require('./middleware/auth');
const seedAdmin = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mariammhmmd710_db_user:hr-12345@cluster0.jrldccv.mongodb.net/station_pro';

app.use(cors());
app.use(express.json());

// Auth routes are public (register/login). Everything else requires a valid token.
app.use('/api/auth', authRouter);
app.use('/api/months', verifyToken, monthsRouter);
app.use('/api/settings', verifyToken, settingsRouter);

app.get('/', (req, res) => {
  res.send('Station Profit API is running.');
});

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB:', MONGO_URI);
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`API server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB.');
    console.error(err.message);
    console.error('\nMake sure MongoDB is running, or update MONGO_URI in your .env file.');
    process.exit(1);
  });