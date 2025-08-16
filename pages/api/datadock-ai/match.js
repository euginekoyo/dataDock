import { getAIResponseWithFallback } from "../../../lib/gpt-engine";

export default async function matchColumns(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, data: 'Method not allowed' });
  }

  try {
    const { validationTemplateColumns, saasTemplateColumns } = req.body;

    // Input validation
    if (!Array.isArray(validationTemplateColumns) || !Array.isArray(saasTemplateColumns)) {
      return res.status(400).json({
        status: 400,
        data: "Please provide valid arrays for validationTemplateColumns and saasTemplateColumns"
      });
    }

    if (validationTemplateColumns.length === 0) {
      return res.status(400).json({
        status: 400,
        data: "Validation columns array cannot be empty"
      });
    }

    if (saasTemplateColumns.length === 0) {
      return res.status(200).json({
        status: 200,
        data: validationTemplateColumns.reduce((acc, col) => ({ ...acc, [col]: null }), {})
      });
    }

    // Create enhanced prompt for better matching
    const actualPrompt = `Match validation columns with SaaS columns based on semantic similarity.

Validation Columns: [${validationTemplateColumns.map(col => `"${col}"`).join(', ')}]
SaaS Columns: [${saasTemplateColumns.map(col => `"${col}"`).join(', ')}]

Rules for matching:
- Only match columns that are semantically similar or identical
- Consider common variations:
  * "name" matches "full_name", "user_name", "first_name"
  * "email" matches "email_address", "user_email"
  * "phone" matches "phone_number", "mobile", "contact"
  * "id" matches "user_id", "customer_id", "_id"
  * "date" matches "created_date", "timestamp", "created_at"
- Set saasColumn to null if no good match exists
- Be conservative - only match if confidence is high

Return JSON in this exact format:
{
  "matches": [
    {"validationColumn": "exact_name_from_validation_list", "saasColumn": "exact_name_from_saas_list_or_null"}
  ]
}

Include ALL validation columns in the matches array.`;

    console.log('Calling AI for column matching');
    console.log('Validation columns:', validationTemplateColumns);
    console.log('SaaS columns:', saasTemplateColumns);

    const response = await getAIResponseWithFallback(actualPrompt, 1500, 0.5, 'columnMatching');

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      // Fallback to no matches
      const fallbackMatches = validationTemplateColumns.reduce((acc, col) => ({
        ...acc,
        [col]: null
      }), {});
      return res.status(200).json({ status: 200, data: fallbackMatches });
    }

    // Check for error in response
    if (parsedResponse.error) {
      console.error('AI response error:', parsedResponse.error);
      const fallbackMatches = validationTemplateColumns.reduce((acc, col) => ({
        ...acc,
        [col]: null
      }), {});
      return res.status(200).json({ status: 200, data: fallbackMatches });
    }

    let matchedColumns = {};

    // Process the matches array
    if (parsedResponse.matches && Array.isArray(parsedResponse.matches)) {
      // Create a map from the matches array
      const matchesMap = {};
      parsedResponse.matches.forEach(match => {
        if (match &&
            typeof match.validationColumn === 'string' &&
            validationTemplateColumns.includes(match.validationColumn) &&
            (match.saasColumn === null ||
                (typeof match.saasColumn === 'string' && saasTemplateColumns.includes(match.saasColumn)))) {
          matchesMap[match.validationColumn] = match.saasColumn;
        }
      });

      // Ensure all validation columns are included
      validationTemplateColumns.forEach(valCol => {
        matchedColumns[valCol] = matchesMap.hasOwnProperty(valCol) ? matchesMap[valCol] : null;
      });

      console.log('Successfully processed column matches:', matchedColumns);
    } else {
      console.error('Invalid response structure - no matches array:', parsedResponse);
      // Fallback: no matches
      validationTemplateColumns.forEach(valCol => {
        matchedColumns[valCol] = null;
      });
    }

    return res.status(200).json({
      status: 200,
      data: matchedColumns
    });

  } catch (error) {
    console.error('matchColumns unexpected error:', error);
    // Fallback response
    const { validationTemplateColumns = [] } = req.body;
    const fallbackMatches = validationTemplateColumns.reduce((acc, col) => ({
      ...acc,
      [col]: null
    }), {});

    return res.status(500).json({
      status: 500,
      data: fallbackMatches,
      error: "Internal server error during column matching"
    });
  }
}