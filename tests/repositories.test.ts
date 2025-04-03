import sqlite3 from 'sqlite3';
import { setDatabase } from '../src/database/database';
import { createMatchWinTable, insertMatchWin, getMatchWinById } from '../src/repositories/match_win.repository';
import { createMatchStatsTable, insertMatchStats, getMatchStats } from '../src/repositories/match_stats.repository';
import { createAchievementsTable, insertDefaultAchievements, getAllAchievements, getAchievementById, getAchievementsByType } from '../src/repositories/achievements.repository';
import { createUserAchievementsTable, insertUserAchievement, getUserAchievements } from '../src/repositories/user_achievements.repository';
import { getLastMatches, getMatchDetails } from '../src/repositories/match_history.repository';
import { IMatchWin, IMatchStats, IMatchHistory } from '../src/interfaces/match.interfaces';
import { IAchievement, IUserAchievement, IAchievementProgress } from '../src/interfaces/achievement.interfaces';
import { getAchievementProgress } from '../src/repositories/achievement_progress.repository';
import fs from 'fs';

interface DBRow {
    [key: string]: any;
}

describe('Pong Database Tests', () => {
    const TEST_DB_PATH = './data/test_database.db';
    let testDb: sqlite3.Database;

    beforeAll(async () => {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        testDb = new sqlite3.Database(TEST_DB_PATH);
        setDatabase(testDb);

        // Create all tables
        await createMatchWinTable();
        await createMatchStatsTable();
        await createAchievementsTable();
        await createUserAchievementsTable();
    });

    beforeEach(async () => {
        // Clear all tables before each test
        await new Promise<void>((resolve) => {
            testDb.run('DELETE FROM match_win', () => {
                testDb.run('DELETE FROM match_stats', () => {
                    testDb.run('DELETE FROM achievements', () => {
                        testDb.run('DELETE FROM user_achievements', () => {
                            resolve();
                        });
                    });
                });
            });
        });
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            testDb.close(() => {
                fs.unlinkSync(TEST_DB_PATH);
                resolve();
            });
        });
    });

    describe('Match Win Repository', () => {
        it('should insert and retrieve match wins', async () => {
            // Insert test matches
            await insertMatchWin('match1', 1, 2);
            await insertMatchWin('match2', 2, 1);
            await insertMatchWin('match3', 1, 3);

            // Verify data
            const rows = await new Promise<DBRow[]>((resolve) => {
                testDb.all('SELECT * FROM match_win ORDER BY match_id', (_err, rows) => {
                    resolve(rows as DBRow[]);
                });
            });

            console.log('\nMatch Win Table:');
            console.table(rows);

            expect(rows.length).toBe(3);
        });

        it('should reject when match not found', async () => {
            await expect(getMatchWinById('non-existent')).rejects.toThrow('Match not found');
        });
    });

    describe('Match Stats Repository', () => {
        it('should insert and retrieve match statistics', async () => {
            // Insert test match stats
            await insertMatchStats('match1', 1, 50, 5, 180);  // 3 minutes, 50 touches, 5 streak
            await insertMatchStats('match2', 2, 75, 8, 240);  // 4 minutes, 75 touches, 8 streak
            await insertMatchStats('match3', 1, 100, 10, 300); // 5 minutes, 100 touches, 10 streak

            // Verify data
            const rows = await new Promise<DBRow[]>((resolve) => {
                testDb.all('SELECT * FROM match_stats ORDER BY match_id', (_err, rows) => {
                    resolve(rows as DBRow[]);
                });
            });

            console.log('\nMatch Stats Table:');
            console.table(rows);

            expect(rows.length).toBe(3);
        });

        it('should reject when match stats not found', async () => {
            await expect(getMatchStats('non-existent')).rejects.toThrow('Match stats not found');
        });
    });

    describe('Achievements Repository', () => {
        it('should insert and retrieve achievements', async () => {
            // Insert default achievements
            await insertDefaultAchievements();

            // Get all achievements
            const achievements = await getAllAchievements() as DBRow[];

            console.log('\nAchievements Table:');
            console.table(achievements);

            expect(achievements.length).toBeGreaterThan(0);
        });

        it('should reject when achievement not found', async () => {
            await expect(getAchievementById('non-existent')).rejects.toThrow('Achievement not found');
        });

        it('should reject when no achievements found', async () => {
            // Clear achievements table
            await new Promise<void>((resolve) => {
                testDb.run('DELETE FROM achievements', () => resolve());
            });
            await expect(getAllAchievements()).rejects.toThrow('No achievements found');
            // Restore achievements
            await insertDefaultAchievements();
        });

        it('should reject when no achievements of type found', async () => {
            await expect(getAchievementsByType('non-existent')).rejects.toThrow('No achievements found');
        });
    });

    describe('User Achievements Repository', () => {
        it('should track user achievements', async () => {
            // Insert some achievements first
            await insertDefaultAchievements();

            // Award achievements to users
            await insertUserAchievement(1, 'first_win');
            await insertUserAchievement(1, 'ball_rookie');
            await insertUserAchievement(2, 'first_win');

            // Get user achievements
            const user1Achievements = await getUserAchievements(1) as DBRow[];
            const user2Achievements = await getUserAchievements(2) as DBRow[];

            console.log('\nUser 1 Achievements:');
            console.table(user1Achievements);
            console.log('\nUser 2 Achievements:');
            console.table(user2Achievements);

            expect(user1Achievements.length).toBe(2);
            expect(user2Achievements.length).toBe(1);
        });

        it('should reject when no user achievements found', async () => {
            await expect(getUserAchievements(999)).rejects.toThrow('No achievements found');
        });
    });

    describe('Match History Repository', () => {
        it('should retrieve detailed match history', async () => {
            // Insert test matches and stats
            const matches = [
                { id: '1690000000000', winner: 1, loser: 2, touches: 50, streak: 5, time: 180 },
                { id: '1690000001000', winner: 2, loser: 1, touches: 75, streak: 8, time: 240 },
                { id: '1690000002000', winner: 1, loser: 3, touches: 100, streak: 10, time: 300 }
            ];

            for (const match of matches) {
                await insertMatchWin(match.id, match.winner, match.loser);
                await insertMatchStats(match.id, match.winner, match.touches, match.streak, match.time);
            }

            // Get match history for player 1
            const history = await getLastMatches(1, 10);
            console.log('\nMatch History for Player 1:');
            console.table(history);

            // Get specific match details
            const matchDetails = await getMatchDetails('1690000000000');
            console.log('\nDetails for Match 1690000000000:');
            console.table([matchDetails]);

            expect(history.length).toBe(3);
            expect(matchDetails).toBeDefined();
        });
    });

    describe('Integration Tests', () => {
        it('should track complete player journey', async () => {
            // 1. Insert matches and stats
            await insertMatchWin('match1', 1, 2);
            await insertMatchStats('match1', 1, 50, 5, 180);

            // 2. Insert achievements
            await insertDefaultAchievements();

            // 3. Award achievement
            await insertUserAchievement(1, 'first_win');

            // 4. Get complete player stats
            const matchHistory = await getLastMatches(1, 1);
            const achievements = await getUserAchievements(1) as DBRow[];

            console.log('\nPlayer 1 Complete Journey:');
            console.log('Match History:');
            console.table(matchHistory);
            console.log('Achievements:');
            console.table(achievements);

            expect(matchHistory.length).toBe(1);
            expect(achievements.length).toBe(1);
        });
    });

    describe('Interface Tests', () => {
        beforeEach(async () => {
            // Insert test data for all interfaces
            await insertMatchWin('test_match', 1, 2);
            await insertMatchStats('test_match', 1, 50, 5, 180);
            await insertDefaultAchievements();
            await insertUserAchievement(1, 'first_win');
        });

        it('should retrieve data in IMatchWin format', async () => {
            const matchWins = await new Promise<IMatchWin[]>((resolve) => {
                testDb.all('SELECT * FROM match_win', (_err, rows) => {
                    resolve(rows as IMatchWin[]);
                });
            });

            console.log('\nIMatchWin Interface Data:');
            console.table(matchWins);

            expect(matchWins[0]).toMatchObject({
                match_id: 'test_match',
                winner_id: 1,
                loser_id: 2
            });
        });

        it('should retrieve data in IMatchStats format', async () => {
            const matchStats = await new Promise<IMatchStats[]>((resolve) => {
                testDb.all('SELECT * FROM match_stats', (_err, rows) => {
                    resolve(rows as IMatchStats[]);
                });
            });

            console.log('\nIMatchStats Interface Data:');
            console.table(matchStats);

            expect(matchStats[0]).toMatchObject({
                match_id: 'test_match',
                user_id: 1,
                touched_balls: 50,
                max_in_a_row: 5,
                time_total: 180
            });
        });

        it('should retrieve data in IAchievement format', async () => {
            const achievements = await getAllAchievements() as IAchievement[];

            console.log('\nIAchievement Interface Data:');
            console.table(achievements);

            expect(achievements.length).toBeGreaterThan(0);
            expect(achievements[0]).toHaveProperty('achievement_id');
            expect(achievements[0]).toHaveProperty('description');
            expect(achievements[0]).toHaveProperty('goal_type');
            expect(achievements[0]).toHaveProperty('goal_amount');
        });

        it('should retrieve data in IUserAchievement format', async () => {
            const userAchievements = await new Promise<IUserAchievement[]>((resolve) => {
                testDb.all('SELECT user_id, achievement_id, datetime("now") as achieved_at FROM user_achievements WHERE user_id = ?', 
                    [1], (_err, rows) => {
                        resolve(rows as IUserAchievement[]);
                    });
            });

            console.log('\nIUserAchievement Interface Data:');
            console.table(userAchievements);

            expect(userAchievements.length).toBeGreaterThan(0);
            expect(userAchievements[0]).toHaveProperty('user_id');
            expect(userAchievements[0]).toHaveProperty('achievement_id');
            expect(userAchievements[0]).toHaveProperty('achieved_at');
        });

        it('should retrieve data in IMatchHistory format', async () => {
            const matchHistory = await getLastMatches(1, 1) as IMatchHistory[];

            console.log('\nIMatchHistory Interface Data:');
            console.table(matchHistory);

            expect(matchHistory.length).toBe(1);
            expect(matchHistory[0]).toHaveProperty('match_id');
            expect(matchHistory[0]).toHaveProperty('timestamp');
            expect(matchHistory[0]).toHaveProperty('won');
            expect(matchHistory[0]).toHaveProperty('opponent_id');
            expect(matchHistory[0]).toHaveProperty('touched_balls');
            expect(matchHistory[0]).toHaveProperty('precision');
            expect(matchHistory[0]).toHaveProperty('max_streak');
            expect(matchHistory[0]).toHaveProperty('duration');
        });

        it('should demonstrate complete data flow through all interfaces', async () => {
            // 1. Create a match
            const matchId = new Date().getTime().toString();
            await insertMatchWin(matchId, 1, 2);
            await insertMatchStats(matchId, 1, 75, 8, 240);

            // 2. Get match data through different interfaces
            const matchWin = await new Promise<IMatchWin[]>((resolve) => {
                testDb.all('SELECT * FROM match_win WHERE match_id = ?', [matchId], (_err, rows) => {
                    resolve(rows as IMatchWin[]);
                });
            });

            const matchStats = await new Promise<IMatchStats[]>((resolve) => {
                testDb.all('SELECT * FROM match_stats WHERE match_id = ?', [matchId], (_err, rows) => {
                    resolve(rows as IMatchStats[]);
                });
            });

            const matchHistory = await getMatchDetails(matchId) as IMatchHistory;

            console.log('\nComplete Data Flow Test:');
            console.log('Match Win Data:');
            console.table(matchWin);
            console.log('Match Stats Data:');
            console.table(matchStats);
            console.log('Match History Data:');
            console.table([matchHistory]);

            expect(matchWin[0].match_id).toBe(matchId);
            expect(matchStats[0].match_id).toBe(matchId);
            expect(matchHistory.match_id).toBe(matchId);
        });
    });

    describe('Achievement Progress Tests', () => {
        beforeEach(async () => {
            // Insert test matches and achievements
            await insertMatchWin('progress_match1', 1, 2);
            await insertMatchWin('progress_match2', 1, 2);
            await insertMatchStats('progress_match1', 1, 60, 7, 180);
            await insertMatchStats('progress_match2', 1, 50, 8, 120);
            await insertDefaultAchievements();
        });

        it('should track wins progress correctly', async () => {
            const progress = await getAchievementProgress(1, 'first_win');
            console.log('\nWins Achievement Progress:');
            console.table([progress]);
            
            expect(progress.goal_type).toBe('wins');
            expect(progress.goal_amount).toBe(1);
            expect(progress.current_progress).toBe(2); // User has 2 wins
        });

        it('should track touched balls progress correctly', async () => {
            const progress = await getAchievementProgress(1, 'ball_rookie');
            console.log('\nTouched Balls Achievement Progress:');
            console.table([progress]);
            
            expect(progress.goal_type).toBe('touched_balls');
            expect(progress.goal_amount).toBe(100);
            expect(progress.current_progress).toBe(110); // Total: 60 + 50 balls
        });

        it('should track max streak progress correctly', async () => {
            const progress = await getAchievementProgress(1, 'steady_hand');
            console.log('\nMax Streak Achievement Progress:');
            console.table([progress]);
            
            expect(progress.goal_type).toBe('max_streak');
            expect(progress.goal_amount).toBe(5);
            expect(progress.current_progress).toBe(8); // Highest streak: 8
        });

        it('should track play time progress correctly', async () => {
            const progress = await getAchievementProgress(1, 'rookie_player');
            console.log('\nPlay Time Achievement Progress:');
            console.table([progress]);
            
            expect(progress.goal_type).toBe('play_time');
            expect(progress.goal_amount).toBe(60);
            expect(progress.current_progress).toBe(300); // Total: 180 + 120 seconds
        });

        it('should show progress for all achievement types', async () => {
            const achievements = await getAllAchievements();
            const allProgress = await Promise.all(
                achievements.map(achievement => 
                    getAchievementProgress(1, achievement.achievement_id)
                )
            );

            console.log('\nAll Achievements Progress for User 1:');
            console.table(allProgress.map((progress: IAchievementProgress) => ({
                ...progress,
                completion_percentage: Math.min(100, (progress.current_progress / progress.goal_amount) * 100)
            })));

            expect(allProgress.length).toBe(achievements.length);
            expect(allProgress.every((p: IAchievementProgress) => p.current_progress >= 0)).toBe(true);
            expect(allProgress.every((p: IAchievementProgress) => p.goal_amount > 0)).toBe(true);
        });

        it('should handle non-existent achievement gracefully', async () => {
            await expect(getAchievementProgress(1, 'non-existent')).rejects.toThrow('Achievement not found');
        });

        it('should handle non-existent user gracefully', async () => {
            const progress = await getAchievementProgress(999, 'first_win');
            console.log('\nNon-existent User Progress:');
            console.table([progress]);
            
            expect(progress.goal_type).toBe('wins');
            expect(progress.goal_amount).toBe(1);
            expect(progress.current_progress).toBe(0);
        });
    });
}); 