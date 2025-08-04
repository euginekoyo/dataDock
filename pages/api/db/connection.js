import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';
import clientPromise from '../../../lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { parse as parsePgConnectionString } from 'pg-connection-string';

const parseConnectionString = (connectionString) => {
    try {
        // Remove channel_binding parameter if present
        const cleanConnectionString = connectionString.replace(/&channel_binding=[^&]*/, '');
        const parsed = parsePgConnectionString(cleanConnectionString);
        return {
            host: parsed.host || 'localhost',
            port: parsed.port ? parseInt(parsed.port) : 5432,
            username: parsed.user,
            password: parsed.password,
            database: parsed.database,
            ssl: parsed.sslmode === 'require' ? { rejectUnauthorized: false } : false,
        };
    } catch (error) {
        console.error('Failed to parse connection string:', error.message);
        return null;
    }
};

async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');
    const connectionsCollection = db.collection('connections');

    if (req.method === 'POST') {
        try {
            const { name, description, dbType, useConnectionString, connectionString, credentials, temporary, connectionId } = req.body;

            if (!['postgresql', 'oracle', 'sqlserver'].includes(dbType)) {
                return res.status(400).json({ error: 'Invalid database type' });
            }

            if (!name && !temporary) {
                return res.status(400).json({ error: 'Connection name is required' });
            }

            let connectionCredentials;
            if (useConnectionString) {
                if (!connectionString || !connectionString.startsWith('postgresql://')) {
                    return res.status(400).json({ error: 'Valid PostgreSQL connection string is required' });
                }
                connectionCredentials = parseConnectionString(connectionString);
                if (!connectionCredentials) {
                    return res.status(400).json({ error: 'Invalid connection string format' });
                }
            } else {
                if (
                    !credentials ||
                    !credentials.host ||
                    !credentials.port ||
                    !credentials.username ||
                    !credentials.password ||
                    !credentials.database
                ) {
                    return res.status(400).json({ error: 'Missing required credentials' });
                }
                if (dbType === 'oracle' && !credentials.sid) {
                    return res.status(400).json({ error: 'SID is required for Oracle' });
                }
                connectionCredentials = credentials;
            }

            console.log('Attempting to connect with credentials:', connectionCredentials);
            const connectionKey = connectionPool.generateConnectionKey(dbType, connectionCredentials);
            let dataSource = connectionPool.connections.get(connectionKey);

            if (!dataSource || !dataSource.isInitialized) {
                await connectionPool.getConnection(dbType, connectionCredentials);
                dataSource = connectionPool.connections.get(connectionKey);
            } else {
                try {
                    await dataSource.query('SELECT 1');
                    console.log('Reusing existing connection:', connectionKey);
                } catch (error) {
                    console.error('Existing connection test failed, reinitializing:', error.message);
                    await connectionPool.removeConnection(connectionKey);
                    await connectionPool.getConnection(dbType, connectionCredentials);
                    dataSource = connectionPool.connections.get(connectionKey);
                }
            }

            const finalConnectionId = connectionId || (temporary ? `temp_${Date.now()}` : uuidv4());
            const connectionData = {
                id: finalConnectionId,
                name,
                description: description || '',
                dbType,
                useConnectionString: !!useConnectionString,
                connectionString: useConnectionString ? connectionString : '',
                credentials: useConnectionString ? {} : credentials,
                createdAt: new Date(),
            };

            if (!temporary) {
                await connectionsCollection.updateOne(
                    { id: finalConnectionId },
                    { $set: connectionData },
                    { upsert: true }
                );
            }

            const sessionConnections = req.session.get('connections') || {};
            sessionConnections[finalConnectionId] = {
                connectionKey,
                dbType,
                connectionId: finalConnectionId,
                isConnected: true,
                credentials: connectionCredentials,
            };
            req.session.set('connections', sessionConnections);
            await req.session.save();

            return res.status(200).json({
                message: `Successfully connected to ${dbType} database`,
                connection: connectionData,
                connectionStats: connectionPool.getStats(),
            });
        } catch (error) {
            console.error('Database connection or save error:', {
                message: error.message,
                stack: error.stack,
            });
            return res.status(500).json({
                error: 'Failed to connect to database',
                details: error.message || 'An unexpected error occurred during connection initialization',
            });
        }
    } else if (req.method === 'GET') {
        try {
            const connections = await connectionsCollection.find({}).toArray();
            return res.status(200).json(connections);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
            return res.status(500).json({
                error: 'Failed to fetch connections',
                details: error.message,
            });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { connectionId } = req.query;
            if (!connectionId) {
                return res.status(400).json({ error: 'Connection ID is required' });
            }

            const result = await connectionsCollection.deleteOne({ id: connectionId });
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Connection not found' });
            }

            const sessionConnections = req.session.get('connections') || {};
            const connectionKey = sessionConnections[connectionId]?.connectionKey;
            if (connectionKey) {
                await connectionPool.removeConnection(connectionKey);
            }
            delete sessionConnections[connectionId];
            req.session.set('connections', sessionConnections);
            await req.session.save();

            return res.status(200).json({ message: 'Connection deleted successfully' });
        } catch (error) {
            console.error('Delete connection error:', error);
            return res.status(500).json({
                error: 'Failed to delete connection',
                details: error.message,
            });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}

export default withIronSession(handler, {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'dataDock-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
});