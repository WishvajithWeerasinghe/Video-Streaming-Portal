# Reelhouse: Video Streaming Metadata Portal

## Run locally
Needs Node 18+ and MongoDB (local, or an Atlas URI).

    # terminal 1: API
    cd server && cp .env.example .env && npm install && npm run seed && npm run dev

    # terminal 2: React app
    cd client && npm install && npm run dev

Open http://localhost:5173. Admin login: admin@example.com / admin123.
API health check: http://localhost:4000/health
