import { db } from "../database/database";
import { IMatchStats } from '../interfaces/match.interfaces';

export async function createMatchStatsTable() {
    return new Promise<void>((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS match_stats (
            match_id VARCHAR(36) NOT NULL,
            user_id INTEGER NOT NULL,
            touched_balls SMALLINT NOT NULL,
            max_in_a_row TINYINT NOT NULL,
            time_total INTEGER NOT NULL
        );`, 
        (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function insertMatchStats(
    match_id: string,
    user_id: number,
    touched_balls: number,
    max_in_a_row: number,
    time_total: number
): Promise<void> {
    return new Promise<void>((resolve) => {
        db.run(
            `INSERT OR IGNORE INTO match_stats (match_id, user_id, touched_balls, max_in_a_row, time_total) 
             VALUES (?, ?, ?, ?, ?);`,
            [match_id, user_id, touched_balls, max_in_a_row, time_total],
            () => resolve()
        );
    });
}

export async function getMatchStats(match_id: string): Promise<IMatchStats | undefined> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM match_stats WHERE match_id = ?;`,
            [match_id],
            (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Match stats not found'));
                else resolve(row as IMatchStats);
            }
        );
    });
} 