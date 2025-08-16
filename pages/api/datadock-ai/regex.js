export default async function generateRegex(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        status: 400,
        error: 'Valid prompt required'
      });
    }

    console.log('Generating regex for prompt:', prompt);

    // Enhanced prompt for precise regex generation
    const actualPrompt = `Generate a JavaScript regex pattern for: "${prompt.trim()}"

Requirements:
- Return JSON format: {"regex": "pattern"}
- Pattern should be a valid JavaScript regex string (no forward slashes or flags)
- Use proper escaping (double backslashes for special characters)
- Make patterns practical and commonly used
- Examples:
  * Email: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$
  * Phone: ^\\+?[1-9]\\d{1,14}$
  * URL: ^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$

Return ONLY the JSON object, no explanations.`;

    const result = await getAIResponseWithFallback(actualPrompt, 1000, 0.3, 'regex');

    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse AI response:', result, parseError.message);
      return res.status(500).json({
        status: 500,
        error: 'Failed to generate valid regex response'
      });
    }

    // Check for error in response
    if (parsedResult.error) {
      console.error('AI response error:', parsedResult.error);
      return res.status(500).json({
        status: 500,
        error: parsedResult.error
      });
    }

    // Validate regex field exists and is a string
    if (!parsedResult.regex || typeof parsedResult.regex !== 'string' || parsedResult.regex.trim() === '') {
      console.error('Invalid or empty regex response:', parsedResult);

      // Try to generate a fallback regex based on the prompt
      const fallbackRegex = generateFallbackRegexPattern(prompt);
      if (fallbackRegex) {
        console.log('Using fallback regex:', fallbackRegex);
        return res.status(200).json({
          status: 200,
          data: { regex: fallbackRegex }
        });
      }

      return res.status(500).json({
        status: 500,
        error: 'Unable to generate regex pattern for this prompt'
      });
    }

    // Final validation - test the regex pattern
    try {
      new RegExp(parsedResult.regex);
      console.log('Successfully generated regex:', parsedResult.regex);
      return res.status(200).json({
        status: 200,
        data: { regex: parsedResult.regex }
      });
    } catch (regexError) {
      console.error('Generated invalid regex pattern:', parsedResult.regex, regexError.message);

      // Try fallback regex
      const fallbackRegex = generateFallbackRegexPattern(prompt);
      if (fallbackRegex) {
        console.log('Using fallback regex due to invalid pattern:', fallbackRegex);
        return res.status(200).json({
          status: 200,
          data: { regex: fallbackRegex }
        });
      }

      return res.status(500).json({
        status: 500,
        error: 'Generated regex pattern is invalid and no fallback available'
      });
    }
  } catch (error) {
    console.error('generateRegex unexpected error:', error.message);
    return res.status(500).json({
      status: 500,
      error: 'Internal server error during regex generation'
    });
  }
}

