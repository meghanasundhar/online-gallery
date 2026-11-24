
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'artGalleryJwtToken';

function getToken() {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return localStorage.getItem(TOKEN_KEY);
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/api/artworks${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Artwork request failed.');
  }

  return data;
}

export async function getArtworksFromAPI() {
  const data = await request('');
  return data.artworks;
}

export async function getArtworkFromAPI(id) {
  const data = await request(`/${id}`);
  return data.artwork;
}

export async function createArtworkAPI(artwork) {
  const data = await request('', {
    method: 'POST',
    body: JSON.stringify(artwork),
  });
  return data.artwork;
}

export async function updateArtworkAPI(id, artwork) {
  const data = await request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(artwork),
  });
  return data.artwork;
}

export async function deleteArtworkAPI(id) {
  return request(`/${id}`, {
    method: 'DELETE',
  });
}
// Admin: Get pending artworks
export async function getPendingArtworksAPI() {
  const data = await request('/admin/pending');
  return data.artworks || [];
}

// Admin: Approve artwork
export async function approveArtworkAPI(id) {
  const data = await request(`/admin/${id}/approve`, {
    method: 'PATCH',
  });

  return data;
}

// Admin: Reject artwork
export async function rejectArtworkAPI(id, reason) {
  const data = await request(`/admin/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

  return data;
}