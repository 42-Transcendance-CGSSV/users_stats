import sqlite3, { Database } from "sqlite3";
import { FastifyInstance } from "fastify";
import fs from "fs";

export let db: Database;

import { createMatchWinTable } from "../repositories/match_win.repository";
import { createMatchStatsTable } from "../repositories/match_stats.repository";
import { createAchievementsTable, insertDefaultAchievements } from "../repositories/achievements.repository";
import { createUserAchievementsTable } from "../repositories/user_achievements.repository";

export function setDatabase(database: Database) {
    db = database;
}

export async function createDatabase(app: FastifyInstance): Promise<void> {
    try {
        if (!fs.existsSync("./data/stats_database.db")) {
            app.log.info("Creating database file...");
            fs.mkdirSync("./data", { recursive: true });
            fs.createWriteStream("./data/stats_database.db").end();
            app.log.info("Database file created successfully!");
        }
        db = new sqlite3.Database('./data/stats_database.db');
        app.log.info("Creating database tables...");
        
        app.log.info("   Creating match win table...");
        await createMatchWinTable();
        app.log.info("   Match win table created successfully!");
        
        app.log.info("   Creating match stats table...");
        await createMatchStatsTable();
        app.log.info("   Match stats table created successfully!");
        
        app.log.info("   Creating achievements table...");
        await createAchievementsTable();
        app.log.info("   Achievements table created successfully!");
        
        app.log.info("   Creating user achievements table...");
        await createUserAchievementsTable();
        app.log.info("   User achievements table created successfully!");
        
        app.log.info("   Initializing default achievements...");
        await insertDefaultAchievements();
        app.log.info("   Default achievements initialized successfully!");
        
    } catch (error) {
        app.log.error("An error occurred while creating the database");
        return Promise.reject(error);
    }
}
