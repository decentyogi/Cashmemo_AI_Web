# Cashmemo Web (विशाल नर्सरी कैश मेमो)

> A standalone, 100% offline-first billing, invoicing, and customer ledger web application ported from the native Android Cashmemo application ([`Vishal_Nurshri`](https://github.com/decentyogi/Vishal_Nurshri)).

---

## 🌺 Overview

**Cashmemo Web** is a zero-backend, browser-native point-of-sale and invoicing solution crafted for nursery businesses, retail shops, and local enterprises. It faithfully preserves the iconic cultural heritage layout of the original Android app—including royal maroon ink (`#8B1527`), ornamental floral motifs, split Rupees (`रू०`) and Paise (`पै०`) ledger columns, and authentic digital signing—while providing a modern, high-productivity web workspace.

---

## ✨ Core Features Ported from Android

### 1. 🏢 Business Header & Invoice Metadata
- **Bilingual Branding:** Prominent Hindi typography (`विशाल नर्सरी`) with optional English title (`Vishal Nursery`) and ornamental floral crests.
- **Configurable Header:** Shop name, phone, address (Sasaram, Rohtas, Bihar), GSTIN/Tax ID, tagline, and customizable UPI ID for payments.
- **Invoice Tracking:** Auto-incrementing invoice number, date picker (DD/MM/YYYY), and optional due date.

### 2. 🧾 Dynamic Itemized Billing Table
- **Interactive Line Items:** Dynamically add, clone, decrement/increment quantities, or delete line items.
- **Comprehensive Columns:** S.No, Item Description/Plant Name, optional HSN/SAC code, Quantity, Unit Price/Rate, Item Discount (`₹` or `%`), and Row Total.
- **Instant Live Recalculation:** Subtotal, row amounts, overall discounts, and balances update instantaneously on every keystroke without page reloads.

### 3. 🧮 Calculations & Indian Ledger Engine
- **Split Tax Breakdown:** Supports intra-state CGST/SGST (50/50 split), inter-state IGST, or standard VAT/Sales tax percentages.
- **Customer Dues & Ledger:** Carries over previous outstanding balances into the total payable bill amount.
- **Partial Payment Settlement:** Records amount received now, remaining balance due, change to return, and next-day promise notes (`Next Day (कल देगा)`).
- **Indian Numbering Converter:** Automatically translates grand totals into official Indian currency words (`Crore`, `Lakh`, `Thousand`, `Hundred`, `Rupees`, `Paise Only`).

### 4. 👥 Customer Directory & Live Autocomplete
- **Intelligent Autocomplete:** Typing customer name or mobile number in the bill editor instantly searches saved customer profiles.
- **Automatic Dues Fetch:** Selecting a customer automatically pre-fills their phone, address, and pulls their current outstanding dues into the invoice.
- **Customer Management Drawer:** Complete ledger tracking total purchases, total collections, outstanding balances, and direct payment settlements.

### 5. 🌿 Plant / Item Rate Catalog
- **Searchable Catalog:** Pre-seeded with nursery plants (Rose/गुलाब, Marigold/गेंदा, Bougainvillea, Mango/आम कलम, Pots, Vermicompost).
- **Retail & Wholesale Toggle:** Switch between Retail (खुदरा मूल्य) and Wholesale (थोक मूल्य) pricing with 1-click addition to the active bill.
- **Custom Additions:** Add, edit, or delete items and prices directly inside the browser.

### 6. 📱 Dynamic Scannable UPI QR Code
- Built-in, zero-dependency offline QR engine that creates standard ISO UPI payment codes (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`).
- Customers can scan the QR directly from the screen or printed paper slip using Google Pay, PhonePe, Paytm, BHIM, or Amazon Pay.

### 7. 🖨️ Pixel-Perfect Print & PDF Output
- **Authentic Maroon Slip:** The exact heritage paper slip with double borders, signature badges, terms (`भूल-चूक लेनी-देनी`), and floral emblems.
- **Modern GST Invoice:** Alternative corporate layout for formal B2B GST tax invoices.
- **CSS `@media print` Engine:** Strips all editor navigation, buttons, and backgrounds for clean A4 printing or browser **Save as PDF** without clipping.

### 8. 🔄 100% Offline Persistence & Backup
- **Zero Backend:** Runs completely offline without any internet connection.
- **Browser Storage:** All memos, customer ledgers, business profiles, and catalog rates persist in `localStorage`.
- **One-Click JSON Backup:** Export your entire database to a `.json` backup file or restore/import an existing backup in one click.

---

## ⌨️ Keyboard Shortcuts

Speed up billing with integrated global keyboard hotkeys:

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` / `Cmd + Enter` | **Save Memo & Open Print Dialog** |
| `Alt + N` | **Insert New Billing Line Item Row** |
| `Alt + S` | **Save Current Memo (No Print)** |
| `Alt + H` | **Toggle Past Bills History Drawer** |
| `Alt + C` | **Open Customer Directory Modal** |
| `Alt + R` | **Open Plant Rate Catalog Modal** |
| `Escape` | **Close Any Open Modal or Drawer** |

---

## 🚀 How to Run Locally

Because Cashmemo Web has zero external backend dependencies, you can run it in multiple ways:

### Method 1: Double-Click (Easiest)
Simply double-click `index.html` to open the app directly inside Chrome, Edge, Firefox, or Safari.

### Method 2: Python HTTP Server (Recommended)
```bash
# Navigate to project folder
cd Cashmemo_Web

# Start Python 3 web server
python -m http.server 8080
```
Then visit: `http://localhost:8080`

### Method 3: Node / NPX Serve
```bash
npx serve .
```

---

## 📁 Project Architecture

```
Cashmemo_Web/
├── index.html           # Main SPA layout, editor workspace & modals
├── css/
│   └── styles.css       # Tailwind base styles, maroon palette, print engine
├── js/
│   ├── app.js           # Core reactive application controller & state
│   ├── db.js            # Offline-first storage layer (localStorage/IndexedDB)
│   ├── numberToWords.js # Indian numbering currency converter (Crore/Lakh/Rupees)
│   ├── sampleData.js    # Pre-seeded Vishal Nursery profile & plant rate catalog
│   ├── shortcuts.js     # Global keyboard shortcuts listener
│   └── qrcode.min.js    # Standalone offline UPI QR code generator
├── .gitignore           # Git ignore rules for clean repository
└── README.md            # Comprehensive project documentation
```

---

## 📜 License
Developed as an open-source, offline-first billing system. All rights reserved by **Vishal Nursery (विशाल नर्सरी)**.
