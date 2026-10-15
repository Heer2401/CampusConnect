# CampusConnect Marketplace & Listing Management API Contract

Base URL: `/api/v1`

All responses follow the unified envelope:
```json
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 12, "total": 45, "totalPages": 4 } // optional for paginated collections
}

// Error Response
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Detailed error message",
    "details": {} // optional
  }
}
```

---

## 1. Categories (`/api/v1/categories`)

### `GET /api/v1/categories`
- **Access:** Public
- **Query Params:**
  - `includeInactive` (boolean, default: `false`) — include inactive categories.
  - `tree` (boolean, default: `false`) — returns hierarchical category structure.
- **Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Books & Textbooks",
      "slug": "books-textbooks",
      "description": "Course materials and reference books",
      "icon": "book",
      "parent": null,
      "isActive": true,
      "sortOrder": 1,
      "listingCount": 18
    }
  ]
}
```

### `GET /api/v1/categories/:idOrSlug`
- **Access:** Public
- **Path Params:** `idOrSlug` (Mongo ObjectId or category slug string)
- **Success (200):** Category object
- **Errors:** 404 (Category not found)

### `POST /api/v1/categories`
- **Access:** Admin only (`Authorization: Bearer <jwt>`)
- **Body:** `{ "name": "Lab Equipment", "slug": "lab-equipment", "description": "...", "sortOrder": 5 }`
- **Success (201):** Created category
- **Errors:** 401 (Unauthorized), 403 (Forbidden), 409 (Duplicate name or slug)

### `PATCH /api/v1/categories/:id`
- **Access:** Admin only
- **Body:** Whitelisted category fields to update
- **Success (200):** Updated category

### `DELETE /api/v1/categories/:id`
- **Access:** Admin only
- **Success (200):** `{ "success": true, "data": {} }`
- **Errors:** 409 (Conflict: category is in use by active listings. Set `isActive=false` instead).

---

## 2. Listings (`/api/v1/listings`)

### Listing Types & Model Rules

| Listing Type | Required Fields | Forbidden Fields | Initial Status |
|--------------|-----------------|------------------|----------------|
| `sell` | `price > 0` | `rentalRate`, `rentalPeriod`, `deposit`, `exchangeFor` | `active` / `pending_approval` |
| `rent` | `rentalRate > 0`, `rentalPeriod` (`day\|week\|month`) | `price`, `exchangeFor` | `active` / `pending_approval` |
| `exchange` | `exchangeFor` (3–300 chars) | `price`, `rentalRate`, `rentalPeriod`, `deposit` | `active` / `pending_approval` |
| `giveaway` | `price == 0` or omitted | `rentalRate`, `rentalPeriod`, `deposit`, `exchangeFor` | `active` / `pending_approval` |

### Allowed Lifecycle Statuses
- `draft` ↔ `pending_approval` / `active` ↔ `archived`
- `active` → `reserved` → `sold` / `rented` / `exchanged` / `given_away`
- `pending_approval` → `rejected`

---

### `POST /api/v1/listings`
- **Access:** Authenticated students (`Authorization: Bearer <jwt>`)
- **Body (Sell Example):**
```json
{
  "title": "Introduction to Algorithms (CLRS 3rd Ed.)",
  "description": "Clean condition, no missing pages, used for CS201.",
  "category": "64f1a2b3c4d5e6f7a8b9c0d1",
  "listingType": "sell",
  "price": 600,
  "condition": "good",
  "tags": ["algorithms", "cs201", "clrs"],
  "pickupLocation": "Hostel Block C Lobby",
  "quantity": 1
}
```
- **Success (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64f1c9d8a1b2c3d4e5f6a7b8",
    "title": "Introduction to Algorithms (CLRS 3rd Ed.)",
    "listingType": "sell",
    "price": 600,
    "owner": "64f1b8a7...",
    "status": "active",
    "viewCount": 0,
    "isDeleted": false,
    "createdAt": "2026-10-13T10:00:00.000Z"
  }
}
```
- **Errors:** 400 (Validation failure), 401 (Unauthenticated)

### `GET /api/v1/listings`
- **Access:** Public
- **Query Params:**
  - `page` (int, default: 1)
  - `limit` (int, default: 12, max: 50)
  - `category` (category ID or slug)
  - `listingType` (`sell` | `rent` | `exchange` | `giveaway`)
  - `condition` (`new` | `like_new` | `good` | `fair` | `poor`)
  - `minPrice`, `maxPrice` (numbers)
  - `q` (search string matching title, description, or tags)
  - `sort` (`newest` | `oldest` | `price_asc` | `price_desc`)
- **Success (200):** Paginated listing results. Owner field projected only with `{ _id, name, avatar }` (email/phone never exposed).

### `GET /api/v1/listings/mine`
- **Access:** Authenticated user
- **Query Params:** `status`, `page`, `limit`
- **Success (200):** Paginated list of caller's own listings in all statuses.

### `GET /api/v1/listings/:id`
- **Access:** Public for public statuses; draft/rejected visible only to owner or admin.
- **Success (200):** Complete listing object. Automatically increments `viewCount` for non-owners.
- **Errors:** 400 (Invalid ID), 403 (Forbidden), 404 (Not found or deleted).

### `PATCH /api/v1/listings/:id`
- **Access:** Owner or Admin
- **Body:** Whitelisted fields (`title`, `description`, `category`, `listingType`, `price`, `rentalRate`, `rentalPeriod`, `deposit`, `exchangeFor`, `condition`, `tags`, `pickupLocation`, `quantity`)
- **Note:** Switching `listingType` clears fields belonging to the previous type.
- **Success (200):** Updated listing document.

### `DELETE /api/v1/listings/:id`
- **Access:** Owner or Admin
- **Behavior:** Soft delete (`isDeleted: true`, `deletedAt: new Date()`). Triggers image cleanup in storage.
- **Errors:** 409 Conflict if status is `reserved` or `rented` (active transaction).

---

## 3. Images (`/api/v1/listings/:id/images`)

### `POST /api/v1/listings/:id/images`
- **Access:** Owner only
- **Content-Type:** `multipart/form-data`
- **Body:** `images` (1 to 6 files per request; total per listing <= 6)
- **Validation:** Max 5MB per file; magic bytes check (JPEG `ffd8`, PNG `89504e47`, WebP `52494646`). EXIF stripped; resized to WebP (1600px main, 400px thumb).
- **Success (201):** Updated `images` array. First uploaded image automatically set as `isPrimary: true`.

### `DELETE /api/v1/listings/:id/images/:imageId`
- **Access:** Owner only
- **Success (200):** Updated `images` array. Promotes next image as primary if primary was deleted.

### `PATCH /api/v1/listings/:id/images/order`
- **Access:** Owner only
- **Body:** `{ "order": ["<imageId1>", "<imageId2>"], "primaryImageId": "<imageId1>" }`
- **Success (200):** Reordered images.

---

## 4. Integration Contracts & Seams

### AI Listing Assistance Hook (`integration/ai.hook.js`)
Future contract signature from Heer Mehta's module:
```javascript
getListingSuggestions(draft: { title?: string, description?: string, imageBuffer?: Buffer })
// Output:
{
  suggestedTitle: string,
  suggestedDescription: string,
  suggestedCategory: string,
  suggestedPrice: number,
  confidence: number
}
```

### Rentals Integration Hook (`integration/rental.hook.js`)
For Charmi Bhayani's rental module:
- `getRentableListing(id)`: Returns listing if `listingType === 'rent'` and `status === 'active'`.
- `markStatus(id, newStatus, { actorId })`: Transitions listing status through allowed state machine.
