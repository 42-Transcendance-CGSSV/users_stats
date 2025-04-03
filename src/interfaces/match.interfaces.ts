export interface IMatchWin {
    match_id: string;
    winner_id: number;
    loser_id: number;
}

export interface IMatchStats {
    match_id: string;
    user_id: number;
    touched_balls: number;
    max_in_a_row: number;
    time_total: number;
}

export interface IMatchHistory {
    match_id: string;
    timestamp: number;
    won: boolean;
    opponent_id: number;
    touched_balls: number;
    precision: number;
    max_streak: number;
    duration: number;
}

export interface IMatchWinStats {
    total_matches: number;
    total_wins: number;
    total_losses: number;
    win_rate?: number;
} 