
import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import {
  getArtworksFromAPI,
  approveArtworkAPI,
  rejectArtworkAPI,
} from '../utils/artworkApi';
import './AdminArtworksPage.css';

function AdminArtworksPage() {
  const [artworks, setArtworks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectingArtwork, setRejectingArtwork] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Load artworks from MongoDB.
  const loadArtworks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getArtworksFromAPI();
      setArtworks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load artworks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadArtworks);
  }, [loadArtworks]);

  // Approve or reject artwork through the backend API.
  const updateApproval = async (artwork, status, reason = '') => {
    const artworkId = artwork._id || artwork.id;

    if (!artworkId) {
      setError('Artwork ID is missing. Unable to update this artwork.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      let result;

      if (status === 'Approved') {
        result = await approveArtworkAPI(artworkId);
      } else {
        result = await rejectArtworkAPI(artworkId, reason);
      }

      if (result.artwork) {
        setArtworks((currentArtworks) =>
          currentArtworks.map((item) =>
            String(item._id || item.id) === String(artworkId)
              ? result.artwork
              : item
          )
        );
      } else {
        await loadArtworks();
      }

      setMessage(
        result.message || `Artwork ${status.toLowerCase()} successfully.`
      );

      setRejectingArtwork(null);
      setRejectionReason('');
    } catch (err) {
      setError(err.message || 'Unable to update artwork status.');
    } finally {
      setSaving(false);
    }
  };

  const query = search.trim().toLowerCase();

  const filteredArtworks = artworks.filter((artwork) => {
    const title = String(
      artwork.title ?? artwork.name ?? ''
    ).toLowerCase();

    const artist = String(
      artwork.artistName ?? artwork.artist ?? artwork.creator ?? ''
    ).toLowerCase();

    const category = String(
      artwork.category ?? ''
    ).toLowerCase();

    const matchesSearch =
      title.includes(query) ||
      artist.includes(query) ||
      category.includes(query);

    const matchesStatus =
      statusFilter === 'All' ||
      String(artwork.status || 'Pending').toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const pendingCount = artworks.filter(
    (artwork) =>
      String(artwork.status || '').toLowerCase() === 'pending'
  ).length;

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-artworks-page">
        <header className="admin-artworks-header">
          <div>
            <h1>Artwork Approval</h1>
            <p>Review artworks submitted to the gallery.</p>
          </div>

          <span className="admin-artworks-pending">
            {pendingCount} Pending
          </span>
        </header>

        <section className="admin-artworks-controls">
          <input
            type="search"
            aria-label="Search artworks"
            placeholder="Search by artwork, artist, or category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Filter by artwork status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </section>

        {message && (
          <p className="admin-artworks-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="admin-artworks-message" role="alert">
            {error}
          </p>
        )}

        <section className="admin-artworks-list">
          {loading ? (
            <div className="admin-artworks-empty">
              <h2>Loading artworks...</h2>
            </div>
          ) : filteredArtworks.length === 0 ? (
            <div className="admin-artworks-empty">
              <h2>No artworks found</h2>
              <p>Try another search or status filter.</p>
            </div>
          ) : (
            filteredArtworks.map((artwork) => {
              const status = artwork.status || 'Pending';

              const title =
                artwork.title || artwork.name || 'Untitled Artwork';

              const artist =
                artwork.artistName ||
                artwork.artist ||
                artwork.creator ||
                'Unknown Artist';

              return (
                <article
                  className="admin-artwork-card"
                  key={artwork._id || artwork.id}
                >
                  {artwork.imageUrl || artwork.image ? (
                    <img
                      className="admin-artwork-image"
                      src={artwork.imageUrl || artwork.image}
                      alt={title}
                    />
                  ) : null}

                  <div className="admin-artwork-info">
                    <h2>{title}</h2>
                    <p>Artist: {artist}</p>
                    <p>Category: {artwork.category || 'Uncategorized'}</p>
                    <p>Price: {artwork.price ?? 'Not specified'}</p>

                    <span
                      className={`admin-artwork-status admin-artwork-status--${status.toLowerCase()}`}
                    >
                      {status}
                    </span>

                    {status === 'Rejected' && artwork.rejectionReason && (
                      <p>
                        <strong>Reason:</strong> {artwork.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="admin-artwork-actions">
                    {status !== 'Approved' && (
                      <button
                        type="button"
                        className="admin-artwork-approve"
                        disabled={saving}
                        onClick={() =>
                          updateApproval(artwork, 'Approved')
                        }
                      >
                        Approve
                      </button>
                    )}

                    {status !== 'Rejected' && (
                      <button
                        type="button"
                        className="admin-artwork-reject"
                        disabled={saving}
                        onClick={() => {
                          setRejectingArtwork(artwork);
                          setRejectionReason('');
                          setError('');
                        }}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      {rejectingArtwork && (
        <div className="admin-artwork-modal-backdrop">
          <section
            className="admin-artwork-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-artwork-title"
          >
            <h2 id="reject-artwork-title">Reject Artwork</h2>

            <p>
              Enter a reason for rejecting "
              {rejectingArtwork.title ||
                rejectingArtwork.name ||
                'this artwork'}".
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();

                if (!rejectionReason.trim() || saving) return;

                updateApproval(
                  rejectingArtwork,
                  'Rejected',
                  rejectionReason.trim()
                );
              }}
            >
              <label htmlFor="artwork-rejection-reason">
                Rejection reason
              </label>

              <textarea
                id="artwork-rejection-reason"
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                rows={4}
                maxLength={500}
                required
              />

              <div className="admin-artwork-modal-actions">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setRejectingArtwork(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-artwork-reject"
                  disabled={saving || !rejectionReason.trim()}
                >
                  {saving ? 'Saving...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <Footer />
    </>
  );
}

export default AdminArtworksPage;
