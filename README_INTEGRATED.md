# SmartPrepAI Final Project

A complete final-year placement preparation platform that integrates:

- AI mock interview practice
- LeetCode-style coding challenge practice
- Resume analysis
- Admin dashboard
- Image-based aptitude test platform like TCS NQT / AMCAT / HackerRank MCQ exams

## What Was Integrated

The aptitude module is now part of the main Smart Interview AI project, not a separate link-only app.

Student routes:

- /aptitude - aptitude test list with difficulty filter
- /aptitude/exam/:attemptId - secure exam UI with timer, palette, autosave, mark for review, clear response
- /aptitude/results/:attemptId - score, accuracy, time taken, analytics, review, and AI feedback

Admin route:

- /admin/aptitude - manage categories, difficulty levels, question image uploads, and tests

Backend API:

- /api/aptitude/meta
- /api/aptitude/tests
- /api/aptitude/attempts/start
- /api/aptitude/attempts/:attemptId/state
- /api/aptitude/attempts/:attemptId/response
- /api/aptitude/attempts/:attemptId/submit
- /api/aptitude/results/:attemptId
- /api/aptitude/admin/*

## How To Open In VS Code

Open this folder directly in Visual Studio Code:

SmartPrepAI_Final_Project

## Setup

1. Install Node.js.
2. Install MongoDB locally, or put your MongoDB Atlas connection string in backend/.env.
3. Open terminal in this root folder.
4. Run:

    npm run install:all

5. Start backend in one terminal:

    npm run dev:backend

6. Start frontend in another terminal:

    npm run dev:frontend

7. Open the frontend URL shown by Vite, usually:

    http://localhost:5175

## Environment Files

Real secrets from the uploaded zip were removed from this final folder. Add your own keys in:

- backend/.env
- frontend/.env
- ai-server/.env

For aptitude tests, MongoDB and JWT secrets are enough. Gemini, Stripe, Email, Cloudinary, Redis, and Python AI server are optional depending on which modules you want to demo.

## Aptitude Module Notes

The database stores only:

- image path
- correct option A/B/C/D
- difficulty
- category
- marks
- time limit
- explanation

Question text and options are inside uploaded images.

Demo seed data is created automatically when backend connects to MongoDB. Sample question images are stored in:

backend/public/uploads/aptitude/questions

## Final-Year Project Talking Points

- Single integrated placement preparation platform
- AI interview + coding + aptitude in one dashboard
- Admin-controlled image question bank
- Real online exam experience with timer and question palette
- Autosave and auto-submit
- Performance analytics and personalized AI feedback
- Secure JWT authentication and role-based admin routes
- Responsive React UI and Express/MongoDB backend
