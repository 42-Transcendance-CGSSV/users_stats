import { db } from "../database/database";
import { IMatchHistory } from "../interfaces/match.interfaces";

export async function getLastMatches(user_id: number, limit: number = 20): Promise<IMatchHistory[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                mw.match_id,
                mw.winner_id,
                mw.loser_id,
                ms.touched_balls,
                ms.max_in_a_row as max_streak,
                ms.time_total as duration,
                CASE 
                    WHEN mw.winner_id = ? THEN true
                    ELSE false
                END as won,
                CASE 
                    WHEN mw.winner_id = ? THEN mw.loser_id
                    ELSE mw.winner_id
                END as opponent_id,
                CAST(SUBSTR(mw.match_id, 1, 13) AS INTEGER) as timestamp
            FROM match_win mw
            JOIN match_stats ms ON mw.match_id = ms.match_id
            WHERE mw.winner_id = ? OR mw.loser_id = ?
            ORDER BY timestamp DESC
            LIMIT ?;`,
            [user_id, user_id, user_id, user_id, limit],
            (err, rows: any[]) => {
                if (err) reject(err);
                else {
                    const matches: IMatchHistory[] = rows.map((row: any) => ({
                        match_id: row.match_id,
                        timestamp: row.timestamp,
                        won: row.won === 1,
                        opponent_id: row.opponent_id,
                        touched_balls: row.touched_balls,
                        precision: Math.round((row.touched_balls / (row.touched_balls * 1.2)) * 100), // Assuming 20% missed balls
                        max_streak: row.max_streak,
                        duration: row.duration
                    }));
                    resolve(matches);
                }
            }
        );
    });
}

export async function getMatchDetails(match_id: string): Promise<IMatchHistory> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                mw.match_id,
                mw.winner_id,
                mw.loser_id,
                ms.touched_balls,
                ms.max_in_a_row as max_streak,
                ms.time_total as duration,
                CAST(SUBSTR(mw.match_id, 1, 13) AS INTEGER) as timestamp
            FROM match_win mw
            JOIN match_stats ms ON mw.match_id = ms.match_id
            WHERE mw.match_id = ?;`,
            [match_id],
            (err, row: any) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Match not found'));
                else {
                    const match: IMatchHistory = {
                        match_id: row.match_id,
                        timestamp: row.timestamp,
                        won: true, // This needs to be compared with user_id in the service layer
                        opponent_id: row.loser_id, // This needs to be adjusted in the service layer
                        touched_balls: row.touched_balls,
                        precision: (row.touched_balls / (row.touched_balls * 1.2)) * 100,
                        max_streak: row.max_streak,
                        duration: row.duration
                    };
                    resolve(match);
                }
            }
        );
    });
} 