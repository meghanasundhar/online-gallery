import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ArtworkCard from '../components/artwork/ArtworkCard';
import Button from '../components/common/Button';
import useArtistArtworks from '../hooks/useArtistArtworks';
import useAuth from '../hooks/useAuth';
import { featuredArtworks } from '../data/sampleData';
import { getBuyerById, getCollectionById, getArtistProfile } from '../utils/storage';

function CollectionDetailsPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const collection = getCollectionById(id);
  const artistArtworks = useArtistArtworks();
  const allArtworks = [...featuredArtworks, ...artistArtworks];

  if (!collection) return <><Navbar /><main className="container page-shell"><section className="empty-state card"><h1>Collection not found</h1><Link to="/collections"><Button>Browse Collections</Button></Link></section></main><Footer /></>;

  const artist = getArtistProfile(collection.artistId) ?? getBuyerById(collection.artistId);
  const includedArtworks = collection.artworkIds
    .map((artworkId) => allArtworks.find((artwork) => String(artwork.id) === String(artworkId)))
    .filter(Boolean);

  return (
    <>
      <Navbar />
      <main className="container page-shell collection-detail-page">
        <article className="collection-detail card">
          <img src={collection.coverImage || includedArtworks[0]?.image} alt={collection.name} />
          <div className="collection-detail__content">
            <p className="eyebrow">Curated collection</p>
            <h1>{collection.name}</h1>
            <p>By <Link to={`/artist/${collection.artistId}`}>{artist?.name || includedArtworks[0]?.artistName || 'Gallery Artist'}</Link></p>
            <p>{collection.description}</p>
            <p>{includedArtworks.length} artworks</p>
            {currentUser?.role === 'artist' && String(collection.artistId) === String(currentUser.id) && (
              <Link to={`/artist/collections/${collection.id}`}><Button variant="secondary">Manage Collection</Button></Link>
            )}
          </div>
        </article>
        <section><div className="page-header"><h2>Included Artworks</h2></div><div className="section-grid">{includedArtworks.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}</div></section>
      </main>
      <Footer />
    </>
  );
}

export default CollectionDetailsPage;