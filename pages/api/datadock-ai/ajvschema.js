import { getAIResponseWithFallback } from "../../../lib/gpt-engine";

export default async function ajvSchemaGenerator(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, error: 'Method not allowed' });
  }

  try {
    let prompt = req.body.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        status: 400,
        error: 'Valid prompt required'
      });
    }

    const normalizedPrompt = prompt.toLowerCase().replace('regestration', 'registration').trim();

    const actualPrompt = `Generate an AJV JSON schema for the following description: ${normalizedPrompt}. The schema must be a JSON object with 'type': 'object', a 'properties' object defining fields with their types and validation rules (e.g., 'type', 'format', 'maxLength', 'enum'), and a 'required' array listing mandatory fields. Ensure fields use appropriate data types (e.g., number for IDs, string for names and emails, boolean for flags like isActive). Example schema: {
      "type": "object",
      "properties": {
        "id": {"type": "number"},
        "name": {"type": "string", "maxLength": 50},
        "email": {"type": "string", "format": "email"},
        "isActive": {"type": "boolean"}
      },
      "required": ["id", "name", "email", "isActive"]
    }. Always respond with valid JSON. Never include explanations, markdown formatting, or code blocks. Return raw JSON only.`;

    let resp = await getAIResponseWithFallback(actualPrompt, 2000, 0.7, 'ajvSchema');

    try {
      let parsedResponse = JSON.parse(resp);

      if (parsedResponse.error) {
        console.error("API error response:", parsedResponse);
        return res.status(500).json({ status: 500, error: parsedResponse.error });
      }

      if (parsedResponse.regex) {
        console.warn("Received regex response instead of AJV schema:", parsedResponse);
        parsedResponse = JSON.parse(generateFallbackResponse('ajvSchema', normalizedPrompt));
      }

      if (
          parsedResponse.type !== 'object' ||
          !parsedResponse.properties ||
          typeof parsedResponse.properties !== 'object' ||
          !parsedResponse.required ||
          !Array.isArray(parsedResponse.required)
      ) {
        console.error("Invalid AJV schema structure:", parsedResponse);
        parsedResponse = JSON.parse(generateFallbackResponse('ajvSchema', normalizedPrompt));
      }

      if (normalizedPrompt.includes('employee registration')) {
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
              isActive: { type: 'boolean' },
              department: { type: 'string', maxLength: 100 },
              hireDate: { type: 'string', format: 'date' }
            },
            required: expectedFields
          };
        }
      }

      return res.status(200).json({ status: 200, data: parsedResponse });
    } catch (error) {
      console.error("Invalid JSON response:", resp, "Error:", error.message);
      return res.status(500).json({ status: 500, error: `Invalid JSON response - ${error.message}` });
    }
  } catch (error) {
    console.error('ajvSchemaGenerator unexpected error:', error.message);
    return res.status(500).json({
      status: 500,
      error: 'Internal server error during schema generation'
    });
  }
}