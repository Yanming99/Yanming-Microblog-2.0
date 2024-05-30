const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const PORT = 3000;
const dbFileName = 'your_database_file.db';

let db;

(async () => {
    db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    // Ensure the database schema matches `populatedb.js`
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );
    `);
})();

app.engine('handlebars', expressHandlebars.engine({
    layoutsDir: path.join(__dirname, 'views/layouts'),
    defaultLayout: 'main',
    extname: '.handlebars',
    helpers: {
        toLowerCase: function (str) {
            return str.toLowerCase();
        },
        ifCond: function (v1, v2, options) {
            if (v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
    }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(
    session({
        secret: 'oneringtorulethemall',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, async (token, tokenSecret, profile, done) => {
    try {
        let user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', profile.id);
        if (!user) {
            // Insert the new user into the database
            const memberSince = new Date().toISOString();
            await db.run('INSERT INTO users (hashedGoogleId, memberSince) VALUES (?, ?)', profile.id, memberSince);
            user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', profile.id);
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id || user.hashedGoogleId);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ? OR hashedGoogleId = ?', id, id);
        if (!user) {
            return done(new Error('User not found'));
        }
        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.use((req, res, next) => {
    res.locals.appName = 'Connected With Us';
    res.locals.loggedIn = req.isAuthenticated();
    res.locals.userId = req.user ? req.user.id : '';
    next();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

async function findUserByUsername(username) {
    return db.get('SELECT * FROM users WHERE username = ?', username);
}

async function findUserById(userId) {
    return db.get('SELECT * FROM users WHERE id = ?', userId);
}

async function addUser(username, hashedGoogleId) {
    const memberSince = new Date().toISOString();
    await db.run('INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)', username, hashedGoogleId, '', memberSince);
}

async function getPosts() {
    return db.all('SELECT * FROM posts ORDER BY timestamp DESC');
}

async function addPost(title, content, username) {
    const timestamp = new Date().toISOString();
    await db.run('INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)', title, content, username, timestamp, 0);
}

async function updatePostLikes(postId) {
    await db.run('UPDATE posts SET likes = likes + 1 WHERE id = ?', postId);
}

// Routes
app.get('/', async (req, res) => {
    const posts = await getPosts();
    const user = req.user ? await findUserById(req.user.id) : {};
    res.render('home', { posts, user, loggedIn: req.isAuthenticated() });
});

app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

app.get('/error', (req, res) => {
    res.render('error');
});

app.get('/main', async (req, res) => {
    const loggedIn = req.isAuthenticated();
    const user = loggedIn ? await findUserById(req.user.id) : undefined;
    res.render('main', { loggedIn, user });
});

app.get('/post/:id', async (req, res) => {
    const postId = parseInt(req.params.id);
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    if (!post) {
        res.redirect('/error');
        return;
    }
    res.render('postDetail', { post });
});

app.post('/posts', async (req, res) => {
    const { title, content } = req.body;
    const user = await findUserById(req.user.id);
    if (!user) {
        res.redirect('/error');
        return;
    }
    await addPost(title, content, user.username);
    res.redirect('/');
});

app.post('/like/:id', async (req, res) => {
    const postId = parseInt(req.params.id);
    await updatePostLikes(postId);
    res.redirect('/');
});


app.get('/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const user = await findUserById(req.user.id);
    if (!user) {
        return res.redirect('/error');
    }

    const userPosts = await db.all('SELECT * FROM posts WHERE username = ? ORDER BY timestamp DESC', user.username);
    res.render('profile', { user, userPosts });
});

app.get('/avatar/:username', async (req, res) => {
    const username = req.params.username;
    const user = await findUserByUsername(username);
    if (!user) {
        res.status(404).send('User not found');
        return;
    }
    const firstLetter = user.username.charAt(0) || 'U';
    const avatarBuffer = generateAvatar(firstLetter);
    res.set('Content-Type', 'image/png');
    res.send(avatarBuffer);
});

// Google OAuth login route
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

// Google OAuth callback route
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
    const user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', req.user.hashedGoogleId);
    if (!user) {
        res.redirect('/registerUsername');
    } else {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
});

// Username registration route (GET)
app.get('/registerUsername', (req, res) => {
    res.render('registerUsername');
});

// Username registration route (POST)
app.post('/registerUsername', async (req, res) => {
    const { username } = req.body;
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        res.redirect('/registerUsername?error=Username%20already%20taken');
        return;
    }
    await addUser(username, req.user.hashedGoogleId);
    req.session.userId = req.user.id;
    req.session.loggedIn = true;
    res.redirect('/');
});

// Logout route
app.get('/logout', (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.redirect('/googleLogout');
    });
});

// Logout confirmation route
app.get('/googleLogout', (req, res) => {
    res.render('googleLogout');
});

// Logout callback route
app.get('/logoutCallback', (req, res) => {
    res.redirect('/login');
});

const fetch = require('node-fetch'); // Make sure to install node-fetch

app.get('/fetch-emojis', async (req, res) => {
   try {
       const apiKey = 'f17d08ed9083f34b80fabba9d06d597517ede322';
       const response = await fetch(`https://emoji-api.com/emojis?access_key=${apiKey}`);
       const emojis = await response.json();
       res.json(emojis);
   } catch (error) {
       console.error('Error fetching emojis:', error);
       res.status(500).send('Error fetching emojis');
   }
});










app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

function generateAvatar(letter, width = 50, height = 50) {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#007bff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(width / 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter.toUpperCase(), width / 2, height / 2);

    return canvas.toBuffer();
}
