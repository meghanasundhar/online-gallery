
const express = require('express');
const { query, validationResult } = require('express-validator');

const ART_INSTITUTE_SEARCH_URL =
  'https://api.artic.edu/api/v1/artworks/search';

function createArtInstituteRouter({ fetchImpl = fetch } = {}) {
  const router = express.Router();

  router.get('/artworks/search', [
    query('q')
      .isString()
      .withMessage('Enter a search term.')
      .bail()
      .trim()
      .isLength({ min: 1, max: 120 })
      .withMessage('Search must be 1 to 120 characters.'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('Result limit must be between 1 and 30.')
      .toInt(),
  ], async (req, res) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        message: validationErrors.array()[0].msg,
      });
    }

    const params = new URLSearchParams({
      q: req.query.q,
      limit: String(req.query.limit ?? 12),
      fields: 'id,title,artist_title,image_id,date_display,medium_display',
    });

    try {
      const upstreamResponse = await fetchImpl(
        `${ART_INSTITUTE_SEARCH_URL}?${params}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!upstreamResponse.ok) {
        return res.status(502).json({
          message: 'Art Institute search is temporarily unavailable.',
        });
      }

      const upstreamData = await upstreamResponse.json();

      if (!Array.isArray(upstreamData.data)) {
        return res.status(502).json({
          message: 'Art Institute returned an invalid search response.',
        });
      }

      return res.json({
        data: upstreamData.data.map((artwork) => ({
          id: artwork.id,
          title: artwork.title,
          artist_title: artwork.artist_title || 'Unknown artist',
          image_id: artwork.image_id || null,
          date_display: artwork.date_display || '',
          medium_display: artwork.medium_display || '',
        })),
        config: {
          iiif_url: upstreamData.config?.iiif_url || '',
        },
      });
    } catch (error) {
      const status = error.name === 'TimeoutError' ? 504 : 502;

      return res.status(status).json({
        message: 'Art Institute search is temporarily unavailable.',
      });
    }
  });

  return router;
}

module.exports = createArtInstituteRouter;
