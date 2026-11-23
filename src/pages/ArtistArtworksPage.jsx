
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import { getArtworkLikeCount } from '../utils/storage';
import { getArtworksFromAPI, deleteArtworkAPI } from '../utils/artworkApi';

function ArtistArtworksPage() {
  const { currentUser } = useAuth();

  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadArtworks = useCallback(async () => {
    try {
      setError('');
      const data = await getArtworksFromAPI();
      setArtworks(data || []);
    } catch (err) {
      setError(err.message || 'Could not load your artworks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const handleDelete = async (artwork) => {
    if (!window.confirm('Are you sure you want to delete this artwork?')) return;

    try {
      await deleteArtworkAPI(artwork._id || artwork.id);
      setArtworks((previous) =>
        previous.filter((item) => item._id !== artwork._id && item.id !== artwork.id)
      );
    } catch (err) {
      setError(err.message || 'Could not delete artwork.');
    }
  };

  return (
    <>
      <Navbar />

      <main className="container page-shell">
        <section className="artist-artworks-heading">
          <div className="page-header">
            <p className="eyebrow">Artist workspace</p>
            <h1>My Artworks</h1>
            <p>Manage the pieces you have shared with the gallery.</p>
          </div>

          <Link to="/artist/artworks/new">
            <Button>Upload Artwork</Button>
          </Link>
        </section>

        {loading ? (
          <section className="empty-state card">
            <h2>Loading your artworks...</h2>
          </section>
        ) : error ? (
          <section className="empty-state card">
            <h2>Unable to load artworks</h2>
            <p className="form-message form-message--error">{error}</p>
            <Button onClick={loadArtworks}>Retry</Button>
          </section>
        ) : artworks.length ? (
          <div className="artist-artworks-grid">
            {artworks.map((artwork) => (
              <article
                className="artist-work-card card"
                key={artwork._id || artwork.id}
              >
                <Link
                  to={`/artwork/${artwork._id || artwork.id}`}
                  className="artist-work-card__image-link"
                >
                  <img src={artwork.image} alt={artwork.title} />
                </Link>

                <div className="artist-work-card__body">
                  <div className="artist-work-card__title-row">
                    <div>
                      <h2>{artwork.title}</h2>
                      <p>{artwork.category}</p>
                    </div>

                    <span className="order-status">
                      {artwork.status || 'Pending'}
                    </span>
                  </div>

                  <div className="artist-work-card__meta">
                    <strong>
                      ₹{Number(artwork.price).toLocaleString('en-IN')}
                    </strong>
                    <span>
                      ♥ {getArtworkLikeCount(artwork._id || artwork.id, artwork.likes)}
                    </span>
                  </div>

                  <div className="artist-work-card__actions">
                    <Link to={`/artwork/${artwork._id || artwork.id}`}>
                      <Button variant="outline">View</Button>
                    </Link>

                    <Link to={`/artist/artworks/edit/${artwork._id || artwork.id}`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>

                    <Button
                      variant="outline"
                      onClick={() => handleDelete(artwork)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state card">
            <h2>Your gallery is ready for its first artwork.</h2>
            <p>Upload a piece to share it with visitors and collectors.</p>

            <Link to="/artist/artworks/new">
              <Button>Upload Artwork</Button>
            </Link>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

export default ArtistArtworksPage;
