# Transcendence User Statistics Microservice

This microservice handles user statistics for the Transcendence project, including match history tracking and achievement systems.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following contents:
```
PORT=3001
```

3. Start the server:
```bash
npx ts-node src/app.ts
```

## API Endpoints

### Match History

#### Record Match Outcome
- **URL**: `POST /api/matches`
- **Description**: Records the outcome of a match between two players
- **Request Body**:
  ```json
  {
    "winnerId": 1,
    "loserId": 2,
    "score": "10-5",
    "gameDuration": 300,
    "touchedBalls": 15
  }
  ```
- **Response**: `201 Created` with match details

#### Get Global Match History
- **URL**: `GET /api/matches/global`
- **Description**: Retrieves global match history
- **Response**: `200 OK` with list of matches

#### Get User Match History
- **URL**: `GET /api/users/:userId/matches`
- **Description**: Retrieves match history for a specific user
- **Response**: `200 OK` with list of user's matches

### Achievements

#### Initialize Default Achievements
- **URL**: `POST /api/achievements/init`
- **Description**: Initializes the default set of achievements in the database
- **Response**: `201 Created` with list of created achievements

#### Get All Achievements
- **URL**: `GET /api/achievements`
- **Description**: Retrieves all available achievements
- **Response**: `200 OK` with list of achievements

#### Get Achievements by Type
- **URL**: `GET /api/achievements/types/:type`
- **Description**: Retrieves achievements filtered by type (wins, touched_balls, max_streak, play_time)
- **Response**: `200 OK` with filtered achievements

#### Get User's Progress
- **URL**: `GET /api/achievements/users/:userId/progress`
- **Description**: Retrieves a user's progress toward all achievements
- **Response**: `200 OK` with user's progress data

#### Check/Unlock Achievement
- **URL**: `POST /api/achievements/users/:userId/:achievementId/check`
- **Description**: Checks if a user has met criteria for an achievement and unlocks it if so
- **Response**: `200 OK` with updated achievement status

## Achievement Types

The system includes achievements based on different metrics:

1. **Wins** - Based on number of victories
   - First Victory (1 win)
   - Rising Star (5 wins)
   - Champion (10 wins)
   - Pong Legend (25 wins)
   - Pong Master (50 wins)

2. **Touched Balls** - Based on ball interactions
   - Ball Novice (10 touches)
   - Ball Apprentice (50 touches)
   - Ball Expert (100 touches)
   - Ball Master (500 touches)
   - Ball Virtuoso (1000 touches)

3. **Max Streak** - Based on consecutive wins
   - Streak Starter (3 streak)
   - Momentum Builder (5 streak)
   - Unstoppable (10 streak)
   - Pong Dominator (15 streak)
   - Untouchable (20 streak)

4. **Play Time** - Based on total time played (in seconds)
   - Pong Beginner (300 seconds)
   - Pong Enthusiast (900 seconds)
   - Pong Addict (1800 seconds)
   - Pong Veteran (3600 seconds)
   - Pong Lifer (7200 seconds)

## Database Structure

The service uses SQLite with the following tables:

- `match_wins` - Stores match outcomes
- `match_stats` - Stores detailed match statistics
- `achievements` - Stores available achievements
- `user_achievements` - Tracks which users have unlocked which achievements

## Technical Stack

- Node.js with TypeScript
- Fastify with Express compatibility layer
- SQLite database
- Pino for logging 