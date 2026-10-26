# Assignment Submission and Grading System

A full stack web app where students submit assignments and teachers grade them.

**Live link:** (add your Render URL here)

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB Atlas (Mongoose)
- Auth: JWT and bcrypt

## Features
- Register and log in as student or teacher
- Students submit title, description and a file link, and view marks and feedback
- Teachers view all submissions and give marks (0-100) and feedback

## How to run locally
1. Install Node.js 18 or newer.
2. Clone the repo and open the folder:
   ```
   git clone <your-repo-url>
   cd assignment-system
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your MongoDB Atlas connection string, a JWT secret and a teacher code.
4. Start the server:
   ```
   npm start
   ```
5. Open http://localhost:3000

## Environment variables
| Name | Purpose |
|---|---|
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | Secret for signing login tokens |
| TEACHER_CODE | Code needed to register as a teacher |
| PORT | Optional, defaults to 3000 |
