
import { useState } from 'react';
import Button from '../common/Button';
import SearchBar from '../common/SearchBar';
import SectionTitle from '../common/SectionTitle';
import { useSearchArtworksQuery } from '../../services/artInstituteApi';

function ArtInstituteSearch() {
  const [searchText, setSearchText] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const {
    data: artworks = [],
    error,
    isError,
    isFetching,
    isSuccess,
  } = useSearchArtworksQuery(
    { query: submittedQuery },
    { skip: !submittedQuery }
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = searchText.trim();

    if (query) {
      setSubmittedQuery(query);
    }
  };

  const errorMessage =
    error?.data?.message ||
    error?.error ||
    'The public artwork search is unavailable right now.';

  return (
    <section className="external-art-search">
      <SectionTitle
        title="Search Cleveland Museum Collection"
        subtitle="Explore public artwork records from the Cleveland Museum of Art."
      />

      <form className="external-art-search__form" onSubmit={handleSubmit}>
        <SearchBar
          placeholder="Search the Cleveland Museum collection"
          value={searchText}
          onChange={setSearchText}
        />

        <Button type="submit" disabled={!searchText.trim() || isFetching}>
          {isFetching ? 'Searching…' : 'Search Collection'}
        </Button>
      </form>

      {isFetching && (
        <p className="external-art-search__message" role="status">
          Searching artworks…
        </p>
      )}

      {isError && (
        <p
          className="external-art-search__message external-art-search__message--error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {isSuccess && !isFetching && artworks.length === 0 && (
        <p className="external-art-search__message">
          No public artworks matched “{submittedQuery}”.
        </p>
      )}

      {artworks.length > 0 && (
        <div className="external-art-search__grid">
          {artworks.map((artwork) => (
            <article className="external-artwork-card card" key={artwork.id}>
              {artwork.imageUrl ? (
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  loading="lazy"
                />
              ) : (
                <div className="external-artwork-card__placeholder">
                  Image unavailable
                </div>
              )}

              <div className="external-artwork-card__body">
                <h3>{artwork.title}</h3>
                <p>{artwork.artistName}</p>

                {artwork.date && <span>{artwork.date}</span>}
                {artwork.medium && <span>{artwork.medium}</span>}

                {artwork.sourceUrl && (
                  <a
                    href={artwork.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View at the Cleveland Museum of Art
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ArtInstituteSearch;
