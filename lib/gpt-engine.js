const getOpenRouterResponse = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex') => {
  const url = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = process.env.OPENROUTER_API_KEY;
  let output;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set.");
    return JSON.stringify({ error: "OPENROUTER_API_KEY is not set." });
  }

  try {
    // Backward compatibility: treat isColumnMatching=true as responseType='columnMatching'
    if (typeof responseType === 'boolean') {
      console.warn("Deprecated: Use responseType='columnMatching' instead of isColumnMatching=true");
      responseType = responseType ? 'columnMatching' : 'regex';
    }

    // System message based on responseType
    let systemContent;
    switch (responseType) {
      case 'columnMatching':
        systemContent = 'You are a JSON generator for column matching. Always respond with valid JSON containing a "matches" array of objects with "validationColumn" and "saasColumn" keys. Set "saasColumn" to null for unmatched columns. Never include explanations, markdown formatting, or code blocks. Return raw JSON only.';
        break;
      case 'ajvSchema':
        systemContent = `You are an AJV JSON schema generator. Always respond with a valid JSON schema as a raw JSON object with the following structure:
          - "type": "object"
          - "properties": an object defining fields with their types (e.g., "string", "number", "boolean") and validation rules (e.g., "format", "maxLength", "enum")
          - "required": an array of mandatory field names.
          Use appropriate data types (e.g., "number" for IDs, "string" for names and emails with "format": "email", "boolean" for flags like isActive). Example:
          {
            "type": "object",
            "properties": {
              "id": {"type": "number"},
              "name": {"type": "string", "maxLength": 50},
              "email": {"type": "string", "format": "email"},
              "isActive": {"type": "boolean"}
            },
            "required": ["id", "name", "email", "isActive"]
          }
          Never include regex patterns, explanations, markdown formatting, code blocks, or non-JSON content. Return raw JSON only.`;
        break;
      case 'regex':
      default:
        systemContent = 'You are a JSON generator for regex patterns. Always respond with valid JSON containing only a "regex" key with a complete, valid JavaScript regex pattern as a string. The pattern must be usable in JavaScript without leading/trailing slashes or flags (e.g., "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" for emails). Keep the pattern concise and complete. Never include explanations, markdown, code blocks, or incomplete patterns. Return raw JSON only.';
    }

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: responseType === 'ajvSchema' ? `Generate an AJV JSON schema for the following description: ${prompt}` : prompt }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-3-mini', // Switched to a JSON-reliable model
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`OpenRouter API error: ${response.status} ${response.statusText} - ${text}`);
      return JSON.stringify({ error: `OpenRouter API error: ${response.status} ${response.statusText} - ${text}` });
    }

    const data = await response.json();
    output = data.choices?.[0]?.message?.content?.trim();

    if (!output) {
      console.error("Unexpected OpenRouter response:", data);
      return JSON.stringify({ error: "No valid response from OpenRouter model." });
    }

    // Clean up the response to remove markdown formatting
    output = cleanJsonResponse(output);

    // Validate that the output is valid JSON
    try {
      const parsed = JSON.parse(output);
      // Validate based on responseType
      if (responseType === 'columnMatching' && (!parsed.matches || !Array.isArray(parsed.matches))) {
        console.error("Invalid JSON structure for column matching: 'matches' array missing or not an array", parsed);
        return JSON.stringify({ error: "Invalid JSON structure - 'matches' array missing or not an array" });
      }
      if (responseType === 'ajvSchema' && (
          parsed.type !== 'object' ||
          !parsed.properties ||
          typeof parsed.properties !== 'object' ||
          !parsed.required ||
          !Array.isArray(parsed.required)
      )) {
        return JSON.stringify({ error: "Invalid JSON structure - missing type, properties, or required fields" });
      }
      if (responseType === 'regex' && (!parsed.regex || typeof parsed.regex !== 'string')) {
        return JSON.stringify({ error: "Invalid JSON structure - missing or invalid regex field" });
      }
      return output;
    } catch (jsonError) {
      console.error("Invalid JSON received from LLM:", output);
      console.error("JSON Parse Error:", jsonError.message);

      // Try to fix incomplete JSON
      const fixedOutput = attemptJsonFix(output, responseType);
      if (fixedOutput) {
        console.log("Successfully fixed incomplete JSON");
        return fixedOutput;
      }

      return JSON.stringify({ error: `Invalid JSON format received - ${jsonError.message}` });
    }
  } catch (err) {
    console.error("OpenRouter API call failed:", err.message);
    return JSON.stringify({ error: `OpenRouter API call failed: ${err.message}` });
  }
};

