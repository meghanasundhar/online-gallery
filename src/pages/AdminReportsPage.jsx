
import { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import {
  getAllArtistArtworks,
  getAuctions,
  getData,
  getOrders,
  getUsers,
} from '../utils/storage';
import { featuredArtworks } from '../data/sampleData';
import './AdminReportsPage.css';

function getReviews() {
  const data = getData('artGalleryReviews', []);

  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    return Object.values(data).flatMap((value) =>
      Array.isArray(value)
        ? value
        : value && typeof value === 'object'
          ? [value]
          : []
    );
  }

  return [];
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF', csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AdminReportsPage() {
  const [reportType, setReportType] = useState('overview');
  const [message, setMessage] = useState('');

  const users = getUsers();
  const artistArtworks = getAllArtistArtworks();
  const artworks = [...featuredArtworks, ...artistArtworks];
  const auctions = getAuctions();
  const orders = getOrders();
  const reviews = getReviews();

  const reportOptions = [
    { value: 'overview', label: 'Platform Overview' },
    { value: 'users', label: 'User Report' },
    { value: 'artists', label: 'Artist Report' },
    { value: 'artworks', label: 'Artwork Report' },
    { value: 'auctions', label: 'Auction Report' },
    { value: 'reviews', label: 'Review Report' },
    { value: 'orders', label: 'Order Report' },
  ];

  const reportData = {
    overview: {
      filename: 'platform-overview.csv',
      headers: ['Metric', 'Value'],
      rows: [
        ['Total Users', users.length],
        [
          'Total Artists',
          users.filter(
            (user) =>
              String(user.role ?? '').toLowerCase() === 'artist'
          ).length,
        ],
        ['Total Artworks', artworks.length],
        ['Total Auctions', auctions.length],
        ['Total Reviews', reviews.length],
        ['Total Orders', orders.length],
      ],
    },

    users: {
      filename: 'user-report.csv',
      headers: ['Name', 'Email', 'Role', 'Status'],
      rows: users.map((user) => [
        user.name ?? user.username ?? '',
        user.email ?? '',
        user.role ?? '',
        user.status ?? user.verificationStatus ?? '',
      ]),
    },

    artists: {
      filename: 'artist-report.csv',
      headers: ['Name', 'Email', 'Role', 'Verification Status'],
      rows: users
        .filter(
          (user) =>
            String(user.role ?? '').toLowerCase() === 'artist'
        )
        .map((artist) => [
          artist.name ?? artist.username ?? '',
          artist.email ?? '',
          artist.role ?? '',
          artist.verificationStatus ??
            artist.artistVerificationStatus ??
            'Not specified',
        ]),
    },

    artworks: {
      filename: 'artwork-report.csv',
      headers: ['Title', 'Artist', 'Category', 'Price', 'Status'],
      rows: artworks.map((artwork) => [
        artwork.title ?? artwork.name ?? '',
        artwork.artistName ?? artwork.artist ?? '',
        artwork.category ?? '',
        artwork.price ?? '',
        artwork.status ?? 'Not specified',
      ]),
    },

    auctions: {
      filename: 'auction-report.csv',
      headers: ['Title', 'Status', 'Starting Price', 'Current Bid'],
      rows: auctions.map((auction) => [
        auction.title ?? auction.artworkTitle ?? '',
        auction.status ?? '',
        auction.startingPrice ?? auction.startPrice ?? '',
        auction.currentBid ?? auction.highestBid ?? '',
      ]),
    },

    reviews: {
      filename: 'review-report.csv',
      headers: ['Reviewer', 'Rating', 'Comment', 'Status'],
      rows: reviews.map((review) => [
        review.userName ?? review.username ?? review.name ?? '',
        review.rating ?? '',
        review.comment ?? review.text ?? '',
        review.status ?? 'Not specified',
      ]),
    },

    orders: {
      filename: 'order-report.csv',
      headers: ['Order ID', 'Customer', 'Status', 'Total'],
      rows: orders.map((order) => [
        order.id ?? order.orderId ?? '',
        order.userName ?? order.customerName ?? '',
        order.status ?? '',
        order.total ?? order.totalAmount ?? order.amount ?? '',
      ]),
    },
  };

  const selectedReport = reportData[reportType];

  const handleDownload = () => {
    downloadCsv(
      selectedReport.filename,
      selectedReport.headers,
      selectedReport.rows
    );

    setMessage(
      `${reportOptions.find((option) => option.value === reportType)?.label} download requested.`
    );
  };

  const handleDownloadAll = () => {
    Object.values(reportData).forEach((report) => {
      downloadCsv(report.filename, report.headers, report.rows);
    });

    setMessage('All seven report downloads were requested.');
  };

  const previewRows = selectedReport.rows.slice(0, 5);

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-reports-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Report Generation</h1>
          <p>
            Create and export reports from your Online Art Gallery
            data.
          </p>
        </section>

        <section className="card reports-generator">
          <h2>Generate a Report</h2>

          <label htmlFor="report-type">Choose report type</label>

          <select
            id="report-type"
            value={reportType}
            onChange={(event) => {
              setReportType(event.target.value);
              setMessage('');
            }}
          >
            {reportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="reports-summary">
            <span>Records in this report</span>
            <strong>{selectedReport.rows.length}</strong>
          </div>

          <div className="reports-actions">
            <button
              type="button"
              className="reports-button"
              onClick={handleDownload}
            >
              Download Selected CSV
            </button>

            <button
              type="button"
              className="reports-button reports-button-secondary"
              onClick={handleDownloadAll}
            >
              Download All Reports
            </button>
          </div>

          {message && (
            <p className="reports-message" role="status">
              {message}
            </p>
          )}
        </section>

        <section className="card reports-preview">
          <h2>Report Preview</h2>
          <p>
            Showing up to five records. Download the CSV to view the
            complete report.
          </p>

          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  {selectedReport.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {previewRows.length > 0 ? (
                  previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((value, columnIndex) => (
                        <td key={columnIndex}>
                          {String(value ?? '') || '—'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={selectedReport.headers.length}
                      className="reports-empty"
                    >
                      No records available for this report yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="reports-note">
          Reports use the data currently available in your browser's
          Local Storage. Some fields may be blank if your records use
          different property names. Sample artworks are included in
          the artwork report.
        </p>
      </main>

      <Footer />
    </>
  );
}

export default AdminReportsPage;
