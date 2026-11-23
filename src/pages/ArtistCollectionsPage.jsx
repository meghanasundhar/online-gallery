import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import useArtistArtworks from '../hooks/useArtistArtworks';
import { deleteOwnedArtistCollection, getArtistCollections } from '../utils/storage';

function ArtistCollectionsPage() {
  const { currentUser } = useAuth();
  const artworks = useArtistArtworks().filter((artwork) => String(artwork.artistId) === String(currentUser.id));
  const [collections, setCollections] = useState(() => getArtistCollections(currentUser.id));

  const handleDelete = (collection) => {
    if (!window.confirm(`Delete the collection "${collection.name}"?`)) return;
    deleteOwnedArtistCollection(currentUser.id, collection.id);
    setCollections(getArtistCollections(currentUser.id));
  };

  const coverFor = (collection) => collection.coverImage || artworks.find((artwork) =>
    collection.artworkIds.map(String).includes(String(artwork.id))
  )?.image;

  return (
    <>
      <Navbar />
      <main className="container page-shell">
        <section className="artist-artworks-heading">
          <div className="page-header"><p className="eyebrow">Artist workspace</p><h1>Art Collections</h1><p>Organize your artworks into curated collections.</p></div>
          <Link to="/artist/collections/new"><Button>Create Collection</Button></Link>
        </section>
        {collections.length ? (
          <div className="collection-grid">
            {collections.map((collection) => (
              <article className="collection-card card" key={collection.id}>
                {coverFor(collection) ? <Link to={`/artist/collections/${collection.id}`}><img src={coverFor(collection)} alt={collection.name} /></Link> : <div className="collection-card__placeholder">Art Collection</div>}
                <div className="collection-card__body">
                  <h2>{collection.name}</h2>
                  <p>{collection.description || 'A curated selection of your artworks.'}</p>
                  <span>{collection.artworkIds.length} artworks</span>
                  <div className="collection-card__actions">
                    <Link to={`/artist/collections/${collection.id}`}><Button variant="outline">View</Button></Link>
                    <Link to={`/artist/collections/edit/${collection.id}`}><Button variant="secondary">Edit</Button></Link>
                    <Button variant="outline" onClick={() => handleDelete(collection)}>Delete</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state card"><h2>Create a collection for your artworks.</h2><p>Choose at least one of your works to get started.</p><Link to="/artist/collections/new"><Button>Create Collection</Button></Link></section>
        )}
      </main>
      <Footer />
    </>
  );
}

export default ArtistCollectionsPage;