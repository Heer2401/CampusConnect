// Small presentation helpers shared by the admin views.
// Presentation only: no API or data-shape changes live here.

const PENDING_STATUSES = ['pending', 'pending_approval'];
export const isPending = (status) => PENDING_STATUSES.includes(status);

// Backend/seed data uses both "Admin" and "Administrator" for the role.
export const isAdminRole = (role) => role === 'Admin' || role === 'Administrator';

// Category can arrive as a plain string or a populated { name } object.
export const categoryName = (category) =>
  (typeof category === 'object' && category ? category.name : category) || 'General';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const titleCase = (s = '') =>
  String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Mirrors how the marketplace ListingCard prices an item (₹, per-type).
export const formatListingPrice = (item = {}) => {
  const type = String(item.listingType || 'sell').toLowerCase();
  if (type === 'rent') return `₹${item.rentalRate ?? 0}/${item.rentalPeriod || 'week'}`;
  if (type === 'giveaway') return 'Free';
  if (type === 'exchange') return 'Exchange';
  return `₹${item.price ?? 0}`;
};

export const listingTypeLabel = (t) => titleCase(String(t || 'sell').toLowerCase());

export const listingTypePill = (t) => {
  switch (String(t || 'sell').toLowerCase()) {
    case 'rent': return 'green';
    case 'giveaway': return 'yellow';
    case 'exchange': return 'purple';
    default: return 'blue';
  }
};

export const conditionLabel = (c) => ({
  new: 'New', like_new: 'Like new', good: 'Good condition', fair: 'Fair condition', poor: 'Poor condition',
}[c] || c || 'Used');
