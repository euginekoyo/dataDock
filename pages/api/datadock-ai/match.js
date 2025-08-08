import { getAIResponseWithFallback } from "../../../lib/gpt-engine";

export default async function matchColumns(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        let validationTemplateColumns = req.body.validationTemplateColumns;
        let saasTemplateColumns = req.body.saasTemplateColumns;

        if (!Array.isArray(validationTemplateColumns) || !Array.isArray(saasTemplateColumns)) {
          return res.status(400).json({ status: 400, data: "Please send correct input lists" });
        }

        let actualPrompt = `Match column names between two lists and return matches as JSON. Find the best semantic matches between validation columns and SaaS columns.

        Validation Columns: ${validationTemplateColumns.join(', ')}
        SaaS Columns: ${saasTemplateColumns.join(', ')}

        Return JSON format:
        {
          "matches": [
            {"validationColumn": "name", "saasColumn": "full_name"},
            {"validationColumn": "email", "saasColumn": "email_address"},
            {"validationColumn": "unmatched_field", "saasColumn": null}
          ]
        }

        Rules:
        - Only include high-confidence matches
        - Set saasColumn to null for unmatched validation columns
        - Consider semantic similarity (e.g., "name" matches "full_name", "phone" matches "phone_number")`;

        console.log('Calling Gemini for column matching');
        let resp = await getAIResponseWithFallback(actualPrompt, 1500, 0.7, 'columnMatching');

        let matchedColumns = {};
        try {
          const parsed = JSON.parse(resp);

          if (parsed.error) {
            console.error("API error response:", parsed.error);
            return res.status(500).json({ status: 500, data: parsed.error });
          }

          if (parsed.matches && Array.isArray(parsed.matches)) {
            parsed.matches.forEach(match => {
              if (match.validationColumn && match.saasColumn !== undefined) {
                matchedColumns[match.validationColumn] = match.saasColumn;
              }
            });
          } else {
            console.error("Invalid response structure - no matches array:", parsed);
            throw new Error("Invalid response structure");
          }
        } catch (e) {
          console.error("JSON parsing error:", e.message, "Response:", resp);
          // Fallback to simple index-based matching
          validationTemplateColumns.forEach((valCol, i) => {
            if (saasTemplateColumns[i]) {
              matchedColumns[valCol] = saasTemplateColumns[i];
            } else {
              matchedColumns[valCol] = null;
            }
          });
        }

        return res.status(200).json({ status: 200, data: matchedColumns });
      } catch (error) {
        console.error("Error in matchColumns:", error);
        return res.status(500).json({ status: 500, data: "Internal server error" });
      }
    default:
      return res.status(405).json({ status: 405, data: 'Method not found' });
  }
}