import request from 'supertest';
import app from '../src/app';
import sqlite3 from 'sqlite3';
import { db, setDatabase } from '../src/database/database';

describe('Match Outcome Routes', () => {
  beforeAll(async () => {
    // Initialize in-memory database for testing
    const testDb = new sqlite3.Database(':memory:');
    setDatabase(testDb);

    // Initialize database and insert test data
    await new Promise<void>((resolve) => {
      db.serialize(() => {
        // Create tables if they don't exist
        db.run(`
          CREATE TABLE IF NOT EXISTS match_win (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            winner_id TEXT NOT NULL,
            loser_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS match_stats (
            match_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            touched_balls INTEGER NOT NULL,
            max_streak INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            FOREIGN KEY (match_id) REFERENCES match_win(id)
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            goal_amount INTEGER NOT NULL
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS user_achievements (
            user_id TEXT NOT NULL,
            achievement_id INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            PRIMARY KEY (user_id, achievement_id)
          )
        `);

        // Insert test achievements
        db.run(`
          INSERT OR IGNORE INTO achievements (type, goal_amount)
          VALUES 
            ('wins', 1),
            ('losses', 1),
            ('touched_balls', 100),
            ('max_streak', 5),
            ('play_time', 3600)
        `);

        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up database
    await new Promise<void>((resolve) => {
      db.serialize(() => {
        db.run('DROP TABLE IF EXISTS match_win');
        db.run('DROP TABLE IF EXISTS match_stats');
        db.run('DROP TABLE IF EXISTS achievements');
        db.run('DROP TABLE IF EXISTS user_achievements');
        resolve();
      });
    });
    // Close the database connection
    await new Promise<void>((resolve) => {
      db.close(() => resolve());
    });
  });

  describe('POST /api/matches', () => {
    it('should record a match outcome and update achievements', async () => {
      const response = await request(app)
        .post('/api/matches')
        .send({
          winnerId: 'user1',
          loserId: 'user2',
          winnerStats: {
            touchedBalls: 150,
            maxStreak: 8,
            duration: 300
          },
          loserStats: {
            touchedBalls: 120,
            maxStreak: 4,
            duration: 300
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Match outcome successfully recorded');
      expect(response.body).toHaveProperty('matchId');

      // Verify match was recorded
      const match = await new Promise((resolve) => {
        db.get(
          'SELECT * FROM match_win WHERE winner_id = ? AND loser_id = ?',
          ['user1', 'user2'],
          (err: Error | null, row: any) => {
            if (err) throw err;
            resolve(row);
          }
        );
      });

      expect(match).toBeTruthy();

      // Verify achievements were updated
      const winnerAchievements = await new Promise((resolve) => {
        db.all(
          'SELECT * FROM user_achievements WHERE user_id = ?',
          ['user1'],
          (err: Error | null, rows: any[]) => {
            if (err) throw err;
            resolve(rows);
          }
        );
      });

      expect(winnerAchievements).toHaveLength(1);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/matches')
        .send({
          winnerId: 'user1',
          loserId: 'user2'
          // Missing winnerStats and loserStats
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should handle invalid stats data', async () => {
      const response = await request(app)
        .post('/api/matches')
        .send({
          winnerId: 'user1',
          loserId: 'user2',
          winnerStats: {
            touchedBalls: 150
            // Missing maxStreak and duration
          },
          loserStats: {
            touchedBalls: 120,
            maxStreak: 4,
            duration: 300
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required stats fields');
    });
  });
}); 