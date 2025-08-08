const getGeminiResponse = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex') => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let output;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return JSON.stringify({ error: "GEMINI_API_KEY is not set." });
  }

  try {
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
          Never include regex patterns, explanations, markdown formatting, code blocks, or non-JSON content. Return raw JSON only.`;
        break;
      case 'feedback':
        systemContent = 'You are a data validation expert. You must return a valid JSON array of objects. Each object must include all original fields plus a "feedback" object containing validation issues. Always wrap your response in square brackets []. Never include explanations, markdown formatting, or code blocks. Return only the JSON array.';
        break;
      case 'regex':
      default:
        systemContent = 'You are a JSON generator for regex patterns. Always respond with valid JSON containing only a "regex" key with a complete, valid JavaScript regex pattern as a string. Never include explanations, markdown, code blocks, or incomplete patterns. Return raw JSON only.';
    }

    // Combine system prompt with user prompt for Gemini
    const fullPrompt = `${systemContent}\n\nUser: ${prompt}\n\nRemember: Return only valid JSON with no additional text, explanations, or formatting.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        topP: 0.8,
        topK: 10
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      return JSON.stringify({ error: `Gemini API error: ${response.status} ${response.statusText}` });
    }

    const data = await response.json();

    // Extract text from Gemini response structure
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      output = data.candidates[0].content.parts[0].text.trim();
    } else {
      console.error("Unexpected Gemini response structure:", data);
      return JSON.stringify({ error: "No valid response from Gemini model." });
    }

    if (!output) {
      console.error("Empty response from Gemini:", data);
      return JSON.stringify({ error: "No valid response from Gemini model." });
    }

    // Clean up the response to remove markdown formatting
    output = cleanJsonResponse(output);

    // Special handling for feedback responses
    if (responseType === 'feedback') {
      return handleFeedbackResponse(output);
    }

    // Validate that the output is valid JSON for other types
    try {
      const parsed = JSON.parse(output);

      // Validate based on responseType
      if (responseType === 'columnMatching' && (!parsed.matches || !Array.isArray(parsed.matches))) {
        return JSON.stringify({ error: "Invalid JSON structure - 'matches' array missing" });
      }
      if (responseType === 'ajvSchema' && (parsed.type !== 'object' || !parsed.properties || !Array.isArray(parsed.required))) {
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
    console.error("Gemini API call failed:", err.message);
    return JSON.stringify({ error: `Gemini API call failed: ${err.message}` });
  }
};

// Special handler for feedback responses
const handleFeedbackResponse = (output) => {
  try {
    // First try direct parsing
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return output;
    }

    // If it's wrapped in a container, try to extract
    if (parsed.data && Array.isArray(parsed.data)) {
      return JSON.stringify(parsed.data);
    }
    if (parsed.feedback && Array.isArray(parsed.feedback)) {
      return JSON.stringify(parsed.feedback);
    }

    throw new Error('Not an array');
  } catch (error) {
    console.log('Direct feedback parsing failed, attempting fixes...');

    // Try to fix common issues with feedback responses
    let fixed = output.trim();

    // Remove markdown formatting
    fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Look for array pattern
    const arrayMatch = fixed.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        JSON.parse(arrayMatch[0]);
        return arrayMatch[0];
      } catch (e) {
        console.log('Array pattern found but invalid JSON');
      }
    }

    // Check if we have comma-separated objects that need array wrapping
    if (fixed.includes('"_id"') && (fixed.includes('},{') || fixed.includes('},\n'))) {
      console.log('Detected comma-separated objects, wrapping in array...');

      // Clean up and wrap in array
      fixed = fixed.replace(/,\s*$/, ''); // Remove trailing comma

      if (!fixed.startsWith('[')) {
        fixed = '[' + fixed;
      }
      if (!fixed.endsWith(']')) {
        fixed = fixed + ']';
      }

      // Clean up commas before closing brackets
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

      try {
        JSON.parse(fixed);
        console.log('Successfully wrapped objects in array');
        return fixed;
      } catch (e) {
        console.error('Failed to parse wrapped array:', e.message);
      }
    }

    // Last resort: return error
    console.error('Could not fix feedback response format');
    return JSON.stringify({ error: "Could not parse feedback response as valid JSON array" });
  }
};

// Enhanced JSON fix function
const attemptJsonFix = (brokenJson, responseType = 'regex') => {
  try {
    let fixed = brokenJson.trim();

    // Remove markdown formatting
    fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');

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

    // Response type specific fixes
    if (responseType === 'feedback') {
      if (!fixed.startsWith('[') && fixed.includes('"_id"')) {
        fixed = '[' + fixed + ']';
      }
    } else if (responseType === 'regex') {
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
      }
    } else if (responseType === 'columnMatching') {
      if (!fixed.includes('"matches"')) {
        fixed = `{"matches": []}`;
      }
    }

    // Try to parse the fixed JSON
    try {
      const parsed = JSON.parse(fixed);

      // Additional validation
      if (responseType === 'regex' && parsed.regex) {
        try {
          new RegExp(parsed.regex);
        } catch (e) {
          return `{"regex": ""}`;
        }
      }
      if (responseType === 'feedback' && !Array.isArray(parsed)) {
        return JSON.stringify([]);
      }

      return fixed;
    } catch (e) {
      console.error("JSON still invalid after fixes:", e.message);

      // Provide fallback based on response type
      switch (responseType) {
        case 'feedback':
          return JSON.stringify([]);
        case 'regex':
          return JSON.stringify({ regex: "" });
        case 'columnMatching':
          return JSON.stringify({ matches: [] });
        case 'ajvSchema':
          return JSON.stringify({ type: "object", properties: {}, required: [] });
        default:
          return null;
      }
    }
  } catch (e) {
    console.error("Failed to fix JSON:", e.message);
    return null;
  }
};

// Rate-limited version with automatic retry
const getGeminiResponseWithRetry = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex', maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getGeminiResponse(prompt, maxTokens, temperature, responseType);
      const parsed = JSON.parse(result);

      // If we get a rate limit error, wait and retry
      if (parsed.error && parsed.error.includes('rate limit')) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        return JSON.stringify({ error: `All retry attempts failed: ${error.message}` });
      }

      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Waiting ${waitTime/1000}s before retry`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Multi-provider fallback system
const getAIResponseWithFallback = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex') => {
  const providers = [
    {
      name: 'Gemini',
      func: () => getGeminiResponseWithRetry(prompt, maxTokens, temperature, responseType, 2)
    }
  ];

  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name} provider...`);
      const result = await provider.func();
      const parsed = JSON.parse(result);

      if (!parsed.error) {
        console.log(`Success with ${provider.name} provider`);
        return result;
      } else {
        console.warn(`${provider.name} provider failed:`, parsed.error);
      }
    } catch (error) {
      console.warn(`${provider.name} provider error:`, error.message);
    }
  }

  return JSON.stringify({ error: "All AI providers failed" });
};

// Helper function to clean JSON response
const cleanJsonResponse = (response) => {
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();

  // For non-array responses, extract the JSON object
  if (!cleaned.startsWith('[')) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  return cleaned;
};

export default getGeminiResponse;
export {
  getGeminiResponseWithRetry,
  getAIResponseWithFallback,
  cleanJsonResponse,
  attemptJsonFix,
  handleFeedbackResponse
};