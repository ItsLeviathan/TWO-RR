# TWO RR Coffee Shop — Full Interactive Website + POS System

## PROJECT OVERVIEW

Build a complete, production-ready web application for **TWO RR**, a coffee shop.

This project is NOT just a landing page.

It is a combined:

1. Interactive customer-facing coffee shop website
2. Digital menu
3. Customer ordering/cart system
4. Owner/admin dashboard
5. Point-of-Sale (POS) system
6. Order management system
7. Menu/product management system
8. Sales reporting system
9. Receipt printing system

The entire application should feel like one cohesive TWO RR product.

The project will be deployed using **Vercel**, so the architecture must be suitable for Vercel deployment and serverless/full-stack hosting.

---

# 1. FIRST STEP — INSPECT THE PROJECT

Before writing significant code:

* Inspect the entire existing project directory.
* Inspect all existing files.
* Inspect the provided TWO RR logo and image assets.
* Identify the logo file(s), dimensions, formats, transparent backgrounds, and available image assets.
* Do NOT recreate the TWO RR logo manually if the real logo asset is available.
* Use the actual supplied TWO RR branding assets.

If there are existing files or code, do not blindly replace them.

Understand what already exists first, then build on top of it where appropriate.

---

# 2. BRANDING & VISUAL IDENTITY

The provided **TWO RR logo is the primary source of truth for the visual identity**.

Do not use a generic coffee-shop template.

Analyze the logo and derive:

* Primary color
* Secondary color
* Accent color
* Background colors
* Typography direction
* Border style
* Button style
* Card styling
* Spacing
* Overall visual mood
* Decorative elements

The website should feel like it was specifically designed for TWO RR.

Do NOT make it look like a generic Starbucks-style website.

Do NOT randomly use coffee-brown colors unless they actually complement the supplied TWO RR branding.

The visual language should be:

* Modern
* Premium
* Warm
* Memorable
* Clean
* Interactive
* Sophisticated
* Approachable
* Mobile-friendly

Use animation intentionally.

Avoid excessive animations that make the website feel like a template or hurt performance.

---

# 3. TECH STACK

Use a modern stack suitable for Vercel.

Preferred:

* Next.js
* TypeScript
* React
* Tailwind CSS
* Modern component architecture
* Responsive design
* Server-side/serverless functionality where appropriate
* Database-backed data
* Secure authentication
* Vercel-compatible APIs

Use the latest stable versions that are compatible with the project environment.

Do not introduce unnecessary dependencies.

Keep the architecture maintainable.

---

# 4. APPLICATION STRUCTURE

The application has two major experiences:

## PUBLIC EXPERIENCE

```text
TWO RR
│
├── Home
├── About
├── Menu
├── Gallery
├── Cart
├── Checkout
└── Contact / Location
```

## OWNER EXPERIENCE

```text
Owner
│
├── Login
├── Dashboard
├── POS
├── Orders
├── Menu Management
├── Products
├── Inventory
├── Reports
└── Settings
```

The customer-facing website and owner system should share the same TWO RR branding but should NOT have identical interfaces.

The public website should be visually immersive.

The POS should prioritize:

* Speed
* Clarity
* Large controls
* Minimal clicks
* Easy order entry
* Easy payment handling

---

# 5. PUBLIC WEBSITE

## HOME PAGE

Create an impressive interactive hero section.

The hero should immediately communicate:

* TWO RR
* Coffee shop identity
* A short brand message
* Strong visual identity
* Primary action to view the menu
* Secondary action to learn about TWO RR

Use the actual TWO RR logo.

Do not make the hero overly complicated.

The first viewport should look polished and intentional.

Possible structure:

```text
[ TWO RR LOGO ]

TWO RR

Coffee / Food / Experience

[ Explore Menu ]
[ Discover TWO RR ]

        Visual / Product / Brand imagery
```

The exact copy should be appropriate for the actual shop and should not invent claims that were not provided.

---

# 6. INTERACTIVE DESIGN

The website should feel alive.

Use tasteful:

* Scroll animations
* Reveal animations
* Image transitions
* Hover states
* Micro-interactions
* Smooth page transitions
* Menu filtering animations
* Cart animations
* Button feedback

Respect:

```text
prefers-reduced-motion
```

Animations must never interfere with usability.

Avoid:

* Excessive parallax
* Constant movement
* Huge loading animations
* Slow page transitions
* Gimmicky effects

Performance comes first.

---

# 7. ABOUT SECTION

Create an attractive section introducing TWO RR.

