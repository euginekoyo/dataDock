import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function updateRecord(req, res) {
  let client;
  try {
    client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const updates = Array.isArray(req.body) ? req.body : [req.body];

    const results = [];
    for (const update of updates) {
      const { collection_id, data, userId, workspace, organization } = update;

      if (!collection_id || !data || !data._id || !userId || !workspace || !organization) {
        console.error('Invalid update payload:', { collection_id, data, userId, workspace, organization });
        results.push({ success: false, error: 'Missing required fields' });
        continue;
      }

      // Remove _id from data to prevent updating immutable field
      const { _id, ...updateData } = data;

      try {
        const result = await db.collection(collection_id).updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateData }
        );

        // Log activity
        const activityPayload = {
          userId,
          collection_name: collection_id,
          workspace,
          organization,
          action: 'resolve_user_data',
          row_id: _id,
        };

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/userActivity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization || `Bearer ${process.env.API_TOKEN}`,
          },
          body: JSON.stringify(activityPayload),
        });

        results.push({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
      } catch (err) {
        console.error('Update error for record:', _id, err.message);
        results.push({ success: false, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Failed to update records', details: err.message });
  }
}