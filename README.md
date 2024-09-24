1. Prerequisites
Before running the application, ensure you have the following installed:
1.	Node.js and npm: Ensure Node.js and npm are installed on your system. You can check this by running:
node -v
npm -v
2.	Google OAuth Credentials: You need a Google OAuth client ID and client secret from the Google Developer Console. Follow these steps to get them:
o	Go to the Google Cloud Console.
o	Create a new project (or use an existing one).
o	Navigate to APIs & Services > Credentials.
o	Click Create Credentials and select OAuth 2.0 Client IDs.
o	Configure OAuth consent screen and authorized redirect URIs (set to http://localhost:3000/auth/google/callback).
o	Download the credentials JSON file and extract the Client ID and Client Secret.
3.	SQLite3: The project uses SQLite for data persistence, so no external database setup is needed. The SQLite database is created locally.
2. Setup Instructions
Step 1: Clone or Download the Project
Download or clone the project to your local machine.
Step 2: Navigate to the Project Directory
Open your terminal or command prompt and navigate to the directory where the project is located. For example:
cd path/to/project
Step 3: Install Dependencies
The project uses several Node.js dependencies (e.g., express, passport, sqlite3). Install them by running:
npm install
Step 4: Set Up Environment Variables
Create a file named .env in the root of your project and add your Google OAuth client ID and client secret. Here's an example of how the .env file should look:
makefile
CLIENT_ID=your_google_client_id_here
CLIENT_SECRET=your_google_client_secret_here
Step 5: Initialize the Database (Optional)
To set up the database with some initial users and posts (if needed), you can run the populatedb.js script:
node populatedb.js
3. Running the Application
Step 1: Start the Server
Once everything is set up, run the server using:
node server.js
You should see a message saying:
Server is running on http://localhost:3000
Step 2: Access the Web Application
Open your web browser and go to:
http://localhost:3000
You will be directed to the homepage where you can either log in or register.
________________________________________
4. Application Features and Functionality
This web application is a basic blog system with Google OAuth login. Here’s how the major features work:
1. Login/Logout via Google OAuth
•	Login: To log in, click the login button on the homepage. You will be redirected to Google’s login page. Once authenticated via Google, you will either:
o	Be logged in directly if you’re already a registered user.
o	Redirected to the username registration page to select a username if it’s your first time logging in.
•	Logout: Clicking the Logout button will log you out from both the blog application and your Google account.
2. Username Registration
•	If it’s your first time logging in with Google, you will be redirected to a page where you can choose a username.
•	Enter a unique username, and after successful registration, you will be redirected to the homepage.
3. Create Posts
•	Once logged in, you will see an option to create a new post.
•	You can enter a title and content, and then click Post to submit your post to the blog.
•	Posts will be saved to the SQLite database and displayed in reverse chronological order on the homepage.
4. Like Posts
•	You can like any post by clicking the like button associated with each post.
•	The number of likes is incremented and saved to the database.
5. View Profile
•	Clicking on the Profile button will take you to your profile page, where you can view all the posts you’ve created.
•	The profile page also shows your username and other account details.
6. Avatar Generation
•	The application dynamically generates an avatar for each user. The avatar is the first letter of the user’s username, displayed inside a colored circle.
•	This avatar is displayed next to the username in the profile and on posts.
________________________________________
5. Application Flow (Login, Registration, and More)
1.	Login Flow
o	User clicks Login with Google.
o	User is redirected to Google for authentication.
o	After successful login, Google sends the user back to the application.
o	If the user exists in the database, they are logged in. If not, they are redirected to the username registration page.
2.	Registration Flow
o	User enters a unique username on the registration page.
o	The application checks if the username already exists in the database.
o	If the username is available, the user is registered and redirected to the homepage.
3.	Logout Flow
o	When the user clicks Logout, the session is destroyed, and the user is logged out of both the blog and Google.
o	The user is then redirected to a confirmation page indicating successful logout.
________________________________________
6. Common Errors and Debugging
•	Database Issues: If you encounter database-related errors (e.g., missing tables), ensure that the database has been correctly initialized by running node populatedb.js or ensuring the database schema in server.js matches the requirements.
•	Google OAuth Issues: If you get an error during Google login:
o	Double-check your Google OAuth Client ID and Client Secret in the .env file.
o	Ensure your Google Developer Console is properly configured with the correct redirect URI (http://localhost:3000/auth/google/callback).
________________________________________
7. Stopping the Application
To stop the running server, go to the terminal where the server is running and press Ctrl + C.
