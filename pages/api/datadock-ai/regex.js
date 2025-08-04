import getOpenRouterResponse from "../../../lib/gpt-engine";

export default async function generateRegex(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        const { prompt } = req.body;
        if (!prompt) {
          return res.status(400).json({ status: 400, error: 'Prompt is required' });
        }
        const actualPrompt = 'Generate a regex pattern for this description and return it as a JSON object with a "regex" key: ' + prompt;
        const resp = await getOpenRouterResponse(actualPrompt, 1500); // Increased max_tokens
        res.status(200).json({ status: 200, data: resp });
      } catch (error) {
        console.error('Error generating regex:', error);
        res.status(500).json({ status: 500, error: 'Failed to generate regex' });
      }
      break;
    default:
      res.status(405).json({ status: 405, error: 'Method not allowed' });
  }
}