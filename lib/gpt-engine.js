const getGeminiResponse = async (prompt, maxTokens = 1000, temperature = 0.7, responseType = 'regex') => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return JSON.stringify({ error: "GEMINI_API_KEY is not set." });
  }

  try {
    let systemContent;
    switch (responseType) {
      case 'columnMatching':
        systemContent = `You are a precise JSON generator for column matching. You MUST return ONLY valid JSON in this exact format:
{"matches": [{"validationColumn": "exact_column_name", "saasColumn": "matched_name_or_null"}]}

Rules:
- NO explanations, NO markdown, NO code blocks
- Use exact column names from the input lists
- Set saasColumn to null for unmatched columns
- Return raw JSON object only`;
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
        systemContent = `You are a regex pattern generator. You MUST return ONLY valid JSON in this exact format:
{"regex": "pattern_string"}

Rules:
- NO explanations, NO markdown, NO code blocks
- Return raw JSON object only
- The regex value must be a valid JavaScript regex pattern as a string
- Do NOT include forward slashes or flags
- Properly escape special characters with double backslashes`;
    }

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

    const cleanedOutput = cleanJsonResponse(output, responseType);
    return validateAndParseResponse(cleanedOutput, responseType, prompt);
  } catch (err) {
    console.error("Gemini API call failed:", err.message, "Details:", err);
    return generateFallbackResponse(responseType, prompt);
  }
};

const cleanJsonResponse = (response, responseType) => {
  let cleaned = response.trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  cleaned = cleaned.replace(/^```[\s\S]*?```$/gm, '');

  const jsonStart = Math.min(
      cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
      cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );

  if (jsonStart !== Infinity && jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  let jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (jsonEnd !== -1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }

  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return cleaned;
};

const validateAndParseResponse = (cleanedOutput, responseType, prompt) => {
  try {
    const parsed = JSON.parse(cleanedOutput);

    switch (responseType) {
      case 'regex':
        return validateRegexResponse(parsed, cleanedOutput, prompt);
      case 'columnMatching':
        return validateColumnMatchingResponse(parsed, cleanedOutput);
      case 'feedback':
        return validateFeedbackResponse(parsed, cleanedOutput);
      case 'ajvSchema':
        return validateAjvSchemaResponse(parsed, cleanedOutput, prompt);
      default:
        return generateFallbackResponse(responseType, prompt);
    }
  } catch (jsonError) {
    console.error("JSON parsing failed:", jsonError.message, "Raw output:", cleanedOutput);

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

  if (!parsed.regex || typeof parsed.regex !== 'string') {
    const regexValue = parsed.pattern || parsed.expression || parsed.value || '';
    parsed.regex = regexValue;
  }

  if (!parsed.regex || parsed.regex.trim() === '') {
    console.error("Empty or missing regex:", parsed);
    return generateFallbackResponse('regex', prompt);
  }

  try {
    new RegExp(parsed.regex);
    return JSON.stringify({ regex: parsed.regex });
  } catch (regexError) {
    console.error("Invalid regex pattern:", parsed.regex, regexError.message);
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

  if (!parsed.matches || !Array.isArray(parsed.matches)) {
    return generateFallbackResponse('columnMatching');
  }

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

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) return JSON.stringify(parsed.data);
    if (Array.isArray(parsed.feedback)) return JSON.stringify(parsed.feedback);
    if (Array.isArray(parsed.results)) return JSON.stringify(parsed.results);
  }

  return JSON.stringify([]);
};

const validateAjvSchemaResponse = (parsed, originalOutput, prompt) => {
  if (!parsed || typeof parsed !== 'object') {
    return generateFallbackResponse('ajvSchema', prompt);
  }

  if (parsed.type !== 'object' || !parsed.properties || !Array.isArray(parsed.required)) {
    return generateFallbackResponse('ajvSchema', prompt);
  }

  return JSON.stringify(parsed);
};

const attemptJsonFix = (brokenJson, responseType) => {
  try {
    let fixed = brokenJson.trim();

    if (responseType === 'ajvSchema') {
      const schemaPattern = /"type"\s*:\s*"object"/;
      if (schemaPattern.test(fixed)) {
        const propertiesMatch = fixed.match(/"properties"\s*:\s*{[\s\S]*?}/);
        const requiredMatch = fixed.match(/"required"\s*:\s*\[[\s\S]*?\]/);
        if (propertiesMatch && requiredMatch) {
          return `{${fixed.match(/"type"\s*:\s*"object"/)[0]},${propertiesMatch[0]},${requiredMatch[0]}}`;
        }
      }
      return generateFallbackResponse('ajvSchema');
    }

    if (responseType === 'regex') {
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

      const stringMatch = fixed.match(/"([^"]+)"/);
      if (stringMatch && stringMatch[1]) {
        try {
          new RegExp(stringMatch[1]);
          return JSON.stringify({ regex: stringMatch[1] });
        } catch (e) {}
      }

      return JSON.stringify({ regex: "" });
    }

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

  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  if (openBraces > closeBraces) {
    fixed += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    fixed += ']'.repeat(openBrackets - closeBrackets);
  }

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
  cleaned = cleaned.replace(/^\/|\/[gimuy]*$/g, '');
  cleaned = cleaned.replace(/\\\\/g, '\\');
  if (cleaned.endsWith('[') || cleaned.endsWith('(') || cleaned.endsWith('\\')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

const generateFallbackRegexPattern = (prompt) => {
  if (!prompt || typeof prompt !== 'string') return '^.*$';

  const lowerPrompt = prompt.toLowerCase().trim();

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

  if (fallbackPatterns[lowerPrompt]) {
    return fallbackPatterns[lowerPrompt];
  }

  for (const [key, pattern] of Object.entries(fallbackPatterns)) {
    if (lowerPrompt.includes(key) || key.includes(lowerPrompt)) {
      return pattern;
    }
  }

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

  return '^.*$';
};

const generateFallbackResponse = (responseType, prompt = '') => {
  switch (responseType) {
    case 'ajvSchema':
      const lowerPrompt = prompt.toLowerCase().replace('regestration', 'registration').trim();
      if (lowerPrompt.includes('employee registration')) {
        return JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email' },
            isActive: { type: 'boolean' },
            department: { type: 'string', maxLength: 100 },
            hireDate: { type: 'string', format: 'date' }
          },
          required: ['id', 'name', 'email', 'isActive']
        });
      }
      return JSON.stringify({
        type: 'object',
        properties: {},
        required: []
      });
    case 'regex':
      return JSON.stringify({ regex: generateFallbackRegexPattern(prompt) });
    case 'columnMatching':
      return JSON.stringify({ matches: [] });
    case 'feedback':
      return JSON.stringify([]);
    default:
      return JSON.stringify({ error: 'Unable to generate valid response' });
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

export default getGeminiResponse;
export {
  getGeminiResponseWithRetry,
  getAIResponseWithFallback,
  cleanJsonResponse,
  attemptJsonFix,
  validateAndParseResponse,
  generateFallbackResponse
};