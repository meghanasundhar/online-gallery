import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import ArtworkCard from '../components/artwork/ArtworkCard';
import useAuth from '../hooks/useAuth';
import useArtistArtworks from '../hooks/useArtistArtworks';
import { getArtistCollections, getArtistProfile } from '../utils/storage';

function ArtistCollectionDetailsPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const collection = getArtistCollections(currentUser.id).find((item) => String(item.id) === String(id));
  const artworks = useArtistArtworks().filter((artwork) => String(artwork.artistId) === String(currentUser.id));
  const profile = getArtistProfile(currentUser.id);
  const collectionArtworks = collection?.artworkIds
    .map((artworkId) => artworks.find((artwork) => String(artwork.id) === String(artworkId)))
    .filter(Boolean) ?? [];

  if (!collection) return <><Navbar /><main className="container page-shell"><section className="empty-state card"><h1>Collection unavailable</h1><p>This collection does not belong to your account.</p><Link to="/artist/collections"><Button>Back to Collections</Button></Link></section></main><Footer /></>;

  return (
    <>
      <Navbar />
      <main className="container page-shell collection-detail-page">
        <article className="collection-detail card">
          <img src={collection.coverImage} alt={collection.name} />
          <div className="collection-detail__content">
            <p className="eyebrow">Artist collection</p>
            <h1>{collection.name}</h1>
            <p>By {profile?.name || currentUser.name}</p>
            <p>{collection.description}</p>
            <p>{collectionArtworks.length} artworks</p>
            <Link to={`/artist/collections/edit/${collection.id}`}><Button>Edit Collection</Button></Link>
          </div>
        </article>
        <section><div className="page-header"><h2>Included Artworks</h2></div><div className="section-grid">{collectionArtworks.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}</div></section>
      </main>
      <Footer />
    </>
  );
}

export default ArtistCollectionDetailsPage;