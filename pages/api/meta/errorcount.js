
import clientPromise from '../../../lib/mongodb';

export default async function recordsCount(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');
  const { collection_name } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        if (!collection_name) {
          return res.status(400).json({ error: 'Missing collection_name' });
        }

        const [totalRecords, validRecords, errorCount] = await Promise.all([
          db.collection(collection_name).countDocuments(),
          db.collection(collection_name).countDocuments({ 'validationData.0': { $exists: false } }),
          db
              .collection(collection_name)
              .aggregate([
                { $unwind: { path: '$validationData', preserveNullAndEmptyArrays: true } },
                {
                  $group: {
                    _id: '$validationData.key',
                    count: { $sum: 1 },
                  },
                },
                { $match: { _id: { $ne: null } } }, // Exclude null keys (rows with no validationData)
              ])
              .toArray(),
        ]);

        const errorRecords = await db
            .collection(collection_name)
            .countDocuments({ 'validationData.0': { $exists: true } });

        res.json({
          totalRecords,
          validRecords,
          errorRecords,
          errorCountbyColumn: errorCount,
        });
      } catch (err) {
        console.error('Error in GET:', err.message);
        res.status(500).json({ error: 'Failed to load data' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
      break;
  }
}
