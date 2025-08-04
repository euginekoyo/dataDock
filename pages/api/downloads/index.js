import clientPromise from '../../../lib/mongodb';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function downloadFile(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        let count = 0;
        let collection = await db.collection(req.headers.collection_name);
        var stream = await collection
          .find({ 'validationData.0': { $exists: false } })
          .project({ _id: 0, validationData: 0, _corrections: 0, _old: 0 })
          .stream();
        let headerFlag = true;

        stream.on('data', async function (data) {
          let columnsHeaders = Object.keys(data);

          if (headerFlag) {
            headerFlag = false;
            count++;
            let csvDataFirstRow = await Papa.unparse(new Array(data), {
              header: true,
              columns: columnsHeaders,
              newline: '\r\n',
            });
            res.write(csvDataFirstRow);
          } else {
            var csvData = await Papa.unparse(new Array(data), {
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
        stream.on('end', function (err) {
          if (err) res.send(err);
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