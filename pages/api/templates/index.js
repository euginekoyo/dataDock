import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId directly
import generateSchema from '../../../lib/template-engine';

export default async function fetchTemplateRecords(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        let query = {};
        const templateId = req.query.template_id || req.headers.template_id;

        if (templateId) {
          if (!/^[0-9a-fA-F]{24}$/.test(templateId)) {
            return res.status(400).json({ error: 'Invalid template_id format' });
          }
          query = { _id: new ObjectId(templateId) };
          // Use new ObjectId
          const result = await db.collection('templates').findOne(query);
          if (!result) {
            return res.status(404).json({ error: 'Template not found' });
          }
          return res.status(200).json(result);
        } else {
          const result = await db.collection('templates').find({}).toArray();
          return res.status(200).json(result);
        }
      } catch (err) {
        console.error('GET error:', err);
        return res.status(500).json({ error: 'Failed to load data' });
      }

    case 'POST':
      try {
        const templateBody = req.body;
        if (!templateBody.columns || !Array.isArray(templateBody.columns)) {
          return res.status(400).json({ error: 'Columns array is required' });
        }

        if (templateBody.baseTemplateId) {
          if (!/^[0-9a-fA-F]{24}$/.test(templateBody.baseTemplateId)) {
            return res.status(400).json({ error: 'Invalid baseTemplateId format' });
          }
          const baseTemplate = await db
              .collection('templates')
              .findOne({ _id: new ObjectId(templateBody.baseTemplateId) }); // Use new ObjectId
          if (!baseTemplate) {
            return res.status(404).json({ error: 'Base template not found' });
          }
          const columnLabels = templateBody.columns.map((el) => el.label);
          const requiredCols = baseTemplate.schema.required?.filter((el) =>
              columnLabels.includes(el)
          );
          templateBody.schema = {
            ...baseTemplate.schema,
            required: requiredCols || [],
          };
          templateBody.validators = baseTemplate.validators;
        } else {
          templateBody.schema = generateSchema(templateBody.columns);
        }

        templateBody.created_date = new Date().toISOString();
        templateBody.template_name = templateBody.template_name || templateBody.fileName;

        const result = await db.collection('templates').insertOne(templateBody);
        return res.status(201).json(result);
      } catch (err) {
        console.error('POST error:', err);
        return res.status(500).json({ error: 'Failed to create data' });
      }

    case 'PUT':
      try {
        const { template_id } = req.query;
        if (!template_id || !/^[0-9a-fA-F]{24}$/.test(template_id)) {
          return res.status(400).json({ error: 'Invalid template_id format' });
        }

        const { columns, ...data } = req.body;
        if (!columns || !Array.isArray(columns)) {
          return res.status(400).json({ error: 'Columns array is required' });
        }

        data.schema = generateSchema(columns);
        const result = await db
            .collection('templates')
            .updateOne(
                { _id: new ObjectId(template_id) }, // Use new ObjectId
                { $set: data },
                { upsert: false }
            );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Template not found' });
        }
        return res.status(200).json(result);
      } catch (err) {
        console.error('PUT error:', err);
        return res.status(500).json({ error: 'Failed to update data' });
      }

    case 'DELETE':
      try {
        const { template_id } = req.query;
        if (!template_id || !/^[0-9a-fA-F]{24}$/.test(template_id)) {
          return res.status(400).json({ error: 'Invalid template_id format' });
        }

        const result = await db
            .collection('templates')
            .deleteOne({ _id: new ObjectId(template_id) }); // Use new ObjectId

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Template not found' });
        }
        return res.status(200).json(result);
      } catch (err) {
        console.error('DELETE error:', err);
        return res.status(500).json({ error: 'Failed to delete data' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}