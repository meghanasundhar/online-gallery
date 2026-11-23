import { createSampleAuctions, createSampleBids } from '../data/auctionData';
import { parseLocalDate } from './helpers';

export function getData(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Unable to read ${key} from localStorage:`, error);
    return fallback;
  }
}

export function setData(key, value, { notify = true } = {}) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    if (notify) window.dispatchEvent(new Event('artGalleryStorageChange'));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to localStorage:`, error);
    return false;
  }
}

export function removeData(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Unable to remove ${key} from localStorage:`, error);
    return false;
  }
}

function getUserRecord(key, userId) {
  if (userId == null) return { userId: null, artworkIds: [], artistIds: [] };

  const stored = getData(key, []);
  const records = Array.isArray(stored) ? stored : stored && typeof stored === 'object' ? [stored] : [];
  return records.find((record) => String(record.userId) === String(userId)) ?? {
    userId,
    artworkIds: [],
    artistIds: [],
  };
}

function setUserRecord(key, updatedRecord) {
  const stored = getData(key, []);
  const records = Array.isArray(stored) ? stored : stored && typeof stored === 'object' ? [stored] : [];
  const matchingIndex = records.findIndex(
    (record) => String(record.userId) === String(updatedRecord.userId)
  );

  if (matchingIndex < 0) {
    records.push(updatedRecord);
  } else {
    records[matchingIndex] = updatedRecord;
  }

  setData(key, records);
  return updatedRecord;
}

function normalizeIds(ids) {
  return [...new Set(ids.map(String))];
}

export function getWishlist(userId) {
  const record = getUserRecord('artGalleryWishlists', userId);
  return { userId: record.userId, artworkIds: normalizeIds(record.artworkIds ?? []) };
}

export function addToWishlist(userId, artworkId) {
  const wishlist = getWishlist(userId);
  return setUserRecord('artGalleryWishlists', {
    userId,
    artworkIds: normalizeIds([...wishlist.artworkIds, artworkId]),
  });
}

export function removeFromWishlist(userId, artworkId) {
  const wishlist = getWishlist(userId);
  return setUserRecord('artGalleryWishlists', {
    userId,
    artworkIds: wishlist.artworkIds.filter((id) => id !== String(artworkId)),
  });
}

export function isInWishlist(userId, artworkId) {
  return getWishlist(userId).artworkIds.includes(String(artworkId));
}

export function getCart(userId) {
  const record = getUserRecord('artGalleryCarts', userId);
  return {
    userId: record.userId,
    artworkIds: normalizeIds(record.artworkIds ?? []),
  };
}

export function addToCart(userId, artworkId) {
  if (userId == null || artworkId == null) return null;

  const cart = getCart(userId);

  return setUserRecord('artGalleryCarts', {
    userId,
    artworkIds: normalizeIds([...cart.artworkIds, artworkId]),
  });
}

export function removeFromCart(userId, artworkId) {
  if (userId == null) return null;

  const cart = getCart(userId);

  return setUserRecord('artGalleryCarts', {
    userId,
    artworkIds: cart.artworkIds.filter((id) => id !== String(artworkId)),
  });
}

export function clearCart(userId) {
  if (userId == null) return null;

  return setUserRecord('artGalleryCarts', {
    userId,
    artworkIds: [],
  });
}

export function getLikes(userId) {
  const record = getUserRecord('artGalleryLikes', userId);
  return { userId: record.userId, artworkIds: normalizeIds(record.artworkIds ?? []) };
}

export function toggleLike(userId, artworkId) {
  const likes = getLikes(userId);
  const normalizedId = String(artworkId);
  const artworkIds = likes.artworkIds.includes(normalizedId)
    ? likes.artworkIds.filter((id) => id !== normalizedId)
    : [...likes.artworkIds, normalizedId];

  return setUserRecord('artGalleryLikes', { userId, artworkIds });
}

export function isLiked(userId, artworkId) {
  return getLikes(userId).artworkIds.includes(String(artworkId));
}

export function getArtworkLikeCount(artworkId, baseCount = 0) {
  const stored = getData('artGalleryLikes', []);
  const records = Array.isArray(stored) ? stored : stored && typeof stored === 'object' ? [stored] : [];
  const userLikeCount = records.filter((record) =>
    normalizeIds(record.artworkIds ?? []).includes(String(artworkId))
  ).length;
  return Number(baseCount) + userLikeCount;
}

export function getArtworkWishlistCount(artworkId) {
  const stored = getData('artGalleryWishlists', []);
  const records = Array.isArray(stored) ? stored : stored && typeof stored === 'object' ? [stored] : [];
  return records.filter((record) => normalizeIds(record.artworkIds ?? []).includes(String(artworkId))).length;
}

export function getArtworkViewCount(artworkId) {
  const views = getData('artGalleryArtworkViews', []);
  if (!Array.isArray(views)) return 0;
  return Number(views.find((entry) => String(entry.artworkId) === String(artworkId))?.views ?? 0);
}

export function recordArtworkView(artworkId, viewerId, ownerArtistId) {
  if (viewerId != null && String(viewerId) === String(ownerArtistId)) return getArtworkViewCount(artworkId);

  const views = getData('artGalleryArtworkViews', []);
  const entries = Array.isArray(views) ? views : [];
  const existing = entries.find((entry) => String(entry.artworkId) === String(artworkId));
  if (existing) existing.views = Number(existing.views ?? 0) + 1;
  else entries.push({ artworkId, views: 1 });
  setData('artGalleryArtworkViews', entries);
  return getArtworkViewCount(artworkId);
}

export function getBuyerById(userId) {
  if (userId == null) return null;
  return getUsers().find((user) => String(user.id) === String(userId)) ?? null;
}

export function getFollowing(userId) {
  const record = getUserRecord('artGalleryFollowing', userId);
  return { userId: record.userId, artistIds: normalizeIds(record.artistIds ?? []) };
}

export function toggleFollow(userId, artistId) {
  const following = getFollowing(userId);
  const normalizedId = String(artistId);
  const artistIds = following.artistIds.includes(normalizedId)
    ? following.artistIds.filter((id) => id !== normalizedId)
    : [...following.artistIds, normalizedId];

  return setUserRecord('artGalleryFollowing', { userId, artistIds });
}

export function isFollowing(userId, artistId) {
  return getFollowing(userId).artistIds.includes(String(artistId));
}

export function getArtistFollowerCount(artistId, baseCount = 0) {
  const stored = getData('artGalleryFollowing', []);
  const records = Array.isArray(stored) ? stored : stored && typeof stored === 'object' ? [stored] : [];
  const followerCount = records.filter((record) =>
    normalizeIds(record.artistIds ?? []).includes(String(artistId))
  ).length;
  return Number(baseCount) + followerCount;
}

function resolveAuctionStatus(auction, now = Date.now()) {
  if (new Date(auction.startTime).getTime() > now) return 'Upcoming';
  if (new Date(auction.endTime).getTime() <= now) return 'Ended';
  return 'Live';
}

export function getAuctions() {
  let auctions = getData('artGalleryAuctions');
  if (!Array.isArray(auctions)) {
    auctions = createSampleAuctions();
    setData('artGalleryAuctions', auctions);
  }

  const updatedAuctions = auctions.map((auction) => ({
    ...auction,
    status: resolveAuctionStatus(auction),
  }));
  if (updatedAuctions.some((auction, index) => auction.status !== auctions[index].status)) {
    setData('artGalleryAuctions', updatedAuctions, { notify: false });
  }
  return updatedAuctions;
}

export function getAuctionById(auctionId) {
  return getAuctions().find((auction) => String(auction.id) === String(auctionId)) ?? null;
}

export function saveAuction(auctionToSave) {
  const auctions = getAuctions();
  const existingIndex = auctions.findIndex((auction) => String(auction.id) === String(auctionToSave.id));
  const nextAuctions = [...auctions];
  if (existingIndex < 0) nextAuctions.push(auctionToSave);
  else nextAuctions[existingIndex] = auctionToSave;
  setData('artGalleryAuctions', nextAuctions);
  return auctionToSave;
}

export function updateArtistAuction(artistId, auctionId, changes) {
  const auction = getAuctionById(auctionId);
  if (!auction || String(auction.artistId) !== String(artistId) || auction.status !== 'Upcoming') return null;
  return saveAuction({ ...auction, ...changes, id: auction.id, artistId: auction.artistId });
}

export function createArtistAuction(artistId, auctionData) {
  if (artistId == null) return null;
  return saveAuction({
    ...auctionData,
    id: `artist-auction-${artistId}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    artistId,
  });
}

