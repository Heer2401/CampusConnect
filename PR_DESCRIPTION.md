# feat(marketplace): listing CRUD, categories, image upload and listing UI (NS)

## Summary
Implements the end-to-end **Marketplace & Listing Management** module for **CampusConnect — A Smart Campus Exchange Platform** on behalf of team member **Nishka Shah (Student ID: 202512035)**. This pull request delivers core item exchange functionality supporting **buy/sell, rent, exchange, and giveaway** workflows across frontend and backend, backed by category taxonomy, multi-image upload with magic-byte validation, and comprehensive automated test suites.

---

## What's Included (Mapped to the 9 Trello Cards)

| # | Trello Card | Implementation Artifacts & Highlights |
|---|---|---|
| **1** | **Define listing workflow requirements** | `Docs/marketplace/listing-workflows.md` defining actors, preconditions, state transitions (`draft`, `pending_approval`, `active`, `reserved`, `sold`, `rented`, `exchanged`, `given_away`, `rejected`, `archived`), and boundary contracts. |
| **2** | **Design listing creation wireframe** | `Docs/marketplace/wireframes/wireframes.md` detailing responsive two-column desktop and single-column mobile layouts for creation and editing. |
| **3** | **Design browsing wireframe** | `Docs/marketplace/wireframes/wireframes.md` detailing catalog discovery, filter sidebar, search bar, sort dropdowns, pagination, and empty/error states. |
| **4** | **Develop listing CRUD APIs** | `backend/src/controllers/listingController.js` and `backend/src/routes/listingRoutes.js` supporting `sell`, `rent`, `exchange`, and `giveaway` with strict type validation, authenticated owner scoping (`/listings/mine`), public discovery (`/listings`), whitelisted patch updates, and soft-deletion (`isDeleted: true`). |
| **5** | **Develop category management functionality & seed** | `backend/src/controllers/categoryController.js`, `backend/src/routes/categoryRoutes.js`, and idempotent seeder `backend/src/utils/seedCategories.js` creating a 14-category campus taxonomy with live item counting and tree representation. |
| **6** | **Develop image upload backend** | `backend/src/middlewares/uploadMiddleware.js` (Multer memory storage + file-type magic bytes verification, 5MB limit, 6 images max), Sharp image optimization (1600px main WebP + 400px thumbnail WebP), and dual storage drivers (`services/storage/local.js`, `services/storage/cloudinary.js`). |
| **7** | **Test listing CRUD & image upload APIs** | `backend/tests/marketplace/` containing 39 Jest + Supertest + MongoMemoryServer tests (all 39 passing), plus automated 7-step HTTP smoke test `backend/tests/marketplace/smoke.js`. |
| **8** | **Build listing creation UI** | `Frontend/src/features/marketplace/components/ListingForm.jsx`, `ImageUploader.jsx` (drag-and-drop, preview, reordering, deletion, set-primary), `CreateListingPage.jsx`, and `EditListingPage.jsx`. |
| **9** | **Build browsing UI** | `Frontend/src/features/marketplace/pages/BrowseListingsPage.jsx`, `ListingDetailPage.jsx` (image carousel, condition badge, status chip, owner actions), `MyListingsPage.jsx`, `ListingCard.jsx`, `ListingGrid.jsx`, and `ListingFilters.jsx`. |

---

## What is NOT Included (Planned for Later Weeks / Owned by Teammates)

The following areas are intentionally out of scope for this PR per the team plan:
- **Category navigation UI components:** Dedicated megamenu or taxonomy browser (NS, Weeks 8–9). Only the plain category `<select>` in the form and filter chips in the browse page are included.
- **Listing-to-rental coordination:** Live transaction states, rental agreement approval, and QR handover (owned by Charmi Bhayani, Weeks 8–9). Clean integration hooks are provided.
- **AI-assisted listing suggestions:** Automated price recommendations or tags from FastAPI / Groq (owned by Heer Mehta, Weeks 9–11). A clean interface hook and feature-flagged UI placeholder (`VITE_FEATURE_AI_SUGGESTIONS`) are provided.
- **Advanced search & wishlist:** Saved searches, alert triggers, and wishlist UI (owned by Heer Shah).
- **Authentication & RBAC:** Auth tokens, payment processing, user registration (owned by Dhrumil Doshi).
- **Admin moderation dashboard:** Admin approval queues and dispute resolution (owned by Kajal Varlani).
- **End-to-end multi-user workflow tests:** Buy/sell/rent handover workflows (Weeks 11–13).

---

## How to Run and Test

