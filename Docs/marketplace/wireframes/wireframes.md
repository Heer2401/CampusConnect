# CampusConnect Marketplace Wireframes & UI Specifications

The UI design follows the approved mockups located in `Frontend/UI-UX Mockups/` (`02_browse.html`, `03_create_listing.html`, and `style.css`).

---

## 1. Screen A: Listing Creation & Management (`CreateListingPage` / `EditListingPage`)

### Layout & Component Structure
```
+-------------------------------------------------------------------------------+
| Topbar: [● CampusConnect]   [Browse] [New Listing*] [Chats] [Rentals]  (Avatar)|
+-------------------------------------------------------------------------------+
| Create a New Listing / Edit Listing                                           |
| Upload photos and fill in listing details.                                    |
|                                                                               |
| +-----------------------------------+ +-------------------------------------+ |
| | ImageUploader                     | | ListingForm                         | |
| | [⬆️ Drag photos here or click]   | | Title: [__________________________] | |
| | Previews: [Img 1] [Img 2] [Img 3] | | Category: [Select Category ▼]       | |
| | (Set Primary, Delete, Reorder)    | | Listing Type: (Sell/Rent/Exch/Give) | |
| |                                   | | Price / Rates:                      | |
| | [✨ AI Suggestion Slot (Flagged)] | |   - Sell: Price [₹ ______]          | |
| | (Hidden under feature flag)       | |   - Rent: Rate [₹ ___] Period [Day] | |
| |                                   | |   - Exchange: Exchange For [______] | |
| |                                   | |   - Giveaway: Free (₹0)             | |
| |                                   | | Condition: [Select Condition ▼]     | |
| |                                   | | Tags: [chips: cs101, math x]        | |
| |                                   | | Pickup Location: [Hostel Lobby]     | |
| |                                   | | Description: [____________________] | |
| |                                   | | [Save Draft]     [Publish Listing]  | |
| +-----------------------------------+ +-------------------------------------+ |
+-------------------------------------------------------------------------------+
```

### UI States
- **Empty / Initial:** Empty inputs, image dropzone ready.
- **Loading / Submitting:** Button disabled with spinner (`Creating listing...` / `Uploading images...`).
- **Validation Errors:** Inline red helper text under invalid fields (e.g., "Title must be 3-100 characters", "Price required for sell").
- **Success:** Toast notification and redirection to the created listing detail page.

---

## 2. Screen B: Browsing & Discovery (`BrowseListingsPage`)

### Layout & Component Structure
```
+-------------------------------------------------------------------------------+
| Topbar: [● CampusConnect]   [Browse*] [New Listing] [Chats] [Rentals]  (Avatar)|
+-------------------------------------------------------------------------------+
| Search Bar: [ Search items, e.g. 'calculus textbook' _____ ] [Search] [+ New] |
| Category Chips: [All*] [Textbooks] [Electronics] [Furniture] [Rent] [Giveaway]|
|                                                                               |
| +---------------------+ +---------------------------------------------------+ |
| | Basic Filter Bar    | | Listings Grid                                     | |
| | Category: [Any   ▼] | | +---------------+ +---------------+ +-----------+ | |
| | Type:     [Any   ▼] | | | [Image]       | | [Image]       | | [Image]   | | |
| | Condition:[Any   ▼] | | | Title...      | | Title...      | | Title...  | | |
| | Min Price:[₹ _____] | | | ₹450   [Sell] | | ₹25/wk [Rent] | | Free [Give] | |
| | Max Price:[₹ _____] | | +---------------+ +---------------+ +-----------+ | |
| | Sort:     [Newest▼] | | (Responsive 3-column grid down to 1-col on mobile)| |
| +---------------------+ | Pagination: [< Prev]  Page 1 of 4  [Next >]       | |
|                         +---------------------------------------------------+ |
+-------------------------------------------------------------------------------+
```

### UI States
- **Loading:** Skeleton grid placeholders for image cards.
- **Empty:** "No listings found matching your search. Try adjusting filters or create one!"
- **Error:** Error alert banner with retry button.
- **Active:** Interactive cards linked to `/listings/:id`.

---

## 3. Screen C: Listing Detail (`ListingDetailPage`)
- Large primary photo with thumbnail carousel selector.
- Details: Title, price/rates, category badge, condition badge, pickup location, tags.
- Seller information (name and avatar only).
- Action buttons: "Contact Seller", "Buy / Rent / Request Exchange / Claim" placeholder buttons with feature flag stubs.
- Owner controls: "Edit Listing", "Delete Listing" (with confirmation dialog).

---

## 4. Screen D: My Listings (`MyListingsPage`)
- List of current user's listings across all statuses (`draft`, `pending_approval`, `active`, `sold`, etc.).
- Status badge with color coding (`draft`: gray, `active`: green, `pending`: yellow, `sold`: blue).
- Quick actions: View, Edit, Delete (with active transaction protection).
