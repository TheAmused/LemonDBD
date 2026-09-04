import { defaultClient, authDuration } from './http_client.js';

export function registerUser(vuId = (typeof __VU !== 'undefined' ? __VU : 1), iter = (typeof __ITER !== 'undefined' ? __ITER : 0), client = defaultClient) {
  const timestamp = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  const username = `k6_u_${vuId}_${iter}_${rand}`.substring(0, 30);
  const email = `k6_${vuId}_${iter}_${timestamp}_${rand}@example.com`;
  const password = 'K6P@ssword123!';

  const startTime = Date.now();
  const regRes = client.post('/api/v1/auth/register', {
    username: username,
    email: email,
    password: password,
  }, { tags: { type: 'auth', operation: 'register' } });

  authDuration.add(Date.now() - startTime);

  let token = null;
  if (regRes.status >= 200 && regRes.status < 300) {
    try {
      const regBody = typeof regRes.body === 'string' ? JSON.parse(regRes.body) : regRes.body;
      token = regBody.token || regBody.access_token || (regBody.data && regBody.data.token) || null;
    } catch (e) {
      token = null;
    }
  }

  return { username, email, password, token, status: regRes.status };
}

export function loginUser(username, password = 'K6P@ssword123!', client = defaultClient) {
  const startTime = Date.now();
  const loginRes = client.post('/api/v1/auth/login', {
    username: username,
    password: password,
  }, { tags: { type: 'auth', operation: 'login' } });

  authDuration.add(Date.now() - startTime);

  let token = null;
  if (loginRes.status === 200) {
    try {
      const body = typeof loginRes.body === 'string' ? JSON.parse(loginRes.body) : loginRes.body;
      token = body.token || body.access_token || (body.data && body.data.token) || null;
    } catch (e) {
      token = null;
    }
  }

  return { username, token, status: loginRes.status };
}

export function registerAndLoginUser(vuId = (typeof __VU !== 'undefined' ? __VU : 1), iter = (typeof __ITER !== 'undefined' ? __ITER : 0), client = defaultClient) {
  const reg = registerUser(vuId, iter, client);
  if (!reg || reg.status >= 300) {
    return { username: reg ? reg.username : '', email: reg ? reg.email : '', token: null };
  }

  const login = loginUser(reg.username, reg.password, client);
  const token = login.token || reg.token;

  return { username: reg.username, email: reg.email, token };
}

export function getAuthHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const registerAndLogin = registerAndLoginUser;
export const authHelper = {
  registerUser,
  loginUser,
  registerAndLoginUser,
  registerAndLogin,
  getAuthHeaders,
};

export default authHelper;
