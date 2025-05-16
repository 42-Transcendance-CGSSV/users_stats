import { db } from "../database/database";
import { IAchievementProgress } from '../interfaces/achievement.interfaces';

export async function getAchievementProgress(user_id: number, achievement_id: string): Promise<IAchievementProgress> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT a.goal_type, a.goal_amount,
                    CASE a.goal_type
                        WHEN 'wins' THEN (
                            SELECT COALESCE(COUNT(*), 0)
                            FROM match_win 
                            WHERE winner_id = ?
                        )
                        WHEN 'touched_balls' THEN (
                            SELECT COALESCE(SUM(ms.touched_balls), 0)
                            FROM match_win mw
                            LEFT JOIN match_stats ms ON ms.match_id = mw.match_id
                            WHERE (mw.winner_id = ? OR mw.loser_id = ?)
                        )
                        WHEN 'max_streak' THEN (
                            SELECT COALESCE(MAX(ms.max_in_a_row), 0)
                            FROM match_win mw
                            LEFT JOIN match_stats ms ON ms.match_id = mw.match_id
                            WHERE (mw.winner_id = ? OR mw.loser_id = ?)
                        )
                        WHEN 'play_time' THEN (
                            SELECT COALESCE(SUM(ms.time_total), 0)
                            FROM match_win mw
                            LEFT JOIN match_stats ms ON ms.match_id = mw.match_id
                            WHERE (mw.winner_id = ? OR mw.loser_id = ?)
                        )
                        ELSE 0
                    END as current_progress
             FROM achievements a
             WHERE a.achievement_id = ?;`,
            [user_id, user_id, user_id, user_id, user_id, user_id, user_id, achievement_id],
            (err, row: any) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('Achievement not found'));
                } else {
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