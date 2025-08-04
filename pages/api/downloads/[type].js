import clientPromise from '../../../lib/mongodb';
import Papa from 'papaparse';

export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

export default async function downloadFile(req, res) {
    const { type } = req.query; // Get the dynamic route parameter (e.g., 'errors', 'valid', 'all')
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');
    const collectionName = req.headers.collection_name;

    if (!collectionName) {
        console.error('Missing collection_name header');
        return res.status(400).json({ error: 'Collection name is required in headers' });
    }

    switch (req.method) {
        case 'GET':
            try {
                const collection = db.collection(collectionName);

                // Default headers tailored to messy_employee_data_errors schema
                const defaultHeaders = ['Emp ID', 'Name', 'Age', 'DOB', 'Salary', 'Email', 'Department'];

                // Try to fetch fields from a sample document
                const sampleDoc = await collection.findOne({}, { projection: { _id: 0 } });
                let fields = sampleDoc
                    ? Object.keys(sampleDoc).filter((key) => !['_id', '_corrections', '_old', 'validationData'].includes(key))
                    : defaultHeaders;

                // Try to fetch template columns for headers
                try {
                    const collectionMeta = await db
                        .collection('collection')
                        .findOne({ name: collectionName }, { projection: { template_id: 1 } });

                    if (collectionMeta && collectionMeta.template_id) {
                        const template = await db
                            .collection('templates')
                            .findOne({ template_id: collectionMeta.template_id }, { projection: { columns: 1 } });

                        if (template && template.columns) {
                            fields = template.columns.map((col) => col.label);
                            console.log(`Using template columns for ${collectionName}: ${fields.join(', ')}`);
                        } else {
                            console.warn(`Template not found for template_id: ${collectionMeta.template_id}`);
                        }
                    } else {
                        console.warn(`No template_id found for collection: ${collectionName}`);
                    }
                } catch (templateError) {
                    console.error(`Error fetching template for collection ${collectionName}:`, templateError.message);
                    // Continue with sampleDoc or default headers
                }

                let columnsHeaders = type === 'errors' ? [...fields, 'errors'] : fields;
                console.log(`CSV headers for ${type} download: ${columnsHeaders.join(', ')}`);

                let stream;
                let filename;
                let includeValidationData = type === 'errors';

                // Determine the query, projection, and filename based on the type
                switch (type) {
                    case 'errors':
                        stream = collection
                            .find({ 'validationData.0': { $exists: true } })
                            .project(
                                Object.fromEntries(
                                    [...fields, 'validationData'].map((field) => [field, 1])
                                )
                            )
                            .stream();
                        filename = `${collectionName}_errors.csv`;
                        break;
                    case 'valid':
                        stream = collection
                            .find({ 'validationData.0': { $exists: false } })
                            .project(
                                Object.fromEntries(
                                    fields.map((field) => [field, 1])
                                )
                            )
                            .stream();
                        filename = `${collectionName}_valid.csv`;
                        break;
                    case 'all':
                    default:
                        stream = collection
                            .find({})
                            .project(
                                Object.fromEntries(
                                    fields.map((field) => [field, 1])
                                )
                            )
                            .stream();
                        filename = `${collectionName}.csv`;
                        break;
                }

                let count = 0;

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

                // Write headers first - create a simple header row
                const headerRow = columnsHeaders.join(',') + '\r\n';
                console.log(`Writing CSV headers: ${headerRow}`);
                res.write(headerRow);

                stream.on('data', async (data) => {
                    // For error rows, format validationData into a single errors column
                    if (includeValidationData && data.validationData) {
                        const errorMessages = data.validationData
                            .map((err) => `${err.key}: ${err.error_message}`)
                            .join('; ');
                        // Protect against CSV injection
                        const escapeCsv = (str) => (str && /^[=+@-]/.test(str) ? `'${str}` : str);
                        data.errors = escapeCsv(`⚠️ ${errorMessages}`);
                        delete data.validationData; // Remove validationData from output
                    }

                    // Create a properly ordered data object based on column headers
                    const orderedData = {};
                    columnsHeaders.forEach(header => {
                        orderedData[header] = data[header] || '';
                    });

                    const csvData = Papa.unparse([orderedData], {
                        header: false,
                        columns: columnsHeaders,
                        newline: '\r\n',
                    });

                    if (count === 0) {
                        res.write(csvData);
                    } else {
                        res.write('\r\n' + csvData);
                    }
                    count++;
                });

                stream.on('end', () => {
                    console.log(`Completed CSV stream for ${type} with ${count} rows`);
                    res.end();
                });

                stream.on('error', (err) => {
                    console.error('Stream error:', err.message);
                    res.status(500).json({ error: 'Internal Server Error' });
                });
            } catch (err) {
                console.error('Server error:', err.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
            break;

        case 'POST':
            try {
                let collection = await db.collection(collectionName);
                let body = '';

                // Collect raw body data
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                req.on('end', async () => {
                    try {
                        // Parse CSV data
                        const parsedData = await new Promise((resolve, reject) => {
                            Papa.parse(body, {
                                header: true,
                                skipEmptyLines: true,
                                complete: (result) => resolve(result.data),
                                error: (error) => reject(error),
                            });
                        });

                        // Insert parsed data into MongoDB
                        if (parsedData.length > 0) {
                            const result = await collection.insertMany(parsedData);
                            res.status(200).json({
                                message: 'Data uploaded successfully',
                                insertedCount: result.insertedCount,
                            });
                        } else {
                            res.status(400).json({ error: 'No valid data found in CSV' });
                        }
                    } catch (error) {
                        console.error(error.message);
                        res.status(500).json({ error: 'Failed to process CSV data' });
                    }
                });
            } catch (error) {
                console.error(error.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
            break;

        default:
            res.status(405).json({ error: 'Method not allowed' });
            break;
    }
}