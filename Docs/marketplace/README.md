# CampusConnect — Marketplace & Listing Management Module

**Module Owner:** Nishka Shah (Student ID: 202512035)  
**Branch:** `feature/ns-marketplace-listings`  
**Phase:** Planning, Design, Backend, Testing, Frontend (Weeks 1–8)

---

## 1. Module Overview

The **Marketplace & Listing Management** module is the core exchange engine of **CampusConnect**. It enables campus students to create, discover, manage, and engage with items across four primary exchange models:
1. **Sell:** Peer-to-peer sale with direct pricing.
2. **Rent:** Peer-to-peer rental with flexible billing periods (`day`, `week`, `month`) and refundable security deposits.
3. **Exchange:** Barter transactions where owners specify requested items.
4. **Giveaway:** Free campus item re-homing with zero price enforcement.

All items are categorized under an administrative category hierarchy with live item counts and protected soft-deletion.

---

## 2. Completed Scope & Trello Deliverables

| # | Trello Card | Status | Documentation / Code Artifact |
|---|---|---|---|
| 1 | Define listing workflow requirements (buy, sell, rent, exchange, giveaway) | DONE | [`Docs/marketplace/listing-workflows.md`](./listing-workflows.md) |
| 2 | Design listing creation wireframe | DONE | [`Docs/marketplace/wireframes/wireframes.md`](./wireframes/wireframes.md) |
| 3 | Design browsing wireframe | DONE | [`Docs/marketplace/wireframes/wireframes.md`](./wireframes/wireframes.md) |
| 4 | Develop listing CRUD APIs (sell, rent, exchange, giveaway) | DONE | `backend/src/controllers/listingController.js`<br>`backend/src/routes/listingRoutes.js`<br>[`Docs/marketplace/api.md`](./api.md) |
| 5 | Develop category management functionality & seed script | DONE | `backend/src/controllers/categoryController.js`<br>`backend/src/utils/seedCategories.js`<br>[`Docs/marketplace/categories.md`](./categories.md) |
| 6 | Develop image upload backend & Sharp WebP processing | DONE | `backend/src/middleware/uploadMiddleware.js`<br>`backend/src/controllers/imageController.js`<br>`backend/src/services/storage/` |
| 7 | Test listing CRUD and image upload APIs | DONE | `backend/tests/marketplace/`<br>[`Docs/marketplace/test-report.md`](./test-report.md) (39/39 passing) |
| 8 | Build listing creation UI & integrate with APIs | DONE | `Frontend/src/features/marketplace/components/ListingForm.jsx`<br>`Frontend/src/features/marketplace/pages/CreateListingPage.jsx`<br>`Frontend/src/features/marketplace/pages/EditListingPage.jsx` |
| 9 | Build browsing UI for viewing and exploring listings | DONE | `Frontend/src/features/marketplace/pages/BrowseListingsPage.jsx`<br>`Frontend/src/features/marketplace/pages/ListingDetailPage.jsx`<br>`Frontend/src/features/marketplace/pages/MyListingsPage.jsx` |

---

## 3. Architecture & Code Layout

### Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── app.js                         # Mounts /api/v1/categories and /api/v1/listings
│   ├── controllers/
│   │   ├── categoryController.js      # Category listing, tree view, admin CRUD
│   │   ├── listingController.js       # Listing CRUD, type-specific validations, mine, soft-delete
│   │   └── imageController.js         # Listing image upload, delete, reordering
│   ├── models/
│   │   ├── Category.js                # Category schema (slug, name, icon, parent, sortOrder)
│   │   └── Listing.js                 # Listing schema (type fields, images, status machine)
│   ├── middleware/
│   │   └── uploadMiddleware.js        # Multer memory storage + magic byte MIME verification
│   ├── services/
│   │   ├── storage/                   # Storage abstraction (index.js, local.js, cloudinary.js)
│   │   └── integration/
│   │       ├── auth.adapter.js        # Auth seam (JWT verify, dev fallback, roles)
│   │       ├── rental.hook.js         # Rental seam (getRentableListing, markStatus)
│   │       └── ai.hook.js             # AI seam (getListingSuggestions hook)
│   └── utils/
│       └── seedCategories.js          # Idempotent 14-category seeder
└── tests/marketplace/
    ├── categories.test.js             # 12 Category integration tests
    ├── listings.test.js               # 21 Listing CRUD & filter tests
    ├── uploads.test.js                # 6 Image upload & reorder tests
    ├── smoke.js                       # End-to-end multi-step HTTP smoke test
    └── helpers/                       # In-memory MongoDB & JWT auth test helpers