function generateFallbackRegexPattern(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;

  const lowerPrompt = prompt.toLowerCase().trim();

  // Common patterns mapping
  const fallbackPatterns = {
    'card': '^(?:\\d{4}[ -]?){3}\\d{4}$',
    'credit card': '^(?:\\d{4}[ -]?){3}\\d{4}$',
    'creditcard': '^(?:\\d{4}[ -]?){3}\\d{4}$',
    'visa': '^4\\d{3}[ -]?\\d{4}[ -]?\\d{4}[ -]?\\d{4}$',
    'mastercard': '^5[1-5]\\d{2}[ -]?\\d{4}[ -]?\\d{4}[ -]?\\d{4}$',
    'email': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    'mail': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    'e-mail': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    'phone': '^\\+?[1-9]\\d{1,14}$',
    'mobile': '^\\+?[1-9]\\d{1,14}$',
    'telephone': '^\\+?[1-9]\\d{1,14}$',
    'cell': '^\\+?[1-9]\\d{1,14}$',
    'url': '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    'website': '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    'link': '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    'number': '^\\d+$',
    'integer': '^\\d+$',
    'decimal': '^\\d+(\\.\\d+)?$',
    'float': '^\\d+(\\.\\d+)?$',
    'price': '^\\$?\\d+(\\.\\d{2})?$',
    'money': '^\\$?\\d+(\\.\\d{2})?$',
    'currency': '^\\$?\\d+(\\.\\d{2})?$',
    'date': '^\\d{4}-\\d{2}-\\d{2}$',
    'time': '^\\d{2}:\\d{2}(:\\d{2})?$',
    'datetime': '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}(:\\d{2})?$',
    'name': '^[a-zA-Z\\s]{2,50}$',
    'username': '^[a-zA-Z0-9_]{3,20}$',
    'password': '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
    'zip': '^\\d{5}(-\\d{4})?$',
    'postal': '^[A-Z]\\d[A-Z] \\d[A-Z]\\d$',
    'zipcode': '^\\d{5}(-\\d{4})?$',
    'ssn': '^\\d{3}-\\d{2}-\\d{4}$',
    'social security': '^\\d{3}-\\d{2}-\\d{4}$',
    'ip': '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    'ip address': '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
  };

  // Direct match
  if (fallbackPatterns[lowerPrompt]) {
    return fallbackPatterns[lowerPrompt];
  }

  // Partial match
  for (const [key, pattern] of Object.entries(fallbackPatterns)) {
    if (lowerPrompt.includes(key) || key.includes(lowerPrompt)) {
      return pattern;
    }
  }

  // Generic fallbacks
  if (lowerPrompt.includes('digit') || lowerPrompt.includes('numeric')) {
    return '^\\d+$';
  }
  if (lowerPrompt.includes('letter') || lowerPrompt.includes('alphabetic')) {
    return '^[a-zA-Z]+$';
  }
  if (lowerPrompt.includes('alphanumeric')) {
    return '^[a-zA-Z0-9]+$';
  }
  if (lowerPrompt.includes('word') || lowerPrompt.includes('text')) {
    return '^[a-zA-Z\\s]+$';
  }

  // Default to a generic regex if no match is found
  return '^.*$';
}

const getGeminiResponse = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex') => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return JSON.stringify({ error: "GEMINI_API_KEY is not set." });
  }

  try {
    // System message for regex response
    const systemContent = `You are a regex pattern generator. You MUST return ONLY valid JSON in this exact format:
{"regex": "pattern_string"}

Rules:
- NO explanations, NO markdown, NO code blocks
- Return raw JSON object only
- The regex value must be a valid JavaScript regex pattern as a string
- Do NOT include forward slashes or flags
- Properly escape special characters with double backslashes`;

    const fullPrompt = `${systemContent}\n\nUser Request: ${prompt}\n\nIMPORTANT: Return ONLY the JSON object with no other text.`;

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
    let output;
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      output = data.candidates[0].content.parts[0].text.trim();
    } else {
      console.error("Unexpected Gemini response structure:", JSON.stringify(data, null, 2));
      return generateFallbackResponse(responseType, prompt);
    }

    if (!output) {
      console.error("Empty response from Gemini:", JSON.stringify(data, null, 2));
      return generateFallbackResponse(responseType, prompt);
    }

    // Clean and validate the response
    const cleanedOutput = cleanJsonResponse(output, responseType);
    return validateAndParseResponse(cleanedOutput, responseType, prompt);
  } catch (err) {
    console.error("Gemini API call failed:", err.message);
    return generateFallbackResponse(responseType, prompt);
  }
};

