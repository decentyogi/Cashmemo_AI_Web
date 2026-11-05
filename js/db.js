/**
 * CashmemoDB - Persistent Server-Side & Local Storage Hybrid Layer
 * Connects directly to Python backend REST API (/api/bills, /api/settings, etc.)
 * writing directly to server-side ./data/bills.json and ./data/settings.json.
 * 
 * Works seamlessly in Incognito Mode and brand new browsers by fetching
 * persistent data directly from the Python backend server.
 */

(function (window) {
  'use strict';

  let cachedSettings = null;
  let cachedBills = [];
  let cachedCustomers = [];
  let cachedRates = [];
  let isBackendOnline = false;

  const STORAGE_KEYS = {
    BUSINESS_PROFILE: 'cashmemo_business_profile_v2',
    MEMOS: 'cashmemo_memos_v2',
    CUSTOMERS: 'cashmemo_customers_v2',
    RATES: 'cashmemo_rates_v2'
  };

  function getLocal(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  // Check backend connectivity and fetch initial state
  async function initDatabase() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-cache' });
      if (res.ok) {
        isBackendOnline = true;
        cachedSettings = await res.json();
        setLocal(STORAGE_KEYS.BUSINESS_PROFILE, cachedSettings);

        // Fetch bills from ./data/bills.json
        const billsRes = await fetch('/api/bills', { cache: 'no-cache' });
        if (billsRes.ok) {
          cachedBills = await billsRes.json();
          setLocal(STORAGE_KEYS.MEMOS, cachedBills);
        }

        // Fetch customers from ./data/customers.json
        const custRes = await fetch('/api/customers', { cache: 'no-cache' });
        if (custRes.ok) {
          cachedCustomers = await custRes.json();
          setLocal(STORAGE_KEYS.CUSTOMERS, cachedCustomers);
        }

        // Fetch rates from ./data/rates.json
        const ratesRes = await fetch('/api/rates', { cache: 'no-cache' });
        if (ratesRes.ok) {
          cachedRates = await ratesRes.json();
          setLocal(STORAGE_KEYS.RATES, cachedRates);
        }

        console.log('[CashmemoDB] Connected to Python backend. Persistent storage active.');
        return { isBackendOnline: true };
      }
    } catch (e) {
      isBackendOnline = false;
      console.warn('[CashmemoDB] Running in standalone local mode (backend not detected).');
    }

    // Fallback to local storage if offline
    cachedSettings = getLocal(STORAGE_KEYS.BUSINESS_PROFILE, window.SampleData.DEFAULT_BUSINESS_PROFILE);
    cachedBills = getLocal(STORAGE_KEYS.MEMOS, []);
    cachedCustomers = getLocal(STORAGE_KEYS.CUSTOMERS, []);
    cachedRates = getLocal(STORAGE_KEYS.RATES, []);
    return { isBackendOnline: false };
  }

  // --- Settings ---
  function getBusinessProfile() {
    if (!cachedSettings) {
      cachedSettings = getLocal(STORAGE_KEYS.BUSINESS_PROFILE, window.SampleData.DEFAULT_BUSINESS_PROFILE);
    }
    // Enforce required defaults
    if (!cachedSettings.gstin) cachedSettings.gstin = "NaN";
    if (!cachedSettings.termsNote) {
      cachedSettings.termsNote = "Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks";
    }
    return cachedSettings;
  }

  async function saveBusinessProfile(profile) {
    const current = getBusinessProfile();
    const merged = { ...current, ...profile };
    if (!merged.gstin) merged.gstin = "NaN";
    if (!merged.termsNote) {
      merged.termsNote = "Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks";
    }
    cachedSettings = merged;
    setLocal(STORAGE_KEYS.BUSINESS_PROFILE, merged);

    if (isBackendOnline) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      } catch (e) {
        console.error('Failed saving settings to backend:', e);
      }
    }
    return merged;
  }

  function incrementNextMemoNumber(usedNum) {
    const profile = getBusinessProfile();
    const numericUsed = parseInt(String(usedNum).replace(/\D/g, ''), 10);
    if (!isNaN(numericUsed) && numericUsed >= (profile.nextMemoNumber || 1001)) {
      profile.nextMemoNumber = numericUsed + 1;
      saveBusinessProfile(profile);
    }
  }

  // --- Bills (Cash Memos) ---
  function getAllMemos() {
    if (!cachedBills) cachedBills = [];
    return cachedBills.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function getMemoById(id) {
    return cachedBills.find(m => String(m.id) === String(id)) || null;
  }

  async function saveMemo(memoData) {
    const profile = getBusinessProfile();
    const now = Date.now();
    const isEdit = Boolean(memoData.id);
    const id = isEdit ? memoData.id : 'memo_' + now + '_' + Math.random().toString(36).substring(2, 7);

    const memoEntity = {
      id: id,
      memoNumber: memoData.memoNumber || String(profile.nextMemoNumber || 1001),
      date: memoData.date || new Date().toLocaleDateString('en-GB'),
      dueDate: memoData.dueDate || '',
      customerName: (memoData.customerName || '').trim(),
      customerMobile: (memoData.customerMobile || '').trim(),
      customerAddress: (memoData.customerAddress || '').trim(),
      customerGstin: (memoData.customerGstin || '').trim(),
      items: Array.isArray(memoData.items) ? memoData.items : [],
      subtotal: Number(memoData.subtotal) || 0,
      discount: Number(memoData.discount) || 0,
      discountType: memoData.discountType || 'amount',
      taxPercentage: Number(memoData.taxPercentage) || 0,
      taxAmount: Number(memoData.taxAmount) || 0,
      previousDues: Number(memoData.previousDues) || 0,
      grandTotal: Number(memoData.grandTotal) || 0,
      paidAmount: Number(memoData.paidAmount) || 0,
      balanceDue: Number(memoData.balanceDue) || 0,
      paymentMethod: memoData.paymentMethod || 'Cash',
      paymentStatusNote: memoData.paymentStatusNote || 'Carry Forward',
      notes: memoData.notes || '',
      businessName: profile.shopNameHindi,
      businessPhone: profile.phone,
      businessAddress: `${profile.addressLine1}, ${profile.addressLine2}`,
      signerName: profile.signerName,
      createdAt: memoData.createdAt || now,
      updatedAt: now
    };

    // Update in-memory cache & local storage
    const idx = cachedBills.findIndex(m => String(m.id) === String(id));
    if (idx !== -1) {
      cachedBills[idx] = memoEntity;
    } else {
      cachedBills.unshift(memoEntity);
      incrementNextMemoNumber(memoEntity.memoNumber);
    }
    setLocal(STORAGE_KEYS.MEMOS, cachedBills);

    // Save server-side into ./data/bills.json immediately
    if (isBackendOnline) {
      try {
        await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memoEntity)
        });
        // Refresh customer list from backend after sync
        const custRes = await fetch('/api/customers');
        if (custRes.ok) cachedCustomers = await custRes.json();
      } catch (e) {
        console.error('Failed saving memo to backend:', e);
      }
    }

    return memoEntity;
  }

  async function deleteMemo(id) {
    cachedBills = cachedBills.filter(m => String(m.id) !== String(id));
    setLocal(STORAGE_KEYS.MEMOS, cachedBills);

    if (isBackendOnline) {
      try {
        await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed deleting memo on backend:', e);
      }
    }
    return true;
  }

  function searchMemos(query = '', filter = 'ALL') {
    const memos = getAllMemos();
    const q = query.trim().toLowerCase();

    return memos.filter(m => {
      if (filter === 'PENDING_DUE' && (m.balanceDue || 0) <= 0.009) return false;
      if (filter === 'PAID' && (m.balanceDue || 0) > 0.009) return false;

      if (!q) return true;
      const memoNum = String(m.memoNumber || '').toLowerCase();
      const custName = String(m.customerName || '').toLowerCase();
      const custMobile = String(m.customerMobile || '').toLowerCase();
      const custAddr = String(m.customerAddress || '').toLowerCase();
      const dateStr = String(m.date || '').toLowerCase();

      return (
        memoNum.includes(q) ||
        custName.includes(q) ||
        custMobile.includes(q) ||
        custAddr.includes(q) ||
        dateStr.includes(q)
      );
    });
  }

  // --- Customers & Balance History ---
  function getAllCustomers() {
    return (cachedCustomers || []).sort((a, b) => (b.lastTransactionAt || 0) - (a.lastTransactionAt || 0));
  }

  async function saveCustomer(customerData) {
    const now = Date.now();
    const isEdit = Boolean(customerData.id);
    const id = isEdit ? customerData.id : 'cust_' + now + '_' + Math.random().toString(36).substring(2, 6);

    const entity = {
      id: id,
      name: (customerData.name || '').trim(),
      phoneNumber: (customerData.phoneNumber || '').trim(),
      address: (customerData.address || '').trim(),
      outstandingBalance: Number(customerData.outstandingBalance) || 0,
      totalPurchased: Number(customerData.totalPurchased) || 0,
      totalPaid: Number(customerData.totalPaid) || 0,
      lastPromiseNote: customerData.lastPromiseNote || 'Carry Forward',
      lastTransactionAt: customerData.lastTransactionAt || now,
      createdAt: customerData.createdAt || now
    };

    const idx = cachedCustomers.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) cachedCustomers[idx] = entity;
    else cachedCustomers.unshift(entity);
    setLocal(STORAGE_KEYS.CUSTOMERS, cachedCustomers);

    if (isBackendOnline) {
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entity)
        });
      } catch (e) {
        console.error('Failed saving customer to backend:', e);
      }
    }
    return entity;
  }

  async function recordCustomerPayment(customerId, amountReceived, paymentMethod = 'Cash', promiseNote = 'Carry Forward') {
    const cust = cachedCustomers.find(c => String(c.id) === String(customerId));
    if (!cust) return null;

    const amt = Number(amountReceived) || 0;
    const oldBalance = Number(cust.outstandingBalance) || 0;
    const newBalance = Math.max(0, oldBalance - amt);
    const now = Date.now();

    cust.outstandingBalance = newBalance;
    cust.totalPaid = (cust.totalPaid || 0) + amt;
    cust.lastPromiseNote = newBalance > 0.009 ? (promiseNote || 'Carry Forward') : 'Fully Paid';
    cust.lastTransactionAt = now;
    setLocal(STORAGE_KEYS.CUSTOMERS, cachedCustomers);

    if (isBackendOnline) {
      try {
        await fetch(`/api/customers/${customerId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt, paymentMethod, promiseNote })
        });
      } catch (e) {
        console.error('Failed recording payment on backend:', e);
      }
    }
    return cust;
  }

  async function deleteCustomer(id) {
    cachedCustomers = cachedCustomers.filter(c => String(c.id) !== String(id));
    setLocal(STORAGE_KEYS.CUSTOMERS, cachedCustomers);

    if (isBackendOnline) {
      try {
        await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed deleting customer on backend:', e);
      }
    }
    return true;
  }

  // --- Rate Catalog ---
  function getAllRates() {
    return (cachedRates || []).sort((a, b) => a.name.localeCompare(b.name, 'hi'));
  }

  async function saveRate(rateData) {
    const isEdit = Boolean(rateData.id);
    const id = isEdit ? rateData.id : 'pr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const entity = {
      id: id,
      name: (rateData.name || '').trim(),
      category: (rateData.category || 'Plants').trim(),
      retailPrice: Number(rateData.retailPrice) || 0,
      wholesalePrice: Number(rateData.wholesalePrice) || 0
    };

    const idx = cachedRates.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) cachedRates[idx] = entity;
    else cachedRates.push(entity);
    setLocal(STORAGE_KEYS.RATES, cachedRates);

    if (isBackendOnline) {
      try {
        await fetch('/api/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entity)
        });
      } catch (e) {
        console.error('Failed saving rate to backend:', e);
      }
    }
    return entity;
  }

  async function deleteRate(id) {
    cachedRates = cachedRates.filter(r => String(r.id) !== String(id));
    setLocal(STORAGE_KEYS.RATES, cachedRates);

    if (isBackendOnline) {
      try {
        await fetch(`/api/rates/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed deleting rate on backend:', e);
      }
    }
    return true;
  }

  // --- Backup & Restore ---
  function exportFullBackup() {
    return JSON.stringify({
      version: 6,
      appName: 'Cashmemo_Web',
      exportDate: new Date().toISOString(),
      businessProfile: getBusinessProfile(),
      memos: getAllMemos(),
      customers: getAllCustomers(),
      rates: getAllRates()
    }, null, 2);
  }

  async function importFullBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.businessProfile) await saveBusinessProfile(data.businessProfile);
      if (Array.isArray(data.memos)) {
        cachedBills = data.memos;
        setLocal(STORAGE_KEYS.MEMOS, cachedBills);
      }
      if (Array.isArray(data.customers)) {
        cachedCustomers = data.customers;
        setLocal(STORAGE_KEYS.CUSTOMERS, cachedCustomers);
      }
      if (Array.isArray(data.rates)) {
        cachedRates = data.rates;
        setLocal(STORAGE_KEYS.RATES, cachedRates);
      }

      if (isBackendOnline) {
        await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonString
        });
      }

      return {
        success: true,
        memosCount: (data.memos || []).length,
        customersCount: (data.customers || []).length,
        ratesCount: (data.rates || []).length
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  window.CashmemoDB = {
    initDatabase,
    getBusinessProfile,
    saveBusinessProfile,
    getAllMemos,
    getMemoById,
    saveMemo,
    deleteMemo,
    searchMemos,
    getAllCustomers,
    saveCustomer,
    recordCustomerPayment,
    deleteCustomer,
    getAllRates,
    saveRate,
    deleteRate,
    exportFullBackup,
    importFullBackup
  };

})(window);