```

### Frontend Structure (`Frontend/`)
```
Frontend/src/features/marketplace/
├── api/
│   ├── categoriesApi.js               # Client API wrapper for /categories
│   └── listingsApi.js                 # Client API wrapper for /listings & images
├── components/
│   ├── ListingCard.jsx                # Reusable responsive card for all 4 types
│   ├── ListingGrid.jsx                # Responsive grid container with empty states
│   ├── ListingFilters.jsx             # Filter sidebar/bar (type, category, condition, price, sort)
│   ├── ListingForm.jsx                # Multi-type form with dynamic type-specific fields
│   ├── ImageUploader.jsx              # Drag-and-drop image uploader with preview & reordering
│   ├── StatusBadge.jsx                # Status chip (active, reserved, sold, rented, etc.)
│   └── ConfirmDialog.jsx              # Accessible modal for deletion/state confirmations
├── pages/
│   ├── BrowseListingsPage.jsx         # Public discovery catalog with filters & pagination
│   ├── ListingDetailPage.jsx         # Full item detail view, image carousel, owner actions
│   ├── CreateListingPage.jsx         # Create listing page
│   ├── EditListingPage.jsx           # Edit listing page
│   └── MyListingsPage.jsx             # Owner listing dashboard (all statuses)
└── __tests__/
    ├── ListingCard.test.jsx           # RTL component tests for card rendering
    └── ListingForm.test.jsx           # RTL component tests for dynamic form fields
```

---

## 4. Environment Variables

### Backend (`backend/.env.example`)
| Variable | Default / Example | Purpose |
|---|---|---|
| `MONGODB_URI` / `MONGO_URI` | `mongodb://localhost:27017/campusconnect` | MongoDB connection URI |
| `JWT_SECRET` | `your_jwt_secret_here` | Secret for verifying JWT auth tokens |
| `LISTING_AUTO_APPROVE` | `true` | `true` in dev (immediate active), `false` in prod (requires admin approval) |
| `IMAGE_STORAGE` | `local` | Storage driver (`local` or `cloudinary`) |
| `UPLOAD_DIR` | `uploads/marketplace` | Local storage directory path |
| `MAX_IMAGE_SIZE_MB` | `5` | Maximum upload size per image in MB |
| `MAX_IMAGES_PER_LISTING` | `6` | Maximum images allowed per listing |
| `CLOUDINARY_CLOUD_NAME` | `""` | Cloudinary account name (if `IMAGE_STORAGE=cloudinary`) |
| `CLOUDINARY_API_KEY` | `""` | Cloudinary API key (if `IMAGE_STORAGE=cloudinary`) |
| `CLOUDINARY_API_SECRET` | `""` | Cloudinary API secret (if `IMAGE_STORAGE=cloudinary`) |

### Frontend (`Frontend/.env.example`)
| Variable | Default / Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Base URL for backend API calls |
| `VITE_FEATURE_AI_SUGGESTIONS` | `false` | Feature flag for AI price/tag suggestions |

---

## 5. Verification & Running Commands

### 1. Run Backend Unit & Integration Tests (39 Tests)
```bash
cd backend
npm run test:marketplace
```

### 2. Run Automated End-to-End Smoke Test
```bash
cd backend
npm run smoke:marketplace
```

### 3. Run Teammate Backend Tests (8 Tests)
```bash
cd backend
npm test
```

### 4. Run Frontend Component Tests (5 Tests)
```bash
cd Frontend
npm test -- --run
```

### 5. Build Frontend Production Bundle
```bash
cd Frontend
npm run build
```

### 6. Seed Default Categories (CLI)
```bash
cd backend
npm run seed:categories
```

---

## 6. Integration Seams & Cross-Module Contracts

1. **Authentication Seam (`backend/src/services/integration/auth.adapter.js`)**:
   - Consumes teammates' JWT bearer token headers (`req.headers.authorization`).
   - Extracts `req.user.id` / `req.user._id` and `req.user.role`.
   - In development environments without active tokens, gracefully falls back to `x-dev-user-id` to unblock local testing.
2. **Rental Module Seam (`backend/src/services/integration/rental.hook.js`)**:
   - Exposes `getRentableListing(listingId)` ensuring listing is `active` and `listingType === 'rent'`.
   - Exposes `markStatus(listingId, status, actorId)` for transitions such as `active → rented → active`.
3. **AI Module Seam (`backend/src/services/integration/ai.hook.js`)**:
   - Clean async hook `getListingSuggestions({ title, description, category })` ready for Heer Mehta's FastAPI recommendation engine.
4. **Chat & Search Seams**:
   - Public listing payloads sanitize owner contact information, providing `owner: { _id, name, avatar }` ready for Socket.io / Redis chat initiates.
   - Text search query indexing on `title`, `description`, and `tags` ready for Heer Shah's search UI.
