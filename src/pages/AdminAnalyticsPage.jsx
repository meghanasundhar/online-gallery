
import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import {
  getAllArtistArtworks,
  getAuctions,
  getData,
  getOrders,
  getUsers,
} from '../utils/storage';
import { galleryArtworks } from '../data/sampleData';
import './AdminAnalyticsPage.css';

function getReviewRecords(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    return Object.values(data).flatMap((value) =>
      Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []
    );
  }

  return [];
}

function AdminAnalyticsPage() {
  const [data, setDataState] = useState({
    users: [],
    artworks: [],
    auctions: [],
    orders: [],
    reviews: [],
  });

  const loadAnalytics = useCallback(() => {
    const users = getUsers();
    const artistArtworks = getAllArtistArtworks();
    const sampleArtworks = Array.isArray(galleryArtworks)
      ? galleryArtworks
      : [];
    const auctions = getAuctions();
    const orders = getOrders();
    const reviews = getReviewRecords(getData('artGalleryReviews', []));

    setDataState({
      users,
      artworks: [
        ...sampleArtworks.map((artwork) => ({
          ...artwork,
          analyticsSource: 'sample',
        })),
        ...artistArtworks.map((artwork) => ({
          ...artwork,
          analyticsSource: 'artist',
        })),
      ],
      auctions,
      orders,
      reviews,
    });
  }, []);

  useEffect(() => {
    loadAnalytics();

    window.addEventListener('artGalleryStorageChange', loadAnalytics);
    window.addEventListener('storage', loadAnalytics);

    return () => {
      window.removeEventListener('artGalleryStorageChange', loadAnalytics);
      window.removeEventListener('storage', loadAnalytics);
    };
  }, [loadAnalytics]);

  const { users, artworks, auctions, orders, reviews } = data;

  const countBy = (items, getValue, fallback = 'Uncategorized') => {
    const counts = {};

    items.forEach((item) => {
      const value = String(getValue(item) || fallback).trim() || fallback;
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const userRoles = countBy(
    users,
    (user) => String(user.role || 'Unknown').toLowerCase()
  );

  const artworkCategories = countBy(
    artworks,
    (artwork) => artwork.category
  );

  const auctionStatuses = countBy(
    auctions,
    (auction) => auction.status || 'Unknown'
  );

  const reviewStatuses = countBy(
    reviews,
    (review) => review.status || 'Pending'
  );

  const isPending = (value) =>
    ['pending', 'submitted', 'pending approval'].includes(
      String(value ?? '').trim().toLowerCase()
    );

  const stats = [
    { label: 'Total Users', value: users.length },
    {
      label: 'Total Artists',
      value: users.filter(
        (user) => String(user.role || '').toLowerCase() === 'artist'
      ).length,
    },
    { label: 'Total Artworks', value: artworks.length },
    { label: 'Total Orders', value: orders.length },
    { label: 'Total Auctions', value: auctions.length },
    {
      label: 'Live Auctions',
      value: auctions.filter(
        (auction) =>
          String(auction.status || '').toLowerCase() === 'live'
      ).length,
    },
    {
      label: 'Pending Reviews',
      value: reviews.filter((review) => isPending(review.status)).length,
    },
    {
      label: 'Pending Artwork Approvals',
      value: getAllArtistArtworks().filter((artwork) =>
        isPending(artwork.status)
      ).length,
    },
  ];

  const renderBreakdown = (title, entries) => {
    const maximum = Math.max(1, ...entries.map((entry) => entry[1]));

    return (
      <section className="card analytics-panel">
        <h2>{title}</h2>

        {entries.length === 0 ? (
          <p className="analytics-empty">No data available yet.</p>
        ) : (
          <div className="analytics-breakdown">
            {entries.map(([label, value]) => (
              <div className="analytics-breakdown-item" key={label}>
                <div className="analytics-breakdown-label">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>

                <div
                  className="analytics-bar-track"
                  role="img"
                  aria-label={`${label}: ${value}`}
                >
                  <div
                    className="analytics-bar"
                    style={{
                      width: `${(value / maximum) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-analytics-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Platform Analytics</h1>
          <p>
            Review user activity, artwork collections, auctions, and
            platform operations in one place.
          </p>
        </section>

        <div className="analytics-summary">
          <span>Platform overview</span>
          <span>{users.length} registered users</span>
        </div>

        <section
          className="analytics-stats-grid"
          aria-label="Platform statistics"
        >
          {stats.map((stat) => (
            <article className="card analytics-stat" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value.toLocaleString()}</strong>
            </article>
          ))}
        </section>

        <section className="analytics-chart-grid">
          {renderBreakdown('Users by Role', userRoles)}
          {renderBreakdown('Artworks by Category', artworkCategories)}
          {renderBreakdown('Auctions by Status', auctionStatuses)}
          {renderBreakdown('Reviews by Status', reviewStatuses)}
        </section>

        <p className="analytics-note">
          Analytics are calculated from the data currently stored in your
          browser. Sample artworks are included in the artwork total.
          These figures are not revenue or sales totals.
        </p>
      </main>

      <Footer />
    </>
  );
}

export default AdminAnalyticsPage;
