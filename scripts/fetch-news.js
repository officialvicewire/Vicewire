const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '../public/gta6-news.json');

async function fetchGTA6News() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Search the web for the 5 most recent Grand Theft Auto 6 / GTA VI news items from the past 7 days.

Return ONLY a raw JSON array (no markdown, no preamble). Each item must have exactly these fields:
{
  "title": "headline in your own words",
  "summary": "2-3 sentences, fully paraphrased",
  "source": "publication name",
  "date": "MMM D, YYYY format",
  "tag": "one of: OFFICIAL, NEWS, RUMOR, BUSINESS"
}

Order newest first. Return ONLY the JSON array, nothing else.`,
          },
        ],
        tools: [
          {
            type: 'builtin_tools',
            name: 'web_search',
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.content) {
      throw new Error('No content in response');
    }

    let newsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        newsText += block.text;
      }
    }

    const jsonMatch = newsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const newsArray = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(newsArray)) {
      throw new Error('Response is not an array');
    }

    const outputDir = path.dirname(NEWS_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(NEWS_FILE, JSON.stringify(newsArray, null, 2));
    console.log(`✓ Updated ${NEWS_FILE} with ${newsArray.length} items`);
  } catch (error) {
    console.error('Error fetching news:', error.message);
    process.exit(1);
  }
}

fetchGTA6News();