The design should allow the actual coffee shop story to be inserted later.

Do not invent a fake history.

Use placeholder copy only when actual information is unavailable.

Structure the section so the owner can easily replace:

* Story
* Mission
* Description
* Brand message

---

# 8. GALLERY / SHOP EXPERIENCE

Create a visual gallery section for:

* Coffee
* Food
* Interior
* Exterior
* Staff
* Shop atmosphere

Use supplied images when available.

If images are missing, build the component so images can easily be added later.

Do not use random stock imagery as if it represents TWO RR.

If placeholder images are necessary during development, clearly structure them as replaceable assets.

---

# 9. MENU

Create a fully interactive digital menu.

Categories should be database-driven rather than hardcoded.

Example:

```text
All
Coffee
Non-Coffee
Food
Pastries
Specials
```

The exact categories should be editable by the owner.

Each product should display:

* Product image
* Product name
* Description
* Price
* Category
* Availability
* Optional variants
* Optional add-ons

Example:

```text
Iced Spanish Latte

Espresso, milk, and Spanish-style sweetness.

₱120

[ Add to Order ]
```

Do not hardcode products permanently.

The menu must use database data.

---

# 10. PRODUCT DETAILS

When a customer selects a product, show a polished product detail interface.

Include:

* Large product image
* Name
* Description
* Price
* Quantity
* Available options
* Add-ons if configured
* Total price
* Add to cart

Example:

```text
Iced Spanish Latte

₱120

Size
○ Regular
○ Large

Add-ons
□ Extra Shot +₱30
□ Oat Milk +₱20

Quantity
[-] 1 [+]

Total: ₱150

[ Add to Order ]
```

Only display options that are actually configured for the product.

---

# 11. CUSTOMER CART

Create a persistent cart during the current session.

Display:

```text
Your Order

Iced Spanish Latte
1 × ₱120

Croissant
2 × ₱90

----------------

Subtotal     ₱300
Total        ₱300

[ Checkout ]
```

Allow:

* Increase quantity
* Decrease quantity
* Remove item
* Modify product options
* Clear cart

The cart should update immediately.

---

# 12. CUSTOMER CHECKOUT

Create a simple checkout process.

Avoid unnecessary fields.

Support:

* Customer name
* Order type
* Optional notes

Order types:

* Dine-in
* Takeout
* Pickup

Payment methods may include:

* Cash
* GCash
* Card

Payment processing should be designed so it can be connected to actual payment providers later.

Do NOT fake successful online payments.

For MVP, payment status can be recorded according to the selected method and POS workflow.

---

# 13. ORDER CONFIRMATION

After an order is submitted:

Show:

```text
Order Received

Order #1024

Thank you for ordering from TWO RR.

Your order is being prepared.

[ View Order ]
[ Back to TWO RR ]
```

Generate a unique order number.

---

# 14. OWNER AUTHENTICATION

Create a secure owner/admin authentication system.

The owner should NOT access the POS through a public unprotected URL.

Provide:

```text
TWO RR

Owner Login

Email
Password

[ Sign In ]
```

Use secure authentication.

Do not store passwords as plain text.

Protect all admin/POS routes.

Unauthorized users should be redirected away from the owner system.

---

# 15. OWNER DASHBOARD

Create a clean admin dashboard.

Display useful information:

```text
Good morning

Today's Sales
₱8,420

Orders
47

Average Order
₱179

Best Seller
Iced Spanish Latte
```

Also include recent orders.

Example:

```text
Recent Orders

#1047    ₱320    Completed
#1046    ₱180    Preparing
#1045    ₱420    Completed
#1044    ₱150    Pending
```

Keep the dashboard useful rather than filling it with meaningless statistics.

---

# 16. POS SYSTEM

This is one of the most important parts of the project.

Create a dedicated POS interface.

The POS should be optimized for desktop/tablet use.

Suggested layout:

```text
┌─────────────────────────────────────────────┐
│ TWO RR POS                         Admin    │
├───────────────────────┬─────────────────────┤
│ Categories            │ Current Order       │
│                       │                     │
│ Coffee                │ Iced Latte    ₱120 │
│ Non-Coffee            │ Croissant      ₱90 │
│ Food                  │                     │
│ Pastries              │---------------------│
│ Specials              │ Subtotal      ₱210 │
│                       │                     │
│ [Product] [Product]   │ TOTAL         ₱210 │
│ [Product] [Product]   │                     │
│ [Product] [Product]   │ [ Charge ₱210 ]    │
└───────────────────────┴─────────────────────┘
```

