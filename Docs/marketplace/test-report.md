# CampusConnect Marketplace & Listing Management Module — Test Report

**Module Owner:** Nishka Shah (Student ID: 202512035)  
**Branch:** `feature/ns-marketplace-listings`  
**Test Suite:** Jest + Supertest + MongoDB Memory Server  
**Total Tests:** 39 passed, 0 failed (100% pass rate)

---

## 1. Test Summary

| Test Suite | Tests | Status | Duration |
|------------|-------|--------|----------|
| `backend/tests/marketplace/categories.test.js` | 12 | PASS | ~5.2s |
| `backend/tests/marketplace/listings.test.js` | 21 | PASS | ~6.5s |
| `backend/tests/marketplace/uploads.test.js` | 6 | PASS | ~4.3s |
| **Total** | **39** | **ALL PASS** | **~16.0s** |

---

## 2. Test Coverage & Detailed Results

### Category Management (`categories.test.js`)
- `GET /api/v1/categories`
  - Active categories listing sorted by `sortOrder` and `name`
  - Dynamic `listingCount` calculation via aggregation
  - Category hierarchy tree representation (`?tree=true`)
  - Idempotent database seeding (`seedCategories` upsert logic)
- `GET /api/v1/categories/:idOrSlug`
  - Lookup by slug and Mongo ObjectId
  - 404 response for unknown category
- `POST /api/v1/categories`
  - 401 Unauthorized for anonymous requests
  - 403 Forbidden for non-administrator accounts
  - 201 Created with valid category payload
  - 409 Conflict on duplicate slug or category name
- `PATCH /api/v1/categories/:id`
  - Admin-only updates with updated data return
- `DELETE /api/v1/categories/:id`
  - Admin-only deletion of unreferenced categories
  - 409 Conflict if category is referenced by active listings

### Listing CRUD (`listings.test.js`)
- `POST /api/v1/listings`
  - Valid creation for all 4 listing types: `sell`, `rent`, `exchange`, `giveaway`
  - Security check: owner ID taken strictly from JWT auth payload, ignoring any body spoofing
  - Type-specific validation:
    - `sell`: rejects missing price or price <= 0; forbids rental/exchange fields
    - `rent`: validates `rentalRate > 0`, `rentalPeriod in ['day','week','month']`, optional `deposit`; forbids price/exchange fields
    - `exchange`: validates `exchangeFor (3-300 chars)`; forbids price/rental fields
    - `giveaway`: rejects if price > 0; enforces free giveaway; forbids rental/exchange fields
- `GET /api/v1/listings` (Public Discovery)
  - Public filter: only `status: active` and `isDeleted: false` listings returned
  - Filtering by `category`, `listingType`, `condition`, `minPrice`, `maxPrice`
  - Search query `q` matching title, description, or tags
  - Pagination (`page`, `limit`, `totalPages`) and sorting (`newest`, `oldest`, `price_asc`, `price_desc`)
  - Sanitized owner projection (`name`, `avatar`; no email/phone)
- `GET /api/v1/listings/mine`
  - Authenticated owner view returning listings across all statuses (`draft`, `pending_approval`, `active`, `sold`, etc.)
- `GET /api/v1/listings/:id`
  - 400 for invalid ObjectId, 404 for non-existent listing
  - Public access for active listings; increments `viewCount` for non-owners
  - 403 Forbidden for non-owners viewing private drafts or non-public statuses
- `PATCH /api/v1/listings/:id`
  - Whitelisted field updates for listing owner
  - 403 Forbidden for non-owners
  - Switching `listingType` cleanly wipes fields belonging to the previous type
  - Demotes active listing to `pending_approval` if core fields change and auto-approve is disabled
- `DELETE /api/v1/listings/:id`
  - Soft delete marking `isDeleted: true` and `deletedAt` timestamp
  - Excluded from subsequent public queries
  - 409 Conflict prevention if listing is in `reserved` or `rented` transaction status

### Image Upload & Storage (`uploads.test.js`)
- `POST /api/v1/listings/:id/images`
  - Single and multiple file upload via `multipart/form-data`
  - Magic bytes header inspection (validates true JPEG, PNG, and WebP signatures)
  - 415 Unsupported Media Type for mismatched magic bytes / invalid files
  - 400 Bad Request if upload exceeds maximum of 6 images per listing
  - Automatic Sharp image optimization (max 1600px main WebP + 400px thumbnail WebP)
  - First image automatically marked as `isPrimary: true`
  - 403 Forbidden for non-owner upload attempts
- `DELETE /api/v1/listings/:id/images/:imageId`
  - Removal of image from database array and storage
  - Automatic promotion of the next image to primary if primary image was deleted
- `PATCH /api/v1/listings/:id/images/order`
  - Reordering of listing images and updating of primary image flag

---

## 3. Integration & Seams Verification
- **Existing Tests:** Node test runner (`npm test`) passes all 8 existing team tests (RBAC, auth middleware, model schema verifications).
- **Auth Seam:** `services/integration/auth.adapter.js` cleanly wraps `authMiddleware.js` and provides `requireAuth`, `optionalAuth`, `requireRole`, and `getCurrentUser`.
- **Rental Seam:** `services/integration/rental.hook.js` exports `getRentableListing(id)` and `markStatus(id, status)`.
- **AI Seam:** `services/integration/ai.hook.js` exports `getListingSuggestions(draft)`.
- **Storage Seam:** `services/storage/` seamlessly switches between `local` and `cloudinary` storage drivers.