const cleanJsonResponse = (response, responseType) => {
  let cleaned = response.trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  cleaned = cleaned.replace(/^```[\s\S]*?```$/gm, '');

  // Remove any text before the first { or [
  const jsonStart = Math.min(
      cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
      cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );

  if (jsonStart !== Infinity && jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  // Remove any text after the last } or ]
  let jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (jsonEnd !== -1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }

  // Remove trailing commas
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  return cleaned;
};

const validateAndParseResponse = (cleanedOutput, responseType, prompt) => {
  try {
    const parsed = JSON.parse(cleanedOutput);

    // Validate based on responseType
    switch (responseType) {
      case 'regex':
        return validateRegexResponse(parsed, cleanedOutput, prompt);
      case 'columnMatching':
        return validateColumnMatchingResponse(parsed, cleanedOutput);
      case 'feedback':
        return validateFeedbackResponse(parsed, cleanedOutput);
      case 'ajvSchema':
        return validateAjvSchemaResponse(parsed, cleanedOutput);
      default:
        return generateFallbackResponse(responseType, prompt);
    }
  } catch (jsonError) {
    console.error("JSON parsing failed:", jsonError.message, "Raw output:", cleanedOutput);

    // Attempt to fix the JSON
    const fixedJson = attemptJsonFix(cleanedOutput, responseType);
    if (fixedJson) {
      try {
        const parsed = JSON.parse(fixedJson);
        return validateAndParseResponse(fixedJson, responseType, prompt);
      } catch (e) {
        console.error("Even fixed JSON failed:", e.message);
      }
    }

    return generateFallbackResponse(responseType, prompt);
  }
};

const validateRegexResponse = (parsed, originalOutput, prompt) => {
  if (!parsed || typeof parsed !== 'object') {
    console.error("Invalid parsed object:", parsed);
    return generateFallbackResponse('regex', prompt);
  }

  // Check if we have a regex field
  if (!parsed.regex || typeof parsed.regex !== 'string') {
    // Try to extract regex from other possible fields
    const regexValue = parsed.pattern || parsed.expression || parsed.value || '';
    parsed.regex = regexValue;
  }

  if (!parsed.regex || parsed.regex.trim() === '') {
    console.error("Empty or missing regex:", parsed);
    return generateFallbackResponse('regex', prompt);
  }

  // Validate the regex pattern
  try {
    new RegExp(parsed.regex);
    return JSON.stringify({ regex: parsed.regex });
  } catch (regexError) {
    console.error("Invalid regex pattern:", parsed.regex, regexError.message);

    // Try to clean the regex pattern
    let cleanedRegex = cleanRegexPattern(parsed.regex);
    try {
      new RegExp(cleanedRegex);
      return JSON.stringify({ regex: cleanedRegex });
    } catch (e) {
      console.error("Cleaned regex still invalid:", cleanedRegex);
      return generateFallbackResponse('regex', prompt);
    }
  }
};

const validateColumnMatchingResponse = (parsed, originalOutput) => {
  if (!parsed || typeof parsed !== 'object') {
    return generateFallbackResponse('columnMatching');
  }

  // Check for matches array
  if (!parsed.matches || !Array.isArray(parsed.matches)) {
    return generateFallbackResponse('columnMatching');
  }

  // Validate each match object
  const validMatches = parsed.matches.filter(match => {
    return match &&
        typeof match === 'object' &&
        typeof match.validationColumn === 'string' &&
        (match.saasColumn === null || typeof match.saasColumn === 'string');
  });

  return JSON.stringify({ matches: validMatches });
};

const validateFeedbackResponse = (parsed, originalOutput) => {
  if (Array.isArray(parsed)) {
    return JSON.stringify(parsed);
  }

  // Try to extract array from wrapper objects
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) return JSON.stringify(parsed.data);
    if (Array.isArray(parsed.feedback)) return JSON.stringify(parsed.feedback);
    if (Array.isArray(parsed.results)) return JSON.stringify(parsed.results);
  }

  return JSON.stringify([]);
};

const validateAjvSchemaResponse = (parsed, originalOutput) => {
  if (!parsed || typeof parsed !== 'object') {
    return generateFallbackResponse('ajvSchema');
  }

  if (parsed.type !== 'object' || !parsed.properties || !Array.isArray(parsed.required)) {
    return generateFallbackResponse('ajvSchema');
  }

  return originalOutput;
};

