import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { createDatabase } from './database/database';
import dotenv from 'dotenv';
import fastifyCors from '@fastify/cors';
import matchHistoryRoutes from './routes/match-history.routes';
import achievementRoutes from './routes/achievement.routes';

// Load environment variables
dotenv.config();

const app = fastify({ 
    logger: true,
    // Enable built-in JSON parsing
    bodyLimit: 30 * 1024 * 1024, // 30MB
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Initialize database
const initializeDatabase = async () => {
    try {
        await createDatabase(app);
        app.log.info('Database initialized');
    } catch (err) {
        app.log.error('Failed to initialize database:', err);
        process.exit(1);
    }
};

// Setup server
const setupServer = async () => {
    // Register plugins
    await app.register(fastifyCors);
    
    // Register routes
    app.register(matchHistoryRoutes, { prefix: '/api' });
    app.register(achievementRoutes, { prefix: '/api/achievements' });
    
    // Health check endpoint
    app.get('/health', async () => {
        return { status: 'ok' };
    });

    // Error handling
    app.setErrorHandler((error: Error, _request: FastifyRequest, reply: FastifyReply) => {
        app.log.error(error);
        reply.status(500).send({ error: 'Something went wrong!' });
    });
};

// Only start the server if this file is run directly
if (require.main === module) {
    Promise.all([
        initializeDatabase(),
        setupServer()
    ]).then(() => {
        app.listen({ port, host: '0.0.0.0' }, (err: Error | null, address: string) => {
            if (err) {
                app.log.error(err);
                process.exit(1);
            }
            app.log.info(`Server listening at ${address}`);
        });
    }).catch(err => {
        app.log.error('Failed to start server:', err);
        process.exit(1);
    });
}

export { initializeDatabase };
export default app;
