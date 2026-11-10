# Cashmemo Web (विशाल नर्सरी कैश मेमो)

> A persistent, server-side local storage billing and customer ledger web application ported from the native Android Cashmemo application ([`Vishal_Nurshri`](https://github.com/decentyogi/Vishal_Nurshri)).

---

## 🌺 Architecture & Enhancements

### 1. 📂 Persistent Server-Side Local Storage (Incognito & Portability Fix)
- **Decoupled from Browser Client Storage:** Bills and customer profiles no longer vanish in Private/Incognito browsing mode or across browser cache clears.
- **Local JSON Storage:** All data is strictly persisted on disk inside `./data/`:
  - `./data/bills.json` — Cash memos, line items, and audit history.
  - `./data/settings.json` — Store metadata, UPI settings, and invoice sequencing.
  - `./data/customers.json` — Customer profiles and outstanding due ledgers.
  - `./data/rates.json` — Custom plant and material rate catalog.
- **100% Portable:** All directory paths are resolved dynamically using `os.path.dirname(os.path.abspath(__file__))`, enabling painless copying between PCs, flash drives, and operating systems.
- **Auto-Save Protection:** When creating a new memo or clicking Print/Save, the system immediately writes to `./data/bills.json`.

### 2. 🌱 Clean Initial State (Zero Dummy Data)
- Fresh installations start with 100% clean tables.
- Hardcoded dummy profiles (Anita Devi, random phone numbers) and default plant rows have been completely removed.
- An explicit **"+ Add Row"** and **"+ Add Plant"** button allows clean, user-driven data entry.

### 3. 🎯 Customer Input Alignment
- Customer Name and Address input fields and their placeholder text are centered (`text-align: center;`) for clean aesthetic ledger entry.

### 4. 🖨️ High-Resolution Vector UPI QR Code for Paper Printing
- **Mathematical Vector SVG:** Instead of fuzzy low-res raster bitmaps, UPI payment QR codes are generated dynamically as crisp SVG vector modules (`shape-rendering: crispEdges`).
- **Print Optimization:** Supports 300+ DPI razor-sharp output on A4 paper and thermal receipt printers with zero blur or pixelation.
- **Strict UPI URI Format:**
  ```text
  upi://pay?pa=dangerousop@ybl&pn=Vishal%20Nursery&am={AMOUNT}&cu=INR&tn=Plant%20Purchase
  ```

### 5. 🌿 Streamlined Billing Items Table
- **Removed Distractions:** Completely removed the unused HSN/SAC and Item Discount columns.
- **Expanded Botanical Description:** The Item / Plant Description column is expanded to take up ~60% of the table width, comfortably accommodating long botanical, vernacular, and variety names without wrapping.
- **Streamlined Columns:** `[ # | Item / Plant Description | Qty | Rate | Amount | Action ]`.

### 6. 💱 "Carry Forward" Settlement
- The settlement balance promise box is strictly labeled in English as **"Carry Forward"** without confusing translation text.

### 7. ⚙️ Default Configurations
- **GSTIN:** Set strictly to `"NaN"`.
- **Terms & Notes:** Configured to:
  `"Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks"`

---

## ⌨️ Keyboard Shortcuts

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

## 🚀 How to Run

### Method 1: Python Flask Server (Recommended - Incognito Safe)
```bash
# Navigate to project folder
cd Cashmemo_Web

# Run the Python backend
python app.py
```
Visit in any browser (standard or Incognito): **`http://localhost:8080`**

### Method 2: Standalone Local Fallback
Double-click `index.html` to open directly in any browser (falls back gracefully to browser local storage if Python server is not running).

---

## 📁 Project Structure

```
Cashmemo_Web/
├── app.py               # Flask RESTful API server & local JSON persistence
├── data/                # Server-side persistent storage directory
│   ├── bills.json       # All cash memo records
│   ├── settings.json    # Store profile, GSTIN="NaN", terms
│   ├── customers.json   # Customer balance directory
│   └── rates.json       # Plant rate catalog
├── index.html           # Streamlined single-page billing UI
├── css/
│   └── styles.css       # Tailwind base, centered alignment & vector print CSS
├── js/
│   ├── tailwind.js      # Offline Tailwind CSS engine (zero external CDN dependency)
│   ├── app.js           # Reactive billing controller, auto-save & vector QR
│   ├── db.js            # Dual-mode backend API & local storage layer
│   ├── numberToWords.js # Indian numbering currency converter (Crore/Lakh/Rupees)
│   ├── sampleData.js    # Clean default profile & settings
│   ├── shortcuts.js     # Global hotkeys (Ctrl+Enter, Alt+N, Alt+S, etc.)
│   └── qrcode.min.js    # Offline QR module matrix generator
├── .gitignore           # Clean git ignore configuration
└── README.md            # Comprehensive project documentation
```