export function cancelArtistAuction(artistId, auctionId) {
  const auctions = getAuctions();
  const auction = auctions.find((item) => String(item.id) === String(auctionId));
  if (!auction || String(auction.artistId) !== String(artistId) || auction.status !== 'Upcoming') return false;
  setData('artGalleryAuctions', auctions.filter((item) => String(item.id) !== String(auctionId)));
  return true;
}

export function getBids() {
  const bids = getData('artGalleryBids');
  if (Array.isArray(bids)) return bids;
  const sampleBids = createSampleBids();
  setData('artGalleryBids', sampleBids);
  return sampleBids;
}

export function getBidsForAuction(auctionId) {
  return getBids()
    .filter((bid) => String(bid.auctionId) === String(auctionId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUserBids(userId) {
  if (userId == null) return [];
  return getBids().filter((bid) => String(bid.userId) === String(userId));
}

export function placeBid({ auctionId, user, amount }) {
  const auction = getAuctionById(auctionId);
  const bidAmount = Number(amount);

  if (!auction) return { success: false, error: 'This auction could not be found.' };
  if (auction.status !== 'Live') return { success: false, error: 'Bids can only be placed while an auction is live.' };
  if (!Number.isFinite(bidAmount)) return { success: false, error: 'Enter a valid bid amount.' };

  const minimumBid = Number(auction.currentBid) + Number(auction.minimumIncrement);
  if (bidAmount < minimumBid) {
    return { success: false, error: `Your bid must be at least $${minimumBid.toFixed(2)}.` };
  }

  const bid = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    auctionId: auction.id,
    artworkId: auction.artworkId,
    userId: user.id,
    userName: user.name,
    amount: bidAmount,
    createdAt: new Date().toISOString(),
  };
  const updatedAuction = {
    ...auction,
    currentBid: bidAmount,
    highestBidderId: user.id,
    highestBidderName: user.name,
  };

  setData('artGalleryBids', [...getBids(), bid]);
  saveAuction(updatedAuction);
  return { success: true, auction: updatedAuction, bid };
}

export function getOrders() {
  const orders = getData('artGalleryOrders', []);
  return Array.isArray(orders) ? orders : [];
}

export function getOrdersForUser(userId) {
  if (userId == null) return [];
  return getOrders()
    .filter((order) => String(order.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createOrder(orderDetails) {
  const orders = getOrders();
  const existingOrder = orders.find((order) =>
    String(order.userId) === String(orderDetails.userId)
    && String(order.artworkId) === String(orderDetails.artworkId)
    && order.purchaseType === orderDetails.purchaseType
  );
  if (existingOrder) return existingOrder;

  const order = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...orderDetails,
    status: orderDetails.status ?? 'Confirmed',
    createdAt: new Date().toISOString(),
  };
  setData('artGalleryOrders', [...orders, order]);
  return order;
}

export function getArtistProfiles() {
  const profiles = getData('artGalleryArtistProfiles', []);
  return Array.isArray(profiles) ? profiles : [];
}

export function getArtistProfile(userId) {
  if (userId == null) return null;
  return getArtistProfiles().find((profile) => String(profile.userId) === String(userId)) ?? null;
}

export function saveArtistProfile(userId, profileData) {
  if (userId == null) return null;
  const profiles = getArtistProfiles();
  const profile = { ...profileData, userId };
  const existingIndex = profiles.findIndex((item) => String(item.userId) === String(userId));
  if (existingIndex < 0) profiles.push(profile);
  else profiles[existingIndex] = profile;
  setData('artGalleryArtistProfiles', profiles);
  return profile;
}

export function getAllArtistArtworks() {
  const artworks = getData('artGalleryArtistArtworks', []);
  return Array.isArray(artworks) ? artworks : [];
}

export function getArtistArtworks(artistId) {
  if (artistId == null) return [];
  return getAllArtistArtworks().filter((artwork) => String(artwork.artistId) === String(artistId));
}

export function getOwnedArtistArtwork(artistId, artworkId) {
  return getArtistArtworks(artistId)
    .find((artwork) => String(artwork.id) === String(artworkId)) ?? null;
}

export function createArtistArtwork(artistId, artworkData) {
  if (artistId == null) return null;
  const artwork = { ...artworkData, artistId };
  setData('artGalleryArtistArtworks', [...getAllArtistArtworks(), artwork]);
  return artwork;
}

export function updateOwnedArtistArtwork(artistId, artworkId, artworkData) {
  if (artistId == null) return null;
  const artworks = getAllArtistArtworks();
  const existing = artworks.find((artwork) =>
    String(artwork.id) === String(artworkId)
    && String(artwork.artistId) === String(artistId)
  );
  if (!existing) return null;

  const updatedArtwork = { ...existing, ...artworkData, id: existing.id, artistId: existing.artistId };
  setData('artGalleryArtistArtworks', artworks.map((artwork) =>
    String(artwork.id) === String(artworkId) && String(artwork.artistId) === String(artistId)
      ? updatedArtwork
      : artwork
  ));
  return updatedArtwork;
}

export function deleteOwnedArtistArtwork(artistId, artworkId) {
  if (artistId == null) return false;
  const artworks = getAllArtistArtworks();
  const ownsArtwork = artworks.some((artwork) =>
    String(artwork.id) === String(artworkId)
    && String(artwork.artistId) === String(artistId)
  );
  if (!ownsArtwork) return false;

  setData('artGalleryArtistArtworks', artworks.filter((artwork) =>
    !(String(artwork.id) === String(artworkId) && String(artwork.artistId) === String(artistId))
  ));
  return true;
}

export function getArtistCollections(artistId) {
  if (artistId == null) return [];
  return getCollections().filter((collection) => String(collection.artistId) === String(artistId));
}

export function getCollections() {
  const stored = getData('artGalleryCollections');
  if (Array.isArray(stored)) return stored;

  const legacy = getData('artGalleryArtistCollections', []);
  const migrated = (Array.isArray(legacy) ? legacy : []).map((collection) => {
    const firstArtwork = getAllArtistArtworks().find((artwork) =>
      String(artwork.artistId) === String(collection.artistId)
      && (collection.artworkIds ?? []).map(String).includes(String(artwork.id))
    );
    return {
      id: collection.id,
      artistId: collection.artistId,
      name: collection.name,
      description: '',
      coverImage: firstArtwork?.image ?? '',
      artworkIds: normalizeIds(collection.artworkIds ?? []),
      createdAt: collection.createdAt ?? new Date().toISOString(),
    };
  });
  if (migrated.length) setData('artGalleryCollections', migrated);
  return migrated;
}

export function getCollectionsForArtist(artistId) {
  return getArtistCollections(artistId);
}

export function getCollectionById(collectionId) {
  return getCollections().find((collection) => String(collection.id) === String(collectionId)) ?? null;
}

export function createArtistCollection(artistId, collectionData, legacyArtworkIds = []) {
  if (artistId == null) return null;
  const data = typeof collectionData === 'string'
    ? { name: collectionData, artworkIds: legacyArtworkIds }
    : collectionData;
  if (!data?.name?.trim()) return null;
  const ownedArtworkIds = new Set(getArtistArtworks(artistId).map((artwork) => String(artwork.id)));
  const collection = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    artistId,
    name: data.name.trim(),
    description: data.description?.trim() ?? '',
    coverImage: data.coverImage?.trim() || '',
    artworkIds: normalizeIds(data.artworkIds ?? []).filter((artworkId) => ownedArtworkIds.has(artworkId)),
    createdAt: new Date().toISOString(),
  };
  const collections = getCollections();
  setData('artGalleryCollections', [...collections, collection]);
  return collection;
}

export function updateOwnedArtistCollection(artistId, collectionId, collectionData) {
  const collections = getCollections();
  const existing = collections.find((collection) =>
    String(collection.id) === String(collectionId) && String(collection.artistId) === String(artistId)
  );
  if (!existing) return null;
  const ownedArtworkIds = new Set(getArtistArtworks(artistId).map((artwork) => String(artwork.id)));
  const updated = {
    ...existing,
    name: collectionData.name.trim(),
    description: collectionData.description?.trim() ?? '',
    coverImage: collectionData.coverImage?.trim() ?? '',
    artworkIds: normalizeIds(collectionData.artworkIds ?? []).filter((artworkId) => ownedArtworkIds.has(artworkId)),
  };
  setData('artGalleryCollections', collections.map((collection) => collection.id === existing.id ? updated : collection));
  return updated;
}

export function deleteOwnedArtistCollection(artistId, collectionId) {
  const collections = getCollections();
  const owned = collections.some((collection) =>
    String(collection.id) === String(collectionId) && String(collection.artistId) === String(artistId)
  );
  if (!owned) return false;
  setData('artGalleryCollections', collections.filter((collection) =>
    !(String(collection.id) === String(collectionId) && String(collection.artistId) === String(artistId))
  ));
  return true;
}

export function getInquiries() {
  const inquiries = getData('artGalleryInquiries', []);
  return Array.isArray(inquiries) ? inquiries : [];
}

export function getInquiriesForArtist(artistId) {
  if (artistId == null) return [];
  return getInquiries()
    .filter((inquiry) => String(inquiry.artistId) === String(artistId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createInquiry(inquiryData) {
  const inquiry = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...inquiryData,
    status: 'New',
    createdAt: new Date().toISOString(),
  };
  setData('artGalleryInquiries', [...getInquiries(), inquiry]);
  return inquiry;
}

export function updateOwnedInquiryStatus(artistId, inquiryId, status) {
  if (!['New', 'Replied', 'Closed'].includes(status)) return null;
  const inquiries = getInquiries();
  const inquiry = inquiries.find((item) =>
    String(item.id) === String(inquiryId) && String(item.artistId) === String(artistId)
  );
  if (!inquiry) return null;
  const updated = { ...inquiry, status };
  setData('artGalleryInquiries', inquiries.map((item) => item.id === inquiry.id ? updated : item));
  return updated;
}

function resolveExhibitionStatus(exhibition, now = Date.now()) {
  const start = parseLocalDate(exhibition.startDate).getTime();
  const end = parseLocalDate(exhibition.endDate, true).getTime();
  if (now < start) return 'Upcoming';
  if (now > end) return 'Completed';
  return 'Active';
}

export function getExhibitions() {
  const exhibitions = getData('artGalleryExhibitions', []);
  if (!Array.isArray(exhibitions)) return [];
  return exhibitions.map((exhibition) => ({
    ...exhibition,
    status: resolveExhibitionStatus(exhibition),
  }));
}

export function getExhibitionsForArtist(artistId) {
  if (artistId == null) return [];
  return getExhibitions().filter((exhibition) => String(exhibition.artistId) === String(artistId));
}

export function getExhibitionById(exhibitionId) {
  return getExhibitions().find((exhibition) => String(exhibition.id) === String(exhibitionId)) ?? null;
}

export function createExhibition(artistId, exhibitionData) {
  if (artistId == null) return null;
  const exhibition = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...exhibitionData,
    artistId,
    artworkIds: normalizeIds(exhibitionData.artworkIds ?? []),
    createdAt: new Date().toISOString(),
  };
  exhibition.status = resolveExhibitionStatus(exhibition);
  setData('artGalleryExhibitions', [...getExhibitions(), exhibition]);
  return exhibition;
}

export function updateOwnedExhibition(artistId, exhibitionId, exhibitionData) {
  const exhibitions = getExhibitions();
  const existing = exhibitions.find((item) =>
    String(item.id) === String(exhibitionId) && String(item.artistId) === String(artistId)
  );
  if (!existing) return null;
  const updated = {
    ...existing,
    ...exhibitionData,
    id: existing.id,
    artistId: existing.artistId,
    artworkIds: normalizeIds(exhibitionData.artworkIds ?? []),
  };
  updated.status = resolveExhibitionStatus(updated);
  setData('artGalleryExhibitions', exhibitions.map((item) => item.id === existing.id ? updated : item));
  return updated;
}

export function deleteOwnedExhibition(artistId, exhibitionId) {
  const exhibitions = getExhibitions();
  const owned = exhibitions.some((item) =>
    String(item.id) === String(exhibitionId) && String(item.artistId) === String(artistId)
  );
  if (!owned) return false;
  setData('artGalleryExhibitions', exhibitions.filter((item) =>
    !(String(item.id) === String(exhibitionId) && String(item.artistId) === String(artistId))
  ));
  return true;
}

export function getUsers() {
  const users = getData('artGalleryUsers', []);
  return Array.isArray(users)
    ? users
      .filter((user) => user && typeof user === 'object')
      .map((user) => {
        const safeUser = { ...user };
        delete safeUser.password;
        delete safeUser.passwordHash;
        delete safeUser.token;
        return safeUser;
      })
    : [];
}

export function isAccountActive(user) {
  if (!user) return false;
  const inactiveStatuses = ['inactive', 'deactivated', 'disabled', 'suspended'];
  if (user.isActive === false) return false;
  if (user.accountStatus != null) return !inactiveStatuses.includes(String(user.accountStatus).toLowerCase());
  return !inactiveStatuses.includes(String(user.status ?? '').toLowerCase());
}

export function updateUserAccountStatus(userId, isActive) {
  const users = getUsers();
  const target = users.find((user) => String(user.id) === String(userId));
  if (!target) return null;

  const updated = { ...target, accountStatus: isActive ? 'Active' : 'Inactive', isActive };
  setData('artGalleryUsers', users.map((user) => String(user.id) === String(userId) ? updated : user));
  return updated;
}