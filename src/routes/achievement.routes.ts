import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { getAllAchievements, getAchievementsByType, insertDefaultAchievements } from '../repositories/achievements.repository';
import { getUserAchievements, hasAchievement, insertUserAchievement } from '../repositories/user_achievements.repository';
import { getAchievementProgress } from '../repositories/achievement_progress.repository';
import { AchievementType } from '../types/achievements';
import { IUserAchievement } from '../interfaces/achievement.interfaces';

interface AchievementParams {
    userId?: string;
    type?: string;
    achievementId?: string;
}

const achievementRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/achievements
    fastify.get('/', async (_request, reply) => {
        try {
            const achievements = await getAllAchievements();
            return achievements;
        } catch (error) {
            console.error('Error fetching achievements:', error);
            return reply.status(500).send({ error: 'Failed to fetch achievements' });
        }
    });

    // GET /api/achievements/types/:type
    fastify.get('/types/:type', async (request: FastifyRequest<{ Params: AchievementParams }>, reply) => {
        const { type } = request.params;
        
        const validTypes = Object.values(AchievementType);
        if (!validTypes.includes(type as AchievementType)) {
            return reply.status(400).send({ 
                error: 'Invalid achievement type', 
                validTypes 
            });
        }
        
        try {
            const achievements = await getAchievementsByType(type);
            return achievements;
        } catch (error) {
            console.error(`Error fetching achievements of type ${type}:`, error);
            return reply.status(500).send({ error: 'Failed to fetch achievements' });
        }
    });

    // GET /api/users/:userId/achievements
    fastify.get('/users/:userId', async (request: FastifyRequest<{ Params: AchievementParams }>, reply) => {
        const userId = parseInt(request.params.userId || '');
        
        if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }
        
        try {
            const achievements = await getUserAchievements(userId);
            return achievements;
        } catch (error) {
            if ((error as Error).message === 'No achievements found') {
                return [];
            }
            
            console.error(`Error fetching achievements for user ${userId}:`, error);
            return reply.status(500).send({ error: 'Failed to fetch user achievements' });
        }
    });

    // GET /api/users/:userId/achievements/progress
    fastify.get('/users/:userId/progress', async (request: FastifyRequest<{ Params: AchievementParams }>, reply) => {
        const userId = parseInt(request.params.userId || '');
        
        if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }
        
        try {
            const allAchievements = await getAllAchievements();
            
            let userAchievements: IUserAchievement[] = [];
            try {
                userAchievements = await getUserAchievements(userId);
            } catch (error) {
                userAchievements = [];
            }
            
            const achievedMap = new Map(
                userAchievements.map(ua => [ua.achievement_id, ua.achieved_at])
            );
            
            const progressPromises = allAchievements.map(async (achievement) => {
                if (achievedMap.has(achievement.achievement_id)) {
                    return {
                        ...achievement,
                        achieved: true,
                        achieved_at: achievedMap.get(achievement.achievement_id),
                        progress: 100
                    };
                }
                
                try {
                    const progress = await getAchievementProgress(userId, achievement.achievement_id);
                    const progressPercentage = Math.min(
                        Math.round((progress.current_progress / progress.goal_amount) * 100), 
                        99
                    );
                    
                    return {
                        ...achievement,
                        achieved: false,
                        progress: progressPercentage,
                        current_progress: progress.current_progress
                    };
                } catch (error) {
                    return {
                        ...achievement,
                        achieved: false,
                        progress: 0,
                        current_progress: 0
                    };
                }
            });
            
            const progressResults = await Promise.all(progressPromises);
            
            const sortedResults = progressResults.sort((a, b) => {
                if (a.achieved && !b.achieved) return -1;
                if (!a.achieved && b.achieved) return 1;
                
                if (a.goal_type < b.goal_type) return -1;
                if (a.goal_type > b.goal_type) return 1;
                
                return a.goal_amount - b.goal_amount;
            });
            
            return sortedResults;
        } catch (error) {
            console.error(`Error fetching achievement progress for user ${userId}:`, error);
            return reply.status(500).send({ error: 'Failed to fetch achievement progress' });
        }
    });

    // POST /api/users/:userId/achievements/:achievementId/check
    fastify.post('/users/:userId/:achievementId/check', async (request: FastifyRequest<{ Params: AchievementParams }>, reply) => {
        const userId = parseInt(request.params.userId || '');
        const { achievementId } = request.params;
        
        if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }
        
        try {
            const hasAchievementAlready = await hasAchievement(userId, achievementId);
            
            if (hasAchievementAlready) {
                return { 
                    achievement_id: achievementId,
                    unlocked: true,
                    new: false
                };
            }
            
            const progress = await getAchievementProgress(userId, achievementId);
            
            if (progress.current_progress >= progress.goal_amount) {
                await insertUserAchievement(userId, achievementId);
                
                return {
                    achievement_id: achievementId,
                    unlocked: true,
                    new: true
                };
            } else {
                return {
                    achievement_id: achievementId,
                    unlocked: false,
                    new: false,
                    progress: Math.round((progress.current_progress / progress.goal_amount) * 100),
                    current_progress: progress.current_progress,
                    goal_amount: progress.goal_amount
                };
            }
        } catch (error) {
            console.error(`Error checking achievement ${achievementId} for user ${userId}:`, error);
            return reply.status(500).send({ error: 'Failed to check achievement' });
        }
    });

    // POST /api/achievements/init
    fastify.post('/init', async (_request, reply) => {
        try {
            await insertDefaultAchievements();
            return reply.status(201).send({ message: 'Default achievements initialized successfully' });
        } catch (error) {
            console.error('Error initializing default achievements:', error);
            return reply.status(500).send({ error: 'Failed to initialize default achievements' });
        }
    });
};

export default achievementRoutes; 