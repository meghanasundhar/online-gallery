import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import SectionTitle from '../components/common/SectionTitle';
import Button from '../components/common/Button';
import useArtistArtworks from '../hooks/useArtistArtworks';
import { getBuyerById, getCollections, getArtistProfile } from '../utils/storage';

function CollectionsPage() {
  const collections = getCollections();
  const artworks = useArtistArtworks();

  return (
    <>
      <Navbar />
      <main className="container page-shell">
        <SectionTitle title="Artist Collections" subtitle="Browse curated groups of original artwork." />
        {collections.length ? (
          <div className="collection-grid">
            {collections.map((collection) => {
              const artist = getArtistProfile(collection.artistId) ?? getBuyerById(collection.artistId);
              const firstArtwork = artworks.find((artwork) => String(artwork.id) === String(collection.artworkIds[0]));
              return (
                <article className="collection-card card" key={collection.id}>
                  <Link to={`/collections/${collection.id}`}><img src={collection.coverImage || firstArtwork?.image} alt={collection.name} /></Link>
                  <div className="collection-card__body">
                    <h2>{collection.name}</h2>
                    <p>By {artist?.name || firstArtwork?.artistName || firstArtwork?.artist || 'Gallery Artist'}</p>
                    <p>{collection.description}</p>
                    <span>{collection.artworkIds.length} artworks</span>
                    <Link to={`/collections/${collection.id}`}><Button variant="primary">View Collection</Button></Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <section className="empty-state card"><h2>No public collections yet.</h2><p>Artist-curated collections will appear here.</p></section>}
      </main>
      <Footer />
    </>
  );
}

export default CollectionsPage;