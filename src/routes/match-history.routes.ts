import { Router, RequestHandler } from 'express';
import { getMatchesPage, getMatchDetails, getGlobalMatchHistory, insertMatchOutcome } from '../repositories/match_history.repository';

const router = Router();

// GET /api/matches/global
const getGlobalHistoryHandler: RequestHandler = async (req, res) => {
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    if (page <= 0) {
        res.status(400).json({ error: 'Invalid page number' });
        return;
    }

    if (pageSize <= 0 || pageSize > 100) {
        res.status(400).json({ error: 'Invalid page size' });
        return;
    }

    try {
        const result = await getGlobalMatchHistory(page, pageSize);
        res.json(result);
    } catch (error) {
        console.error('Error fetching global match history:', error);
        res.status(500).json({ error: 'Failed to fetch global match history' });
    }
};

// GET /api/users/:userId/matches
const getUserMatchesHandler: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
    }

    if (page <= 0) {
        res.status(400).json({ error: 'Invalid page number' });
        return;
    }

    if (pageSize <= 0 || pageSize > 100) {
        res.status(400).json({ error: 'Invalid page size' });
        return;
    }

    try {
        const result = await getMatchesPage(userId, page, pageSize);
        res.json(result);
    } catch (error) {
        console.error('Error fetching user match history:', error);
        res.status(500).json({ error: 'Failed to fetch user match history' });
    }
};

// GET /api/matches/:matchId
const getMatchHandler: RequestHandler = async (req, res) => {
    const { matchId } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    if (!matchId) {
        res.status(404).json({ error: 'Match not found' });
        return;
    }

    try {
        const match = await getMatchDetails(matchId, userId);
        if (!match) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        res.json(match);
    } catch (error) {
        console.error('Error fetching match details:', error);
        res.status(500).json({ error: 'Failed to fetch match details' });
    }
};

/**
 * @swagger
 * /api/matches:
 *   post:
 *     summary: Insert a match outcome and update achievements
 *     tags: [Matches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - winnerId
 *               - loserId
 *               - winnerStats
 *               - loserStats
 *             properties:
 *               winnerId:
 *                 type: string
 *                 description: ID of the winning user
 *               loserId:
 *                 type: string
 *                 description: ID of the losing user
 *               winnerStats:
 *                 type: object
 *                 properties:
 *                   touchedBalls:
 *                     type: number
 *                   maxStreak:
 *                     type: number
 *                   duration:
 *                     type: number
 *               loserStats:
 *                 type: object
 *                 properties:
 *                   touchedBalls:
 *                     type: number
 *                   maxStreak:
 *                     type: number
 *                   duration:
 *                     type: number
 *     responses:
 *       201:
 *         description: Match outcome successfully recorded
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
const postMatchHandler: RequestHandler = async (req, res) => {
  try {
    const { winnerId, loserId, winnerStats, loserStats } = req.body;
    
    console.log('POST /api/matches - Request body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!winnerId || !loserId || !winnerStats || !loserStats) {
      console.log('Missing required fields:', { winnerId, loserId, winnerStats, loserStats });
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate stats objects
    if (!winnerStats.touchedBalls || !winnerStats.maxStreak || !winnerStats.duration ||
        !loserStats.touchedBalls || !loserStats.maxStreak || !loserStats.duration) {
      console.log('Missing required stats fields:', { winnerStats, loserStats });
      res.status(400).json({ error: 'Missing required stats fields' });
      return;
    }

    console.log('Attempting to insert match outcome with params:', {
      winnerId, loserId, 
      winnerTouchedBalls: winnerStats.touchedBalls,
      winnerMaxStreak: winnerStats.maxStreak,
      winnerDuration: winnerStats.duration,
      loserTouchedBalls: loserStats.touchedBalls,
      loserMaxStreak: loserStats.maxStreak,
      loserDuration: loserStats.duration
    });

    // Insert match outcome and update achievements
    const matchId = await insertMatchOutcome(
      winnerId,
      loserId,
      winnerStats.touchedBalls,
      winnerStats.maxStreak,
      winnerStats.duration,
      loserStats.touchedBalls,
      loserStats.maxStreak,
      loserStats.duration
    );

    console.log('Match outcome successfully recorded with matchId:', matchId);
    res.status(201).json({
      message: 'Match outcome successfully recorded',
      matchId
    });
  } catch (error) {
    console.error('Error recording match outcome:', error);
    res.status(500).json({ error: 'Failed to record match outcome' });
  }
};

router.get('/matches/global', getGlobalHistoryHandler);
router.get('/matches/:matchId', getMatchHandler);
router.get('/users/:userId/matches', getUserMatchesHandler);
router.post('/matches', postMatchHandler);

export default router; 