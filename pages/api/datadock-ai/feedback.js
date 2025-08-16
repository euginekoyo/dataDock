
import { getAIResponseWithFallback } from '../../../lib/gpt-engine';
import clientPromise from '../../../lib/mongodb';

function parseAIResponse(response) {
  try {
    let parsedResponse = JSON.parse(response);
    if (parsedResponse.error) {
      throw new Error(`AI Provider Error: ${parsedResponse.error}`);
    }
    if (parsedResponse.regex) {
      parsedResponse = parsedResponse.regex;
      if (typeof parsedResponse === 'string') {
        parsedResponse = JSON.parse(parsedResponse);
      }
    }
    return parsedResponse;
  } catch (e) {
    console.error('parseAIResponse failed:', e.message, 'Raw response:', response.substring(0, 500) + '...');
    if (e.message.includes('AI Provider Error')) {
      throw e;
    }
    return parseCommaDelimitedObjects(response);
  }
}

function parseCommaDelimitedObjects(response) {
  try {
    let cleanedResponse = response.trim();
    const regexMatch = response.match(/"regex":\s*"([^"]+)"/);
    if (regexMatch) {
      cleanedResponse = regexMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\\\/g, '\\');
    }

    const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {
        console.log('Array extraction failed, trying to fix format...');
      }
    }

    if (cleanedResponse.includes('"_id"') && cleanedResponse.includes('},{')) {
      try {
        let fixedResponse = cleanedResponse.trim();
        fixedResponse = fixedResponse.replace(/,\s*$/, '');
        if (!fixedResponse.startsWith('[')) {
          fixedResponse = '[' + fixedResponse;
        }
        if (!fixedResponse.endsWith(']')) {
          fixedResponse = fixedResponse + ']';
        }
        fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');
        console.log('Attempting to parse fixed response...');
        const parsed = JSON.parse(fixedResponse);
        console.log('Successfully parsed comma-delimited objects');
        return parsed;
      } catch (e) {
        console.log('Format fixing failed:', e.message);
      }
    }

    return extractIndividualObjects(cleanedResponse);
  } catch (error) {
    throw new Error(`Unable to parse AI response: ${error.message}`);
  }
}

function extractIndividualObjects(text) {
  const objects = [];
  const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;

  while ((match = objectRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj._id) {
        objects.push(obj);
      }
    } catch (e) {
      continue;
    }
  }

  if (objects.length > 0) {
    console.log(`Extracted ${objects.length} individual objects`);
    return objects;
  }

  throw new Error('No valid JSON objects found in response');
}

function extractFeedbackFromRawResponse(rawResponse, originalData) {
  try {
    console.log('Attempting manual extraction from raw response...');
    const idRegex = /"_id":\s*"([^"]+)"/g;
    const feedbackRegex = /"feedback":\s*({[^}]*(?:{[^}]*}[^}]*)*})/g;

    const result = {};
    const ids = [];
    let idMatch;

    while ((idMatch = idRegex.exec(rawResponse)) !== null) {
      ids.push(idMatch[1]);
    }

    idRegex.lastIndex = 0;
    feedbackRegex.lastIndex = 0;

    const chunks = rawResponse.split('"_id":');
    for (let i = 1; i < chunks.length; i++) {
      try {
        const chunk = '"_id":' + chunks[i];
        const idMatch = chunk.match(/"_id":\s*"([^"]+)"/);
        if (idMatch) {
          const id = idMatch[1];
          const originalItem = originalData.find(item => item._id === id);
          if (originalItem) {
            const feedbackMatch = chunk.match(/"feedback":\s*({[^}]*(?:{[^}]*}[^}]*)*})/);
            let feedback = {};
            if (feedbackMatch) {
              try {
                feedback = JSON.parse(feedbackMatch[1]);
              } catch (e) {
                console.log(`Failed to parse feedback for ${id}:`, e.message);
              }
            }
            result[id] = { ...originalItem, feedback };
          }
        }
      } catch (e) {
        console.log(`Error processing chunk ${i}:`, e.message);
        continue;
      }
    }

    console.log(`Manual extraction completed, found ${Object.keys(result).length} items`);
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('Manual extraction failed completely:', error.message);
    return null;
  }
}

