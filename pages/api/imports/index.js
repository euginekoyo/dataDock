
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function fetchTemplateRecords(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        const results = await db
            .collection('templates')
            .find({ collection_name: { $exists: true } })
            .toArray();

        for (const item of results) {
          if (!item.collection_name) continue;

          const [recordsCount, validData, errorCount] = await Promise.all([
            db.collection(item.collection_name).countDocuments({}),
            db.collection(item.collection_name).countDocuments({ 'validationData.0': { $exists: false } }),
            db
                .collection(item.collection_name)
                .aggregate([
                  { $unwind: { path: '$validationData', preserveNullAndEmptyArrays: true } },
                  { $group: { _id: '$validationData.key', count: { $sum: 1 } } },
                  { $match: { _id: { $ne: null } } },
                ])
                .toArray(),
          ]);

          const importerDetails = await db
              .collection('importers')
              .findOne({ templateId: item.baseTemplateId });

          if (importerDetails) {
            item.importerId = importerDetails._id;
            item.orgId = importerDetails.organizationId;
            item.workspaceId = importerDetails.workspaceId;

            const organization = await db
                .collection('organizations')
                .findOne({ _id: new ObjectId(importerDetails.organizationId) });
            if (organization) {
              const workspace = organization.workspaces.find(ws =>
                  ws.workspaceId && ws.workspaceId.toString() === importerDetails.workspaceId.toString()
              ) || { workspaceName: 'N/A', collaborators: [] };
              item.orgName = organization.orgName || 'N/A';
              item.workspaceName = workspace.workspaceName || 'N/A';
              item.collaborators = workspace.collaborators || [];
            } else {
              item.orgName = 'N/A';
              item.workspaceName = 'N/A';
              item.collaborators = [];
            }
          } else {
            item.importerId = null;
            item.orgId = null;
            item.workspaceId = null;
            item.orgName = 'N/A';
            item.workspaceName = 'N/A';
            item.collaborators = [];
          }

          item.totalRecords = recordsCount;
          item.validRecords = validData;
          item.errorRecords = recordsCount - validData;
          item.errorCountbyColumn = errorCount;
          item.status = recordsCount === validData ? 'Complete' : 'Incomplete';
        }

        res.send(results);
      } catch (err) {
        console.error('Error in GET:', err.message);
        res.status(500).json({ error: 'Failed to load data' });
      }
      break;

    case 'DELETE':
      try {
        const { importId, collection_name } = req.body;

        await db.collection('templates').deleteOne({ _id: new ObjectId(importId) });

        if (collection_name) {
          try {
            await db.collection(collection_name).drop();
          } catch (err) {
            console.log('Collection drop failed (might not exist):', err.message);
          }
        }

        await db.collection('importers').deleteMany({
          $or: [
            { templateId: importId },
            { templateId: new ObjectId(importId) },
          ],
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete import' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
      break;
  }
}
