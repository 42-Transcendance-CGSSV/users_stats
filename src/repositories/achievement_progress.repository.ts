import { db } from "../database/database";
import { IAchievementProgress } from '../interfaces/achievement.interfaces';

export async function getAchievementProgress(user_id: number, achievement_id: string): Promise<IAchievementProgress> {
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
            (err, row: any) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Achievement not found'));
                else {
                    const progress: IAchievementProgress = {
                        goal_type: row.goal_type,
                        goal_amount: row.goal_amount,
                        current_progress: row.current_progress || 0
                    };
                    resolve(progress);
                }
            }
        );
    });
} 