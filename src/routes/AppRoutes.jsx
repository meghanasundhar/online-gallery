
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Public pages
import HomePage from '../pages/HomePage';
import BrowsePage from '../pages/BrowsePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';
import CollectionsPage from '../pages/CollectionsPage';
import CollectionDetailsPage from '../pages/CollectionDetailsPage';
import ArtworkDetailsPage from '../pages/ArtworkDetailsPage';
import AuctionPage from '../pages/AuctionPage';
import AuctionDetailsPage from '../pages/AuctionDetailsPage';
import ExhibitionsPage from '../pages/ExhibitionsPage';
import ExhibitionDetailsPage from '../pages/ExhibitionDetailsPage';
import ArtistProfilePage from '../pages/ArtistProfilePage';
import WishlistPage from '../pages/WishlistPage';
import CartPage from '../pages/CartPage';
import OrdersPage from '../pages/OrdersPage';

// Admin pages
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminArtistsPage from '../pages/AdminArtistsPage';
import AdminArtworksPage from '../pages/AdminArtworksPage';
import AdminCategoriesPage from '../pages/AdminCategoriesPage';
import AdminAuctionsPage from '../pages/AdminAuctionsPage';
import AdminOrdersPage from '../pages/AdminOrdersPage';
import AdminReviewsPage from '../pages/AdminReviewsPage';
import AdminAnalyticsPage from '../pages/AdminAnalyticsPage';
import AdminReportsPage from '../pages/AdminReportsPage';

// Artist pages
import ArtistDashboardPage from '../pages/ArtistDashboardPage';
import ArtistProfileManagementPage from '../pages/ArtistProfileManagementPage';
import ArtistArtworksPage from '../pages/ArtistArtworksPage';
import ArtistArtworkFormPage from '../pages/ArtistArtworkFormPage';
import ArtistInquiriesPage from '../pages/ArtistInquiriesPage';
import ArtistExhibitionsPage from '../pages/ArtistExhibitionsPage';
import ArtistExhibitionFormPage from '../pages/ArtistExhibitionFormPage';
import ArtistAuctionsPage from '../pages/ArtistAuctionsPage';
import ArtistAuctionFormPage from '../pages/ArtistAuctionFormPage';
import ArtistCollectionsPage from '../pages/ArtistCollectionsPage';
import ArtistCollectionFormPage from '../pages/ArtistCollectionFormPage';
import ArtistCollectionDetailsPage from '../pages/ArtistCollectionDetailsPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowsePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:id" element={<CollectionDetailsPage />} />
      <Route path="/artwork/:id" element={<ArtworkDetailsPage />} />

      <Route path="/auctions" element={<AuctionPage />} />
      <Route path="/auctions/:id" element={<AuctionDetailsPage />} />

      <Route path="/exhibitions" element={<ExhibitionsPage />} />
      <Route path="/exhibitions/:id" element={<ExhibitionDetailsPage />} />

      <Route path="/artist/:id" element={<ArtistProfilePage />} />

      {/* Authenticated user routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Route>

      {/* Artist-only routes */}
      <Route element={<ProtectedRoute allowedRoles={['artist']} redirectTo="/" />}>
        <Route path="/artist/dashboard" element={<ArtistDashboardPage />} />
        <Route path="/artist/profile" element={<ArtistProfileManagementPage />} />
        <Route path="/artist/artworks" element={<ArtistArtworksPage />} />
        <Route path="/artist/artworks/new" element={<ArtistArtworkFormPage />} />
        <Route path="/artist/artworks/edit/:id" element={<ArtistArtworkFormPage />} />
        <Route path="/artist/inquiries" element={<ArtistInquiriesPage />} />
        <Route path="/artist/exhibitions" element={<ArtistExhibitionsPage />} />
        <Route path="/artist/exhibitions/new" element={<ArtistExhibitionFormPage />} />
        <Route path="/artist/exhibitions/edit/:id" element={<ArtistExhibitionFormPage />} />
        <Route path="/artist/auctions" element={<ArtistAuctionsPage />} />
        <Route path="/artist/auctions/new" element={<ArtistAuctionFormPage />} />
        <Route path="/artist/auctions/edit/:id" element={<ArtistAuctionFormPage />} />
        <Route path="/artist/collections" element={<ArtistCollectionsPage />} />
        <Route path="/artist/collections/new" element={<ArtistCollectionFormPage />} />
        <Route path="/artist/collections/edit/:id" element={<ArtistCollectionFormPage />} />
        <Route path="/artist/collections/:id" element={<ArtistCollectionDetailsPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/artists" element={<AdminArtistsPage />} />
        <Route path="/admin/artworks" element={<AdminArtworksPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/auctions" element={<AdminAuctionsPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/reviews" element={<AdminReviewsPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
