const parseConnectionString = (connectionString) => {
    try {
        // Remove unsupported parameters like channel_binding
        let cleanConnectionString = connectionString.replace(/&channel_binding=[^&]*/, '');
        // Also remove sslmode if it's causing issues
        cleanConnectionString = cleanConnectionString.replace(/&sslmode=[^&]*/, '');
        const parsed = parsePgConnectionString(cleanConnectionString);
        return {
            host: parsed.host || 'localhost',
            port: parsed.port ? parseInt(parsed.port) : 5432,
            username: parsed.user,
            password: parsed.password,
            database: parsed.database,
            ssl: parsed.ssl || { rejectUnauthorized: false }, // Default to Neon's SSL requirement
        };
    } catch (error) {
        console.error('Failed to parse connection string:', error.message);
        return null;
    }
};