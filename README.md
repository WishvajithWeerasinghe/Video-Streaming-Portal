# Reelhouse — On-Demand Video Streaming Metadata Portal

Reelhouse is a web application for browsing movies and series, managing their metadata, and playing videos hosted on other services. It uses React for the frontend, Express for the backend API, and MongoDB to store titles, accounts, subscriptions, and viewing progress.

## About the Project

Visitors can search the catalogue and filter titles by genre. Registered users can watch videos included in their plan and continue from where they stopped. Admins can add movies and series through the Add title form.

The website reads its catalogue from MongoDB. Titles added through the admin form are saved to the database through the API. They do not change the sample list in `seed.js`.

## Features

### Browsing

- Movie and series listings split into pages.
- Search by title, cast member, or description.
- Genre filters based on titles in the database.
- Detail pages with descriptions, release years, genres, and cast.
- Poster images, or coloured title cards when no poster is provided.
- Loading messages, empty results messages, and a retry button when the catalogue fails to load.

### Accounts

- Registration and login with an email and password.
- Password hashing with bcrypt.
- Login authentication using JSON Web Tokens (JWTs).
- User and admin roles.
- Backend permission checks for adding and updating titles.

### Adding and Updating Titles

- An admin-only form for adding movies and series.
- Fields for name, type, genres, cast, description, release year, poster URL, stream URL, and required plan.
- Checks for required names, valid release years, supported plans, and HTTP/HTTPS media URLs.
- An API endpoint for updating existing titles.

### Playback and Watch History

- HLS playback using hls.js where supported, with native browser playback as a fallback.
- Access to streams based on the user's current plan.
- Saved viewing progress and a Continue Watching page.
- Playback that resumes from the saved position.
- Title records that can contain metadata without a video link.

### Demo Subscriptions

- Free, Basic, and Premium plans.
- Basic includes Free titles; Premium includes titles from all three plans.
- Subscriptions with expiry dates and cancellation.
- Plan selection without payment processing.

## Technologies

| Part | Technologies | Use |
| --- | --- | --- |
| Frontend | React, Vite, CSS | Website interface and build tools |
| Video player | HTML video, hls.js | Playing videos hosted on other services |
| Backend | Node.js, Express | REST API and application logic |
| Database | MongoDB, Mongoose | Storing records and validating their fields |
| Authentication | JSON Web Tokens, bcryptjs | Login tokens and password hashing |
| Configuration | dotenv | Loading backend settings from environment variables |

## How the Application Works

```text
React frontend
      |
      | HTTP requests and JSON responses
      v
Express REST API
      |
      | Mongoose models
      v
MongoDB
```

The frontend asks the API for catalogue records. The API reads them from MongoDB and sends them back to display on the website. When an admin adds a title, the API checks their permissions, validates the fields, and saves the record to MongoDB.

Video playback uses a separate API endpoint. It checks the user's login and plan, then returns the video URL and saved playback position. The browser loads the video from its host. MongoDB stores the URL, not the video file.

## Database Collections

| Collection | Main fields | Stores |
| --- | --- | --- |
| `users` | Email, password hash, role, timestamps | User accounts and roles |
| `titles` | Name, type, genres, cast, description, release year, poster URL, stream URL, required plan, timestamps | Movie and series metadata |
| `subscriptions` | User reference, plan, status, start date, end date | Subscription plans, status, and dates |
| `watches` | User reference, title reference, progress in seconds, timestamps | Watch history and playback positions |

Titles have indexes on name and genre. Watch records have a unique index on the user and title together, so each user has one progress record per title.