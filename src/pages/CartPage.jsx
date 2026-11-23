
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { featuredArtworks } from '../data/sampleData';
import useArtistArtworks from '../hooks/useArtistArtworks';
import useAuth from '../hooks/useAuth';
import {
  getCart,
  removeFromCart,
} from '../utils/storage';

function CartPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const artistArtworks = useArtistArtworks();
  const [cartIds, setCartIds] = useState([]);

  const allArtworks = [...featuredArtworks, ...artistArtworks];

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'visitor') {
      setCartIds(getCart(currentUser.id).artworkIds);
    } else {
      setCartIds([]);
    }
  }, [currentUser?.id, currentUser?.role, isAuthenticated]);

  const cartItems = allArtworks.filter((item) =>
    cartIds.includes(String(item.id))
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const handleRemove = (artworkId) => {
    removeFromCart(currentUser.id, artworkId);
    setCartIds((previous) =>
      previous.filter((id) => id !== String(artworkId))
    );
  };

  return (
    <>
      <Navbar />

      <main className="container page-shell">
        <section className="page-header">
          <h1>Your Cart</h1>
          <p>Ready for checkout when you are.</p>
        </section>

        {!isAuthenticated ? (
          <section className="empty-state card">
            <h2>Please log in to view your cart.</h2>
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          </section>
        ) : currentUser?.role !== 'visitor' ? (
          <section className="empty-state card">
            <h2>Cart is available for visitors only.</h2>
          </section>
        ) : cartItems.length === 0 ? (
          <section className="empty-state card">
            <h2>Your cart is empty.</h2>
            <p>Add artworks from the artwork details page.</p>
            <Link to="/browse">
              <Button>Browse Artworks</Button>
            </Link>
          </section>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item card">
                  <img src={item.image} alt={item.title} />

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.artist || item.artistName}</p>
                    <strong>${item.price}</strong>

                    <button
                      type="button"
                      className="detail-button"
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="checkout-summary card">
              <h2>Summary</h2>

              <div className="summary-row">
                <span>Items</span>
                <strong>{cartItems.length}</strong>
              </div>

              <div className="summary-row">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>

              <div className="summary-row">
                <span>Shipping</span>
                <strong>$0.00</strong>
              </div>

              <div className="summary-row total">
                <span>Total</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>

              <Button
                type="button"
                onClick={() => alert('Checkout functionality will be added next.')}
              >
                Proceed to Checkout
              </Button>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default CartPage;
