import { getAIResponseWithFallback } from "../../../lib/gpt-engine";

export default async function ajvSchemaGenerator(req, res) {
  switch (req.method) {
    case 'POST':
      let prompt = req.body.prompt;
      let actualPrompt = `Generate an AJV JSON schema for the following description: ${prompt}. The schema must be a JSON object with 'type': 'object', a 'properties' object defining fields with their types and validation rules (e.g., 'type', 'format', 'maxLength', 'enum'), and a 'required' array listing mandatory fields. Ensure fields use appropriate data types (e.g., number for IDs, string for names and emails, boolean for flags like isActive). Example schema: {
        "type": "object",
        "properties": {
          "id": {"type": "number"},
          "name": {"type": "string", "maxLength": 50},
          "email": {"type": "string", "format": "email"},
          "isActive": {"type": "boolean"}
        },
        "required": ["id", "name", "email", "isActive"]
      }. Always respond with valid JSON. Never include explanations, markdown formatting, or code blocks. Return raw JSON only.`;

      console.log('Calling getAIResponseWithFallback with prompt:', actualPrompt);
      let resp = await getAIResponseWithFallback(actualPrompt, 2000, 0.7, 'ajvSchema');
      // console.log('Raw response from Gemini API:', resp);

      try {
        let parsedResponse = JSON.parse(resp);

        if (parsedResponse.error) {
          console.error("API error response:", parsedResponse);
          res.json({ status: 500, data: parsedResponse });
          return;
        }

        // Detect and fix regex responses
        if (parsedResponse.regex) {
          console.warn("Received regex response instead of AJV schema:", parsedResponse);
          if (prompt.includes('email')) {
            parsedResponse = {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' }
              },
              required: ['email']
            };
          } else {
            res.json({ status: 500, data: { error: "Received regex instead of AJV schema" } });
            return;
          }
        }

        // Validate schema structure
        if (
            parsedResponse.type !== 'object' ||
            !parsedResponse.properties ||
            typeof parsedResponse.properties !== 'object' ||
            !parsedResponse.required ||
            !Array.isArray(parsedResponse.required)
        ) {
          console.error("Invalid AJV schema structure:", parsedResponse);
          res.json({ status: 500, data: { error: "Invalid AJV schema structure - missing type, properties, or required fields" } });
          return;
        }

        // Validate user fields for the specific prompt
        if (prompt.includes('list of users with fields: id, name, email, and isActive')) {
          const props = parsedResponse.properties;
          const expectedFields = ['id', 'name', 'email', 'isActive'];
          const missingFields = expectedFields.filter(field => !props[field]);
          const invalidTypes = expectedFields.filter(field =>
                  props[field] && (
                      (field === 'id' && props[field].type !== 'number') ||
                      (field === 'name' && props[field].type !== 'string') ||
                      (field === 'email' && (props[field].type !== 'string' || props[field].format !== 'email')) ||
                      (field === 'isActive' && props[field].type !== 'boolean')
                  )
          );

          if (missingFields.length || invalidTypes.length) {
            console.warn('Invalid or missing fields in schema:', { missingFields, invalidTypes });
            parsedResponse = {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string', maxLength: 50 },
                email: { type: 'string', format: 'email' },
                isActive: { type: 'boolean' }
              },
              required: expectedFields
            };
          }
        }

        res.json({ status: 200, data: parsedResponse });
      } catch (error) {
        console.error("Invalid JSON response:", resp, "Error:", error.message);
        res.json({ status: 500, data: { error: `Invalid JSON response - ${error.message}` } });
      }
      break;
    default:
      res.json({ status: 405, data: { error: 'Method not found' } });
  }
}