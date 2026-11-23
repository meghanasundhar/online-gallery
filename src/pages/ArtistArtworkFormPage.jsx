
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import { getArtistProfile } from '../utils/storage';
import {
  createArtworkAPI,
  getArtworkFromAPI,
  updateArtworkAPI,
} from '../utils/artworkApi';

const categories = [
  'Painting',
  'Digital Art',
  'Photography',
  'Sculpture',
  'Abstract Art',
  'Traditional Art',
];

function ArtistArtworkFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const artistProfile = getArtistProfile(currentUser.id);
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    image: '',
    price: '',
    category: 'Painting',
    medium: '',
    dimensions: '',
    yearCreated: '',
    tags: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Load artwork from MongoDB when editing
  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;

    async function loadArtwork() {
      try {
        const artwork = await getArtworkFromAPI(id);

        if (cancelled) return;

        setForm({
          title: artwork.title || '',
          description: artwork.description || '',
          image: artwork.image || '',
          price: artwork.price ?? '',
          category: artwork.category || 'Painting',
          medium: artwork.medium || '',
          dimensions: artwork.dimensions || '',
          yearCreated: artwork.yearCreated || '',
          tags: Array.isArray(artwork.tags) ? artwork.tags.join(', ') : '',
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load artwork.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArtwork();

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  const updateField = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const image = form.image.trim();
    const price = Number(form.price);

    if (
      !title ||
      !description ||
      !image ||
      !form.category ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError('Complete all required fields and enter a valid price.');
      return;
    }

    const artworkData = {
      title,
      description,
      image,
      price,
      category: form.category,
    };

    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        await updateArtworkAPI(id, artworkData);
      } else {
        await createArtworkAPI(artworkData);
      }

      navigate('/artist/artworks');
    } catch (err) {
      setError(err.message || 'Could not save artwork. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container page-shell">
          <section className="empty-state card">
            <h1>Loading artwork...</h1>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="container page-shell">
        <section className="page-header">
          <p className="eyebrow">Artist workspace</p>
          <h1>{isEditing ? 'Edit Artwork' : 'Upload Artwork'}</h1>
          <p>
            {isEditing
              ? 'Update the details of your artwork.'
              : 'Add a new piece to the public gallery.'}
          </p>
        </section>

        <form className="artist-artwork-form card" onSubmit={handleSubmit}>
          <div className="artist-form-grid">
            <label>
              Artwork Title *
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Image URL *
              <input
                name="image"
                type="url"
                value={form.image}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Price *
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Category *
              <select
                name="category"
                value={form.category}
                onChange={updateField}
                required
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Medium
              <input
                name="medium"
                value={form.medium}
                onChange={updateField}
                placeholder="e.g. Oil on canvas"
              />
            </label>

            <label>
              Dimensions
              <input
                name="dimensions"
                value={form.dimensions}
                onChange={updateField}
                placeholder="e.g. 60 x 80 cm"
              />
            </label>

            <label>
              Year Created
              <input
                name="yearCreated"
                type="number"
                min="0"
                max="2100"
                value={form.yearCreated}
                onChange={updateField}
              />
            </label>

            <label>
              Tags
              <input
                name="tags"
                value={form.tags}
                onChange={updateField}
                placeholder="landscape, blue, original"
              />
            </label>

            <label className="artist-form-grid__wide">
              Artwork Description *
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows="6"
                required
              />
            </label>
          </div>

          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}

          <div className="dashboard-actions">
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Upload Artwork'}
            </Button>

            <Link to="/artist/artworks">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}

export default ArtistArtworkFormPage;
