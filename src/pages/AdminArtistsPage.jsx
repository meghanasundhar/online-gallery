
import { useCallback, useEffect, useState } from 'react';
import { getUsers, setData } from '../utils/storage';
import './AdminArtistsPage.css';

function AdminArtistsPage() {
  const [artists, setArtists] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [rejectingArtist, setRejectingArtist] = useState(null);
  const [reason, setReason] = useState('');

  const loadArtists = useCallback(() => {
    const users = getUsers();

    const artistUsers = users.filter(
      (user) => String(user.role || '').toLowerCase() === 'artist'
    );

    setArtists(artistUsers);
  }, []);

  useEffect(() => {
    loadArtists();

    window.addEventListener('artGalleryStorageChange', loadArtists);
    window.addEventListener('storage', loadArtists);

    return () => {
      window.removeEventListener('artGalleryStorageChange', loadArtists);
      window.removeEventListener('storage', loadArtists);
    };
  }, [loadArtists]);

  const getStatus = (artist) =>
    artist.verificationStatus || 'Pending';

  const updateVerification = (
    artistId,
    status,
    rejectionReason = ''
  ) => {
    const users = getUsers();

    const updatedUsers = users.map((user) => {
      if (String(user.id) !== String(artistId)) {
        return user;
      }

      return {
        ...user,
        verificationStatus: status,
        verificationReason:
          status === 'Rejected' ? rejectionReason : '',
        verificationUpdatedAt: new Date().toISOString(),
      };
    });

    const saved = setData('artGalleryUsers', updatedUsers);

    if (!saved) {
      window.alert('Unable to save the verification decision.');
      return;
    }

    loadArtists();
    setRejectingArtist(null);
    setReason('');
  };

  const term = search.trim().toLowerCase();

  const filteredArtists = artists.filter((artist) => {
    const status = getStatus(artist);

    const matchesStatus =
      filter === 'All' || status === filter;

    const matchesSearch = [
      artist.name,
      artist.username,
      artist.email,
    ].some((value) =>
      String(value || '').toLowerCase().includes(term)
    );

    return matchesStatus && matchesSearch;
  });

  const pendingCount = artists.filter(
    (artist) => getStatus(artist) === 'Pending'
  ).length;

  return (
    <main className="admin-artists-page">
      <header className="admin-artists-header">
        <div>
          <h1>Artist Verification</h1>
          <p>Review artist accounts and verify eligible artists.</p>
        </div>

        <div className="admin-artists-count">
          {pendingCount} Pending
        </div>
      </header>

      <section className="admin-artists-controls">
        <input
          type="search"
          placeholder="Search by artist name or email..."
          aria-label="Search artists"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by verification status"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </section>

      {filteredArtists.length === 0 ? (
        <section className="admin-artists-empty">
          <h2>No artists found</h2>
          <p>Try another search or select All statuses.</p>
        </section>
      ) : (
        <section className="admin-artists-list">
          {filteredArtists.map((artist) => {
            const status = getStatus(artist);

            return (
              <article
                className="admin-artist-card"
                key={artist.id}
              >
                <div className="admin-artist-info">
                  <h2>{artist.name || artist.username || 'Unnamed Artist'}</h2>
                  <p>Email: {artist.email || 'Not provided'}</p>
                  <p>Role: {artist.role}</p>

                  <span
                    className={`artist-verification-status artist-status-${status.toLowerCase()}`}
                  >
                    {status}
                  </span>

                  {status === 'Rejected' && artist.verificationReason && (
                    <p>
                      <strong>Reason:</strong>{' '}
                      {artist.verificationReason}
                    </p>
                  )}
                </div>

                <div className="admin-artist-actions">
                  {status !== 'Approved' && (
                    <button
                      type="button"
                      className="artist-approve-button"
                      onClick={() =>
                        updateVerification(artist.id, 'Approved')
                      }
                    >
                      Approve
                    </button>
                  )}

                  {status !== 'Rejected' && (
                    <button
                      type="button"
                      className="artist-reject-button"
                      onClick={() => {
                        setRejectingArtist(artist);
                        setReason('');
                      }}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {rejectingArtist && (
        <div className="artist-modal-backdrop">
          <section
            className="artist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="artist-reject-title"
          >
            <h2 id="artist-reject-title">
              Reject {rejectingArtist.name || 'this artist'}?
            </h2>

            <p>Enter a reason for rejecting this artist.</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();

                if (!reason.trim()) return;

                updateVerification(
                  rejectingArtist.id,
                  'Rejected',
                  reason.trim()
                );
              }}
            >
              <label htmlFor="artist-rejection-reason">
                Rejection reason
              </label>

              <textarea
                id="artist-rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                maxLength={500}
                rows={4}
              />

              <div className="artist-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingArtist(null);
                    setReason('');
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="artist-reject-button"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminArtistsPage;
