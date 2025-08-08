import { getAIResponseWithFallback } from '../../../lib/gpt-engine';
import clientPromise from '../../../lib/mongodb';

// Helper function to clean and parse JSON response
function parseAIResponse(response) {
  // Handle error responses from AI provider fallback
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(response);
    if (parsedResponse.error) {
      throw new Error(`AI Provider Error: ${parsedResponse.error}`);
    }
  } catch (e) {
    // If it's not a JSON error response, continue with parsing
    if (e.message.includes('AI Provider Error')) {
      throw e;
    }
  }

  try {
    // First try to parse directly
    let parsedResp = JSON.parse(response);

    // If it's wrapped in a regex object, extract the content
    if (parsedResp.regex) {
      parsedResp = parsedResp.regex;
      // If it's a string, parse it again
      if (typeof parsedResp === 'string') {
        parsedResp = JSON.parse(parsedResp);
      }
    }

    return parsedResp;
  } catch (error) {
    console.log('Direct parsing failed, trying cleanup...');

    // Handle the specific case from your logs where objects are comma-separated
    // but not wrapped in array brackets
    return parseCommaDelimitedObjects(response);
  }
}

// Specific function to handle comma-delimited JSON objects
function parseCommaDelimitedObjects(response) {
  try {
    let cleanedResponse = response.trim();

    // If wrapped in regex object as string, extract it
    const regexMatch = response.match(/"regex":\s*"([^"]+)"/);
    if (regexMatch) {
      cleanedResponse = regexMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\\\/g, '\\');
    }

    // Look for array pattern first
    const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {
        console.log('Array extraction failed, trying to fix format...');
      }
    }

    // Handle the case where we have comma-separated objects without array brackets
    if (cleanedResponse.includes('"_id"') && cleanedResponse.includes('},{')) {
      try {
        // Add array brackets
        let fixedResponse = cleanedResponse.trim();

        // Remove any trailing comma
        fixedResponse = fixedResponse.replace(/,\s*$/, '');

        // Wrap in array brackets
        if (!fixedResponse.startsWith('[')) {
          fixedResponse = '[' + fixedResponse;
        }
        if (!fixedResponse.endsWith(']')) {
          fixedResponse = fixedResponse + ']';
        }

        // Clean up any malformed commas
        fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');

        console.log('Attempting to parse fixed response...');
        const parsed = JSON.parse(fixedResponse);
        console.log('Successfully parsed comma-delimited objects');
        return parsed;
      } catch (e) {
        console.log('Format fixing failed:', e.message);
        console.log('Attempted to fix:', fixedResponse?.substring(0, 200) + '...');
      }
    }

    // Last resort: try to extract individual objects manually
    return extractIndividualObjects(cleanedResponse);

  } catch (error) {
    throw new Error(`Unable to parse AI response: ${error.message}`);
  }
}

// Fallback to manually extract objects
function extractIndividualObjects(text) {
  const objects = [];
  const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;

  while ((match = objectRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj._id) { // Only include objects that look like our data
        objects.push(obj);
      }
    } catch (e) {
      // Skip malformed objects
      continue;
    }
  }

  if (objects.length > 0) {
    console.log(`Extracted ${objects.length} individual objects`);
    return objects;
  }

  throw new Error('No valid JSON objects found in response');
}

// Manual extraction as last resort
function extractFeedbackFromRawResponse(rawResponse, originalData) {
  try {
    console.log('Attempting manual extraction from raw response...');

    // Look for patterns like "_id": "6895e5a4022c42cf3d5d64a0"
    const idRegex = /"_id":\s*"([^"]+)"/g;
    const feedbackRegex = /"feedback":\s*({[^}]*(?:{[^}]*}[^}]*)*})/g;

    const result = {};
    const ids = [];
    let idMatch;

    // Extract all IDs first
    while ((idMatch = idRegex.exec(rawResponse)) !== null) {
      ids.push(idMatch[1]);
    }

    // Reset regex
    idRegex.lastIndex = 0;
    feedbackRegex.lastIndex = 0;

    // Try to match IDs with their feedback objects
    const chunks = rawResponse.split('"_id":');

    for (let i = 1; i < chunks.length; i++) {
      try {
        const chunk = '"_id":' + chunks[i];
        const idMatch = chunk.match(/"_id":\s*"([^"]+)"/);

        if (idMatch) {
          const id = idMatch[1];
          const originalItem = originalData.find(item => item._id === id);

          if (originalItem) {
            // Look for feedback object in this chunk
            const feedbackMatch = chunk.match(/"feedback":\s*({[^}]*(?:{[^}]*}[^}]*)*})/);

            let feedback = {};
            if (feedbackMatch) {
              try {
                feedback = JSON.parse(feedbackMatch[1]);
              } catch (e) {
                console.log(`Failed to parse feedback for ${id}:`, e.message);
              }
            }

            result[id] = {
              ...originalItem,
              feedback
            };
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
  const queryParams = req.query;
  const { columnName, columnValue, collection } = queryParams;
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME || 'DataDock');

  switch (req.method) {
    case 'GET':
      try {
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

        // Enhanced prompt with clearer instructions
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
        // console.log('Raw AI Response:', resp);

        try {
          // Check if we got an error response from AI providers
          let errorCheck;
          try {
            errorCheck = JSON.parse(resp);
            if (errorCheck.error) {
              throw new Error(`AI providers failed: ${errorCheck.error}`);
            }
          } catch (e) {
            // Not an error response, continue with normal parsing
          }

          let parsedResp = parseAIResponse(resp);

          // Ensure we have an array
          if (!Array.isArray(parsedResp)) {
            throw new Error('Response is not an array');
          }

          // Build result object keyed by _id
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

          // Enhanced fallback: try manual parsing one more time
          let fallbackRv = {};

          try {
            // Try to extract at least some feedback from the malformed response
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

          // Final fallback: return original data with empty feedback
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

        let csvresp = await getAIResponseWithFallback(csvPrompt, 1500, 0.3, 'regex');
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