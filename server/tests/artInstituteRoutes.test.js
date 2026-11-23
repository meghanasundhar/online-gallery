const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const { createApp } = require('../app');

async function startTestServer(fetchImpl) {
  const server = createApp({ artInstituteFetch: fetchImpl }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('proxies validated Art Institute search and returns requested artwork fields', async () => {
  let upstreamUrl;
  const serverContext = await startTestServer(async (url, options) => {
    upstreamUrl = new URL(url);
    assert.equal(options.headers.Accept, 'application/json');
    return new Response(JSON.stringify({
      config: { iiif_url: 'https://www.artic.edu/iiif/2/' },
      data: [{
        id: 21,
        title: 'Water Lilies',
        artist_title: 'Claude Monet',
        image_id: 'image-21',
        date_display: '1906',
        medium_display: 'Oil on canvas',
        ignored_field: 'not forwarded',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  try {
    const response = await fetch(`${serverContext.baseUrl}/api/art-institute/artworks/search?q=water%20lilies&limit=1`);
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(upstreamUrl.searchParams.get('q'), 'water lilies');
    assert.equal(upstreamUrl.searchParams.get('limit'), '1');
    assert.equal(upstreamUrl.searchParams.get('fields'), 'id,title,artist_title,image_id,date_display,medium_display');
    assert.deepEqual(result.data[0], {
      id: 21,
      title: 'Water Lilies',
      artist_title: 'Claude Monet',
      image_id: 'image-21',
      date_display: '1906',
      medium_display: 'Oil on canvas',
    });
    assert.equal(result.config.iiif_url, 'https://www.artic.edu/iiif/2/');
  } finally {
    await new Promise((resolve) => serverContext.server.close(resolve));
  }
});

test('rejects empty/oversized search and invalid limits without calling upstream', async () => {
  let upstreamCalls = 0;
  const serverContext = await startTestServer(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  });

  try {
    const emptyQuery = await fetch(`${serverContext.baseUrl}/api/art-institute/artworks/search?q=`);
    assert.equal(emptyQuery.status, 400);

    const oversizedQuery = await fetch(`${serverContext.baseUrl}/api/art-institute/artworks/search?q=${'a'.repeat(121)}`);
    assert.equal(oversizedQuery.status, 400);

    const invalidLimit = await fetch(`${serverContext.baseUrl}/api/art-institute/artworks/search?q=art&limit=31`);
    assert.equal(invalidLimit.status, 400);
    assert.equal(upstreamCalls, 0);
  } finally {
    await new Promise((resolve) => serverContext.server.close(resolve));
  }
});

test('maps upstream errors and network failures to safe service errors', async () => {
  const unavailableServer = await startTestServer(async () => new Response('upstream error', { status: 403 }));
  try {
    const response = await fetch(`${unavailableServer.baseUrl}/api/art-institute/artworks/search?q=art`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: 'Art Institute search is temporarily unavailable.' });
  } finally {
    await new Promise((resolve) => unavailableServer.server.close(resolve));
  }

  const networkErrorServer = await startTestServer(async () => { throw new Error('network details should not leak'); });
  try {
    const response = await fetch(`${networkErrorServer.baseUrl}/api/art-institute/artworks/search?q=art`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: 'Art Institute search is temporarily unavailable.' });
  } finally {
    await new Promise((resolve) => networkErrorServer.server.close(resolve));
  }
});