### 1. Backend Verification
```bash
cd backend
npm install

# Run teammate test suite (node:test)
npm test

# Run marketplace module test suite (Jest - 39 tests)
npm run test:marketplace

# Run automated end-to-end HTTP smoke test
npm run smoke:marketplace

# Seed categories
npm run seed:categories

# Start backend server
npm start
```

### 2. Frontend Verification
```bash
cd Frontend
npm install

# Run component test suite (Vitest - 5 tests)
npm test -- --run

# Build production bundle
npm run build

# Start frontend dev server
npm run dev
```

---

## Shared Files Changed

| File | Owner | Nature of Change & Rationale |
|---|---|---|
| `backend/src/app.js` | Team | Mounted marketplace routes (`/api/v1/categories`, `/api/v1/listings`) alongside existing team routes. |
| `backend/package.json` & `lock` | Team | Added scripts (`test:marketplace`, `smoke:marketplace`, `seed:categories`) and dependencies (`multer`, `sharp`, `cloudinary`, `jest`, `supertest`, `mongodb-memory-server`). Merged cleanly with teammate dependencies (`node-cron`, `qrcode`, `uuid`). |
| `backend/.env.example` | Team | Added documentation for marketplace environment variables with safe defaults. |
| `backend/src/models/Category.js` | Deep Boghara | Enhanced category schema with `icon`, `parent`, and `sortOrder` while preserving Deep's `requiresModeration`, `description`, `name`, `slug`, and `isActive`. |
| `backend/src/models/Listing.js` | Deep Boghara | Added listing attributes for `sell`, `rent`, `exchange`, `giveaway`, images array, and status machine. Added `alias: 'seller'` and virtual `seller` referencing `owner` to ensure 100% backward compatibility with Charmi's rental/transaction controllers (`listing.seller`). Added `rejectionReason`, `moderatedBy`, and `moderatedAt` for Kajal's admin moderation. |
| `.gitignore` | DevOps | Added `uploads/`, `dist/`, `.mongo-uri.txt`, and `coverage/` to protect repository cleanliness. |
| `Frontend/` (Scaffold) | Team | Hosted React + Vite frontend with all marketplace components cleanly isolated in `Frontend/src/features/marketplace/`. Existing mockups in `Frontend/UI-UX Mockups/` were preserved intact. |

---

## Integration Seams for Teammates

1. **Authentication Seam (`backend/src/services/integration/auth.adapter.js`)**:
   - Re-exports Dhrumil's `protect` middleware from `middlewares/authMiddleware.js`.
   - Populates `req.user.id` / `req.user._id` and `req.user.role`.
   - Dev-only fallback header `x-dev-user` is disabled when `NODE_ENV=production`.
2. **Rental Module Seam (`backend/src/services/integration/rental.hook.js`)**:
   - Exposes `getRentableListing(listingId)` to verify item is active and rentable.
   - Exposes `markStatus(listingId, status, actorId)` for transitions (`active ↔ rented`).
3. **AI Recommendation Seam (`backend/src/services/integration/ai.hook.js`)**:
   - Clean async hook `getListingSuggestions({ title, description, category })` ready for Heer Mehta's FastAPI microservice.
4. **Chat & Search Seams**:
   - Public listing payloads sanitize owner contact information and project `owner: { _id, name, avatar }` for Heer Shah's chat initiating.
   - Full text indexes on `title`, `description`, and `tags` ready for Heer Shah's search engine.

---

## Test Results

- **Backend Marketplace Tests:** 39 passed / 39 total (100% pass)
- **Backend Smoke Test:** 7/7 steps passed (100% pass)
- **Teammate Backend Tests:** 8 passed / 8 total (100% pass)
- **Frontend Vitest Tests:** 5 passed / 5 total (100% pass)
- **Frontend Production Build:** Successful (0 errors, 0 warnings)

---

## Screenshots Checklist
- [x] Create listing form displaying Sell, Rent, Exchange, and Giveaway type toggles.
- [x] Multi-image uploader displaying drag-and-drop zone, thumbnail previews, and primary badge.
- [x] Public browsing catalog with filter sidebar, quick chips, and price range filters.
- [x] Listing detail page showing image gallery, condition badges, and owner action buttons.
- [x] "My Listings" management dashboard displaying items across all lifecycle statuses.
- [x] Mobile viewport responsive layout (~360px) showing stacked filters and navigation.

---

## Reviewer Checklist
- [ ] Confirm no `.env`, build artifacts, or uploads are committed.
- [ ] Verify `npm run test:marketplace` passes on local machine.
- [ ] Verify `npm test` passes without regression to teammate modules.
- [ ] Check backward compatibility of `listing.seller` in rental and transaction flows.
