require('dotenv').config();
require('../index');

module.exports = client;
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');

const GuildConfig = require('../src/models/GuildConfig');
const AuditLog = require('../src/models/AuditLog');
const auth = require('./middleware/auth');
const client = require('../index');

// ===============================
// EXPRESS + SOCKET SETUP
// ===============================

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

require('../shared/socket').init(io);

// ===============================
// MONGODB
// ===============================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected (Dashboard)"))
  .catch(err => console.error("❌ Mongo Error:", err));

// ===============================
// EXPRESS CONFIG
// ===============================

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ===============================
// PASSPORT DISCORD OAUTH
// ===============================

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['identify', 'guilds']
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// ===============================
// BASIC ROUTE
// ===============================

app.get('/', (req, res) => {
  res.send("🚀 Elite Security Dashboard Running");
});

// ===============================
// AUTH ROUTES
// ===============================

app.get('/login', passport.authenticate('discord'));

app.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect('/dashboard')
);

app.get('/logout', (req, res) => {
  req.logout(() => {});
  res.redirect('/');
});

// ===============================
// MAIN DASHBOARD
// ===============================

app.get('/dashboard', auth, (req, res) => {

  const adminGuilds = req.user.guilds.filter(g => {
    const isAdmin = (g.permissions & 0x8) === 0x8;
    const botIsInGuild = client.guilds.cache.has(g.id);
    return isAdmin && botIsInGuild;
  });

  res.render('dashboard', {
    user: req.user,
    guilds: adminGuilds
  });
});

// ===============================
// GUILD SETTINGS PAGE
// ===============================

app.get('/guild/:id', auth, async (req, res) => {

  const guildId = req.params.id;

  const guild = req.user.guilds.find(g =>
    g.id === guildId &&
    (g.permissions & 0x8) === 0x8 &&
    client.guilds.cache.has(g.id)
  );

  if (!guild) return res.redirect('/dashboard');

  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId });

  res.render('guild', { guild, config });
});

// ===============================
// SAVE SETTINGS
// ===============================

// ===============================
// SAVE SETTINGS
// ===============================

app.post('/guild/:id/save', auth, async (req, res) => {

  const guildId = req.params.id;

  const guild = req.user.guilds.find(g =>
    g.id === guildId &&
    (g.permissions & 0x8) === 0x8 &&
    client.guilds.cache.has(g.id)
  );

  if (!guild) return res.redirect('/dashboard');

  await GuildConfig.findOneAndUpdate(
    { guildId },
    {
      antiRaidEnabled: req.body.antiRaidEnabled === 'on',
      punishment: req.body.punishment,
      minAccountAge: Number(req.body.minAccountAge) || 0,
      raidJoinLimit: Number(req.body.raidJoinLimit) || 5,
      raidTimeWindow: Number(req.body.raidTimeWindow) || 10000,

      // 💎 PREMIUM FLAG (ADDED SAFELY)
      premium: req.body.premium === 'on'
    },
    { upsert: true }
  );

  res.redirect(`/guild/${guildId}`);
});
// ===============================
// ANALYTICS API ROUTE
// ===============================

app.get('/dashboard/:guildId', async (req, res) => {

  const config = await GuildConfig.findOne({ guildId: req.params.guildId });
  const logs = await AuditLog.find({ guildId: req.params.guildId })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    messages: config?.messageCount || 0,
    premium: config?.premium || false,
    logs
  });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🌍 Dashboard running on port ${PORT}`);
});