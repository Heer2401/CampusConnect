/**
 * Charmi Bhayani (202512028) - Rental & Transaction Management
 * rentalApi.js - API service layer connecting to backend endpoints.
 *
 * Token key: "cc_token" (matches AuthContext.jsx)
 * Proxy: Vite proxies /api -> http://localhost:5000 (vite.config.js)
 */

// ─── helper: read JWT stored by AuthContext ─────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('cc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function buildQS(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
}

// ─── RENTAL ENDPOINTS ────────────────────────────────────────────────────────

/** GET /api/rentals/my-rentals?role=&status=&page=&limit= */
export const getMyRentals = (params = {}) =>
  request(`/api/rentals/my-rentals${buildQS(params)}`);

/** GET /api/rentals/:id */
export const getRentalById = (id) => request(`/api/rentals/${id}`);

/** GET /api/rentals/listing/:listingId/reserved-dates */
export const getListingReservedDates = (listingId) =>
  request(`/api/rentals/listing/${listingId}/reserved-dates`).catch(() => ({ data: [] }));

/** POST /api/rentals  — { listingId, startDate, dueDate, message? } */
export const createRental = (body) =>
  request('/api/rentals', { method: 'POST', body: JSON.stringify(body) });

/** PATCH /api/rentals/:id/status  — { status: 'approved'|'cancelled' } */
export const updateRentalStatus = (id, status) =>
  request(`/api/rentals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

/** GET /api/rentals/:id/qr  — owner only; returns { qrDataUri, token } */
export const getRentalQR = (id) => request(`/api/rentals/${id}/qr`);

/** POST /api/rentals/:id/handover  — { qrToken } renter verifies */
export const verifyHandover = (id, qrToken) =>
  request(`/api/rentals/${id}/handover`, {
    method: 'POST',
    body: JSON.stringify({ qrToken }),
  });

/** POST /api/rentals/:id/return  — owner confirms return */
export const completeRental = (id) =>
  request(`/api/rentals/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

// ─── TRANSACTION ENDPOINTS ───────────────────────────────────────────────────

/** GET /api/transactions/my?role=&status=&page=&limit= */
export const getMyTransactions = (params = {}) =>
  request(`/api/transactions/my${buildQS(params)}`);

/** POST /api/transactions  — { listingId, type: 'sale'|'exchange'|'giveaway' } */
export const createTransaction = (body) =>
  request('/api/transactions', { method: 'POST', body: JSON.stringify(body) });

/** GET /api/transactions/:id */
export const getTransactionById = (id) => request(`/api/transactions/${id}`);

/** PATCH /api/transactions/:id/confirm */
export const confirmTransaction = (id) =>
  request(`/api/transactions/${id}/confirm`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

/** POST /api/transactions/:id/generate-pin — Seller generates 6-digit handover PIN */
export const generateTransactionPin = (id) =>
  request(`/api/transactions/${id}/generate-pin`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

/** POST /api/transactions/:id/verify-pin — Buyer verifies 6-digit handover PIN */
export const verifyTransactionPin = (id, pin) =>
  request(`/api/transactions/${id}/verify-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });

/** PATCH /api/transactions/:id/cancel */
export const cancelTransaction = (id) =>
  request(`/api/transactions/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

// ─── RENTAL ITEM REQUEST ENDPOINTS (free-form, no listing ID needed) ───────────

/** POST /api/rental-requests — Student posts a request for an item not yet listed */
export const createRentalRequest = (data) =>
  request('/api/rental-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });

/** GET /api/rental-requests/my — Get requests made by the current user */
export const getMyRentalRequests = () => request('/api/rental-requests/my');

/** GET /api/rental-requests — Browse open requests from all students */
export const getAllRentalRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/rental-requests${qs ? `?${qs}` : ''}`);
};

/** PATCH /api/rental-requests/:id/cancel — Requester cancels their own request */
export const cancelRentalRequest = (id) =>
  request(`/api/rental-requests/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

/** POST /api/rental-requests/:id/notify-listing — Owner offers to list item & notifies student */
export const notifyItemListing = (id) =>
  request(`/api/rental-requests/${id}/notify-listing`, {
    method: 'POST',
    body: JSON.stringify({}),
  });


