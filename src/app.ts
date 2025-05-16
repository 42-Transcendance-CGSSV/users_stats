import fastify from 'fastify';
import { createDatabase } from './database/database';
import dotenv from 'dotenv';
import fastifyCors from '@fastify/cors';
import fastifyExpress from '@fastify/express';
import express from 'express';
import matchHistoryRoutes from './routes/match-history.routes';
import achievementRoutes from './routes/achievement.routes';

// Load environment variables
dotenv.config();

const app = fastify({ logger: true });
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
    await app.register(fastifyExpress);

    // Create Express app with middleware
    const expressApp = express();
    expressApp.use(express.json());  // Parse JSON requests
    expressApp.use(express.urlencoded({ extended: true }));  // Parse URL-encoded requests
    
    // Attach routes to Express app
    expressApp.use('/api', matchHistoryRoutes);
    expressApp.use('/api/achievements', achievementRoutes);
    
    // Use Express app in Fastify
    app.use(expressApp);
    
    // Health check endpoint
    app.get('/health', async () => {
        return { status: 'ok' };
    });

    // Error handling
    app.setErrorHandler((error, _request, reply) => {
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
        app.listen({ port, host: '0.0.0.0' }, (err, address) => {
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
