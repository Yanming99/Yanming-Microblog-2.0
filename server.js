// Express will handle the express functions
// 

const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers

// app.engine('handlebars',  expressHandlebars.engine({
//         helpers: {
//             toLowerCase: function (str) {
//                 return str.toLowerCase();
//             },
//             ifCond: function (v1, v2, options) {
//                 if (v1 === v2) {
//                     return options.fn(this);
//                 }
//                 return options.inverse(this);
//             },
//         },
//     })
// );

// app.set('view engine', 'handlebars');
// app.set('views', './views');


// Remodify the app.engine


const path = require('path'); // Import the path module

//console.log(path);

// Set up Handlebars view engine with custom helpers and layout template
app.engine('handlebars', expressHandlebars.engine ({
    layoutsDir: path.join(__dirname, 'views/layouts'), // Specify the directory for layout templates
    defaultLayout: 'main', // Specify the default layout template file (main.handlebars)
    extname: '.handlebars', // Specify the file extension for Handlebars files
    helpers: {
        // Your Handlebars helpers
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

app.set('view engine', 'handlebars'); // Set the view engine to Handlebars
app.set('views', path.join( __dirname , 'views')); // Specify the directory for view files



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Connected With Us';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//

/*
    I don't know how to access the home 
*/

app.get('/', (req, res) => {
    // Get posts and current user
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    
    // Check if the user is logged in
    const loggedIn = req.session.loggedIn || false;
    
    // Pass posts, user, and loggedIn status to the home template
    res.render('home', { posts, user, loggedIn });
});

app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// 
// Main file router
// app.get('/main' , (req, res) => {

//     // There need to do ! After User Successful login
//     // And then redirect to the home pages
//     res.render('main' , { loggedIn: req.query.error } );

// });

app.get('/main' , (req, res) => {
    // Check if the user is logged in
    const loggedIn = req.session.loggedIn || false;
    // Get user information if logged in
    const user = loggedIn ? getCurrentUser(req) : undefined;

    // Render the main template with the provided data
    res.render('main', { loggedIn, user });
});


// Additional routes that you must implement

app.get('/post/:id', (req, res) => {
    // TODO: Render post detail page
    const postId = parseInt(req.params.id);
    const post = posts.find(post => post.id === postId);
    if (!post) {
        res.redirect('/error');
        return;
    }
    res.render('postDetail', { post });
});

app.post('/posts', (req, res) => {
     // TODO: Add a new post and redirect to home
    const { title, content } = req.body;
    const user = getCurrentUser(req);
    if (!user) {
        res.redirect('/error');
        return;
    }
    const postId = posts.length + 1;
    const timestamp = new Date().toISOString();
    const newPost = { id: postId, title, content, username: user.username, timestamp, likes: 0 };
    posts.push(newPost);
    res.redirect('/');
    
});

app.post('/like/:id', (req, res) => {
    // TODO: Update post likes
    const postId = parseInt(req.params.id);
    const post = posts.find(post => post.id === postId);
    if (!post) {
        res.redirect('/error');
        return;
    }
    post.likes++;
    res.redirect('/');
});

app.get('/profile', isAuthenticated, (req, res) => {
    // TODO: Render profile page
    const user = getCurrentUser(req);
    let userPosts = posts.filter(post => post.username === user.username);
    userPosts = userPosts.reverse(); // Reverse the order of userPosts
    res.render('profile', { user, userPosts });
});


app.get('/avatar/:username', (req, res) => {
    const username = req.params.username;
    const user = findUserByUsername(username);
    if (!user) {
        res.status(404).send('User not found');
        return;
    }
    const firstLetter = user.username.charAt(0) || 'U';
    const avatarBuffer = generateAvatar(firstLetter);
    res.set('Content-Type', 'image/png');
    res.send(avatarBuffer);
});

function generateAvatar(letter, width = 50, height = 50) { // Adjust the size here
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Choose a color scheme (customize as needed)
    ctx.fillStyle = '#007bff'; // Blue color

    // Draw background
    ctx.fillRect(0, 0, width, height);

    // Draw the letter in the center
    ctx.fillStyle = '#ffffff'; // White color
    ctx.font = `${Math.floor(width / 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter.toUpperCase(), width / 2, height / 2);

    // Convert the canvas to a PNG buffer
    return canvas.toBuffer();
}



// After Register and then back to Login 
app.post('/register', (req, res) => {
    // TODO: Register a new user
    const { username } = req.body;
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username%20already%20taken');
        return;
    }
    addUser(username);
    res.redirect('/login');
});

// When User Successful login and then redirectly to Home pages
app.post('/login', (req, res) => {
    // TODO: Login a user
    const { username } = req.body;
    const user = findUserByUsername(username);
    if (!user) {
        res.redirect('/login?error=User%20not%20found');
        return;
    }
    req.session.userId = user.id;
    req.session.loggedIn = true ;
    // This part is Successful login pages

    res.redirect('/');
});



app.get('/logout', (req, res) => {
     // TODO: Logout the user
    req.session.destroy();
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



app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.session.userId;

    // Find the post to delete
    const postIndex = posts.findIndex(post => post.id === postId && post.username === findUserById(userId).username);


    if (postIndex > -1) {
        // Remove the post from the posts array
        posts.splice(postIndex, 1);
        res.status(200).send();
    } else {
        res.status(404).send('Post not found or not authorized to delete');
    }
});



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
let posts = [
    { id: 1, title: 'Sample Post', content: 'This is a sample post.', username: 'SampleUser', timestamp: '2024-01-01 10:00', likes: 0 },
    { id: 2, title: 'Another Post', content: 'This is another sample post.', username: 'AnotherUser', timestamp: '2024-01-02 12:00', likes: 0 },
];
let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

// Function to find a user by username
function findUserByUsername(username) {
    return users.find(user => user.username === username);
}

// Function to find a user by user ID
function findUserById(userId) {
    return users.find(user => user.id === userId);
}

// Function to add a new user
function addUser(username) {
    const userId = users.length + 1;
    const newUser = { id: userId, username, avatar_url: undefined, memberSince: new Date().toISOString() };
    users.push(newUser);
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
function registerUser(req, res) {
    const { username } = req.body;
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username%20already%20taken');
        return;
    }
    addUser(username);
    res.redirect('/login');
}

// Function to login a user
function loginUser(req, res) {
    const { username } = req.body;
    const user = findUserByUsername(username);
    if (!user) {
        res.redirect('/login?error=User%20not%20found');
        return;
    }
    req.session.userId = user.id;
    res.redirect('/main');
}

// Function to logout a user
function logoutUser(req, res) {
    req.session.destroy();
    res.redirect('/login');
}

// Function to render the profile page
function renderProfile(req, res) {
    const user = getCurrentUser(req);
    const userPosts = posts.filter(post => post.username === user.username);
    res.render('profile', { user, userPosts });
}

// Function to update post likes
function updatePostLikes(req, res) {
    const postId = parseInt(req.params.id);
    const post = posts.find(post => post.id === postId);
    if (!post) {
        res.redirect('/error');
        return;
    }
    post.likes++;
    res.redirect('/');
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    const username = req.params.username;
    const user = findUserByUsername(username);
    if (!user || !user.avatar_url) {
        // If user or avatar_url not found, serve a default avatar or return an error
        res.status(404).send('Avatar not found');
        return;
    }
    // Serve the avatar image (replace 'avatar_url' with the actual field containing the image URL)
    res.sendFile(user.avatar_url);
}

// Function to get the current user from session
function getCurrentUser(req) {
    const userId = req.session.userId;
    if (userId) {
        return findUserById(userId);
    }
    return undefined;
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    const postId = posts.length + 1;
    const timestamp = new Date().toISOString();
    const newPost = { id: postId, title, content, username: user.username, timestamp, likes: 0 };
    posts.push(newPost);
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    const { Canvas } = require('canvas');
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // Choose a color scheme (you can customize this)
    ctx.fillStyle = '#007bff'; // blue color

    // Draw background
    ctx.fillRect(0, 0, width, height);

    // Draw the letter in the center
    ctx.fillStyle = '#ffffff'; // white color
    ctx.font = `${Math.floor(width / 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter.toUpperCase(), width / 2, height / 2);

    // Convert the canvas to a PNG buffer
    return canvas.toBuffer();
}