// Helper function to attempt fixing incomplete JSON
const attemptJsonFix = (brokenJson, responseType = 'regex') => {
  try {
    let fixed = brokenJson.trim();

    // Remove trailing commas and invalid characters
    fixed = fixed.replace(/,\s*$/, '');
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Count braces and brackets to close unclosed ones
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      fixed += ']'.repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }

    if (responseType === 'regex') {
      if (!fixed.includes('"regex"')) {
        const regexMatch = fixed.match(/([^\s`][^`]*[^\s`])/);
        if (regexMatch) {
          let pattern = regexMatch[1].replace(/"/g, '\\"').replace(/^\/|\/[gimsuy]*$/g, '');
          if (pattern.endsWith('[') || pattern.endsWith('(') || pattern.endsWith('\\')) {
            pattern = '';
          }
          fixed = `{"regex": "${pattern}"}`;
        } else {
          fixed = `{"regex": ""}`;
        }
      } else if (!fixed.endsWith('"}')) {
        fixed = fixed.replace(/"$/, '"}');
      }
    } else if (responseType === 'columnMatching') {
      if (!fixed.includes('"matches"')) {
        fixed = `{"matches": []}`;
      }
    } else if (responseType === 'ajvSchema') {
      if (!fixed.includes('"type": "object"') || !fixed.includes('"properties"') || !fixed.includes('"required"')) {
        // Fallback to a minimal AJV schema
        fixed = `{
          "type": "object",
          "properties": {},
          "required": []
        }`;
      }
    }

    // Try to parse the fixed JSON
    try {
      const parsed = JSON.parse(fixed);
      if (responseType === 'regex' && parsed.regex) {
        try {
          new RegExp(parsed.regex);
        } catch (e) {
          console.error("Invalid regex pattern in fixed JSON:", parsed.regex, e.message);
          return `{"regex": ""}`;
        }
      }
      if (responseType === 'ajvSchema' && (
          parsed.type !== 'object' ||
          !parsed.properties ||
          !Array.isArray(parsed.required)
      )) {
        console.error("Fixed JSON does not meet AJV schema requirements:", parsed);
        return `{
          "type": "object",
          "properties": {},
          "required": []
        }`;
      }
      return fixed;
    } catch (e) {
      console.error("JSON still invalid after basic fixes:", e.message, "Input:", fixed);
      return null;
    }
  } catch (e) {
    console.error("Failed to fix JSON:", e.message, "Input:", brokenJson);
    return null;
  }
};

// Helper function to clean JSON response
const cleanJsonResponse = (response) => {
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned;
};

// Alternative version with more robust JSON extraction
const getOpenRouterResponseRobust = async (prompt, maxTokens = 1000, temperature = 0.7) => {
  return getOpenRouterResponse(prompt, maxTokens, temperature, 'ajvSchema');
};

const extractValidJson = (text) => {
  let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^.*?(\{)/s, '$1')
      .replace(/(\}).*$/s, '$1')
      .trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    const patterns = [
      /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
      /\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g,
      /\{[\s\S]*\}/g,
      /\[[\s\S]*\]/g
    ];

    for (const pattern of patterns) {
      const matches = cleaned.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            JSON.parse(match);
            return match;
          } catch (e) {
            continue;
          }
        }
      }
    }
  }

  return null;
};

export default getOpenRouterResponse;
export { getOpenRouterResponseRobust, cleanJsonResponse, extractValidJson, attemptJsonFix };