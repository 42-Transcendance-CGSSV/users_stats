import { db } from "../database/database";
import { IMatchHistory } from "../interfaces/match.interfaces";

export interface PaginatedMatches {
    matches: IMatchHistory[];
    total: number;
    page: number;
    totalPages: number;
}

export async function getMatchesPage(user_id: number, page: number = 1, pageSize: number = 20): Promise<PaginatedMatches> {
    const offset = (page - 1) * pageSize;
    
    return new Promise((resolve, reject) => {
        // First, get total count
        db.get(
            `SELECT COUNT(*) as total
            FROM match_win
            WHERE winner_id = ? OR loser_id = ?`,
            [user_id, user_id],
            (err, countRow: any) => {
                if (err) reject(err);
                else {
                    const total = countRow.total;
                    const totalPages = Math.ceil(total / pageSize);

                    // Then get the matches for the requested page
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
                        LIMIT ? OFFSET ?;`,
                        [user_id, user_id, user_id, user_id, pageSize, offset],
                        (err, rows: any[]) => {
                            if (err) reject(err);
                            else {
                                const matches: IMatchHistory[] = rows.map((row: any) => ({
                                    match_id: row.match_id,
                                    timestamp: row.timestamp,
                                    won: row.won === 1,
                                    opponent_id: row.opponent_id,
                                    touched_balls: row.touched_balls,
                                    precision: Math.round((row.touched_balls / (row.touched_balls * 1.2)) * 100),
                                    max_streak: row.max_streak,
                                    duration: row.duration
                                }));
                                resolve({
                                    matches,
                                    total,
                                    page,
                                    totalPages
                                });
                            }
                        }
                    );
                }
            }
        );
    });
}

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

export async function getMatchDetails(match_id: string, user_id?: number): Promise<IMatchHistory | null> {
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
            LEFT JOIN match_stats ms ON mw.match_id = ms.match_id
            WHERE mw.match_id = ?;`,
            [match_id],
            (err, row: any) => {
                if (err) reject(err);
                else if (!row) resolve(null);
                else {
                    const winnerId = parseInt(row.winner_id);
                    const loserId = parseInt(row.loser_id);
                    const match: IMatchHistory = {
                        match_id: row.match_id,
                        timestamp: row.timestamp,
                        won: user_id ? winnerId === user_id : true, // If user_id provided, show from their perspective, otherwise from winner's
                        opponent_id: user_id ? (winnerId === user_id ? loserId : winnerId) : loserId,
                        touched_balls: row.touched_balls || 0,
                        precision: row.touched_balls ? Math.round((row.touched_balls / (row.touched_balls + 10)) * 100) : 0,
                        max_streak: row.max_streak || 0,
                        duration: row.duration || 0
                    };
                    resolve(match);
                }
            }
        );
    });
}

export async function getGlobalMatchHistory(page: number = 1, pageSize: number = 20): Promise<PaginatedMatches> {
    const offset = (page - 1) * pageSize;
    
    return new Promise((resolve, reject) => {
        // First, get total count
        db.get(
            `SELECT COUNT(*) as total FROM match_win`,
            [],
            (err, countRow: any) => {
                if (err) reject(err);
                else {
                    const total = countRow.total;
                    const totalPages = Math.ceil(total / pageSize);

                    // Then get the matches for the requested page
                    db.all(
                        `SELECT 
                            mw.match_id,
                            mw.winner_id,
                            mw.loser_id,
                            ms.touched_balls,
                            ms.max_in_a_row as max_streak,
                            ms.time_total as duration,
                            true as won,
                            mw.loser_id as opponent_id,
                            CAST(SUBSTR(mw.match_id, 1, 13) AS INTEGER) as timestamp
                        FROM match_win mw
                        JOIN match_stats ms ON mw.match_id = ms.match_id
                        ORDER BY timestamp DESC
                        LIMIT ? OFFSET ?;`,
                        [pageSize, offset],
                        (err, rows: any[]) => {
                            if (err) reject(err);
                            else {
                                const matches: IMatchHistory[] = rows.map((row: any) => ({
                                    match_id: row.match_id,
                                    timestamp: row.timestamp,
                                    won: true, // For global history, we show from winner's perspective
                                    opponent_id: row.loser_id,
                                    touched_balls: row.touched_balls,
                                    precision: Math.round((row.touched_balls / (row.touched_balls * 1.2)) * 100),
                                    max_streak: row.max_streak,
                                    duration: row.duration
                                }));
                                resolve({
                                    matches,
                                    total,
                                    page,
                                    totalPages
                                });
                            }
                        }
                    );
                }
            }
        );
    });
}

export async function insertMatchOutcome(
  winnerId: string,
  loserId: string,
  winnerTouchedBalls: number,
  winnerMaxStreak: number,
  winnerDuration: number,
  loserTouchedBalls: number,
  loserMaxStreak: number,
  loserDuration: number
): Promise<string> {
  // Generate a unique match ID using timestamp and random suffix
  const matchId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Insert match win record
      db.run(
        `INSERT INTO match_win (match_id, winner_id, loser_id)
         VALUES (?, ?, ?)`,
        [matchId, winnerId, loserId],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Insert winner stats
          db.run(
            `INSERT INTO match_stats (match_id, user_id, touched_balls, max_in_a_row, time_total)
             VALUES (?, ?, ?, ?, ?)`,
            [matchId, winnerId, winnerTouchedBalls, winnerMaxStreak, winnerDuration],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              // Insert loser stats
              db.run(
                `INSERT INTO match_stats (match_id, user_id, touched_balls, max_in_a_row, time_total)
                 VALUES (?, ?, ?, ?, ?)`,
                [matchId, loserId, loserTouchedBalls, loserMaxStreak, loserDuration],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    resolve(matchId);
                  });
                }
              );
            }
          );
        }
      );
    });
  });
} 