Products should be selectable quickly.

Use large touch-friendly buttons.

---

# 17. POS ORDER CREATION

Staff should be able to:

1. Select product
2. Select options
3. Set quantity
4. Add to current order
5. Modify/remove items
6. Select order type
7. Select payment method
8. Enter payment amount if cash
9. Complete the transaction
10. Print receipt

Minimize unnecessary steps.

---

# 18. CASH PAYMENT

For cash payments:

```text
Total
₱250

Cash Received
₱500

Change
₱250

[ Complete Sale ]
```

Do not allow completion when the received amount is lower than the total.

Display a clear validation message.

Calculate change automatically.

Never show:

* NaN
* Infinity
* Undefined
* Negative change caused by invalid input

---

# 19. PAYMENT TYPES

Support:

```text
Cash
GCash
Card
```

Payment methods should be configurable.

For GCash/Card:

* Record the selected payment method
* Record payment status
* Do not claim an external payment succeeded unless a real payment provider confirms it.

---

# 20. ORDER STATUS

Orders should have statuses such as:

```text
Pending
Preparing
Ready
Completed
Cancelled
```

The owner should be able to update the status.

Customers should be able to see the relevant status when applicable.

---

# 21. MENU MANAGEMENT

Create an owner interface for managing the menu.

Owner actions:

```text
Products
├── Add Product
├── Edit Product
├── Delete Product
├── Change Price
├── Change Image
├── Change Category
├── Toggle Availability
└── Manage Options
```

Product fields:

* Name
* Description
* Price
* Category
* Image
* Availability
* SKU/reference if useful
* Options
* Add-ons

---

# 22. CATEGORY MANAGEMENT

Allow the owner to:

* Add category
* Rename category
* Delete category
* Reorder categories
* Enable/disable category

Do not make categories permanently hardcoded.

---

# 23. INVENTORY

Include a simple inventory system if the product has inventory tracking enabled.

Example:

```text
Iced Spanish Latte
Stock: 18
Status: In Stock
```

When an order is completed, inventory should update correctly.

Support:

```text
In Stock
Low Stock
Out of Stock
```

Products can also be configured to not use inventory tracking.

Do not force inventory tracking on products that do not need it.

---

# 24. REPORTS

Create an owner reports page.

Useful metrics:

* Today's sales
* Weekly sales
* Monthly sales
* Total orders
* Average order value
* Best-selling products
* Best-selling categories
* Payment method breakdown

Use clear charts only when they provide useful information.

Do not create decorative charts with fake data.

Reports must use real database records.

---

# 25. RECEIPT SYSTEM

Create a professional receipt layout optimized for thermal receipt printers.

Receipt example:

```text
              TWO RR
        COFFEE SHOP

Order #1047
October 5, 2026
3:42 PM

----------------------------
1 × Iced Spanish Latte
                ₱120.00

2 × Croissant
                ₱180.00
----------------------------

Subtotal        ₱300.00
TOTAL           ₱300.00

Payment: Cash
Cash:           ₱500.00
Change:         ₱200.00

Thank you for visiting
TWO RR!
```

The receipt should use the actual TWO RR business information when provided.

Do not invent:

* Address
* Phone number
* Business registration number
* Tax information
* Contact information

Create settings where the owner can configure these.

---

# 26. PRINT RECEIPT

Implement browser-based printing.

Create a dedicated print stylesheet:

```text
@media print
```

The printed result should:

* Hide the application UI
* Show only the receipt
* Use receipt-friendly typography
* Avoid unnecessary margins
* Fit common thermal printer widths
* Work with normal browser printing

Provide:

```text
[ Print Receipt ]
```

After successful order completion.

If possible, structure the receipt so it can also work with common 58mm/80mm thermal printers through the browser's print dialog.

Do not claim direct hardware integration unless it is actually implemented.

---

# 27. ORDER HISTORY

Owner should be able to view previous orders.

Include:

* Order number
* Date/time
* Items
* Total
* Payment method
* Order type
* Status

Allow searching/filtering by:

* Order number
* Date
* Status
* Payment method

---

# 28. DATABASE

Use a proper relational database structure.

At minimum, design tables/models for:

```text
User
Category
Product
ProductOption
ProductAddon
Order
OrderItem
Payment
Inventory
BusinessSettings
```

Add other models only when necessary.

Relationships must be properly designed.

Do not duplicate data unnecessarily.

---

# 29. DATA INTEGRITY

The POS must be reliable.

Prevent:

