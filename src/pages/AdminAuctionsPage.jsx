
import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { getAuctions, getBids, setData } from '../utils/storage';
import './AdminAuctionsPage.css';

function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState(() => getAuctions());
  const [bids, setBids] = useState(() => getBids());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [message, setMessage] = useState('');

  const refreshData = useCallback(() => {
    setAuctions(getAuctions());
    setBids(getBids());
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('artGalleryStorageChange', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener('artGalleryStorageChange', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, [refreshData]);

  const filteredAuctions = auctions.filter((auction) => {
    const title = String(
      auction.artworkTitle ?? auction.title ?? auction.artworkName ?? ''
    ).toLowerCase();

    const matchesSearch = title.includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      String(auction.status).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getAuctionBids = (auctionId) =>
    bids
      .filter((bid) => String(bid.auctionId) === String(auctionId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const cancelAuction = (auction) => {
    if (auction.status !== 'Upcoming') {
      setMessage('Only upcoming auctions can be cancelled.');
      return;
    }

    if (!window.confirm('Cancel this upcoming auction?')) return;

    const updated = auctions.filter(
      (item) => String(item.id) !== String(auction.id)
    );

    if (setData('artGalleryAuctions', updated)) {
      setAuctions(getAuctions());
      setBids(getBids());
      setSelectedAuction(null);
      setMessage('Upcoming auction cancelled.');
    } else {
      setMessage('Unable to cancel the auction.');
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Not specified';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleString();
  };

  const liveCount = auctions.filter((item) => item.status === 'Live').length;
  const upcomingCount = auctions.filter((item) => item.status === 'Upcoming').length;
  const endedCount = auctions.filter((item) => item.status === 'Ended').length;

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-auctions-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Auction Monitoring</h1>
          <p>Monitor auctions, current bids, and bidding activity.</p>
        </section>

        <section className="admin-auction-stats">
          <article className="card">
            <span>Total Auctions</span>
            <strong>{auctions.length}</strong>
          </article>
          <article className="card">
            <span>Live Auctions</span>
            <strong>{liveCount}</strong>
          </article>
          <article className="card">
            <span>Upcoming</span>
            <strong>{upcomingCount}</strong>
          </article>
          <article className="card">
            <span>Ended</span>
            <strong>{endedCount}</strong>
          </article>
        </section>

        <section className="card admin-auction-controls">
          <label>
            Search auctions
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by artwork title"
            />
          </label>

          <label>
            Filter by status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Live">Live</option>
              <option value="Ended">Ended</option>
            </select>
          </label>
        </section>

        {message && <p className="admin-auction-message" role="status">{message}</p>}

        <section className="admin-auction-list">
          {filteredAuctions.length === 0 ? (
            <div className="card admin-auction-empty">
              <h2>No auctions found</h2>
              <p>Try a different search or status filter.</p>
            </div>
          ) : (
            filteredAuctions.map((auction) => {
              const auctionBids = getAuctionBids(auction.id);
              const status = String(auction.status || 'Unknown');

              return (
                <article className="card admin-auction-card" key={auction.id}>
                  <div className="admin-auction-details">
                    <h2>
                      {auction.artworkTitle ||
                        auction.title ||
                        auction.artworkName ||
                        `Auction ${auction.id}`}
                    </h2>

                    <p>Artist: {auction.artistName || 'Not specified'}</p>
                    <p>Current bid: {Number(auction.currentBid || 0).toLocaleString()}</p>
                    <p>Highest bidder: {auction.highestBidderName || 'No bids yet'}</p>
                    <p>Start: {formatDate(auction.startTime)}</p>
                    <p>End: {formatDate(auction.endTime)}</p>

                    <span
                      className={`admin-auction-status admin-auction-status--${status.toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="admin-auction-actions">
                    <Button onClick={() => setSelectedAuction(auction)}>
                      View Bids ({auctionBids.length})
                    </Button>

                    {status === 'Upcoming' && (
                      <Button
                        variant="secondary"
                        onClick={() => cancelAuction(auction)}
                      >
                        Cancel Auction
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {selectedAuction && (
          <div
            className="admin-auction-backdrop"
            onClick={() => setSelectedAuction(null)}
            role="presentation"
          >
            <section
              className="card admin-auction-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-auction-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="admin-auction-dialog-title">
                Bidding Activity
              </h2>
              <p>
                {selectedAuction.artworkTitle ||
                  selectedAuction.title ||
                  selectedAuction.artworkName ||
                  `Auction ${selectedAuction.id}`}
              </p>

              <div className="admin-auction-bid-list">
                {getAuctionBids(selectedAuction.id).length === 0 ? (
                  <p>No bids have been placed on this auction.</p>
                ) : (
                  getAuctionBids(selectedAuction.id).map((bid) => (
                    <article key={bid.id} className="admin-auction-bid">
                      <strong>
                        {bid.userName || 'Unknown bidder'}
                      </strong>
                      <span>{Number(bid.amount).toLocaleString()}</span>
                      <small>{formatDate(bid.createdAt)}</small>
                    </article>
                  ))
                )}
              </div>

              <Button onClick={() => setSelectedAuction(null)}>
                Close
              </Button>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default AdminAuctionsPage;
