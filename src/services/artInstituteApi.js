
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const artInstituteApi = createApi({
  reducerPath: 'artInstituteApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/art-institute/`,
  }),
  endpoints: (builder) => ({
    searchArtworks: builder.query({
      query: ({ query, limit = 12 }) => ({
        url: 'artworks/search',
        params: {
          q: query,
          limit,
        },
      }),

      transformResponse: (response) => {
        return (Array.isArray(response?.data) ? response.data : []).map(
          (artwork) => ({
            id: artwork.id,
            title: artwork.title || 'Untitled artwork',
            artistName: artwork.artist_title || 'Unknown artist',
            imageUrl: artwork.image_id || null,
            date: artwork.date_display || '',
            medium: artwork.medium_display || '',
            sourceUrl: artwork.artwork_url || '',
          })
        );
      },
    }),
  }),
});

export const { useSearchArtworksQuery } = artInstituteApi;
