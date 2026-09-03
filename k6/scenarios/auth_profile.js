import { sleep } from 'k6';
import { defaultClient } from '../lib/http_client.js';
import { registerAndLoginUser, getAuthHeaders } from '../lib/auth.js';

function thinkTime(min, max) {
  if (typeof __ENV !== 'undefined' && (__ENV.K6_FAST_TEST === 'true' || __ENV.K6_FAST_TEST === '1')) {
    sleep(0.05);
    return;
  }
  sleep(min + Math.random() * (max - min));
}

export function runScenario(client = defaultClient) {
  const vuId = typeof __VU !== 'undefined' ? __VU : 1;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  const tags = { type: 'api', scenario: 'auth' };

  // 1. Register and login dynamic virtual user
  const authUser = registerAndLoginUser(vuId, iter);

  // 2. Fetch authenticated profile
  if (authUser && authUser.token) {
    client.get('/api/v1/auth/me', {
      headers: getAuthHeaders(authUser.token),
      tags: tags,
    });
  }

  thinkTime(1.5, 3.0);
}

export const authProfile = runScenario;
export default function () {
  runScenario();
}
