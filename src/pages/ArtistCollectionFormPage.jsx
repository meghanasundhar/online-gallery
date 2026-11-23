import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import useArtistArtworks from '../hooks/useArtistArtworks';
import { createArtistCollection, getArtistCollections, updateOwnedArtistCollection } from '../utils/storage';

function ArtistCollectionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const artworks = useArtistArtworks().filter((artwork) => String(artwork.artistId) === String(currentUser.id));
  const existing = id
    ? getArtistCollections(currentUser.id).find((collection) => String(collection.id) === String(id))
    : null;
  const [form, setForm] = useState(() => existing ? ({
    name: existing.name,
    description: existing.description ?? '',
    coverImage: existing.coverImage ?? '',
    artworkIds: existing.artworkIds.map(String),
  }) : ({ name: '', description: '', coverImage: '', artworkIds: [] }));
  const [error, setError] = useState('');

  const toggleArtwork = (artworkId) => {
    const normalizedId = String(artworkId);
    setForm((previous) => ({
      ...previous,
      artworkIds: previous.artworkIds.includes(normalizedId)
        ? previous.artworkIds.filter((selectedId) => selectedId !== normalizedId)
        : [...previous.artworkIds, normalizedId],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Collection Name is required.');
      return;
    }
    const validArtworkIds = form.artworkIds.filter((artworkId) => artworks.some((artwork) => String(artwork.id) === artworkId));
    if (!validArtworkIds.length) {
      setError('Select at least one of your artworks.');
      return;
    }

    const firstArtwork = artworks.find((artwork) => String(artwork.id) === validArtworkIds[0]);
    const data = {
      name,
      description: form.description.trim(),
      coverImage: form.coverImage.trim() || firstArtwork?.image || '',
      artworkIds: validArtworkIds,
    };
    if (existing) {
      const updated = updateOwnedArtistCollection(currentUser.id, existing.id, data);
      if (!updated) {
        setError('This collection does not belong to your account.');
        return;
      }
    } else {
      createArtistCollection(currentUser.id, data);
    }
    navigate('/artist/collections');
  };

  if (id && !existing) {
    return <><Navbar /><main className="container page-shell"><section className="empty-state card"><h1>Collection unavailable</h1><p>This collection does not belong to your account.</p><Link to="/artist/collections"><Button>Back to Collections</Button></Link></section></main><Footer /></>;
  }

  return (
    <>
      <Navbar />
      <main className="container page-shell">
        <section className="page-header"><p className="eyebrow">Artist workspace</p><h1>{existing ? 'Edit Collection' : 'Create Collection'}</h1><p>Choose only artworks from your own gallery.</p></section>
        <form className="artist-artwork-form card" onSubmit={handleSubmit}>
          <div className="artist-form-grid">
            <label>Collection Name *<input value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} required /></label>
            <label>Cover Image URL<input type="url" value={form.coverImage} onChange={(event) => setForm((previous) => ({ ...previous, coverImage: event.target.value }))} placeholder="Optional; defaults to first selected artwork" /></label>
            <label className="artist-form-grid__wide">Description<textarea value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} rows="4" /></label>
            <fieldset className="artwork-picker artist-form-grid__wide">
              <legend>Select Artworks * (choose at least one)</legend>
              {artworks.length ? artworks.map((artwork) => (
                <label className="artwork-picker__item" key={artwork.id}>
                  <input type="checkbox" checked={form.artworkIds.includes(String(artwork.id))} onChange={() => toggleArtwork(artwork.id)} />
                  <img src={artwork.image} alt="" />
                  <span>{artwork.title}</span>
                </label>
              )) : <p>Upload an artwork before creating a collection.</p>}
            </fieldset>
          </div>
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <div className="dashboard-actions"><Button type="submit">{existing ? 'Save Collection' : 'Create Collection'}</Button><Link to="/artist/collections"><Button type="button" variant="outline">Cancel</Button></Link></div>
        </form>
      </main>
      <Footer />
    </>
  );
}

export default ArtistCollectionFormPage;