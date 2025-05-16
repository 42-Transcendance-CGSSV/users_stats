import { Router, RequestHandler } from 'express';
import { getAllAchievements, getAchievementsByType, insertDefaultAchievements } from '../repositories/achievements.repository';
import { getUserAchievements, hasAchievement, insertUserAchievement } from '../repositories/user_achievements.repository';
import { getAchievementProgress } from '../repositories/achievement_progress.repository';
import { AchievementType } from '../types/achievements';
import { IUserAchievement } from '../interfaces/achievement.interfaces';

const router = Router();

// GET /api/achievements
// Récupère tous les achievements disponibles
const getAchievementsHandler: RequestHandler = async (_req, res) => {
    try {
        const achievements = await getAllAchievements();
        res.json(achievements);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};

// GET /api/achievements/types/:type
// Récupère les achievements par type (wins, touched_balls, etc.)
const getAchievementsByTypeHandler: RequestHandler = async (req, res) => {
    const { type } = req.params;
    
    // Vérifier si le type est valide
    const validTypes = Object.values(AchievementType);
    if (!validTypes.includes(type as AchievementType)) {
        res.status(400).json({ 
            error: 'Invalid achievement type', 
            validTypes 
        });
        return;
    }
    
    try {
        const achievements = await getAchievementsByType(type);
        res.json(achievements);
    } catch (error) {
        console.error(`Error fetching achievements of type ${type}:`, error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};

// GET /api/users/:userId/achievements
// Récupère les achievements obtenus par un utilisateur
const getUserAchievementsHandler: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
    }
    
    try {
        const achievements = await getUserAchievements(userId);
        res.json(achievements);
    } catch (error) {
        // Si l'utilisateur n'a pas d'achievements, retourner un tableau vide au lieu d'une erreur
        if ((error as Error).message === 'No achievements found') {
            res.json([]);
            return;
        }
        
        console.error(`Error fetching achievements for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to fetch user achievements' });
    }
};

// GET /api/users/:userId/achievements/progress
// Récupère la progression des achievements pour un utilisateur
const getUserAchievementProgressHandler: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
    }
    
    try {
        // Récupérer tous les achievements disponibles
        const allAchievements = await getAllAchievements();
        
        // Récupérer les achievements déjà obtenus par l'utilisateur
        let userAchievements: IUserAchievement[] = [];
        try {
            userAchievements = await getUserAchievements(userId);
        } catch (error) {
            // Si l'utilisateur n'a pas d'achievements, utiliser un tableau vide
            userAchievements = [];
        }
        
        // Construire une map des achievements déjà obtenus pour un accès rapide
        const achievedMap = new Map(
            userAchievements.map(ua => [ua.achievement_id, ua.achieved_at])
        );
        
        // Pour chaque achievement, récupérer la progression
        const progressPromises = allAchievements.map(async (achievement) => {
            // Si l'achievement est déjà obtenu, la progression est à 100%
            if (achievedMap.has(achievement.achievement_id)) {
                return {
                    ...achievement,
                    achieved: true,
                    achieved_at: achievedMap.get(achievement.achievement_id),
                    progress: 100
                };
            }
            
            // Sinon, calculer la progression actuelle
            try {
                const progress = await getAchievementProgress(userId, achievement.achievement_id);
                const progressPercentage = Math.min(
                    Math.round((progress.current_progress / progress.goal_amount) * 100), 
                    99 // Max 99% si pas encore obtenu
                );
                
                return {
                    ...achievement,
                    achieved: false,
                    progress: progressPercentage,
                    current_progress: progress.current_progress
                };
            } catch (error) {
                // En cas d'erreur, considérer que la progression est à 0%
                return {
                    ...achievement,
                    achieved: false,
                    progress: 0,
                    current_progress: 0
                };
            }
        });
        
        const progressResults = await Promise.all(progressPromises);
        
        // Trier les résultats: d'abord les acquis, puis par type, puis par quantité croissante
        const sortedResults = progressResults.sort((a, b) => {
            // Les achievements déjà acquis en premier
            if (a.achieved && !b.achieved) return -1;
            if (!a.achieved && b.achieved) return 1;
            
            // Trier par type d'achievement
            if (a.goal_type < b.goal_type) return -1;
            if (a.goal_type > b.goal_type) return 1;
            
            // Trier par quantité (objectif)
            return a.goal_amount - b.goal_amount;
        });
        
        res.json(sortedResults);
    } catch (error) {
        console.error(`Error fetching achievement progress for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to fetch achievement progress' });
    }
};

// POST /api/users/:userId/achievements/:achievementId/check
// Vérifie si un utilisateur a débloqué un achievement spécifique
const checkUserAchievementHandler: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { achievementId } = req.params;
    
    if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
    }
    
    try {
        // Vérifier si l'utilisateur a déjà l'achievement
        const hasAchievementAlready = await hasAchievement(userId, achievementId);
        
        if (hasAchievementAlready) {
            // L'utilisateur a déjà obtenu cet achievement
            res.json({ 
                achievement_id: achievementId,
                unlocked: true,
                new: false
            });
            return;
        }
        
        // Vérifier la progression actuelle
        const progress = await getAchievementProgress(userId, achievementId);
        
        // Si la progression est suffisante, débloquer l'achievement
        if (progress.current_progress >= progress.goal_amount) {
            await insertUserAchievement(userId, achievementId);
            
            res.json({
                achievement_id: achievementId,
                unlocked: true,
                new: true
            });
        } else {
            // L'utilisateur n'a pas encore débloqué cet achievement
            res.json({
                achievement_id: achievementId,
                unlocked: false,
                new: false,
                progress: Math.round((progress.current_progress / progress.goal_amount) * 100),
                current_progress: progress.current_progress,
                goal_amount: progress.goal_amount
            });
        }
    } catch (error) {
        console.error(`Error checking achievement ${achievementId} for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to check achievement' });
    }
};

// POST /api/achievements/init
// Initialise la base de données avec les achievements par défaut
const initAchievementsHandler: RequestHandler = async (_req, res) => {
    try {
        await insertDefaultAchievements();
        res.status(201).json({ message: 'Default achievements initialized successfully' });
    } catch (error) {
        console.error('Error initializing default achievements:', error);
        res.status(500).json({ error: 'Failed to initialize default achievements' });
    }
};

// Enregistrement des routes
router.get('/', getAchievementsHandler);
router.get('/types/:type', getAchievementsByTypeHandler);
router.get('/users/:userId', getUserAchievementsHandler);
router.get('/users/:userId/progress', getUserAchievementProgressHandler);
router.post('/users/:userId/:achievementId/check', checkUserAchievementHandler);
router.post('/init', initAchievementsHandler);

export default router; 