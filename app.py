"""
Cashmemo Web - Persistent Server-Side Local Storage Backend
===========================================================
This Flask backend decouples billing and customer ledger storage from
client-side localStorage / cookies, solving data loss in Incognito Mode.

Key Architectural Guarantees:
1. 100% Portable: All data paths resolve relative to `__file__` using os.path.
2. Structured JSON Storage: `./data/bills.json`, `./data/settings.json`,
   `./data/customers.json`, and `./data/rates.json`.
3. Auto-Save Mechanism: Endpoints immediately serialize and persist changes.
4. Full RESTful CRUD API: Bills, Customers, Plant Rates, and Settings.
"""

import os
import json
import time
import threading
from flask import Flask, request, jsonify, send_from_directory

# Resolve absolute directory of this script to guarantee 100% portability across drives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

BILLS_FILE = os.path.join(DATA_DIR, 'bills.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
CUSTOMERS_FILE = os.path.join(DATA_DIR, 'customers.json')
RATES_FILE = os.path.join(DATA_DIR, 'rates.json')

file_lock = threading.Lock()

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

DEFAULT_SETTINGS = {
    "shopNameHindi": "विशाल नर्सरी",
    "shopNameEnglish": "Vishal Nursery",
    "tagline": "हमारे यहाँ हर प्रकार के फूल, पेड़-पौधा जैसे-गुलाब, गुलदावदी, गेंदा, क्रोटन सब गमले में तैयार पौधा भी मिलता है।",
    "phone": "7631873743",
    "email": "vishalnursery.sasaram@gmail.com",
    "addressLine1": "ग्राम-कोटा, माँ ताराचण्डी रोड (माँ सीताराम मंदिर)",
    "addressLine2": "पो०-सासाराम (रोहतास), बिहार - 821115",
    "gstin": "NaN",
    "currencySymbol": "₹",
    "memoPrefix": "VN-",
    "nextMemoNumber": 1001,
    "defaultTaxPercentage": 0.0,
    "enableTax": False,
    "taxType": "GST",
    "gstTaxSplit": "CGST_SGST",
    "upiVpa": "dangerousop@ybl",
    "signerName": "VISHAL NURSERY",
    "printTheme": "traditional",
    "termsNote": "Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks"
}


def ensure_data_files():
    """Ensure data directory and JSON files exist with clean initial states."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

    defaults = [
        (BILLS_FILE, []),
        (CUSTOMERS_FILE, []),
        (RATES_FILE, []),
        (SETTINGS_FILE, DEFAULT_SETTINGS)
    ]
    for filepath, initial_content in defaults:
        if not os.path.exists(filepath):
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(initial_content, f, ensure_ascii=False, indent=2)


def read_json(filepath, default_val=None):
    """Safely read and parse JSON from a file with thread lock."""
    with file_lock:
        if not os.path.exists(filepath):
            return default_val
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Storage Error] Failed reading {filepath}: {e}")
            return default_val


def write_json(filepath, data):
    """Safely serialize and write JSON to a file with thread lock."""
    with file_lock:
        try:
            tmp_path = filepath + ".tmp"
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            # Atomic replace
            os.replace(tmp_path, filepath)
            return True
        except Exception as e:
            print(f"[Storage Error] Failed writing {filepath}: {e}")
            return False


# =========================================================================
# STATIC FILE SERVING
# =========================================================================

@app.route('/')
def serve_index():
    """Serve main SPA HTML."""
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static assets (css, js, images)."""
    return send_from_directory(BASE_DIR, path)


# =========================================================================
# BACKEND API ENDPOINTS: SETTINGS
# =========================================================================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current business settings."""
    settings = read_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    return jsonify(settings)


@app.route('/api/settings', methods=['POST', 'PUT'])
def save_settings():
    """Update and persist business settings to ./data/settings.json."""
    incoming = request.get_json() or {}
    current = read_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    merged = {**current, **incoming}
    # Enforce strictly required defaults
    if not merged.get('gstin'):
        merged['gstin'] = 'NaN'
    if not merged.get('termsNote'):
        merged['termsNote'] = 'Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks'
    write_json(SETTINGS_FILE, merged)
    return jsonify({"success": True, "settings": merged})


# =========================================================================
# BACKEND API ENDPOINTS: BILLS (CASH MEMOS)
# =========================================================================

@app.route('/api/bills', methods=['GET'])
def list_bills():
    """
    List all saved bills from ./data/bills.json with search and filter support.
    Persists across all browser restarts and incognito sessions.
    """
    bills = read_json(BILLS_FILE, [])
    q = request.args.get('q', '').strip().lower()
    filter_mode = request.args.get('filter', 'ALL')

    # Sort newest first by creation timestamp
    bills.sort(key=lambda b: b.get('createdAt', 0), reverse=True)

    if not q and filter_mode == 'ALL':
        return jsonify(bills)

    filtered = []
    for b in bills:
        # Check filter mode
        due = float(b.get('balanceDue', 0))
        if filter_mode == 'PENDING_DUE' and due <= 0.009:
            continue
        if filter_mode == 'PAID' and due > 0.009:
            continue

        # Check search query
        if q:
            match = (
                q in str(b.get('memoNumber', '')).lower() or
                q in str(b.get('customerName', '')).lower() or
                q in str(b.get('customerMobile', '')).lower() or
                q in str(b.get('customerAddress', '')).lower() or
                q in str(b.get('date', '')).lower()
            )
            if not match:
                continue

        filtered.append(b)

    return jsonify(filtered)


@app.route('/api/bills/<memo_id>', methods=['GET'])
def get_bill(memo_id):
    """Retrieve single bill by ID."""
    bills = read_json(BILLS_FILE, [])
    for b in bills:
        if str(b.get('id')) == str(memo_id):
            return jsonify(b)
    return jsonify({"error": "Bill not found"}), 404


@app.route('/api/bills', methods=['POST'])
def save_bill():
    """
    Create or update a cash memo bill into ./data/bills.json.
    Auto-saves immediately, increments nextMemoNumber, and syncs customer dues.
    """
    bill_data = request.get_json() or {}
    bills = read_json(BILLS_FILE, [])
    settings = read_json(SETTINGS_FILE, DEFAULT_SETTINGS)
    now_ms = int(time.time() * 1000)

    bill_id = bill_data.get('id')
    is_new = not bool(bill_id)

    if is_new:
        bill_id = f"memo_{now_ms}_{os.urandom(2).hex()}"
        bill_data['id'] = bill_id
        bill_data['createdAt'] = now_ms

    bill_data['updatedAt'] = now_ms

    # Auto-increment nextMemoNumber if needed
    memo_num_str = str(bill_data.get('memoNumber', ''))
    digits_only = ''.join(c for c in memo_num_str if c.isdigit())
    if digits_only:
        num_val = int(digits_only)
        current_next = int(settings.get('nextMemoNumber', 1001))
        if num_val >= current_next:
            settings['nextMemoNumber'] = num_val + 1
            write_json(SETTINGS_FILE, settings)

    # Upsert in bills list
    found = False
    for i, b in enumerate(bills):
        if str(b.get('id')) == str(bill_id):
            bills[i] = bill_data
            found = True
            break
    if not found:
        bills.insert(0, bill_data)

    write_json(BILLS_FILE, bills)

    # Automatically sync customer dues into ./data/customers.json
    sync_customer_from_bill(bill_data)

    return jsonify({"success": True, "bill": bill_data})


@app.route('/api/bills/<memo_id>', methods=['PUT'])
def update_bill(memo_id):
    """Update an existing bill in ./data/bills.json."""
    bill_data = request.get_json() or {}
    bill_data['id'] = memo_id
    bills = read_json(BILLS_FILE, [])

    found = False
    for i, b in enumerate(bills):
        if str(b.get('id')) == str(memo_id):
            bill_data['createdAt'] = b.get('createdAt', int(time.time() * 1000))
            bill_data['updatedAt'] = int(time.time() * 1000)
            bills[i] = bill_data
            found = True
            break

    if not found:
        return jsonify({"error": "Bill not found"}), 404

    write_json(BILLS_FILE, bills)
    sync_customer_from_bill(bill_data)
    return jsonify({"success": True, "bill": bill_data})


@app.route('/api/bills/<memo_id>', methods=['DELETE'])
def delete_bill(memo_id):
    """Delete a bill from ./data/bills.json."""
    bills = read_json(BILLS_FILE, [])
    new_bills = [b for b in bills if str(b.get('id')) != str(memo_id)]
    if len(new_bills) == len(bills):
        return jsonify({"error": "Bill not found"}), 404

    write_json(BILLS_FILE, new_bills)
    return jsonify({"success": True, "deletedId": memo_id})


# =========================================================================
# BACKEND API ENDPOINTS: CUSTOMERS & LEDGER
# =========================================================================

def sync_customer_from_bill(bill):
    """Synchronize customer purchases and outstanding dues into ./data/customers.json."""
    cust_name = str(bill.get('customerName', '')).strip()
    cust_phone = str(bill.get('customerMobile', '')).strip()
    cust_addr = str(bill.get('customerAddress', '')).strip()

    if not cust_name and not cust_phone:
        return

    customers = read_json(CUSTOMERS_FILE, [])
    now_ms = int(time.time() * 1000)

    bill_grand_total = float(bill.get('grandTotal', 0))
    paid_now = float(bill.get('paidAmount', 0))
    balance_due = float(bill.get('balanceDue', 0))
    prev_dues = float(bill.get('previousDues', 0))

    # Match customer by phone or exact name
    matched = None
    for c in customers:
        if cust_phone and str(c.get('phoneNumber', '')).strip() == cust_phone:
            matched = c
            break
        if cust_name and str(c.get('name', '')).strip().lower() == cust_name.lower():
            matched = c
            break

    if matched:
        # Update existing
        if prev_dues >= float(matched.get('outstandingBalance', 0)) and float(matched.get('outstandingBalance', 0)) > 0:
            new_bal = balance_due
        else:
            new_bal = max(0.0, float(matched.get('outstandingBalance', 0)) + (bill_grand_total - paid_now))

        matched['name'] = cust_name or matched.get('name')
        matched['phoneNumber'] = cust_phone or matched.get('phoneNumber')
        matched['address'] = cust_addr or matched.get('address')
        matched['outstandingBalance'] = new_bal
        matched['totalPurchased'] = float(matched.get('totalPurchased', 0)) + bill_grand_total
        matched['totalPaid'] = float(matched.get('totalPaid', 0)) + paid_now
        matched['lastPromiseNote'] = "Carry Forward" if new_bal > 0.009 else "Fully Paid"
        matched['lastTransactionAt'] = now_ms
    else:
        # Create new customer entry
        new_cust = {
            "id": f"cust_{now_ms}_{os.urandom(2).hex()}",
            "name": cust_name or f"Customer ({cust_phone})",
            "phoneNumber": cust_phone,
            "address": cust_addr,
            "outstandingBalance": balance_due,
            "totalPurchased": bill_grand_total,
            "totalPaid": paid_now,
            "lastPromiseNote": "Carry Forward" if balance_due > 0.009 else "Fully Paid",
            "lastTransactionAt": now_ms,
            "createdAt": now_ms
        }
        customers.append(new_cust)

    write_json(CUSTOMERS_FILE, customers)


@app.route('/api/customers', methods=['GET'])
def list_customers():
    """Get all saved customers."""
    customers = read_json(CUSTOMERS_FILE, [])
    customers.sort(key=lambda c: c.get('lastTransactionAt', 0), reverse=True)
    return jsonify(customers)


@app.route('/api/customers', methods=['POST'])
def save_customer():
    """Add or edit a customer profile."""
    data = request.get_json() or {}
    customers = read_json(CUSTOMERS_FILE, [])
    cust_id = data.get('id')
    now_ms = int(time.time() * 1000)

    if cust_id:
        for i, c in enumerate(customers):
            if str(c.get('id')) == str(cust_id):
                customers[i] = {**c, **data, "lastTransactionAt": now_ms}
                write_json(CUSTOMERS_FILE, customers)
                return jsonify({"success": True, "customer": customers[i]})

    # New customer
    new_c = {
        "id": f"cust_{now_ms}_{os.urandom(2).hex()}",
        "name": data.get('name', '').strip(),
        "phoneNumber": data.get('phoneNumber', '').strip(),
        "address": data.get('address', '').strip(),
        "outstandingBalance": float(data.get('outstandingBalance', 0)),
        "totalPurchased": float(data.get('totalPurchased', 0)),
        "totalPaid": float(data.get('totalPaid', 0)),
        "lastPromiseNote": data.get('lastPromiseNote', 'Carry Forward'),
        "lastTransactionAt": now_ms,
        "createdAt": now_ms
    }
    customers.append(new_c)
    write_json(CUSTOMERS_FILE, customers)
    return jsonify({"success": True, "customer": new_c})


@app.route('/api/customers/<cust_id>/pay', methods=['POST'])
def record_customer_payment(cust_id):
    """Record customer due settlement."""
    data = request.get_json() or {}
    amount_paid = float(data.get('amount', 0))
    promise_note = data.get('promiseNote', 'Carry Forward')

    customers = read_json(CUSTOMERS_FILE, [])
    for c in customers:
        if str(c.get('id')) == str(cust_id):
            old_due = float(c.get('outstandingBalance', 0))
            new_due = max(0.0, old_due - amount_paid)
            c['outstandingBalance'] = new_due
            c['totalPaid'] = float(c.get('totalPaid', 0)) + amount_paid
            c['lastPromiseNote'] = "Fully Paid" if new_due <= 0.009 else promise_note
            c['lastTransactionAt'] = int(time.time() * 1000)
            write_json(CUSTOMERS_FILE, customers)
            return jsonify({"success": True, "customer": c})

    return jsonify({"error": "Customer not found"}), 404


@app.route('/api/customers/<cust_id>', methods=['DELETE'])
def delete_customer(cust_id):
    """Delete customer record."""
    customers = read_json(CUSTOMERS_FILE, [])
    new_list = [c for c in customers if str(c.get('id')) != str(cust_id)]
    write_json(CUSTOMERS_FILE, new_list)
    return jsonify({"success": True, "deletedId": cust_id})


# =========================================================================
# BACKEND API ENDPOINTS: PLANT RATE CATALOG
# =========================================================================

@app.route('/api/rates', methods=['GET'])
def list_rates():
    """Get all saved plant and product rates from ./data/rates.json."""
    rates = read_json(RATES_FILE, [])
    return jsonify(rates)


@app.route('/api/rates', methods=['POST'])
def save_rate():
    """Add or update an item in the plant rate catalog."""
    data = request.get_json() or {}
    rates = read_json(RATES_FILE, [])
    rate_id = data.get('id')
    now_ms = int(time.time() * 1000)

    if rate_id:
        for i, r in enumerate(rates):
            if str(r.get('id')) == str(rate_id):
                rates[i] = {**r, **data}
                write_json(RATES_FILE, rates)
                return jsonify({"success": True, "rate": rates[i]})

    new_rate = {
        "id": f"pr_{now_ms}_{os.urandom(2).hex()}",
        "name": data.get('name', '').strip(),
        "category": data.get('category', 'Plants').strip(),
        "retailPrice": float(data.get('retailPrice', 0)),
        "wholesalePrice": float(data.get('wholesalePrice', 0))
    }
    rates.append(new_rate)
    write_json(RATES_FILE, rates)
    return jsonify({"success": True, "rate": new_rate})


@app.route('/api/rates/<rate_id>', methods=['DELETE'])
def delete_rate(rate_id):
    """Delete a rate item from catalog."""
    rates = read_json(RATES_FILE, [])
    new_rates = [r for r in rates if str(r.get('id')) != str(rate_id)]
    write_json(RATES_FILE, new_rates)
    return jsonify({"success": True, "deletedId": rate_id})


# =========================================================================
# BACKEND API ENDPOINTS: BACKUP & RESTORE
# =========================================================================

@app.route('/api/backup', methods=['GET'])
def get_backup():
    """Export all local server storage into a single portable backup JSON."""
    return jsonify({
        "version": 6,
        "appName": "Cashmemo_Web",
        "exportDate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "settings": read_json(SETTINGS_FILE, DEFAULT_SETTINGS),
        "bills": read_json(BILLS_FILE, []),
        "customers": read_json(CUSTOMERS_FILE, []),
        "rates": read_json(RATES_FILE, [])
    })


@app.route('/api/backup', methods=['POST'])
def restore_backup():
    """Restore all local server data from JSON payload."""
    data = request.get_json() or {}
    if data.get('settings'):
        write_json(SETTINGS_FILE, data['settings'])
    if isinstance(data.get('bills'), list):
        write_json(BILLS_FILE, data['bills'])
    if isinstance(data.get('customers'), list):
        write_json(CUSTOMERS_FILE, data['customers'])
    if isinstance(data.get('rates'), list):
        write_json(RATES_FILE, data['rates'])

    return jsonify({"success": True, "message": "Backup restored successfully"})


# =========================================================================
# SERVER STARTUP
# =========================================================================

if __name__ == '__main__':
    ensure_data_files()
    port = int(os.environ.get('PORT', 8080))
    print(f"==================================================")
    print(f" Cashmemo Web Server Starting on http://127.0.0.1:{port}")
    print(f" Storage Directory: {DATA_DIR}")
    print(f" Bills: {BILLS_FILE}")
    print(f" Settings: {SETTINGS_FILE}")
    print(f" 100% Incognito-Proof Persistent Storage Active")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