* Duplicate order creation
* Negative quantities
* Negative prices
* Invalid payment amounts
* Orders with zero/invalid totals
* Invalid product IDs
* Purchasing unavailable products
* Inventory becoming incorrectly negative
* Unauthorized admin actions

Validate both client-side and server-side.

Never trust frontend validation alone.

---

# 30. SECURITY

Implement reasonable production security.

Protect:

* Admin routes
* POS routes
* Database operations
* Authentication
* Sensitive configuration

Never expose:

* Database credentials
* Secret API keys
* Service-role keys
* Private environment variables

Never place secrets in client-side code.

Use environment variables.

---

# 31. VERCEL DEPLOYMENT

The project must be designed specifically for Vercel.

Prepare:

```text
.env.local
```

for local development.

Document required environment variables.

Do not hardcode secrets.

Ensure:

* Build works
* Production build works
* Server-side functionality is Vercel-compatible
* API routes/server actions are Vercel-compatible
* Static assets work correctly
* Image handling is compatible with the deployment environment

Do not depend on a local filesystem for permanent database storage.

Do not store permanent uploaded images directly on the Vercel server filesystem.

Use appropriate external storage/database architecture.

---

# 32. IMAGE STORAGE

Product and gallery images should be stored using a proper persistent storage solution.

The architecture should support replacing images without changing application code.

Do not permanently rely on:

```text
/public/uploads
```

for user-uploaded production content.

Static bundled assets may remain in the project when appropriate.

---

# 33. RESPONSIVE DESIGN

The public website must work beautifully on:

* Mobile
* Tablet
* Laptop
* Desktop
* Large desktop displays

The POS should work especially well on:

* Desktop
* Laptop
* Tablet

Do not simply shrink the desktop layout.

Re-design layouts where necessary.

At small widths:

* Navigation should collapse
* Cards should reflow
* Menu grids should adapt
* Cart should become a drawer/page
* Text should remain readable
* Buttons should remain touch-friendly

Never create accidental horizontal page scrolling.

---

# 34. NAVIGATION

Create an intuitive public navigation.

Possible:

```text
TWO RR logo

Home
About
Menu
Gallery
Contact

[ Order Now ]
```

The exact navigation should be based on the final design.

On mobile, use a clean mobile navigation pattern.

Do not overcrowd the navbar.

---

# 35. LOADING EXPERIENCE

Create a polished loading experience.

The application should not show a blank screen while important data is loading.

Use appropriate:

* Skeletons
* Loading indicators
* Initial app loading states

The loading screen should disappear only when the required application dependencies/data are ready.

Do not artificially delay loading just to show an animation.

---

# 36. ERROR STATES

Design proper error states.

Examples:

```text
Something went wrong.

We couldn't load the menu.

[ Try Again ]
```

For POS:

```text
Unable to complete the order.

Please check your connection and try again.
```

Errors should be understandable to normal users.

Do not expose stack traces or internal database errors.

---

# 37. EMPTY STATES

Create useful empty states.

Examples:

```text
Your cart is empty.

Browse the TWO RR menu and add something you love.

[ Browse Menu ]
```

Admin:

```text
No orders yet.

Orders will appear here after customers place them.
```

---

# 38. ACCESSIBILITY

Use:

* Semantic HTML
* Proper buttons
* Labels
* Keyboard navigation
* Focus states
* Sufficient contrast
* Accessible forms
* Meaningful alt text
* ARIA only when necessary

Do not use clickable `<div>` elements when a button or link is appropriate.

---

# 39. PERFORMANCE

Performance is important.

Optimize:

* Images
* Fonts
* JavaScript
* Animations
* Database queries
* API calls

Use lazy loading where appropriate.

Avoid unnecessary client-side rendering.

Do not load huge assets unnecessarily.

The interactive website should still feel fast on average mobile connections.

---

# 40. UI DETAILS

Avoid generic SaaS dashboard aesthetics.

The public website should feel like a real coffee brand.

The POS/dashboard can be more functional, but should still clearly belong to TWO RR.

Use:

* Strong typography
* Intentional spacing
* Elegant cards
* Good hierarchy
* Refined buttons
* Subtle borders
* Tasteful transitions
* Consistent radius
* Consistent spacing system

Do not use excessive:

* Gradients
* Glassmorphism
* Neon colors
* Floating blobs
* Random shapes
* Huge text everywhere
* Excessive shadows

Everything should have a design reason.

---

# 41. COMPONENT ARCHITECTURE

Build reusable components.

Example:

