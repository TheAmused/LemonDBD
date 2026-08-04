export interface GeneratorConfig {
  id?: number;
  role?: string;
  gen_mode?: string;
  no_repeat_perks?: number | boolean;
  total_pages?: number;
  perks_per_page?: number;
  last_page_perks?: number;
  spin_duration_sec?: number;
  updated_at?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/generator`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchGeneratorConfig(): Promise<GeneratorConfig> {
  const response = await fetch(`${API_BASE}/config`);
  const data = await handleResponse<{ config: GeneratorConfig }>(response);
  return data.config;
}

export async function updateGeneratorConfig(
  config: Partial<GeneratorConfig>
): Promise<GeneratorConfig> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  const data = await handleResponse<{ config: GeneratorConfig }>(response);
  return data.config;
}

export async function fetchDrawnPerks(role: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/drawn?role=${encodeURIComponent(role)}`);
  const data = await handleResponse<{ drawn_perks: string[] }>(response);
  return data.drawn_perks;
}

export async function addDrawnPerks(
  role: string,
  perks: string[]
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/draw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, perks }),
  });
  const data = await handleResponse<{ drawn_perks: string[] }>(response);
  return data.drawn_perks;
}

export async function resetDrawnPerks(role?: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role ? { role } : {}),
  });
  const data = await handleResponse<{ drawn_perks: string[] }>(response);
  return data.drawn_perks;
}
