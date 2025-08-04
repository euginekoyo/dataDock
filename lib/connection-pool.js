import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDbConfig } from './global-db-connector';

class ConnectionPool {
    constructor() {
        this.connections = new Map();
        this.maxConnections = 10;
        this.connectionTimeouts = new Map();
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    generateConnectionKey(dbType, credentials) {
        return `${dbType}-${JSON.stringify(credentials)}`;
    }

    async getConnection(dbType, credentials) {
        const key = this.generateConnectionKey(dbType, credentials);
        let dataSource = this.connections.get(key);

        if (dataSource && dataSource.isInitialized) {
            try {
                await dataSource.query('SELECT 1');
                this.updateTimeout(key);
                console.log('Reusing existing connection:', key);
                return dataSource;
            } catch (error) {
                console.error('Existing connection test failed:', error.message);
                await this.removeConnection(key);
                dataSource = null;
            }
        }

        if (!dataSource) {
            if (this.connections.size >= this.maxConnections) {
                const oldestKey = this.connections.keys().next().value;
                await this.removeConnection(oldestKey);
            }

            const config = getDbConfig(dbType, credentials);
            console.log('Initializing new connection with config:', config);
            try {
                dataSource = new DataSource({
                    ...config,
                    connectTimeoutMS: 10000, // Set a 10-second timeout for connection
                });
                await dataSource.initialize();
                console.log('Connection initialized successfully for:', key);
                await dataSource.query('SELECT 1');
                console.log('Test query executed successfully:', key);
                this.connections.set(key, dataSource);
                this.updateTimeout(key);
            } catch (error) {
                console.error('Failed to initialize connection:', {
                    message: error.message,
                    stack: error.stack,
                    config,
                });
                throw new Error(error.message || 'Failed to initialize database connection');
            }
        }

        return dataSource;
    }

    updateTimeout(key) {
        if (this.connectionTimeouts.has(key)) {
            clearTimeout(this.connectionTimeouts.get(key));
        }
        const timeout = setTimeout(() => {
            console.log('Removing connection due to timeout:', key);
            this.removeConnection(key);
        }, 60 * 60 * 1000); // 1 hour timeout
        this.connectionTimeouts.set(key, timeout);
    }

    async removeConnection(key) {
        const dataSource = this.connections.get(key);
        if (dataSource?.isInitialized) {
            try {
                await dataSource.destroy();
                console.log('Connection closed:', key);
            } catch (error) {
                console.error('Error closing connection:', error.message);
            }
        }
        this.connections.delete(key);
        if (this.connectionTimeouts.has(key)) {
            clearTimeout(this.connectionTimeouts.get(key));
            this.connectionTimeouts.delete(key);
        }
    }

    async cleanup() {
        for (const [key, dataSource] of this.connections.entries()) {
            if (!dataSource.isInitialized) {
                console.log('Cleaning up uninitialized connection:', key);
                await this.removeConnection(key);
                continue;
            }
            try {
                await dataSource.query('SELECT 1');
            } catch (error) {
                console.error('Cleanup connection test failed:', error.message);
                await this.removeConnection(key);
            }
        }
    }

    async closeAll() {
        const promises = Array.from(this.connections.keys()).map((key) => this.removeConnection(key));
        await Promise.all(promises);
    }

    getStats() {
        return {
            totalConnections: this.connections.size,
            activeConnections: Array.from(this.connections.values()).filter((ds) => ds.isInitialized).length,
        };
    }
}

export const connectionPool = new ConnectionPool();

process.on('SIGINT', async () => {
    await connectionPool.closeAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await connectionPool.closeAll();
    process.exit(0);
});