export default async function feedback(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  const queryParams = req.query;
  const { columnName, columnValue, collection } = queryParams;
  console.log('GET request received:', { columnName, columnValue, collection });

  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
        if (!columnName || !columnValue) {
          console.log('Missing columnName or columnValue, falling back to collection processing');
          if (!collection) {
            return res.json({ status: 400, data: { error: 'Missing required parameters: columnName, columnValue, or collection' } });
          }
        }

        if (columnName && columnValue) {
          const actualPrompt = `You are a data validation expert. Analyze the value "${columnValue}" for the field "${columnName}".

          Return feedback as a JSON object describing any issues found.

          Validation checks:
          - Required fields not empty
          - Email format validation
          - Age should be numeric and reasonable (16-100)
          - Date formats should be consistent (YYYY-MM-DD)
          - Salary should be numeric
          - Names should be properly formatted

          Return format: {"${columnName}": "issue description"}

          IMPORTANT: Return only valid JSON object, no additional text.`;

          console.log('Calling AI for single field validation:', { columnName, columnValue });
          let resp = await getAIResponseWithFallback(actualPrompt, 1000, 0.3, 'feedback');
          console.log('Raw AI response for single field:', resp);
          let parsedResp = parseAIResponse(resp);
          return res.json({ status: 200, data: parsedResp });
        }

        const rows = await db
            .collection(collection)
            .find()
            .skip(parseInt(0))
            .limit(parseInt(10))
            .toArray();

        let parsedRows = rows.map((elem) => {
          let x = { ...elem };
          delete x['validationData'];
          return x;
        });

        let actualPrompt = `You are a data validation expert. Analyze the following array of employee data objects and identify data quality issues.

        For each object, add a "feedback" property containing validation feedback for problematic fields. Return ONLY a valid JSON array (wrapped in square brackets).

        Validation rules to check:
        - Age: Must be a number between 16-100
        - Full Name: Should be trimmed, properly capitalized
        - Email: Must be valid format and trimmed
        - DoB: Must be in YYYY-MM-DD format
        - Salary: Must be a number (not text)
        - Department: Required field, not empty
        - Emp ID: Required field, must be unique

        Input data:
        ${JSON.stringify(parsedRows, null, 2)}

        Return format: [{"_id": "...", "Emp ID": 101, "feedback": {...}}, {...}]

        IMPORTANT: Return only the JSON array, no additional text or formatting.`;

        console.log('Calling AI for data validation feedback');
        let resp = await getAIResponseWithFallback(actualPrompt, 3000, 0.3, 'feedback');
        console.log('Raw AI Response:', resp);

        try {
          let errorCheck;
          try {
            errorCheck = JSON.parse(resp);
            if (errorCheck.error) {
              throw new Error(`AI providers failed: ${errorCheck.error}`);
            }
          } catch (e) {}

          let parsedResp = parseAIResponse(resp);
          if (!Array.isArray(parsedResp)) {
            throw new Error('Response is not an array');
          }

          let rv = {};
          for (const item of parsedResp) {
            if (item._id) {
              rv[item._id] = item;
            }
          }

          console.log(`Successfully parsed feedback data for ${Object.keys(rv).length} items`);
          res.json({ status: 200, data: rv });
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError.message);
          console.error('Raw response was:', resp.substring(0, 500) + '...');

          let fallbackRv = {};
          try {
            const manualObjects = extractFeedbackFromRawResponse(resp, parsedRows);
            if (manualObjects && Object.keys(manualObjects).length > 0) {
              console.log('Manual extraction succeeded, using partial results');
              res.json({
                status: 200,
                data: manualObjects,
                warning: 'Partial data extracted from malformed AI response'
              });
              return;
            }
          } catch (e) {
            console.log('Manual extraction also failed:', e.message);
          }

          for (const item of parsedRows) {
            fallbackRv[item._id] = { ...item, feedback: {} };
          }
          res.json({
            status: 200,
            data: fallbackRv,
            warning: 'AI response parsing failed completely, returned data without feedback'
          });
        }
      } catch (error) {
        console.error('Database error:', error);
        res.json({ status: 500, data: { error: 'Database query failed' } });
      }
      break;

    case 'POST':
      try {
        let csvPrompt = `You are a data validation expert. Analyze the following JSON data for validation issues.

        Return feedback as a JSON object where each key corresponds to a field name and the value describes any issues found.

        Validation checks:
        - Required fields not empty
        - Email format validation
        - Age should be numeric and reasonable (16-100)
        - Date formats should be consistent
        - Salary should be numeric
        - Names should be properly formatted

        Data to analyze:
        ${JSON.stringify(req.body, null, 2)}

        Return format: {"fieldName": "issue description", "anotherField": "another issue"}

        IMPORTANT: Return only valid JSON object, no additional text.`;

        console.log('Calling AI for POST feedback');
        let csvresp = await getAIResponseWithFallback(csvPrompt, 1500, 0.3, 'feedback');
        console.log('Raw CSV feedback response:', csvresp);

        try {
          let parsedResp = parseAIResponse(csvresp);
          res.json({ status: 200, data: parsedResp });
        } catch (parseError) {
          console.error('Failed to parse CSV feedback response:', parseError);
          res.json({
            status: 200,
            data: { feedback: 'Analysis completed but response format was invalid' }
          });
        }
      } catch (error) {
        console.error('Error in POST feedback:', error);
        res.json({ status: 500, data: { error: 'Failed to analyze data' } });
      }
      break;

    default:
      res.json({ status: 405, data: { error: 'Method not found' } });
      break;
  }
}
