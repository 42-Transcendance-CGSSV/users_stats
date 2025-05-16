import request from 'supertest';
import app from '../src/app';
import sqlite3 from 'sqlite3';
import { setDatabase, db } from '../src/database/database';
import { insertMatchWin, createMatchWinTable } from '../src/repositories/match_win.repository';
import { insertMatchStats, createMatchStatsTable } from '../src/repositories/match_stats.repository';

describe('Match History Routes', () => {
    beforeAll(async () => {
        // Initialize test database
        const testDb = new sqlite3.Database(':memory:');
        setDatabase(testDb);

        // Create necessary tables
        await Promise.all([
            createMatchWinTable(),
            createMatchStatsTable()
        ]);
    });

    beforeEach(async () => {
        // Clear tables before each test
        await new Promise<void>((resolve, reject) => {
            db.serialize(() => {
                db.run('DELETE FROM match_win', (err) => {
                    if (err) reject(err);
                    db.run('DELETE FROM match_stats', (err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });
            });
        });

        // Insert test data
        const matches = [
            { id: '1690000000000', winner: 1, loser: 2, touches: 50, streak: 5, time: 180 },
            { id: '1690000001000', winner: 2, loser: 1, touches: 75, streak: 8, time: 240 },
            { id: '1690000002000', winner: 1, loser: 3, touches: 100, streak: 10, time: 300 },
            { id: '1690000003000', winner: 3, loser: 2, touches: 60, streak: 6, time: 200 },
            { id: '1690000004000', winner: 1, loser: 2, touches: 80, streak: 7, time: 220 }
        ];

        for (const match of matches) {
            await insertMatchWin(match.id, match.winner, match.loser);
            await insertMatchStats(match.id, match.winner, match.touches, match.streak, match.time);
        }
    });

    afterAll(async () => {
        // Close database connection after all tests
        await new Promise<void>((resolve) => {
            db.close(() => resolve());
        });
    });

    describe('GET /api/matches/global', () => {
        it('should return paginated global match history', async () => {
            const response = await request(app)
                .get('/api/matches/global')
                .query({ page: 1, pageSize: 3 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('matches');
            expect(response.body).toHaveProperty('total', 5);
            expect(response.body).toHaveProperty('page', 1);
            expect(response.body).toHaveProperty('totalPages', 2);
            expect(response.body.matches).toHaveLength(3);
        });

        it('should return second page of matches', async () => {
            const response = await request(app)
                .get('/api/matches/global')
                .query({ page: 2, pageSize: 3 });

            expect(response.status).toBe(200);
            expect(response.body.matches).toHaveLength(2);
            expect(response.body.page).toBe(2);
        });

        it('should handle invalid page number', async () => {
            const response = await request(app)
                .get('/api/matches/global')
                .query({ page: 0 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid page number');
        });

        it('should handle invalid page size', async () => {
            const response = await request(app)
                .get('/api/matches/global')
                .query({ pageSize: 0 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid page size');
        });
    });

    describe('GET /api/users/:userId/matches', () => {
        it('should return paginated match history for a user', async () => {
            const response = await request(app)
                .get('/api/users/1/matches')
                .query({ page: 1, pageSize: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('matches');
            expect(response.body).toHaveProperty('total', 4); // User 1 has 4 matches
            expect(response.body).toHaveProperty('page', 1);
            expect(response.body).toHaveProperty('totalPages', 2);
            expect(response.body.matches).toHaveLength(2);
        });

        it('should handle non-existent user', async () => {
            const response = await request(app)
                .get('/api/users/999/matches');

            expect(response.status).toBe(200);
            expect(response.body.matches).toHaveLength(0);
            expect(response.body.total).toBe(0);
        });

        it('should handle invalid user ID', async () => {
            const response = await request(app)
                .get('/api/users/invalid/matches');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid user ID');
        });
    });

    describe('GET /api/matches/:matchId', () => {
        it('should return match details from winner perspective', async () => {
            const response = await request(app)
                .get('/api/matches/1690000000000')
                .query({ userId: 1 }); // User 1 won this match

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('match_id', '1690000000000');
            expect(response.body).toHaveProperty('won', true);
            expect(response.body).toHaveProperty('opponent_id', 2);
            expect(response.body).toHaveProperty('touched_balls', 50);
            expect(response.body).toHaveProperty('max_streak', 5);
            expect(response.body).toHaveProperty('duration', 180);
        });

        it('should return match details from loser perspective', async () => {
            const response = await request(app)
                .get('/api/matches/1690000000000')
                .query({ userId: 2 }); // User 2 lost this match

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('match_id', '1690000000000');
            expect(response.body).toHaveProperty('won', false);
            expect(response.body).toHaveProperty('opponent_id', 1);
            expect(response.body).toHaveProperty('touched_balls', 50);
            expect(response.body).toHaveProperty('max_streak', 5);
            expect(response.body).toHaveProperty('duration', 180);
        });

        it('should handle non-existent match', async () => {
            const response = await request(app)
                .get('/api/matches/non-existent');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Match not found');
        });

        it('should handle missing match ID', async () => {
            const response = await request(app)
                .get('/api/matches/');

            expect(response.status).toBe(404);
        });
    });
}); 