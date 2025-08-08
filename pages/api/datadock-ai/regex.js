import { getAIResponseWithFallback } from "../../../lib/gpt-engine";

export default async function generateRegex(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        const { prompt } = req.body;
        if (!prompt) {
          return res.status(400).json({ status: 400, error: 'Prompt is required' });
        }

        const actualPrompt = `Generate a JavaScript regex pattern for: "${prompt}"

        Requirements:
        - Return valid JSON with a "regex" key
        - Pattern should be ready to use in JavaScript (no leading/trailing slashes)
        - Include common validation patterns for emails, phones, etc.
        - Make patterns practical and not overly complex

        Examples:
        - Email: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$
        - Phone: ^\\+?[1-9]\\d{1,14}$
        - Name: ^[a-zA-Z\\s'-]{2,50}$

        Generate regex for: ${prompt}`;

        console.log('Calling Gemini for regex generation');
        const resp = await getAIResponseWithFallback(actualPrompt, 1000, 0.5, 'regex');

        try {
          const parsed = JSON.parse(resp);

          if (parsed.error) {
            return res.status(500).json({ status: 500, error: parsed.error });
          }

          if (!parsed.regex) {
            return res.status(500).json({ status: 500, error: 'No regex pattern generated' });
          }

          // Validate the regex pattern
          try {
            new RegExp(parsed.regex);
          } catch (regexError) {
            console.error('Invalid regex pattern generated:', parsed.regex);
            return res.status(500).json({ status: 500, error: 'Generated regex pattern is invalid' });
          }

          res.status(200).json({ status: 200, data: parsed });
        } catch (parseError) {
          console.error('Failed to parse regex response:', parseError, 'Response:', resp);
          res.status(500).json({ status: 500, error: 'Failed to parse AI response' });
        }
      } catch (error) {
        console.error('Error generating regex:', error);
        res.status(500).json({ status: 500, error: 'Failed to generate regex' });
      }
      break;
    default:
      res.status(405).json({ status: 405, error: 'Method not allowed' });
  }
}