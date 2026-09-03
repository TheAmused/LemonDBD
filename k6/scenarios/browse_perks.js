import { defaultClient, browseDuration, thinkTime } from '../lib/http_client.js';

export function runScenario(client = defaultClient) {
  const startTime = Date.now();
  const tags = { type: 'api', scenario: 'browse' };

  // 1. Fetch lightweight sidebar/vault stats summary
  client.get('/api/v1/stats/summary', { tags: tags });

  // 2. Explore survivor perks catalog
  const survivorPerksRes = client.get('/api/v1/perks?limit=50&category=survivor', { tags: tags });

  // 3. Multilingual killer perks exploration (Polish localization)
  client.get('/api/v1/perks?limit=50&category=killer&lang=pl', { tags: tags });

  // 4. Character roster index
  client.get('/api/v1/characters', { tags: tags });

  // 5. Inspect specific perk detail by identifier
  let perkIdentifier = 'Sprint%20Burst';
  if (survivorPerksRes && survivorPerksRes.status === 200) {
    try {
      const parsed = typeof survivorPerksRes.body === 'string'
        ? JSON.parse(survivorPerksRes.body)
        : survivorPerksRes.body;
      const perks = parsed.data || (Array.isArray(parsed) ? parsed : []);
      if (perks.length > 0) {
        const randomPerk = perks[Math.floor(Math.random() * perks.length)];
        if (randomPerk && randomPerk.name) {
          perkIdentifier = encodeURIComponent(randomPerk.name);
        }
      }
    } catch (e) {
      perkIdentifier = 'Sprint%20Burst';
    }
  }

  client.get(`/api/v1/perks/${perkIdentifier}`, { tags: tags });

  browseDuration.add(Date.now() - startTime);
  thinkTime(1.0, 2.5);
}

export const browsePerks = runScenario;
export default function () {
  runScenario();
}
