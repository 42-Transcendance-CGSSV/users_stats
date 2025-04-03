export interface IAchievement {
    achievement_id: string;
    description: string;
    goal_type: string;
    goal_amount: number;
}

export interface IUserAchievement {
    user_id: number;
    achievement_id: string;
    achieved_at: string;
}

export interface IAchievementProgress {
    goal_type: string;
    goal_amount: number;
    current_progress: number;
} 