
import clientPromise from '../../../lib/mongodb';
import axios from 'axios';
const { ObjectId } = require('mongodb');

export default async function updateRecord(req, res) {
  let client;
  try {
    client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');

    switch (req.method) {
      case 'GET':
        try {
          const { collection_name, page, limit, valid } = req.query;
          if (!collection_name) {
            return res.status(400).json({ error: 'Missing collection_name' });
          }

          const collections = await db.listCollections().toArray();
          if (!collections.some(col => col.name === collection_name)) {
            return res.status(404).json({ error: `Collection ${collection_name} not found` });
          }

          let query = {};
          if (valid === 'true') {
            query = { 'validationData.0': { $exists: false } };
          } else if (valid === 'false') {
            query = { 'validationData.0': { $exists: true } };
          }

          const data = await db
              .collection(collection_name)
              .find(query)
              .limit(parseInt(limit) || 100)
              .skip((parseInt(page) - 1) * parseInt(limit) || 0)
              .toArray();

          const count = await db.collection(collection_name).countDocuments();

          res.json({
            data,
            totalPages: Math.ceil(count / parseInt(limit) || 100),
            currentPage: parseInt(page) || 1,
          });
        } catch (err) {
          console.error('Error in GET:', err.message);
          res.status(500).json({ error: 'Failed to load data', details: err.message });
        }
        break;

      case 'POST':
        try {
          const updates = Array.isArray(req.body) ? req.body : [req.body];
          const results = [];

          for (const update of updates) {
            const { collection_id, data, userId } = update;
            if (!collection_id || !data?._id || !ObjectId.isValid(data._id)) {
              results.push({ error: 'Missing or invalid collection_id or _id' });
              continue;
            }
            if (!userId || !ObjectId.isValid(userId)) {
              results.push({ error: 'Missing or invalid userId' });
              continue;
            }

            const collections = await db.listCollections().toArray();
            if (!collections.some(col => col.name === collection_id)) {
              results.push({ error: `Collection ${collection_id} not found` });
              continue;
            }

            const row_id = new ObjectId(data._id);
            delete data._id;

            const result = await db
                .collection(collection_id)
                .updateOne({ _id: row_id }, { $set: data }, { upsert: false });

            if (result.modifiedCount > 0 && userId && data.validationData?.length === 0) {
              try {
                console.log('Logging activity:', { userId, collection_id, action: 'resolve_row', row_id });
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/userActivity`,
                    {
                      userId,
                      collection_name: collection_id,
                      action: 'resolve_row',
                      row_id,
                    },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                console.log('Activity logged successfully');
              } catch (activityErr) {
                console.error('Failed to log activity:', activityErr.message);
                // Continue without failing the main request
              }
            }

            results.push(result);
          }

          res.json(results.length === 1 ? results[0] : results);
        } catch (err) {
          console.error('Error in POST:', err.message);
          res.status(500).json({ error: 'Failed to update data', details: err.message });
        }
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
        break;
    }
  } catch (err) {
    console.error('Database connection error:', err.message);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
}
