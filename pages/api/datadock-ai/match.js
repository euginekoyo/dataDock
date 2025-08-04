
import getOpenRouterResponse from "../../../lib/gpt-engine";

export default async function matchColumns(req, res) {
  switch (req.method) {
    case 'POST':
      let validationTemplateColumns = req.body.validationTemplateColumns;
      let saasTemplateColumns = req.body.saasTemplateColumns;

      if (!Array.isArray(validationTemplateColumns) || !Array.isArray(saasTemplateColumns)) {
        return res.status(400).json({ status: 400, data: "Please send correct input lists" });
      }

      let actualPrompt = `Match the following two lists of column names and return a JSON object with a "matches" array. Each object in the array should have "validationColumn" (from List1) and "saasColumn" (from List2) keys representing the best match. Only include matches with high confidence. If no match is found for a validation column, set "saasColumn" to null.
      List1: ${validationTemplateColumns.join(', ')}
      List2: ${saasTemplateColumns.join(', ')}`;

      let resp = await getOpenRouterResponse(actualPrompt, 1000, 0.7, true); // Set isColumnMatching to true

      if (typeof resp === 'string' && resp.startsWith('Error')) {
        console.error("Error from getOpenRouterResponse:", resp);
        return res.status(500).json({ status: 500, data: resp });
      }

      let matchedColumns = {};
      try {
        const parsed = JSON.parse(resp);
        if (parsed.matches && Array.isArray(parsed.matches)) {
          parsed.matches.forEach(match => {
            if (match.validationColumn && match.saasColumn !== undefined) {
              matchedColumns[match.validationColumn] = match.saasColumn;
            }
          });
        } else {
          console.error("Invalid response structure:", parsed);
          return res.status(500).json({ status: 500, data: "Invalid response structure from AI" });
        }
      } catch (e) {
        console.error("JSON parsing error:", e.message);
        // Fallback to a simple matching strategy
        validationTemplateColumns.forEach((valCol, i) => {
          if (saasTemplateColumns[i]) {
            matchedColumns[valCol] = saasTemplateColumns[i];
          }
        });
      }

      return res.status(200).json({ status: 200, data: matchedColumns });
    default:
      return res.status(405).json({ status: 405, data: 'Method not found' });
  }
}