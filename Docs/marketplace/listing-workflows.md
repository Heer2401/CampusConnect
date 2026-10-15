# Listing Workflows

## Actors
- **Owner (Seller/Lender/Giver/Exchanger):** Creates and manages listings.
- **Buyer/Renter/Receiver:** Browses listings, initiates transactions.
- **Admin:** Moderates listings.

## Lifecycle Statuses
draft ? pending_approval / ctive ? rchived (Owner can transition these)
ctive ? eserved ? sold / ented / exchanged / given_away (Via markStatus() from external modules)
ejected (From pending_approval via moderation)

## Workflows
1. **Sell:** Owner posts with fixed price. Status: ctive ? eserved ? sold.
2. **Buy:** Buyer browses ctive listings and starts transaction (transaction logic handled by others).
3. **Rent:** Owner posts with entalRate, entalPeriod, deposit. Status: ctive ? ented ? ctive.
4. **Exchange:** Owner posts with exchangeFor. Status: ctive ? exchanged.
5. **Giveaway:** Owner posts with no price. Status: ctive ? given_away.

## Inter-module Interactions
- **Transactions/Payments:** Read listing data; call markStatus when starting/finishing a transaction.
- **Rentals:** Call getRentableListing to get rental details.
- **Moderation:** Write to moderation field; approve/reject moves from pending_approval to ctive or ejected.
- **AI:** Will use iMeta and provide getListingSuggestions.
