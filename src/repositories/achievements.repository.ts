import { db } from "../database/database";
import { IAchievement } from '../interfaces/achievement.interfaces';

export async function createAchievementsTable() {
    return new Promise<void>((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS achievements (
            achievement_id VARCHAR(36) PRIMARY KEY,
            description VARCHAR(36) NOT NULL,
            goal_type VARCHAR(36) NOT NULL,
            goal_amount SMALLINT NOT NULL
        );`, 
        (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export const ACHIEVEMENT_TYPES = {
    WINS: 'wins',
    TOUCHED_BALLS: 'touched_balls',
    MAX_STREAK: 'max_streak',
    PLAY_TIME: 'play_time'  // in minutes
} as const;

export const DEFAULT_ACHIEVEMENTS: IAchievement[] = [
    // Wins achievements
    {
        achievement_id: 'first_win',
        description: 'First Victory',
        goal_type: ACHIEVEMENT_TYPES.WINS,
        goal_amount: 1
    },
    {
        achievement_id: 'win_master',
        description: 'Win Master',
        goal_type: ACHIEVEMENT_TYPES.WINS,
        goal_amount: 10
    },
    {
        achievement_id: 'pong_champion',
        description: 'Pong Champion',
        goal_type: ACHIEVEMENT_TYPES.WINS,
        goal_amount: 50
    },

    // Ball control achievements
    {
        achievement_id: 'ball_rookie',
        description: 'Ball Rookie',
        goal_type: ACHIEVEMENT_TYPES.TOUCHED_BALLS,
        goal_amount: 100
    },
    {
        achievement_id: 'ball_expert',
        description: 'Ball Expert',
        goal_type: ACHIEVEMENT_TYPES.TOUCHED_BALLS,
        goal_amount: 500
    },
    {
        achievement_id: 'ball_master',
        description: 'Ball Master',
        goal_type: ACHIEVEMENT_TYPES.TOUCHED_BALLS,
        goal_amount: 1000
    },

    // Streak achievements
    {
        achievement_id: 'steady_hand',
        description: 'Steady Hand',
        goal_type: ACHIEVEMENT_TYPES.MAX_STREAK,
        goal_amount: 5
    },
    {
        achievement_id: 'unstoppable',
        description: 'Unstoppable',
        goal_type: ACHIEVEMENT_TYPES.MAX_STREAK,
        goal_amount: 10
    },
    {
        achievement_id: 'legendary_streak',
        description: 'Legendary Streak',
        goal_type: ACHIEVEMENT_TYPES.MAX_STREAK,
        goal_amount: 20
    },

    // Playtime achievements
    {
        achievement_id: 'rookie_player',
        description: 'Rookie Player',
        goal_type: ACHIEVEMENT_TYPES.PLAY_TIME,
        goal_amount: 60  // 1 hour
    },
    {
        achievement_id: 'dedicated_player',
        description: 'Dedicated Player',
        goal_type: ACHIEVEMENT_TYPES.PLAY_TIME,
        goal_amount: 300  // 5 hours
    },
    {
        achievement_id: 'pong_veteran',
        description: 'Pong Veteran',
        goal_type: ACHIEVEMENT_TYPES.PLAY_TIME,
        goal_amount: 1800  // 30 hours
    }
];

export async function insertDefaultAchievements() {
    const promises = DEFAULT_ACHIEVEMENTS.map(achievement => {
        return new Promise<void>((resolve) => {
            db.run(
                `INSERT OR IGNORE INTO achievements (achievement_id, description, goal_type, goal_amount) 
                 VALUES (?, ?, ?, ?);`,
                [achievement.achievement_id, achievement.description, achievement.goal_type, achievement.goal_amount],
                () => resolve()
            );
        });
    });

    return Promise.all(promises);
}

export async function getAchievementById(achievement_id: string): Promise<IAchievement | undefined> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM achievements WHERE achievement_id = ?;`, [achievement_id], (err, row) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Achievement not found'));
            else resolve(row as IAchievement);
        });
    });
}

export async function getAllAchievements(): Promise<IAchievement[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM achievements ORDER BY goal_type, goal_amount;`, (err, rows) => {
            if (err) reject(err);
            else if (!rows || rows.length === 0) reject(new Error('No achievements found'));
            else resolve(rows as IAchievement[]);
        });
    });
}

export async function getAchievementsByType(goal_type: string): Promise<IAchievement[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM achievements WHERE goal_type = ? ORDER BY goal_amount;`, 
            [goal_type], 
            (err, rows: any[]) => {
                if (err) reject(err);
                else if (!rows || rows.length === 0) reject(new Error('No achievements found'));
                else resolve(rows as IAchievement[]);
            }
        );
    });
} 