const attemptJsonFix = (brokenJson, responseType) => {
  try {
    let fixed = brokenJson.trim();

    // Handle specific response type patterns
    if (responseType === 'regex') {
      // Look for regex patterns in the text
      const regexPatterns = [
        /"regex"\s*:\s*"([^"]*?)"/,
        /"pattern"\s*:\s*"([^"]*?)"/,
        /regex:\s*"([^"]*?)"/,
        /pattern:\s*"([^"]*?)"/
      ];

      for (const pattern of regexPatterns) {
        const match = fixed.match(pattern);
        if (match && match[1]) {
          return JSON.stringify({ regex: match[1] });
        }
      }

      // If no pattern found, try to extract any string that looks like a regex
      const stringMatch = fixed.match(/"([^"]+)"/);
      if (stringMatch && stringMatch[1]) {
        try {
          new RegExp(stringMatch[1]);
          return JSON.stringify({ regex: stringMatch[1] });
        } catch (e) {
          // Invalid regex, return empty
        }
      }

      return JSON.stringify({ regex: "" });
    }

    if (responseType === 'columnMatching') {
      // Try to find matches array pattern
      const matchesPattern = /"matches"\s*:\s*\[[\s\S]*?\]/;
      const match = fixed.match(matchesPattern);
      if (match) {
        try {
          return JSON.stringify({ matches: JSON.parse(`[${match[0].split('[')[1].split(']')[0]}]`) });
        } catch (e) {
          // Fall back to empty matches
        }
      }
      return JSON.stringify({ matches: [] });
    }

    // Generic JSON fixing
    fixed = fixCommonJsonIssues(fixed);

    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
};

const fixCommonJsonIssues = (json) => {
  let fixed = json;

  // Count and fix braces/brackets
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  // Add missing closing braces/brackets
  if (openBraces > closeBraces) {
    fixed += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    fixed += ']'.repeat(openBrackets - closeBrackets);
  }

  // Remove extra closing braces/brackets
  if (closeBraces > openBraces) {
    const extraClosing = closeBraces - openBraces;
    for (let i = 0; i < extraClosing; i++) {
      fixed = fixed.replace(/\}(?=[^}]*$)/, '');
    }
  }
  if (closeBrackets > openBrackets) {
    const extraClosing = closeBrackets - openBrackets;
    for (let i = 0; i < extraClosing; i++) {
      fixed = fixed.replace(/\](?=[^\]]*$)/, '');
    }
  }

  return fixed;
};

const cleanRegexPattern = (pattern) => {
  if (!pattern) return '';

  let cleaned = pattern.toString();

  // Remove forward slashes and flags if present
  cleaned = cleaned.replace(/^\/|\/[gimuy]*$/g, '');

  // Fix common escaping issues
  cleaned = cleaned.replace(/\\\\/g, '\\');

  // Remove incomplete character classes or groups
  if (cleaned.endsWith('[') || cleaned.endsWith('(') || cleaned.endsWith('\\')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
};

const generateFallbackResponse = (responseType, prompt = '') => {
  switch (responseType) {
    case 'regex':
      const smartRegex = generateFallbackRegexPattern(prompt);
      return JSON.stringify({ regex: smartRegex });
    case 'columnMatching':
      return JSON.stringify({ matches: [] });
    case 'feedback':
      return JSON.stringify([]);
    case 'ajvSchema':
      return JSON.stringify({
        type: "object",
        properties: {},
        required: []
      });
    default:
      return JSON.stringify({ error: "Unable to generate valid response" });
  }
};

const getGeminiResponseWithRetry = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex', maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getGeminiResponse(prompt, maxTokens, temperature, responseType);
      const parsed = JSON.parse(result);

      if (parsed.error && parsed.error.includes('rate limit')) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        return generateFallbackResponse(responseType, prompt);
      }

      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Waiting ${waitTime/1000}s before retry`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

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

  return generateFallbackResponse(responseType, prompt);
};

export {
  getGeminiResponse,
  getGeminiResponseWithRetry,
  getAIResponseWithFallback,
  cleanJsonResponse,
  attemptJsonFix,
  validateAndParseResponse,
  generateFallbackResponse
};