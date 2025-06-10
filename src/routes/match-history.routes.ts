import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { getMatchesPage, getMatchDetails, getGlobalMatchHistory, insertMatchOutcome } from '../repositories/match_history.repository';

interface MatchQuery {
    page?: string;
    pageSize?: string;
    userId?: string;
}

interface MatchParams {
    matchId?: string;
    userId?: string;
}

interface MatchBody {
    winnerId: string;
    loserId: string;
    winnerStats: {
        touchedBalls: number;
        maxStreak: number;
        duration: number;
    };
    loserStats: {
        touchedBalls: number;
        maxStreak: number;
        duration: number;
    };
}

const matchHistoryRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/matches/global
    fastify.get('/matches/global', async (request: FastifyRequest<{ Querystring: MatchQuery }>, reply) => {
        const page = parseInt(request.query.page || '1');
        const pageSize = parseInt(request.query.pageSize || '20');

        if (page <= 0) {
            return reply.status(400).send({ error: 'Invalid page number' });
        }

        if (pageSize <= 0 || pageSize > 100) {
            return reply.status(400).send({ error: 'Invalid page size' });
        }

        try {
            const result = await getGlobalMatchHistory(page, pageSize);
            return result;
        } catch (error) {
            console.error('Error fetching global match history:', error);
            return reply.status(500).send({ error: 'Failed to fetch global match history' });
        }
    });

    // GET /api/users/:userId/matches
    fastify.get('/users/:userId/matches', async (request: FastifyRequest<{ Params: MatchParams, Querystring: MatchQuery }>, reply) => {
        const userId = parseInt(request.params.userId || '');
        const page = parseInt(request.query.page || '1');
        const pageSize = parseInt(request.query.pageSize || '10');

        if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }

        if (page <= 0) {
            return reply.status(400).send({ error: 'Invalid page number' });
        }

        if (pageSize <= 0 || pageSize > 100) {
            return reply.status(400).send({ error: 'Invalid page size' });
        }

        try {
            const result = await getMatchesPage(userId, page, pageSize);
            return result;
        } catch (error) {
            console.error('Error fetching user match history:', error);
            return reply.status(500).send({ error: 'Failed to fetch user match history' });
        }
    });

    // GET /api/matches/:matchId
    fastify.get('/matches/:matchId', async (request: FastifyRequest<{ Params: MatchParams, Querystring: MatchQuery }>, reply) => {
        const { matchId } = request.params;
        const userId = request.query.userId ? parseInt(request.query.userId) : undefined;

        if (!matchId) {
            return reply.status(404).send({ error: 'Match not found' });
        }

        try {
            const match = await getMatchDetails(matchId, userId);
            if (!match) {
                return reply.status(404).send({ error: 'Match not found' });
            }
            return match;
        } catch (error) {
            console.error('Error fetching match details:', error);
            return reply.status(500).send({ error: 'Failed to fetch match details' });
        }
    });

    // POST /api/matches
    fastify.post('/matches', async (request: FastifyRequest<{ Body: MatchBody }>, reply) => {
        try {
            const { winnerId, loserId, winnerStats, loserStats } = request.body;
            
            console.log('POST /api/matches - Request body:', JSON.stringify(request.body, null, 2));

            if (!winnerId || !loserId || !winnerStats || !loserStats) {
                console.log('Missing required fields:', { winnerId, loserId, winnerStats, loserStats });
                return reply.status(400).send({ error: 'Missing required fields' });
            }

            if (!winnerStats.touchedBalls || !winnerStats.maxStreak || !winnerStats.duration ||
                !loserStats.touchedBalls || !loserStats.maxStreak || !loserStats.duration) {
                console.log('Missing required stats fields:', { winnerStats, loserStats });
                return reply.status(400).send({ error: 'Missing required stats fields' });
            }

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
            return reply.status(201).send({
                message: 'Match outcome successfully recorded',
                matchId
            });
        } catch (error) {
            console.error('Error recording match outcome:', error);
            return reply.status(500).send({ error: 'Failed to record match outcome' });
        }
    });
};

export default matchHistoryRoutes; 