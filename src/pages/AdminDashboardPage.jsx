
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { featuredArtworks } from '../data/sampleData';
import {
  getAllArtistArtworks,
  getAuctions,
  getData,
  getOrders,
  getUsers,
} from '../utils/storage';

function AdminDashboardPage() {
  const users = getUsers();
  const artistArtworks = getAllArtistArtworks();
  const allArtworks = [...featuredArtworks, ...artistArtworks];
  const auctions = getAuctions();
  const orders = getOrders();

  const storedReviews = getData('artGalleryReviews', []);

  const reviewRecords = Array.isArray(storedReviews)
    ? storedReviews
    : Object.values(
        storedReviews && typeof storedReviews === 'object'
          ? storedReviews
          : {}
      ).flatMap((value) =>
        Array.isArray(value)
          ? value
          : value && typeof value === 'object'
            ? [value]
            : []
      );

  const isPending = (value) =>
    ['pending', 'submitted', 'pending approval'].includes(
      String(value ?? '').trim().toLowerCase()
    );

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
    },
    {
      label: 'Total Artists',
      value: users.filter(
        (user) =>
          String(user.role ?? '').toLowerCase() === 'artist'
      ).length,
    },
    {
      label: 'Pending Artist Verifications',
      value: users.filter((user) =>
        isPending(
          user.verificationStatus ?? user.artistVerificationStatus
        )
      ).length,
    },
    {
      label: 'Pending Artwork Approvals',
      value: artistArtworks.filter((artwork) =>
        isPending(artwork.status)
      ).length,
    },
    {
      label: 'Total Artworks',
      value: allArtworks.length,
    },
    {
      label: 'Active Auctions',
      value: auctions.filter(
        (auction) =>
          String(auction.status ?? '').toLowerCase() === 'live'
      ).length,
    },
    {
      label: 'Pending Reviews',
      value: reviewRecords.filter((review) =>
        isPending(review?.status)
      ).length,
    },
    {
      label: 'Total Orders',
      value: orders.length,
    },
  ];

  const adminModules = [
    {
      title: 'Artist Verification',
      description:
        'Review artist accounts and approve or reject applications.',
      path: '/admin/artists',
      button: 'Verify Artists',
    },
    {
      title: 'Category Management',
      description:
        'Create, edit, and organize artwork categories.',
      path: '/admin/categories',
      button: 'Manage Categories',
    },
    {
      title: 'Auction Monitoring',
      description:
        'Monitor auctions and inspect bidding activity.',
      path: '/admin/auctions',
      button: 'Monitor Auctions',
    },
    {
      title: 'Order Management',
      description:
        'View customer purchases and manage order statuses.',
      path: '/admin/orders',
      button: 'Manage Orders',
    },
    {
      title: 'Review Moderation',
      description:
        'Review customer feedback and moderate submitted reviews.',
      path: '/admin/reviews',
      button: 'Moderate Reviews',
    },
    {
      title: 'Platform Analytics',
      description:
        'View statistics about users, artworks, and platform activity.',
      path: '/admin/analytics',
      button: 'View Analytics',
    },
    {
      title: 'Report Generation',
      description:
        'Generate and download reports for platform records.',
      path: '/admin/reports',
      button: 'Generate Reports',
    },
  ];

  return (
    <>
      <Navbar />

      <main className="container page-shell">
        <section className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Platform overview and administration.</p>
        </section>

        <section
          className="admin-stats-grid"
          aria-label="Platform summary"
        >
          {stats.map((stat) => (
            <article
              className="admin-stat card"
              key={stat.label}
            >
              <span>{stat.label}</span>
              <strong>{stat.value.toLocaleString()}</strong>
            </article>
          ))}
        </section>

        <section className="admin-module-grid">
          {adminModules.map((module) => (
            <article
              className="admin-module-card card"
              key={module.path}
            >
              <div>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>

              <Link to={module.path}>
                <Button>{module.button}</Button>
              </Link>
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default AdminDashboardPage;
