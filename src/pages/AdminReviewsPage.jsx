
import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { getData, setData } from '../utils/storage';
import './AdminReviewsPage.css';

const REVIEW_KEY = 'artGalleryReviews';

function normalizeReviews(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    return Object.entries(data).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((review) => ({
          ...review,
          artworkId: review.artworkId ?? key,
        }));
      }

      if (value && typeof value === 'object') {
        return [{ ...value, id: value.id ?? key }];
      }

      return [];
    });
  }

  return [];
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState(() =>
    normalizeReviews(getData(REVIEW_KEY, []))
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState('');

  const loadReviews = useCallback(() => {
    setReviews(normalizeReviews(getData(REVIEW_KEY, [])));
  }, []);

  useEffect(() => {
    loadReviews();
    window.addEventListener('artGalleryStorageChange', loadReviews);
    window.addEventListener('storage', loadReviews);

    return () => {
      window.removeEventListener('artGalleryStorageChange', loadReviews);
      window.removeEventListener('storage', loadReviews);
    };
  }, [loadReviews]);

  const getStatus = (review) => review.status || 'Pending';

  const updateStatus = (review, status) => {
    const confirmed = window.confirm(
      `${status === 'Approved' ? 'Approve' : 'Reject'} this review?`
    );

    if (!confirmed) return;

    const stored = getData(REVIEW_KEY, []);
    let updatedData;

    if (Array.isArray(stored)) {
      updatedData = stored.map((item) => {
        const sameReview =
          review.id != null && item.id != null
            ? String(item.id) === String(review.id)
            : item === review;

        return sameReview
          ? { ...item, status, moderatedAt: new Date().toISOString() }
          : item;
      });
    } else if (stored && typeof stored === 'object') {
      updatedData = { ...stored };
      let found = false;

      for (const [key, value] of Object.entries(stored)) {
        if (Array.isArray(value)) {
          updatedData[key] = value.map((item) => {
            const sameReview =
              review.id != null && item.id != null
                ? String(item.id) === String(review.id)
                : item === review;

            if (!sameReview) return item;

            found = true;
            return {
              ...item,
              status,
              moderatedAt: new Date().toISOString(),
            };
          });
        } else if (
          value &&
          typeof value === 'object' &&
          review.id != null &&
          String(value.id ?? key) === String(review.id)
        ) {
          updatedData[key] = {
            ...value,
            status,
            moderatedAt: new Date().toISOString(),
          };
          found = true;
        }
      }

      if (!found) {
        setMessage('Review could not be matched to stored data.');
        return;
      }
    } else {
      setMessage('No review data is available to update.');
      return;
    }

    if (setData(REVIEW_KEY, updatedData)) {
      loadReviews();
      setMessage(`Review ${status.toLowerCase()} successfully.`);
    } else {
      setMessage('Unable to save the moderation decision.');
    }
  };

  const query = search.trim().toLowerCase();

  const filteredReviews = reviews.filter((review) => {
    const searchableText = [
      review.userName,
      review.reviewerName,
      review.name,
      review.comment,
      review.text,
      review.review,
      review.artworkTitle,
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    const matchesSearch = searchableText.includes(query);
    const matchesStatus =
      statusFilter === 'All' ||
      getStatus(review).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const pendingCount = reviews.filter(
    (review) => getStatus(review).toLowerCase() === 'pending'
  ).length;

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-reviews-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Review Moderation</h1>
          <p>Review customer feedback and moderate submitted reviews.</p>
        </section>

        <section className="admin-review-stats">
          <article className="card">
            <span>Total Reviews</span>
            <strong>{reviews.length}</strong>
          </article>
          <article className="card">
            <span>Pending Reviews</span>
            <strong>{pendingCount}</strong>
          </article>
          <article className="card">
            <span>Approved Reviews</span>
            <strong>
              {reviews.filter(
                (review) => getStatus(review).toLowerCase() === 'approved'
              ).length}
            </strong>
          </article>
          <article className="card">
            <span>Rejected Reviews</span>
            <strong>
              {reviews.filter(
                (review) => getStatus(review).toLowerCase() === 'rejected'
              ).length}
            </strong>
          </article>
        </section>

        <section className="card admin-review-controls">
          <label>
            Search reviews
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reviewer, artwork, or comment"
            />
          </label>

          <label>
            Filter by status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
        </section>

        {message && (
          <p className="admin-review-message" role="status">
            {message}
          </p>
        )}

        <section className="admin-review-list">
          {filteredReviews.length === 0 ? (
            <div className="card admin-review-empty">
              <h2>No reviews found</h2>
              <p>
                There are no reviews matching your search and selected status.
              </p>
            </div>
          ) : (
            filteredReviews.map((review, index) => {
              const status = getStatus(review);
              const reviewId = review.id ?? `${review.artworkId ?? 'review'}-${index}`;

              return (
                <article className="card admin-review-card" key={reviewId}>
                  <div className="admin-review-details">
                    <h2>
                      {review.artworkTitle ||
                        review.title ||
                        'Artwork Review'}
                    </h2>
                    <p>
                      <strong>Reviewer:</strong>{' '}
                      {review.userName ||
                        review.reviewerName ||
                        review.name ||
                        'Anonymous'}
                    </p>
                    <p>
                      <strong>Rating:</strong>{' '}
                      {review.rating != null
                        ? `${review.rating} / 5`
                        : 'Not provided'}
                    </p>
                    <p>
                      <strong>Comment:</strong>{' '}
                      {review.comment ||
                        review.text ||
                        review.review ||
                        'No comment provided.'}
                    </p>

                    <span
                      className={`admin-review-status admin-review-status--${status.toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="admin-review-actions">
                    {status !== 'Approved' && (
                      <Button
                        onClick={() => updateStatus(review, 'Approved')}
                      >
                        Approve
                      </Button>
                    )}
                    {status !== 'Rejected' && (
                      <Button
                        variant="secondary"
                        onClick={() => updateStatus(review, 'Rejected')}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default AdminReviewsPage;
