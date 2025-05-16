import { db } from "../database/database";
import { IUserAchievement } from '../interfaces/achievement.interfaces';

export async function createUserAchievementsTable() {
    return new Promise<void>((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
            user_id INTEGER NOT NULL,
            achievement_id VARCHAR(36) NOT NULL,
            achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, achievement_id)
        );`, 
        (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function insertUserAchievement(user_id: number, achievement_id: string): Promise<void> {
    return new Promise<void>((resolve) => {
        db.run(
            `INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, achieved_at) 
             VALUES (?, ?, datetime('now'));`,
            [user_id, achievement_id],
            () => {
                resolve();
            }
        );
    });
}

export async function getUserAchievements(user_id: number): Promise<IUserAchievement[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT ua.user_id, ua.achievement_id, ua.achieved_at
             FROM user_achievements ua
             WHERE ua.user_id = ?;`,
            [user_id],
            (err, rows) => {
                if (err) reject(err);
                else if (!rows || rows.length === 0) reject(new Error('No achievements found'));
                else resolve(rows as IUserAchievement[]);
            }
        );
    });
}

export async function hasAchievement(user_id: number, achievement_id: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        db.get(
            `SELECT 1 FROM user_achievements 
             WHERE user_id = ? AND achievement_id = ?;`,
            [user_id, achievement_id],
            (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            }
        );
    });
}

interface AchievementProgress {
    goal_type: string;
    goal_amount: number;
    current_progress: number;
}

export async function getAchievementProgress(user_id: number, achievement_id: string): Promise<AchievementProgress> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT a.goal_type, a.goal_amount,
                    CASE a.goal_type
                        WHEN 'wins' THEN (
                            SELECT COUNT(*) 
                            FROM match_win 
                            WHERE winner_id = ?
                        )
                        WHEN 'touched_balls' THEN (
                            SELECT SUM(touched_balls) 
                            FROM match_stats 
                            WHERE user_id = ?
                        )
                        WHEN 'max_streak' THEN (
                            SELECT MAX(max_in_a_row) 
                            FROM match_stats 
                            WHERE user_id = ?
                        )
                        WHEN 'play_time' THEN (
                            SELECT SUM(time_total) 
                            FROM match_stats 
                            WHERE user_id = ?
                        )
                        ELSE 0
                    END as current_progress
             FROM achievements a
             WHERE a.achievement_id = ?;`,
            [user_id, user_id, user_id, user_id, achievement_id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row as AchievementProgress);
            }
        );
    });
} 