```text
components/
├── branding/
├── navigation/
├── hero/
├── menu/
├── products/
├── cart/
├── checkout/
├── orders/
├── pos/
├── receipt/
├── dashboard/
├── forms/
├── charts/
└── ui/
```

Keep components focused.

Do not create one enormous component containing the entire application.

---

# 42. PUBLIC ROUTES

Suggested structure:

```text
/
 /about
 /menu
 /menu/[product]
 /cart
 /checkout
 /order/[id]
 /gallery
 /contact
```

---

# 43. OWNER ROUTES

Suggested structure:

```text
/admin/login
/admin
/admin/pos
/admin/orders
/admin/orders/[id]
/admin/products
/admin/categories
/admin/inventory
/admin/reports
/admin/settings
```

Protect all relevant routes.

---

# 44. MOBILE POS

The POS should still be usable on tablets.

On smaller screens:

```text
Products
   ↓
Current Order
   ↓
Checkout
```

Use drawers or sheets where appropriate.

Do not cram the desktop POS into a tiny screen.

---

# 45. ADMIN SETTINGS

Create business settings for:

* TWO RR logo
* Business name
* Address
* Phone
* Social links
* Receipt footer
* Currency
* Receipt settings
* Payment methods
* Order settings

Do not hardcode business information that the owner should be able to modify.

---

# 46. CURRENCY

Use Philippine Peso:

```text
₱
```

Prices should be stored numerically and formatted consistently.

Example:

```text
₱120.00
```

Avoid floating-point calculation errors where possible.

For financial calculations, use a reliable money representation strategy.

---

# 47. NO FAKE FUNCTIONALITY

This is extremely important.

Do NOT create buttons that appear functional but do nothing.

Do NOT create fake:

* Checkout
* Payment
* Reports
* Authentication
* POS transactions
* Inventory
* Database operations

If a feature is not implemented yet, either:

1. Implement it properly, or
2. Clearly mark it as unavailable/development-only.

Do not pretend something works.

---

# 48. DEVELOPMENT PROCESS

Work incrementally.

First:

1. Inspect project
2. Identify logo/assets
3. Establish design system
4. Establish architecture
5. Set up database
6. Build public website
7. Build menu
8. Build cart
9. Build checkout
10. Build authentication
11. Build admin
12. Build POS
13. Build orders
14. Build inventory
15. Build reports
16. Build receipts
17. Add printing
18. Test responsive layouts
19. Test edge cases
20. Prepare Vercel deployment

Do not attempt to make every feature visually complex at once.

Get the architecture and core functionality correct first.

---

# 49. TESTING

Before considering the project complete, test:

## Public

* Homepage loads
* Navigation works
* Menu loads
* Categories work
* Product details work
* Cart works
* Checkout works
* Order creation works
* Order confirmation works

## POS

* Product selection
* Quantity changes
* Product removal
* Order totals
* Cash payment
* Change calculation
* GCash/Card recording
* Order completion
* Duplicate submission prevention
* Receipt generation
* Receipt printing

## Admin

* Login
* Logout
* Protected routes
* Product creation
* Product editing
* Product deletion
* Category management
* Availability toggles
* Order management
* Inventory
* Reports
* Settings

## Responsive

Test at:

```text
320px
375px
390px
768px
1024px
1440px
1920px
```

---

# 50. FINAL QUALITY STANDARD

The final result should feel like a **real coffee shop digital platform**, not a school project template.

It should be something that can realistically be shown to the TWO RR owner.

The customer experience should make people want to explore the coffee shop.

The POS should make the owner's daily workflow easier.

The design should be distinctive and based on the real TWO RR branding.

The system should be maintainable and deployable on Vercel.

Prioritize:

```text
Brand identity
UX
Reliability
Performance
Security
Responsiveness
Maintainability
```

over unnecessary visual effects.

---

# IMPORTANT FINAL INSTRUCTION

Before finishing:

* Inspect the entire application for broken links.
* Inspect every button.
* Inspect every form.
* Inspect every API/database operation.
* Inspect every route.
* Inspect authentication protection.
* Inspect mobile layouts.
* Inspect receipt printing.
* Inspect calculations.
* Inspect loading states.
* Inspect error states.
* Inspect empty states.
* Remove unused code.
* Remove placeholder functionality that looks finished but is not functional.
* Fix console errors.
* Fix TypeScript errors.
* Fix lint errors where applicable.
* Run the production build.
* Make sure the project is actually ready for Vercel deployment.

Do not stop after creating the UI.

The objective is a **working TWO RR coffee shop platform with a polished public website and functional owner POS system.**
