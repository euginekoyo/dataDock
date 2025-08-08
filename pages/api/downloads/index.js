import clientPromise from '../../../lib/mongodb';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function downloadFile(req, res) {
  const { type } = req.query; // Get the download type (valid, errors, all)
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        let count = 0;
        let collection = await db.collection(req.headers.collection_name);
        let stream;
        let filename = `${req.headers.collection_name}.csv`; // Default filename

        // Determine the query based on the type parameter
        switch (type) {
          case 'errors':
            stream = await collection
                .find({ 'validationData.0': { $exists: true } })
                .project({ _id: 0 }) // Include all fields except _id
                .stream();
            filename = `${req.headers.collection_name}_errors.csv`;
            break;
          case 'valid':
            stream = await collection
                .find({ 'validationData.0': { $exists: false } })
                .project({ _id: 0, validationData: 0, _corrections: 0, _old: 0 })
                .stream();
            filename = `${req.headers.collection_name}_valid.csv`;
            break;
          case 'all':
          default:
            stream = await collection
                .find({})
                .project({ _id: 0, validationData: 0, _corrections: 0, _old: 0 })
                .stream();
            break;
        }

        let headerFlag = true;

        stream.on('data', async function (data) {
          let columnsHeaders = Object.keys(data);

          // For error records, process validationData into an errors column
          if (type === 'errors' && data.validationData) {
            const errorMessages = data.validationData
                .map((err) => `${err.key}: ${err.error_message}`)
                .join('; ');
            data.errors = `⚠️ ${errorMessages}`; // Add errors column
            columnsHeaders = [...columnsHeaders.filter(key => key !== 'validationData'), 'errors'];
            delete data.validationData; // Remove validationData after processing
          } else if (type !== 'errors') {
            // Remove validationData for valid and all types
            delete data.validationData;
            columnsHeaders = columnsHeaders.filter(key => key !== 'validationData');
          }

          if (headerFlag) {
            headerFlag = false;
            count++;
            let csvDataFirstRow = await Papa.unparse([data], {
              header: true,
              columns: columnsHeaders,
              newline: '\r\n',
            });
            res.write(csvDataFirstRow);
          } else {
            var csvData = await Papa.unparse([data], {
              header: false,
              columns: columnsHeaders,
              newline: '\r\n',
            });
            csvData = '\r\n' + csvData;
            count++;
            res.write(csvData);
          }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        stream.on('end', function (err) {
          if (err) res.status(500).json({ error: 'Stream error' });
          res.end();
        });
      } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal Server Error' });
      }
      break;

    case 'POST':
      try {
        let collection = await db.collection(req.headers.collection_name);
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const parsedData = await new Promise((resolve, reject) => {
              Papa.parse(body, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => resolve(result.data),
                error: (error) => reject(error),
              });
            });

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