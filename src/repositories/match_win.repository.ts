import { db } from "../database/database";
import { IMatchWin, IMatchWinStats } from '../interfaces/match.interfaces';

export async function createMatchWinTable() {
    return new Promise<void>((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS match_win (
            match_id VARCHAR(36) PRIMARY KEY,
            winner_id INTEGER NOT NULL,
            loser_id INTEGER NOT NULL
        );`, 
        (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function insertMatchWin(match_id: string, winner_id: number, loser_id: number) {
    return new Promise<void>((resolve) => {
        db.run(
            `INSERT OR IGNORE INTO match_win (match_id, winner_id, loser_id) 
             VALUES (?, ?, ?);`,
            [match_id, winner_id, loser_id],
            () => {
                resolve();
            }
        );
    });
}

export async function getMatchWinById(match_id: string): Promise<IMatchWin | undefined> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM match_win WHERE match_id = ?;`, [match_id], (err, row) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Match not found'));
            else resolve(row as IMatchWin);
        });
    });
}

export async function getMatchesByWinnerId(winner_id: number): Promise<IMatchWin[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM match_win WHERE winner_id = ?;`, [winner_id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows as IMatchWin[]);
        });
    });
}

export async function getMatchesByLoserId(loser_id: number): Promise<IMatchWin[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM match_win WHERE loser_id = ?;`, [loser_id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows as IMatchWin[]);
        });
    });
}

export async function getUserMatchStats(user_id: number): Promise<IMatchWinStats> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                (SELECT COUNT(*) FROM match_win WHERE winner_id = ? OR loser_id = ?) as total_matches,
                (SELECT COUNT(*) FROM match_win WHERE winner_id = ?) as total_wins,
                (SELECT COUNT(*) FROM match_win WHERE loser_id = ?) as total_losses
            `,
            [user_id, user_id, user_id, user_id],
            (err, row: any) => {
                if (err) reject(err);
                else {
                    const stats: IMatchWinStats = {
                        total_matches: row?.total_matches || 0,
                        total_wins: row?.total_wins || 0,
                        total_losses: row?.total_losses || 0,
                        win_rate: row?.total_matches ? (row.total_wins / row.total_matches) * 100 : 0
                    };
                    resolve(stats);
                }
            }
        );
    });
}

export async function getGlobalMatchStats(): Promise<IMatchWinStats> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COUNT(*) as total_matches,
                COUNT(DISTINCT winner_id) + COUNT(DISTINCT loser_id) as total_players
            FROM match_win`,
            [],
            (err, row: any) => {
                if (err) reject(err);
                else {
                    const stats: IMatchWinStats = {
                        total_matches: row?.total_matches || 0,
                        total_wins: row?.total_matches || 0, // In global stats, total wins equals total matches
                        total_losses: row?.total_matches || 0, // In global stats, total losses equals total matches
                    };
                    resolve(stats);
                }
            }
        );
    });
}

export async function getHeadToHeadStats(player1_id: number, player2_id: number): Promise<IMatchWinStats> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COUNT(*) as total_matches,
                SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as player1_wins,
                SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as player2_wins
            FROM match_win 
            WHERE (winner_id = ? AND loser_id = ?) 
               OR (winner_id = ? AND loser_id = ?)`,
            [player1_id, player2_id, player1_id, player2_id, player2_id, player1_id],
            (err, row: any) => {
                if (err) reject(err);
                else {
                    const stats: IMatchWinStats = {
                        total_matches: row?.total_matches || 0,
                        total_wins: row?.player1_wins || 0,
                        total_losses: row?.player2_wins || 0,
                        win_rate: row?.total_matches ? (row.player1_wins / row.total_matches) * 100 : 0
                    };
                    resolve(stats);
                }
            }
        );
    });
}






