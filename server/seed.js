require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@station.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists (${email})`);
    return existing;
  }
  const name = process.env.ADMIN_NAME || 'Administrator';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'admin' });
  console.log('----------------------------------------');
  console.log('Admin user created:');
  console.log('  Email:   ', email);
  console.log('  Password:', password);
  console.log('  Log in and change this password from the app, or set ADMIN_PASSWORD in .env before first run.');
  console.log('----------------------------------------');
  return user;
}

// Allows running directly: npm run seed
if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mariammhmmd710_db_user:hr-12345@cluster0.jrldccv.mongodb.net/station_pro';
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      await seedAdmin();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedAdmin;