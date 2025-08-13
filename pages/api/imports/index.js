import clientPromise from '../../../lib/mongodb';
let ObjectId = require('mongodb').ObjectId;

export default async function fetchTemplateRecords(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        let results = await db
            .collection('templates')
            .find({ collection_name: { $exists: true } })
            .toArray();

        for (const item of results) {
          if (!item.collection_name) continue;

          const recordsCount = await db
              .collection(item.collection_name)
              .countDocuments({});

          const validData = await db
              .collection(item.collection_name)
              .countDocuments({ 'validationData.0': { $exists: false } });

          const importerDetails = await db
              .collection('importers')
              .findOne({ templateId: item.baseTemplateId });

          if (importerDetails) {
            item.importerId = importerDetails._id;
            item.orgId = importerDetails.organizationId;
            item.workspaceId = importerDetails.workspaceId;

            // Fetch organization details
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

          item.rows = validData;
          item.status = (recordsCount === validData) ? 'Complete' : 'Incomplete';
        }

        res.send(results);
      } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'failed to load data' });
      }
    case 'DELETE':
      try {
        const { importId, collection_name } = req.body;

        // Delete from templates collection
        await db.collection('templates').deleteOne({ _id: new ObjectId(importId) });

        // Delete the data collection if it exists
        if (collection_name) {
          try {
            await db.collection(collection_name).drop();
          } catch (err) {
            // Collection might not exist, that's ok
            console.log('Collection drop failed (might not exist):', err.message);
          }
        }

        // Clean up importer record
        await db.collection('importers').deleteMany({
          $or: [
            { templateId: importId },
            { templateId: new ObjectId(importId) }
          ]
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete import' });
      }
      break;
  }

}