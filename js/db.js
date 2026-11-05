/**
 * CashmemoDB - Offline-first Storage Layer
 * Manages localStorage persistence for Business Profile, Cash Memos,
 * Customer Directory, Balance Ledgers, and Rate Catalog.
 * 100% offline, zero backend required.
 */

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    BUSINESS_PROFILE: 'cashmemo_business_profile_v1',
    MEMOS: 'cashmemo_memos_v1',
    CUSTOMERS: 'cashmemo_customers_v1',
    BALANCE_HISTORY: 'cashmemo_balance_history_v1',
    RATES: 'cashmemo_rates_v1',
    INITIALIZED: 'cashmemo_initialized_v1'
  };

  function getRaw(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.error('Error reading localStorage for key', key, e);
      return fallback;
    }
  }

  function setRaw(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.error('Error writing localStorage for key', key, e);
      return false;
    }
  }

  // --- Initial Bootstrap ---
  function initDatabase() {
    const isInit = getRaw(STORAGE_KEYS.INITIALIZED, false);
    if (!isInit) {
      if (!getRaw(STORAGE_KEYS.BUSINESS_PROFILE)) {
        setRaw(STORAGE_KEYS.BUSINESS_PROFILE, window.SampleData.DEFAULT_BUSINESS_PROFILE);
      }
      if (!getRaw(STORAGE_KEYS.RATES)) {
        setRaw(STORAGE_KEYS.RATES, window.SampleData.DEFAULT_PLANT_RATES);
      }
      if (!getRaw(STORAGE_KEYS.CUSTOMERS)) {
        setRaw(STORAGE_KEYS.CUSTOMERS, window.SampleData.SAMPLE_CUSTOMERS);
      }
      if (!getRaw(STORAGE_KEYS.MEMOS)) {
        setRaw(STORAGE_KEYS.MEMOS, []);
      }
      if (!getRaw(STORAGE_KEYS.BALANCE_HISTORY)) {
        setRaw(STORAGE_KEYS.BALANCE_HISTORY, []);
      }
      setRaw(STORAGE_KEYS.INITIALIZED, true);
    }
  }

  // --- Business Profile ---
  function getBusinessProfile() {
    initDatabase();
    return getRaw(STORAGE_KEYS.BUSINESS_PROFILE, window.SampleData.DEFAULT_BUSINESS_PROFILE);
  }

  function saveBusinessProfile(profile) {
    const current = getBusinessProfile();
    const merged = { ...current, ...profile };
    setRaw(STORAGE_KEYS.BUSINESS_PROFILE, merged);
    return merged;
  }

  function incrementNextMemoNumber(usedNum) {
    const profile = getBusinessProfile();
    const numericUsed = parseInt(String(usedNum).replace(/\D/g, ''), 10);
    if (!isNaN(numericUsed) && numericUsed >= profile.nextMemoNumber) {
      profile.nextMemoNumber = numericUsed + 1;
      saveBusinessProfile(profile);
    }
  }

  // --- Cash Memos ---
  function getAllMemos() {
    initDatabase();
    const memos = getRaw(STORAGE_KEYS.MEMOS, []);
    // sort newest first
    return memos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function getMemoById(id) {
    const memos = getAllMemos();
    return memos.find(m => String(m.id) === String(id)) || null;
  }

  function saveMemo(memoData) {
    const memos = getAllMemos();
    const profile = getBusinessProfile();
    const now = Date.now();

    const isEdit = Boolean(memoData.id);
    const id = isEdit ? memoData.id : 'memo_' + now + '_' + Math.random().toString(36).substring(2, 7);

    const memoEntity = {
      id: id,
      memoNumber: memoData.memoNumber || String(profile.nextMemoNumber),
      date: memoData.date || new Date().toLocaleDateString('en-GB'),
      dueDate: memoData.dueDate || '',
      customerName: (memoData.customerName || '').trim(),
      customerMobile: (memoData.customerMobile || '').trim(),
      customerAddress: (memoData.customerAddress || '').trim(),
      customerGstin: (memoData.customerGstin || '').trim(),
      items: Array.isArray(memoData.items) ? memoData.items : [],
      subtotal: Number(memoData.subtotal) || 0,
      discount: Number(memoData.discount) || 0,
      discountType: memoData.discountType || 'amount', // 'amount' or 'percentage'
      taxPercentage: Number(memoData.taxPercentage) || 0,
      taxAmount: Number(memoData.taxAmount) || 0,
      taxType: memoData.taxType || profile.taxType || 'GST',
      gstTaxSplit: memoData.gstTaxSplit || profile.gstTaxSplit || 'CGST_SGST',
      previousDues: Number(memoData.previousDues) || 0,
      grandTotal: Number(memoData.grandTotal) || 0,
      paidAmount: Number(memoData.paidAmount) || 0,
      balanceDue: Number(memoData.balanceDue) || 0,
      paymentMethod: memoData.paymentMethod || 'Cash',
      paymentStatusNote: memoData.paymentStatusNote || '',
      notes: memoData.notes || '',
      businessName: profile.shopNameHindi,
      businessPhone: profile.phone,
      businessAddress: `${profile.addressLine1}, ${profile.addressLine2}`,
      signerName: profile.signerName,
      createdAt: memoData.createdAt || now,
      updatedAt: now
    };

    if (isEdit) {
      const idx = memos.findIndex(m => String(m.id) === String(id));
      if (idx !== -1) memos[idx] = memoEntity;
      else memos.unshift(memoEntity);
    } else {
      memos.unshift(memoEntity);
      incrementNextMemoNumber(memoEntity.memoNumber);
    }

    setRaw(STORAGE_KEYS.MEMOS, memos);
    syncCustomerLedger(memoEntity);
    return memoEntity;
  }

  function deleteMemo(id) {
    let memos = getAllMemos();
    memos = memos.filter(m => String(m.id) !== String(id));
    setRaw(STORAGE_KEYS.MEMOS, memos);
    return true;
  }

  function searchMemos(query = '', filter = 'ALL') {
    const memos = getAllMemos();
    const q = query.trim().toLowerCase();

    return memos.filter(m => {
      // filter mode
      if (filter === 'PENDING_DUE' && (m.balanceDue || 0) <= 0.009) return false;
      if (filter === 'PAID' && (m.balanceDue || 0) > 0.009) return false;

      // search match
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

  // --- Customers & Balance History Ledger ---
  function getAllCustomers() {
    initDatabase();
    const customers = getRaw(STORAGE_KEYS.CUSTOMERS, []);
    return customers.sort((a, b) => (b.lastTransactionAt || b.createdAt || 0) - (a.lastTransactionAt || a.createdAt || 0));
  }

  function getCustomerById(id) {
    const customers = getAllCustomers();
    return customers.find(c => String(c.id) === String(id)) || null;
  }

  function findCustomer(name, phone) {
    const customers = getAllCustomers();
    const cleanPhone = (phone || '').trim();
    const cleanName = (name || '').trim().toLowerCase();

    if (cleanPhone) {
      const byPhone = customers.find(c => (c.phoneNumber || '').trim() === cleanPhone);
      if (byPhone) return byPhone;
    }
    if (cleanName) {
      const byName = customers.find(c => (c.name || '').trim().toLowerCase() === cleanName);
      if (byName) return byName;
    }
    return null;
  }

  function saveCustomer(customerData) {
    const customers = getAllCustomers();
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
      lastPromiseNote: customerData.lastPromiseNote || '',
      lastTransactionAt: customerData.lastTransactionAt || now,
      createdAt: customerData.createdAt || now
    };

    if (isEdit) {
      const idx = customers.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) customers[idx] = entity;
      else customers.unshift(entity);
    } else {
      customers.unshift(entity);
    }

    setRaw(STORAGE_KEYS.CUSTOMERS, customers);
    return entity;
  }

  function deleteCustomer(id) {
    let customers = getAllCustomers();
    customers = customers.filter(c => String(c.id) !== String(id));
    setRaw(STORAGE_KEYS.CUSTOMERS, customers);

    // clean associated balance history
    let history = getAllBalanceHistory();
    history = history.filter(h => String(h.customerId) !== String(id));
    setRaw(STORAGE_KEYS.BALANCE_HISTORY, history);
    return true;
  }

  function getAllBalanceHistory() {
    initDatabase();
    const history = getRaw(STORAGE_KEYS.BALANCE_HISTORY, []);
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  function getCustomerHistory(customerId) {
    const history = getAllBalanceHistory();
    return history.filter(h => String(h.customerId) === String(customerId));
  }

  function addBalanceHistoryEntry(entry) {
    const history = getAllBalanceHistory();
    const newEntry = {
      id: 'bh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      ...entry
    };
    history.unshift(newEntry);
    setRaw(STORAGE_KEYS.BALANCE_HISTORY, history);
    return newEntry;
  }

  function syncCustomerLedger(memo) {
    if (!memo.customerName && !memo.customerMobile) return;

    const existing = findCustomer(memo.customerName, memo.customerMobile);
    const now = Date.now();
    const paidNow = Number(memo.paidAmount) || 0;
    const balanceDue = Number(memo.balanceDue) || 0;
    const billGrandTotal = Number(memo.grandTotal) || 0;
    const totalPayable = billGrandTotal + (Number(memo.previousDues) || 0);

    if (existing) {
      // update customer
      const newBalance = (memo.previousDues >= existing.outstandingBalance && existing.outstandingBalance > 0)
        ? balanceDue
        : Math.max(0, (existing.outstandingBalance || 0) + (billGrandTotal - paidNow));

      existing.name = memo.customerName || existing.name;
      existing.phoneNumber = memo.customerMobile || existing.phoneNumber;
      existing.address = memo.customerAddress || existing.address;
      existing.outstandingBalance = newBalance;
      existing.totalPurchased = (existing.totalPurchased || 0) + billGrandTotal;
      existing.totalPaid = (existing.totalPaid || 0) + paidNow;
      existing.lastPromiseNote = balanceDue > 0.009 ? (memo.paymentStatusNote || 'Next Day') : 'Fully Paid (चुकता)';
      existing.lastTransactionAt = now;

      saveCustomer(existing);

      addBalanceHistoryEntry({
        customerId: existing.id,
        customerName: existing.name,
        customerPhone: existing.phoneNumber,
        memoId: memo.id,
        memoNumber: memo.memoNumber,
        transactionType: 'BILL_CREATED',
        billAmount: totalPayable,
        paidAmount: paidNow,
        balanceChange: newBalance - (existing.outstandingBalance || 0),
        resultingBalance: newBalance,
        paymentMethod: memo.paymentMethod || 'Cash',
        note: balanceDue > 0.009
          ? `Bill #${memo.memoNumber}: Paid ₹${paidNow} of ₹${totalPayable} • Due ₹${balanceDue} (${memo.paymentStatusNote || 'Next Day'})`
          : `Bill #${memo.memoNumber}: Full Payment ₹${paidNow}`
      });
    } else {
      // create new customer
      const newCust = saveCustomer({
        name: memo.customerName || `Customer (${memo.customerMobile})`,
        phoneNumber: memo.customerMobile,
        address: memo.customerAddress,
        outstandingBalance: balanceDue,
        totalPurchased: billGrandTotal,
        totalPaid: paidNow,
        lastPromiseNote: balanceDue > 0.009 ? (memo.paymentStatusNote || 'Next Day') : 'Fully Paid (चुकता)',
        lastTransactionAt: now
      });

      addBalanceHistoryEntry({
        customerId: newCust.id,
        customerName: newCust.name,
        customerPhone: newCust.phoneNumber,
        memoId: memo.id,
        memoNumber: memo.memoNumber,
        transactionType: 'BILL_CREATED',
        billAmount: totalPayable,
        paidAmount: paidNow,
        balanceChange: balanceDue,
        resultingBalance: balanceDue,
        paymentMethod: memo.paymentMethod || 'Cash',
        note: balanceDue > 0.009
          ? `Bill #${memo.memoNumber}: Paid ₹${paidNow} of ₹${totalPayable} • Due ₹${balanceDue}`
          : `Bill #${memo.memoNumber}: Full Payment ₹${paidNow}`
      });
    }
  }

  function recordCustomerPayment(customerId, amountReceived, paymentMethod = 'Cash', promiseNote = '') {
    const cust = getCustomerById(customerId);
    if (!cust) return null;

    const amt = Number(amountReceived) || 0;
    const oldBalance = Number(cust.outstandingBalance) || 0;
    const newBalance = Math.max(0, oldBalance - amt);
    const now = Date.now();

    cust.outstandingBalance = newBalance;
    cust.totalPaid = (cust.totalPaid || 0) + amt;
    cust.lastPromiseNote = newBalance > 0.009 ? (promiseNote || 'Next Day') : 'Fully Paid (चुकता)';
    cust.lastTransactionAt = now;
    saveCustomer(cust);

    addBalanceHistoryEntry({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phoneNumber,
      transactionType: newBalance <= 0.009 ? 'BALANCE_SETTLED' : 'PAYMENT_RECEIVED',
      billAmount: oldBalance,
      paidAmount: amt,
      balanceChange: -amt,
      resultingBalance: newBalance,
      paymentMethod: paymentMethod,
      note: newBalance <= 0.009
        ? `Received ₹${amt} (${paymentMethod}) • All dues cleared!`
        : `Received ₹${amt} (${paymentMethod}) • Remaining due ₹${newBalance} (${promiseNote || 'Next Day'})`
    });

    return cust;
  }

  // --- Rate Catalog ---
  function getAllRates() {
    initDatabase();
    const rates = getRaw(STORAGE_KEYS.RATES, []);
    return rates.sort((a, b) => a.name.localeCompare(b.name, 'hi'));
  }

  function saveRate(rateData) {
    const rates = getAllRates();
    const isEdit = Boolean(rateData.id);
    const id = isEdit ? rateData.id : 'pr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const entity = {
      id: id,
      name: (rateData.name || '').trim(),
      category: (rateData.category || 'General').trim(),
      retailPrice: Number(rateData.retailPrice) || 0,
      wholesalePrice: Number(rateData.wholesalePrice) || 0,
      hsn: (rateData.hsn || '').trim()
    };

    if (isEdit) {
      const idx = rates.findIndex(r => String(r.id) === String(id));
      if (idx !== -1) rates[idx] = entity;
      else rates.push(entity);
    } else {
      rates.push(entity);
    }

    setRaw(STORAGE_KEYS.RATES, rates);
    return entity;
  }

  function deleteRate(id) {
    let rates = getAllRates();
    rates = rates.filter(r => String(r.id) !== String(id));
    setRaw(STORAGE_KEYS.RATES, rates);
    return true;
  }

  // --- Backup & Restore ---
  function exportFullBackup() {
    initDatabase();
    return JSON.stringify({
      version: 5,
      appName: 'Cashmemo_Web',
      exportDate: new Date().toISOString(),
      businessProfile: getBusinessProfile(),
      memos: getAllMemos(),
      customers: getAllCustomers(),
      balanceHistory: getAllBalanceHistory(),
      rates: getAllRates()
    }, null, 2);
  }

  function importFullBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      let importedMemos = 0;
      let importedCustomers = 0;
      let importedRates = 0;

      if (data.businessProfile && typeof data.businessProfile === 'object') {
        saveBusinessProfile(data.businessProfile);
      }
      if (Array.isArray(data.memos)) {
        setRaw(STORAGE_KEYS.MEMOS, data.memos);
        importedMemos = data.memos.length;
      }
      if (Array.isArray(data.customers)) {
        setRaw(STORAGE_KEYS.CUSTOMERS, data.customers);
        importedCustomers = data.customers.length;
      }
      if (Array.isArray(data.balanceHistory)) {
        setRaw(STORAGE_KEYS.BALANCE_HISTORY, data.balanceHistory);
      }
      if (Array.isArray(data.rates)) {
        setRaw(STORAGE_KEYS.RATES, data.rates);
        importedRates = data.rates.length;
      }

      return {
        success: true,
        memosCount: importedMemos,
        customersCount: importedCustomers,
        ratesCount: importedRates
      };
    } catch (e) {
      console.error('Backup import error:', e);
      return {
        success: false,
        error: e.message || 'Invalid JSON format'
      };
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
    getCustomerById,
    findCustomer,
    saveCustomer,
    deleteCustomer,
    getAllBalanceHistory,
    getCustomerHistory,
    recordCustomerPayment,
    getAllRates,
    saveRate,
    deleteRate,
    exportFullBackup,
    importFullBackup
  };

  initDatabase();

})(window);
