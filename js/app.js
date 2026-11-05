/**
 * Cashmemo Web - Master Application Controller
 * Handles persistent backend storage, auto-save mechanisms,
 * high-resolution vector UPI QR generation, simplified billing tables,
 * and live recalculation without page reloads.
 */

(function (window, document) {
  'use strict';

  // --- Reactive Application State ---
  const state = {
    memoId: null,
    memoNumber: '1001',
    date: getTodayFormatted(),
    dueDate: '',
    customerName: '',
    customerMobile: '',
    customerAddress: '',
    customerGstin: '',
    items: [
      createItem(1, '', 1, 0)
    ],
    discount: 0,
    discountType: 'amount',
    taxPercentage: 0,
    previousDues: 0,
    paidAmount: 0,
    hasCustomPayment: false,
    paymentMethod: 'Cash',
    paymentStatusNote: 'Carry Forward', // Strictly English label
    notes: '',
    previewTheme: 'traditional',
    isWholesaleMode: false
  };

  // --- Helpers ---
  function getTodayFormatted() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Simplified Item Model: Removed HSN & per-item discount to maximize description width
  function createItem(serialNo, description = '', quantity = 1, rate = 0) {
    const q = Number(quantity) || 1;
    const r = Number(rate) || 0;
    return {
      id: 'itm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      serialNo: serialNo,
      description: description,
      quantity: q,
      rate: r,
      amount: Math.max(0, q * r)
    };
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span class="font-bold text-base">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // --- Calculation Engine ---
  function recalculateAll() {
    let subtotal = 0;
    state.items.forEach((item, index) => {
      item.serialNo = index + 1;
      const q = Number(item.quantity) || 0;
      const r = Number(item.rate) || 0;
      item.amount = Math.max(0, q * r);
      subtotal += item.amount;
    });

    // Invoice level discount
    let overallDiscountAmount = Number(state.discount) || 0;
    if (state.discountType === '%') {
      overallDiscountAmount = (subtotal * overallDiscountAmount) / 100;
    }
    overallDiscountAmount = Math.min(subtotal, Math.max(0, overallDiscountAmount));
    const taxableBase = Math.max(0, subtotal - overallDiscountAmount);

    // Tax calculation
    const taxRate = Number(state.taxPercentage) || 0;
    const taxAmount = (taxableBase * taxRate) / 100;

    // Grand Total & Total Payable
    const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;
    const previousDues = Number(state.previousDues) || 0;
    const totalPayable = grandTotal + previousDues;

    // Payment & Balances
    const effectivePaid = state.hasCustomPayment ? Number(state.paidAmount) || 0 : totalPayable;
    const balanceDue = state.hasCustomPayment ? Math.max(0, totalPayable - effectivePaid) : 0;
    const changeToReturn = state.hasCustomPayment ? Math.max(0, effectivePaid - totalPayable) : 0;

    return {
      subtotal,
      overallDiscountAmount,
      taxableBase,
      taxRate,
      taxAmount,
      grandTotal,
      previousDues,
      totalPayable,
      effectivePaid,
      balanceDue,
      changeToReturn
    };
  }

  // --- UI Renderers ---
  function renderEditorItems() {
    const tableBody = document.getElementById('itemsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    state.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 hover:bg-gray-50 transition-colors';
      tr.innerHTML = `
        <td class="p-2 text-center text-xs font-semibold text-gray-500">${index + 1}</td>
        <!-- Expanded Item Description / Plant Name Column -->
        <td class="p-2">
          <div class="relative">
            <input type="text"
              class="w-full text-xs font-semibold border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-red-700 item-desc-input"
              data-index="${index}"
              value="${escapeHtml(item.description)}"
              placeholder="Enter plant / botanical / vernacular name..." />
            <div class="item-suggestions absolute left-0 right-0 top-full bg-white shadow-xl border border-gray-200 rounded-b mt-0.5 z-20 hidden max-h-48 overflow-y-auto"></div>
          </div>
        </td>
        <!-- Quantity Stepper -->
        <td class="p-2">
          <div class="flex items-center justify-center space-x-1">
            <button type="button" class="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold btn-qty-dec" data-index="${index}">-</button>
            <input type="number" step="any" min="0.1"
              class="w-14 text-xs text-center border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-red-700 font-semibold"
              data-index="${index}" data-field="quantity"
              value="${item.quantity}" />
            <button type="button" class="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold btn-qty-inc" data-index="${index}">+</button>
          </div>
        </td>
        <!-- Rate / Unit Price -->
        <td class="p-2">
          <input type="number" step="any" min="0"
            class="w-full text-xs text-right border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-red-700 font-semibold"
            data-index="${index}" data-field="rate"
            value="${item.rate}" />
        </td>
        <!-- Row Total -->
        <td class="p-2 text-right font-bold text-xs text-gray-800 item-row-amount font-mono">
          ₹ ${item.amount.toFixed(2)}
        </td>
        <!-- Actions: Clone & Delete -->
        <td class="p-2 text-center">
          <div class="flex items-center justify-center space-x-1">
            <button type="button" title="Clone row" class="p-1 text-gray-400 hover:text-blue-600 transition-colors btn-row-clone" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
            <button type="button" title="Delete row" class="p-1 text-gray-400 hover:text-red-600 transition-colors btn-row-del" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    bindItemRowEvents();
  }

  function bindItemRowEvents() {
    // Autocomplete lookup for Plant Rate Catalog
    document.querySelectorAll('.item-desc-input').forEach(input => {
      input.addEventListener('input', function () {
        const idx = parseInt(this.dataset.index, 10);
        state.items[idx].description = this.value;

        const val = this.value.trim().toLowerCase();
        const suggestionsBox = this.nextElementSibling;
        if (!val || val.length < 1) {
          suggestionsBox.classList.add('hidden');
          suggestionsBox.innerHTML = '';
          updateLiveCalculations();
          return;
        }

        const rates = window.CashmemoDB.getAllRates();
        const matches = rates.filter(r => r.name.toLowerCase().includes(val)).slice(0, 5);

        if (matches.length > 0) {
          suggestionsBox.innerHTML = matches.map(m => `
            <div class="px-3 py-1.5 hover:bg-red-50 cursor-pointer flex justify-between items-center text-xs text-gray-700 item-suggestion-row"
              data-name="${escapeHtml(m.name)}"
              data-retail="${m.retailPrice}"
              data-wholesale="${m.wholesalePrice}">
              <span class="font-semibold">${escapeHtml(m.name)}</span>
              <span class="text-xs text-red-800 font-bold font-mono">₹${state.isWholesaleMode ? m.wholesalePrice : m.retailPrice}</span>
            </div>
          `).join('');
          suggestionsBox.classList.remove('hidden');

          suggestionsBox.querySelectorAll('.item-suggestion-row').forEach(row => {
            row.addEventListener('click', function () {
              const name = this.dataset.name;
              const price = state.isWholesaleMode ? Number(this.dataset.wholesale) : Number(this.dataset.retail);

              state.items[idx].description = name;
              state.items[idx].rate = price;

              renderEditorItems();
              updateLiveCalculations();
            });
          });
        } else {
          suggestionsBox.classList.add('hidden');
        }

        updateLiveCalculations();
      });

      input.addEventListener('blur', function () {
        setTimeout(() => {
          const suggestionsBox = this.nextElementSibling;
          if (suggestionsBox) suggestionsBox.classList.add('hidden');
        }, 200);
      });
    });

    // Quantity & Rate inputs
    document.querySelectorAll('#itemsTableBody input[data-field]').forEach(input => {
      input.addEventListener('input', function () {
        const idx = parseInt(this.dataset.index, 10);
        const field = this.dataset.field;
        state.items[idx][field] = Number(this.value) || 0;
        updateLiveCalculations();
      });
    });

    // Qty Increment & Decrement
    document.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index, 10);
        state.items[idx].quantity = (Number(state.items[idx].quantity) || 1) + 1;
        renderEditorItems();
        updateLiveCalculations();
      });
    });

    document.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index, 10);
        const curr = Number(state.items[idx].quantity) || 1;
        if (curr > 1) {
          state.items[idx].quantity = curr - 1;
        } else {
          if (state.items.length > 1) {
            state.items.splice(idx, 1);
          } else {
            state.items[0] = createItem(1, '', 1, 0);
          }
        }
        renderEditorItems();
        updateLiveCalculations();
      });
    });

    // Clone Row
    document.querySelectorAll('.btn-row-clone').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index, 10);
        const src = state.items[idx];
        const clone = createItem(state.items.length + 1, src.description, src.quantity, src.rate);
        state.items.splice(idx + 1, 0, clone);
        renderEditorItems();
        updateLiveCalculations();
      });
    });

    // Delete Row
    document.querySelectorAll('.btn-row-del').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index, 10);
        if (state.items.length <= 1) {
          state.items = [createItem(1, '', 1, 0)];
        } else {
          state.items.splice(idx, 1);
        }
        renderEditorItems();
        updateLiveCalculations();
      });
    });
  }

  function updateLiveCalculations() {
    const calc = recalculateAll();

    // Update row total text displays
    const rowAmounts = document.querySelectorAll('.item-row-amount');
    state.items.forEach((item, idx) => {
      if (rowAmounts[idx]) {
        rowAmounts[idx].textContent = `₹ ${item.amount.toFixed(2)}`;
      }
    });

    // Update Editor Summary Displays
    const elSubtotal = document.getElementById('calcSubtotal');
    if (elSubtotal) elSubtotal.textContent = `₹ ${calc.subtotal.toFixed(2)}`;

    const elTaxAmount = document.getElementById('calcTaxAmount');
    if (elTaxAmount) elTaxAmount.textContent = `+ ₹ ${calc.taxAmount.toFixed(2)}`;

    const elGrandTotal = document.getElementById('calcGrandTotal');
    if (elGrandTotal) elGrandTotal.textContent = `₹ ${calc.grandTotal.toFixed(2)}`;

    const elTotalPayable = document.getElementById('calcTotalPayable');
    if (elTotalPayable) elTotalPayable.textContent = `₹ ${calc.totalPayable.toFixed(2)}`;

    const elPaidAmountInput = document.getElementById('editorPaidAmount');
    if (elPaidAmountInput && !state.hasCustomPayment) {
      elPaidAmountInput.value = calc.totalPayable.toFixed(2);
    }

    const elBalanceDue = document.getElementById('calcBalanceDue');
    if (elBalanceDue) {
      elBalanceDue.textContent = `₹ ${calc.balanceDue.toFixed(2)}`;
      const dueContainer = document.getElementById('calcBalanceDueContainer');
      if (dueContainer) {
        if (calc.balanceDue > 0.009) {
          dueContainer.classList.remove('text-gray-600');
          dueContainer.classList.add('text-red-700', 'font-bold');
        } else {
          dueContainer.classList.remove('text-red-700', 'font-bold');
          dueContainer.classList.add('text-gray-600');
        }
      }
    }

    const elWords = document.getElementById('calcAmountInWords');
    if (elWords) {
      elWords.textContent = window.NumberToWordsConverter.convertToIndianRupees(calc.totalPayable);
    }

    // Re-render Live Print Slip Preview with High-Res Vector QR Code
    renderLivePaperSlip(calc);
  }

  // --- Real-time Paper Slip Preview ---
  function renderLivePaperSlip(calc) {
    const previewContainer = document.getElementById('slipPreviewContainer');
    if (!previewContainer) return;

    const profile = window.CashmemoDB.getBusinessProfile();
    const isTraditional = state.previewTheme === 'traditional';

    if (isTraditional) {
      renderTraditionalSlip(previewContainer, profile, calc);
    } else {
      renderModernGstSlip(previewContainer, profile, calc);
    }

    // Generate Razor-Sharp High-Resolution Vector UPI QR Code
    generateVectorUpiQr(calc.totalPayable, profile);
  }

  function renderTraditionalSlip(container, profile, calc) {
    const { rupees, paise } = window.NumberToWordsConverter.splitRupeesAndPaise(calc.totalPayable);
    const wordsStr = window.NumberToWordsConverter.convertToIndianRupees(calc.totalPayable);
    const minRows = 12;

    let rowsHtml = '';
    for (let i = 0; i < Math.max(minRows, state.items.length); i++) {
      const item = state.items[i];
      if (item && (item.description || item.amount > 0)) {
        const itemSplit = window.NumberToWordsConverter.splitRupeesAndPaise(item.amount);
        const qtyDisplay = (item.quantity % 1 === 0) ? item.quantity : item.quantity.toFixed(2);
        rowsHtml += `
          <tr class="h-6">
            <td class="text-center font-bold w-8">${item.serialNo}</td>
            <td class="font-medium px-2 leading-tight">${escapeHtml(item.description)}</td>
            <td class="text-center w-12 font-medium">${qtyDisplay}</td>
            <td class="text-right w-16 pr-1 font-mono">${item.rate > 0 ? item.rate.toFixed(2) : ''}</td>
            <td class="text-center w-16 font-mono font-bold">${itemSplit.rupees}</td>
            <td class="text-center w-8 font-mono">${itemSplit.paise}</td>
          </tr>
        `;
      } else {
        // Blank filler row replicating authentic physical cash memo paper
        rowsHtml += `
          <tr class="h-6">
            <td class="text-center w-8 opacity-40 text-xs">${i + 1}</td>
            <td class="px-2">&nbsp;</td>
            <td class="text-center w-12">&nbsp;</td>
            <td class="text-right w-16">&nbsp;</td>
            <td class="text-center w-16 opacity-30 font-mono">--</td>
            <td class="text-center w-8 opacity-30 font-mono">--</td>
          </tr>
        `;
      }
    }

    let breakdownHtml = '';
    const hasExtras = calc.overallDiscountAmount > 0 || calc.taxAmount > 0 || calc.previousDues > 0 || calc.balanceDue > 0.009;
    if (hasExtras) {
      breakdownHtml = `
        <div class="mt-2 text-xs text-red-900 border-t border-red-900/30 pt-1.5 space-y-0.5">
          <div class="flex flex-wrap gap-x-3 text-[11px] italic">
            <span>Bill Subtotal: ₹${calc.subtotal.toFixed(2)}</span>
            ${calc.overallDiscountAmount > 0 ? `<span>| Discount: -₹${calc.overallDiscountAmount.toFixed(2)}</span>` : ''}
            ${calc.taxAmount > 0 ? `<span>| GST (${calc.taxRate}%): +₹${calc.taxAmount.toFixed(2)}</span>` : ''}
            ${calc.previousDues > 0 ? `<span>| Prev Dues: +₹${calc.previousDues.toFixed(2)}</span>` : ''}
          </div>
          ${calc.balanceDue > 0.009 ? `
            <div class="text-[11.5px] font-bold text-red-950 flex flex-wrap gap-x-2 pt-0.5">
              <span>Paid: ₹${calc.effectivePaid.toFixed(2)}</span>
              <span>| Balance Due: ₹${calc.balanceDue.toFixed(2)}</span>
              <span>• [${escapeHtml(state.paymentStatusNote || 'Carry Forward')}]</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="cashmemo-slip p-3 select-none">
        <div class="cashmemo-slip-outer-border">
          <div class="cashmemo-slip-inner-border">
            <!-- Header: Mobile & Emblems -->
            <div class="flex justify-between items-center text-xs font-bold text-red-900 pb-1">
              <span class="flex items-center space-x-1">
                <span>🌺 Mob.</span>
                <span class="tracking-wide">${escapeHtml(profile.phone)}</span>
              </span>
              <span class="text-[11px] font-semibold">${profile.gstin && profile.gstin !== 'NaN' ? 'GSTIN: ' + escapeHtml(profile.gstin) : '🌸🌿'}</span>
              <span>🌸</span>
            </div>

            <!-- Shop Title in Royal Hindi Typography -->
            <div class="text-center py-0.5">
              <div class="flex items-center justify-center space-x-2">
                <span class="text-base text-red-900">🌺</span>
                <h1 class="slip-title-hindi text-2xl tracking-wide font-black text-red-900 inline">${escapeHtml(profile.shopNameHindi)}</h1>
                <span class="text-base text-red-900">🌺</span>
              </div>
              ${profile.shopNameEnglish ? `
                <div class="text-xs font-bold tracking-wider uppercase text-red-900 -mt-0.5">(${escapeHtml(profile.shopNameEnglish)})</div>
              ` : ''}
            </div>

            <!-- Address & Tagline -->
            <div class="text-center text-[10.5px] text-red-900 space-y-0.5">
              ${profile.addressLine1 ? `<div>${escapeHtml(profile.addressLine1)}</div>` : ''}
              ${profile.addressLine2 ? `<div>${escapeHtml(profile.addressLine2)}</div>` : ''}
              ${profile.tagline ? `<div class="italic text-[9.5px] px-4 pt-0.5 leading-tight opacity-90">${escapeHtml(profile.tagline)}</div>` : ''}
            </div>

            <div class="border-b-2 border-red-900 my-1.5"></div>

            <!-- Meta: Memo No & Date -->
            <div class="flex justify-between items-center text-xs font-bold text-red-900 mb-1.5">
              <div class="flex items-center space-x-1.5">
                <span>नं० (Bill No):</span>
                <span class="border border-red-900 rounded px-2 py-0.5 font-mono text-xs bg-red-50/50">${escapeHtml(state.memoNumber)}</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span>दिनांक (Date):</span>
                <span class="font-medium">${escapeHtml(state.date)}</span>
              </div>
            </div>

            <!-- Customer Details: Centered Layout Alignment -->
            <div class="text-xs text-red-900 space-y-1 mb-2">
              <div class="flex items-center">
                <span class="font-bold mr-1">नाम (Name):</span>
                <span class="border-b border-dotted border-red-900/60 flex-1 px-1 font-semibold text-center truncate">${escapeHtml(state.customerName) || '................................................................'}</span>
                ${state.customerMobile ? `
                  <span class="font-bold ml-2 mr-1">मो०:</span>
                  <span class="font-medium font-mono">${escapeHtml(state.customerMobile)}</span>
                ` : ''}
              </div>
              <div class="flex items-center">
                <span class="font-bold mr-1">पता (Address):</span>
                <span class="border-b border-dotted border-red-900/60 flex-1 px-1 text-center truncate font-normal">${escapeHtml(state.customerAddress) || '........................................................................................................'}</span>
              </div>
            </div>

            <!-- STREAMLINED TABULAR SECTION -->
            <table class="slip-table">
              <thead>
                <tr>
                  <th class="w-8">क्रम.</th>
                  <th>पौधा / सामग्री का विवरण (Description)</th>
                  <th class="w-12">संख्या</th>
                  <th class="w-16">दाम</th>
                  <th class="w-16">रू०</th>
                  <th class="w-8">पै०</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <!-- Total Row -->
                <tr class="total-row h-7">
                  <td colspan="4" class="text-right pr-3 font-bold text-xs">
                    ${calc.previousDues > 0 ? 'कुल देय (Total Payable inc. Dues):' : 'टोटल (Grand Total):'}
                  </td>
                  <td class="text-center font-mono font-black text-xs">${rupees}</td>
                  <td class="text-center font-mono font-bold text-xs">${paise}</td>
                </tr>
              </tbody>
            </table>

            <!-- Words Row -->
            <div class="flex items-start text-[11px] text-red-900 pt-1.5 font-medium">
              <span class="font-bold mr-1.5 whitespace-nowrap">शब्दों में:</span>
              <span class="slip-words flex-1 leading-snug">${escapeHtml(wordsStr)}</span>
            </div>

            ${breakdownHtml}

            <!-- Bottom QR Code & Signature Section -->
            <div class="mt-3 pt-2 border-t border-red-900/20 flex justify-between items-end">
              <!-- High-Resolution Vector UPI QR Block -->
              <div class="flex items-center space-x-2.5">
                <div id="slipQrBox" class="w-24 h-24 bg-white p-1 border border-red-900/30 rounded flex items-center justify-center shadow-xs"></div>
                <div class="text-[9.5px] text-red-900 space-y-0.5 leading-tight">
                  <div class="font-bold">📱 Scan & Pay UPI</div>
                  <div class="font-mono text-[9px] text-gray-700">${escapeHtml(profile.upiVpa || 'dangerousop@ybl')}</div>
                  <div class="text-[8.5px] text-gray-500">Google Pay • PhonePe • Paytm</div>
                  <div class="text-[9px] italic pt-0.5 max-w-[190px] leading-tight text-gray-700">${escapeHtml(profile.termsNote || 'Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks')}</div>
                </div>
              </div>

              <!-- Digital Signature Box -->
              <div class="text-right">
                <div class="digital-signature-badge">
                  <div class="flex items-center justify-center space-x-1 text-[10px] font-bold text-red-900">
                    <span class="text-green-700">✓</span>
                    <span>Digitally Signed</span>
                  </div>
                  <div class="text-[10px] font-black text-red-900 tracking-wider">
                    BY ${escapeHtml((profile.signerName || 'VISHAL NURSERY').toUpperCase())}
                  </div>
                  <div class="text-[8.5px] text-red-800 font-mono">Date: ${escapeHtml(state.date)}</div>
                </div>
                <div class="text-[9.5px] font-semibold text-red-900 text-center mt-0.5">हस्ताक्षर (Authorized Signatory)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderModernGstSlip(container, profile, calc) {
    const wordsStr = window.NumberToWordsConverter.convertToIndianRupees(calc.totalPayable);

    let rowsHtml = state.items.map((item, idx) => `
      <tr>
        <td class="text-center font-medium">${idx + 1}</td>
        <td class="font-semibold text-gray-800">${escapeHtml(item.description)}</td>
        <td class="text-center font-medium">${item.quantity}</td>
        <td class="text-right font-mono">₹ ${item.rate.toFixed(2)}</td>
        <td class="text-right font-mono font-bold">₹ ${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="gst-invoice select-none">
        <!-- Modern Header -->
        <div class="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900">${escapeHtml(profile.shopNameEnglish || profile.shopNameHindi)}</h1>
            <div class="text-xs text-red-800 font-bold">${escapeHtml(profile.shopNameHindi)}</div>
            <div class="text-xs text-gray-600 mt-1">${escapeHtml(profile.addressLine1)}, ${escapeHtml(profile.addressLine2)}</div>
            <div class="text-xs text-gray-600 font-medium">Mob: ${escapeHtml(profile.phone)}</div>
            <div class="text-xs font-bold text-gray-800 mt-0.5">GSTIN: ${escapeHtml(profile.gstin || 'NaN')}</div>
          </div>
          <div class="text-right">
            <span class="inline-block bg-red-100 text-red-900 text-xs font-bold px-3 py-1 rounded">TAX INVOICE</span>
            <div class="text-sm font-bold font-mono text-gray-800 mt-2">Invoice #: ${escapeHtml(state.memoNumber)}</div>
            <div class="text-xs text-gray-600">Date: ${escapeHtml(state.date)}</div>
            ${state.dueDate ? `<div class="text-xs text-red-700 font-medium">Due Date: ${escapeHtml(state.dueDate)}</div>` : ''}
          </div>
        </div>

        <!-- Bill To -->
        <div class="bg-gray-50 border border-gray-200 rounded p-3 text-xs mb-4 flex justify-between">
          <div class="w-full text-center">
            <div class="text-gray-500 font-bold uppercase text-[10px] tracking-wider mb-1">BILL TO / CUSTOMER</div>
            <div class="text-sm font-bold text-gray-900">${escapeHtml(state.customerName) || 'Walk-in Customer'}</div>
            <div class="text-gray-600">${escapeHtml(state.customerAddress) || 'Sasaram, Bihar'}</div>
            ${state.customerMobile ? `<div class="text-gray-700 font-medium">Phone: ${escapeHtml(state.customerMobile)}</div>` : ''}
          </div>
        </div>

        <!-- Modern Table -->
        <table class="gst-invoice-table mb-4">
          <thead>
            <tr>
              <th class="w-8 text-center">#</th>
              <th>Description of Goods</th>
              <th class="w-16 text-center">Qty</th>
              <th class="w-24 text-right">Unit Price</th>
              <th class="w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Totals & Payment Summary -->
        <div class="flex justify-between items-start pt-2 border-t border-gray-200">
          <div class="flex-1 pr-6 space-y-2">
            <div class="text-xs">
              <span class="font-bold text-gray-700">Amount in Words:</span>
              <div class="italic text-gray-800 font-medium">${escapeHtml(wordsStr)}</div>
            </div>
            <!-- High-Res UPI QR -->
            <div class="flex items-center space-x-3 pt-2">
              <div id="slipQrBox" class="w-24 h-24 bg-white p-1 border border-gray-300 rounded flex items-center justify-center"></div>
              <div class="text-xs text-gray-600">
                <div class="font-bold text-gray-800">Instant UPI Payment</div>
                <div class="font-mono text-[11px] text-red-900">${escapeHtml(profile.upiVpa || 'dangerousop@ybl')}</div>
                <div class="text-[10px] text-gray-500">Scan via GPay / PhonePe / Paytm</div>
              </div>
            </div>
          </div>

          <div class="w-64 space-y-1.5 text-xs text-gray-700">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span class="font-mono font-semibold">₹ ${calc.subtotal.toFixed(2)}</span>
            </div>
            ${calc.overallDiscountAmount > 0 ? `
              <div class="flex justify-between text-green-700">
                <span>Discount:</span>
                <span class="font-mono">- ₹ ${calc.overallDiscountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${calc.taxAmount > 0 ? `
              <div class="flex justify-between">
                <span>GST (${calc.taxRate}%):</span>
                <span class="font-mono">₹ ${calc.taxAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${calc.previousDues > 0 ? `
              <div class="flex justify-between text-red-800 font-medium">
                <span>Previous Dues:</span>
                <span class="font-mono">+ ₹ ${calc.previousDues.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-sm font-black text-gray-900 border-t border-b border-gray-300 py-1.5 mt-1">
              <span>Total Payable:</span>
              <span class="font-mono text-red-900">₹ ${calc.totalPayable.toFixed(2)}</span>
            </div>
            ${calc.balanceDue > 0.009 ? `
              <div class="flex justify-between text-xs text-gray-600">
                <span>Paid Amount:</span>
                <span class="font-mono">₹ ${calc.effectivePaid.toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-xs font-bold text-red-700">
                <span>Carry Forward:</span>
                <span class="font-mono">₹ ${calc.balanceDue.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
          <div>
            <div>${escapeHtml(profile.termsNote || 'Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks')}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-gray-900">For ${escapeHtml(profile.signerName || 'VISHAL NURSERY')}</div>
            <div class="h-10"></div>
            <div>Authorized Signatory</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- High-Resolution Vector UPI QR Code Generator ---
  function generateVectorUpiQr(amount, profile) {
    const qrBox = document.getElementById('slipQrBox');
    if (!qrBox || typeof window.QRCode === 'undefined') return;

    qrBox.innerHTML = '';
    const vpa = (profile.upiVpa || 'dangerousop@ybl').trim();
    const payeeName = 'Vishal%20Nursery';
    const note = 'Plant%20Purchase';

    // Strictly formatted UPI string
    let upiUri = '';
    if (amount && amount > 0) {
      const amtStr = (amount % 1 === 0) ? String(amount.toFixed(0)) : String(amount.toFixed(2));
      upiUri = `upi://pay?pa=${vpa}&pn=${payeeName}&am=${amtStr}&cu=INR&tn=${note}`;
    } else {
      upiUri = `upi://pay?pa=${vpa}&pn=${payeeName}&cu=INR&tn=${note}`;
    }

    try {
      // Calculate QR matrix using QRCode.js
      const tempDiv = document.createElement('div');
      const qr = new window.QRCode(tempDiv, {
        text: upiUri,
        correctLevel: window.QRCode.CorrectLevel.M
      });

      const qrModel = qr._oQRCode;
      if (qrModel && typeof qrModel.getModuleCount === 'function') {
        const count = qrModel.getModuleCount();
        const margin = 4;
        const totalSize = count + margin * 2;

        // Render pure mathematical vector SVG for zero-blur, crisp paper printing
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" class="w-full h-full upi-qr-svg">`;
        svg += `<rect width="${totalSize}" height="${totalSize}" fill="#FFFFFF"/>`;
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qrModel.isDark(r, c)) {
              svg += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="#000000"/>`;
            }
          }
        }
        svg += `</svg>`;
        qrBox.innerHTML = svg;
      }
    } catch (e) {
      console.error('Error generating Vector UPI QR:', e);
    }
  }

  // --- Auto-complete for Customer Directory ---
  function initCustomerAutocomplete() {
    const nameInput = document.getElementById('editorCustomerName');
    const mobileInput = document.getElementById('editorCustomerMobile');
    const suggestionsBox = document.getElementById('customerSuggestions');
    if (!nameInput || !suggestionsBox) return;

    function handleLookup(query) {
      const q = (query || '').trim().toLowerCase();
      if (!q || q.length < 1) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
      }

      const customers = window.CashmemoDB.getAllCustomers();
      const matches = customers.filter(c =>
        c.name.toLowerCase().includes(q) || (c.phoneNumber && c.phoneNumber.includes(q))
      ).slice(0, 5);

      if (matches.length > 0) {
        suggestionsBox.innerHTML = matches.map(c => `
          <div class="p-2.5 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-none customer-suggest-item"
            data-id="${c.id}"
            data-name="${escapeHtml(c.name)}"
            data-phone="${escapeHtml(c.phoneNumber || '')}"
            data-address="${escapeHtml(c.address || '')}"
            data-balance="${c.outstandingBalance || 0}">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-gray-800">${escapeHtml(c.name)}</span>
              ${(c.outstandingBalance || 0) > 0.009 ? `
                <span class="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                  Due: ₹${Number(c.outstandingBalance).toFixed(2)}
                </span>
              ` : `
                <span class="text-green-700 text-[10px] font-semibold">No Dues</span>
              `}
            </div>
            <div class="text-[11px] text-gray-500 mt-0.5 flex justify-between">
              <span>${c.phoneNumber ? '📞 ' + escapeHtml(c.phoneNumber) : ''}</span>
              <span class="truncate max-w-[140px]">${escapeHtml(c.address || '')}</span>
            </div>
          </div>
        `).join('');

        suggestionsBox.classList.remove('hidden');

        suggestionsBox.querySelectorAll('.customer-suggest-item').forEach(el => {
          el.addEventListener('click', function () {
            nameInput.value = this.dataset.name;
            state.customerName = this.dataset.name;

            if (mobileInput) {
              mobileInput.value = this.dataset.phone;
              state.customerMobile = this.dataset.phone;
            }

            const addrInput = document.getElementById('editorCustomerAddress');
            if (addrInput && this.dataset.address) {
              addrInput.value = this.dataset.address;
              state.customerAddress = this.dataset.address;
            }

            const dues = Number(this.dataset.balance) || 0;
            const prevDuesInput = document.getElementById('editorPreviousDues');
            if (prevDuesInput) prevDuesInput.value = dues;
            state.previousDues = dues;

            suggestionsBox.classList.add('hidden');
            updateLiveCalculations();
            showToast(`Loaded Customer: ${this.dataset.name}`, 'info');
          });
        });
      } else {
        suggestionsBox.classList.add('hidden');
      }
    }

    nameInput.addEventListener('input', function () {
      state.customerName = this.value;
      handleLookup(this.value);
      updateLiveCalculations();
    });

    if (mobileInput) {
      mobileInput.addEventListener('input', function () {
        state.customerMobile = this.value;
        handleLookup(this.value);
        updateLiveCalculations();
      });
    }

    document.addEventListener('click', function (e) {
      if (!nameInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.add('hidden');
      }
    });
  }

  // --- Auto-Save & Manual Save Operations ---
  async function saveCurrentMemo(shouldPrint = false) {
    const calc = recalculateAll();

    const validItems = state.items.filter(i => (i.description && i.description.trim()) || i.amount > 0);
    if (validItems.length === 0) {
      if (shouldPrint) showToast('Please add at least one item to print!', 'error');
      return null;
    }

    const memoData = {
      id: state.memoId,
      memoNumber: state.memoNumber,
      date: state.date,
      dueDate: state.dueDate,
      customerName: state.customerName,
      customerMobile: state.customerMobile,
      customerAddress: state.customerAddress,
      customerGstin: state.customerGstin,
      items: validItems,
      subtotal: calc.subtotal,
      discount: state.discount,
      discountType: state.discountType,
      taxPercentage: state.taxPercentage,
      taxAmount: calc.taxAmount,
      previousDues: state.previousDues,
      grandTotal: calc.grandTotal,
      paidAmount: calc.effectivePaid,
      balanceDue: calc.balanceDue,
      paymentMethod: state.paymentMethod,
      paymentStatusNote: calc.balanceDue > 0.009 ? (state.paymentStatusNote || 'Carry Forward') : 'Fully Paid',
      notes: state.notes
    };

    const saved = await window.CashmemoDB.saveMemo(memoData);
    state.memoId = saved.id;

    showToast(`✓ Cash Memo #${saved.memoNumber} saved to server storage!`, 'success');

    if (shouldPrint) {
      setTimeout(() => window.print(), 200);
    }
    return saved;
  }

  // Auto-save on "New Bill" action if current bill has content
  async function createNewMemo() {
    const hasContent = state.items.some(i => i.description.trim() || i.amount > 0) || state.customerName.trim();
    if (hasContent) {
      await saveCurrentMemo(false);
    }

    const profile = window.CashmemoDB.getBusinessProfile();
    state.memoId = null;
    state.memoNumber = String(profile.nextMemoNumber || 1001);
    state.date = getTodayFormatted();
    state.dueDate = '';
    state.customerName = '';
    state.customerMobile = '';
    state.customerAddress = '';
    state.customerGstin = '';
    state.items = [createItem(1, '', 1, 0)];
    state.discount = 0;
    state.taxPercentage = profile.enableTax ? profile.defaultTaxPercentage : 0;
    state.previousDues = 0;
    state.paidAmount = 0;
    state.hasCustomPayment = false;
    state.paymentStatusNote = 'Carry Forward';

    // Reset DOM inputs
    document.getElementById('editorMemoNumber').value = state.memoNumber;
    document.getElementById('editorDate').value = state.date;
    document.getElementById('editorCustomerName').value = '';
    document.getElementById('editorCustomerMobile').value = '';
    document.getElementById('editorCustomerAddress').value = '';
    document.getElementById('editorPreviousDues').value = 0;
    document.getElementById('editorDiscount').value = 0;
    document.getElementById('editorTax').value = state.taxPercentage;
    document.getElementById('editorDueNote').value = 'Carry Forward';

    renderEditorItems();
    updateLiveCalculations();
    showToast('New Memo initialized (clean state).', 'info');
  }

  function loadMemoIntoEditor(memo) {
    state.memoId = memo.id;
    state.memoNumber = memo.memoNumber;
    state.date = memo.date;
    state.dueDate = memo.dueDate || '';
    state.customerName = memo.customerName || '';
    state.customerMobile = memo.customerMobile || '';
    state.customerAddress = memo.customerAddress || '';
    state.customerGstin = memo.customerGstin || '';
    state.items = (memo.items && memo.items.length > 0)
      ? memo.items.map((it, idx) => ({ ...it, serialNo: idx + 1 }))
      : [createItem(1, '', 1, 0)];
    state.discount = memo.discount || 0;
    state.discountType = memo.discountType || 'amount';
    state.taxPercentage = memo.taxPercentage || 0;
    state.previousDues = memo.previousDues || 0;
    state.hasCustomPayment = (memo.balanceDue > 0.009) || (memo.paidAmount > 0 && memo.paidAmount !== memo.grandTotal + memo.previousDues);
    state.paidAmount = memo.paidAmount || 0;
    state.paymentMethod = memo.paymentMethod || 'Cash';
    state.paymentStatusNote = memo.paymentStatusNote || 'Carry Forward';
    state.notes = memo.notes || '';

    // Update DOM
    document.getElementById('editorMemoNumber').value = state.memoNumber;
    document.getElementById('editorDate').value = state.date;
    document.getElementById('editorCustomerName').value = state.customerName;
    document.getElementById('editorCustomerMobile').value = state.customerMobile;
    document.getElementById('editorCustomerAddress').value = state.customerAddress;
    document.getElementById('editorPreviousDues').value = state.previousDues;
    document.getElementById('editorDiscount').value = state.discount;
    document.getElementById('editorTax').value = state.taxPercentage;
    document.getElementById('editorDueNote').value = state.paymentStatusNote;

    renderEditorItems();
    updateLiveCalculations();
    closeAllModals();
    showToast(`Loaded Memo #${memo.memoNumber}`, 'info');
  }

  function duplicateMemo(memo) {
    const profile = window.CashmemoDB.getBusinessProfile();
    loadMemoIntoEditor(memo);
    state.memoId = null;
    state.memoNumber = String(profile.nextMemoNumber || 1001);
    state.date = getTodayFormatted();
    document.getElementById('editorMemoNumber').value = state.memoNumber;
    document.getElementById('editorDate').value = state.date;
    updateLiveCalculations();
    showToast(`Duplicated into new Memo #${state.memoNumber}`, 'success');
  }

  // --- History Drawer ---
  function openHistoryDrawer() {
    renderHistoryList();
    document.getElementById('historyDrawer')?.classList.remove('hidden');
  }

  function renderHistoryList() {
    const listContainer = document.getElementById('historyListContainer');
    const searchInput = document.getElementById('historySearchInput');
    const filterSelect = document.getElementById('historyFilterSelect');
    if (!listContainer) return;

    const query = searchInput ? searchInput.value : '';
    const filter = filterSelect ? filterSelect.value : 'ALL';
    const memos = window.CashmemoDB.searchMemos(query, filter);
    const allMemos = window.CashmemoDB.getAllMemos();

    // KPI Metrics calculation
    const totalSales = allMemos.reduce((sum, m) => sum + (m.grandTotal + (m.previousDues || 0)), 0);
    const totalCollected = allMemos.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    const totalDues = allMemos.reduce((sum, m) => sum + (m.balanceDue || 0), 0);

    document.getElementById('historyKpiTotalSales').textContent = `₹ ${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('historyKpiCollected').textContent = `₹ ${totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('historyKpiPendingDues').textContent = `₹ ${totalDues.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    if (memos.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <div class="text-sm font-semibold">No memos found in ./data/bills.json</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = memos.map(m => {
      const hasDue = (m.balanceDue || 0) > 0.009;
      return `
        <div class="p-3.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-red-700/50 transition-all space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-mono font-bold text-sm text-red-900">#${escapeHtml(m.memoNumber)}</span>
                <span class="text-xs text-gray-500">${escapeHtml(m.date)}</span>
                ${hasDue ? `
                  <span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Due: ₹${m.balanceDue.toFixed(2)}
                  </span>
                ` : `
                  <span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Paid
                  </span>
                `}
              </div>
              <div class="text-xs font-bold text-gray-800 mt-1">${escapeHtml(m.customerName) || 'Cash Sale'}</div>
              ${m.customerMobile ? `<div class="text-[11px] text-gray-500">📞 ${escapeHtml(m.customerMobile)}</div>` : ''}
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Total Payable</div>
              <div class="text-sm font-black text-gray-900 font-mono">₹ ${(m.grandTotal + (m.previousDues || 0)).toFixed(2)}</div>
            </div>
          </div>

          <div class="text-[11px] text-gray-600 truncate border-t border-gray-100 pt-1.5">
            ${(m.items || []).map(i => `${i.description} (${i.quantity})`).join(', ')}
          </div>

          <div class="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
            <div class="flex space-x-1.5">
              <button class="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white font-medium rounded text-[11px] btn-memo-load" data-id="${m.id}">
                Edit / View
              </button>
              <button class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] btn-memo-dup" data-id="${m.id}">
                Duplicate
              </button>
              <button class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] btn-memo-print" data-id="${m.id}">
                Print
              </button>
            </div>
            <button class="p-1 text-gray-400 hover:text-red-600 transition-colors btn-memo-delete" data-id="${m.id}" title="Delete memo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.btn-memo-load').forEach(b => {
      b.addEventListener('click', function () {
        const memo = window.CashmemoDB.getMemoById(this.dataset.id);
        if (memo) {
          loadMemoIntoEditor(memo);
          closeAllModals();
        }
      });
    });

    listContainer.querySelectorAll('.btn-memo-dup').forEach(b => {
      b.addEventListener('click', function () {
        const memo = window.CashmemoDB.getMemoById(this.dataset.id);
        if (memo) {
          duplicateMemo(memo);
          closeAllModals();
        }
      });
    });

    listContainer.querySelectorAll('.btn-memo-print').forEach(b => {
      b.addEventListener('click', function () {
        const memo = window.CashmemoDB.getMemoById(this.dataset.id);
        if (memo) {
          loadMemoIntoEditor(memo);
          closeAllModals();
          setTimeout(() => window.print(), 200);
        }
      });
    });

    listContainer.querySelectorAll('.btn-memo-delete').forEach(b => {
      b.addEventListener('click', async function () {
        if (confirm('Delete this cash memo permanently?')) {
          await window.CashmemoDB.deleteMemo(this.dataset.id);
          renderHistoryList();
          showToast('Memo deleted from server storage.', 'info');
        }
      });
    });
  }

  // --- Customer Directory Modal ---
  function openCustomerModal() {
    renderCustomerList();
    document.getElementById('customerModal')?.classList.remove('hidden');
  }

  function renderCustomerList() {
    const container = document.getElementById('customerListContainer');
    const searchInput = document.getElementById('customerSearchInput');
    if (!container) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let customers = window.CashmemoDB.getAllCustomers();
    if (query) {
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(query) || (c.phoneNumber && c.phoneNumber.includes(query)) || (c.address && c.address.toLowerCase().includes(query))
      );
    }

    if (customers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-gray-400">
          <div class="text-sm font-semibold">No customers registered</div>
          <div class="text-xs">Saved customers will persist in ./data/customers.json</div>
        </div>
      `;
      return;
    }

    container.innerHTML = customers.map(c => {
      const hasDue = (c.outstandingBalance || 0) > 0.009;
      return `
        <div class="p-3 bg-white border border-gray-200 rounded-lg hover:border-red-700/50 transition-colors flex justify-between items-center">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-sm text-gray-900">${escapeHtml(c.name)}</span>
              ${hasDue ? `
                <span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Due: ₹${Number(c.outstandingBalance).toFixed(2)}
                </span>
              ` : `
                <span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Clear
                </span>
              `}
            </div>
            <div class="text-xs text-gray-500 mt-0.5">📞 ${escapeHtml(c.phoneNumber || 'N/A')} • 📍 ${escapeHtml(c.address || 'Sasaram')}</div>
          </div>
          <div class="flex items-center space-x-2">
            <button class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 font-semibold rounded text-xs btn-cust-bill"
              data-name="${escapeHtml(c.name)}"
              data-phone="${escapeHtml(c.phoneNumber || '')}"
              data-address="${escapeHtml(c.address || '')}"
              data-balance="${c.outstandingBalance || 0}">
              + New Bill
            </button>
            <button class="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs btn-cust-pay"
              data-id="${c.id}"
              data-name="${escapeHtml(c.name)}"
              data-balance="${c.outstandingBalance || 0}">
              Pay Due
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-cust-bill').forEach(b => {
      b.addEventListener('click', function () {
        createNewMemo();
        state.customerName = this.dataset.name;
        state.customerMobile = this.dataset.phone;
        state.customerAddress = this.dataset.address;
        state.previousDues = Number(this.dataset.balance) || 0;

        document.getElementById('editorCustomerName').value = state.customerName;
        document.getElementById('editorCustomerMobile').value = state.customerMobile;
        document.getElementById('editorCustomerAddress').value = state.customerAddress;
        document.getElementById('editorPreviousDues').value = state.previousDues;

        updateLiveCalculations();
        closeAllModals();
        showToast(`Created bill for ${this.dataset.name}`, 'info');
      });
    });

    container.querySelectorAll('.btn-cust-pay').forEach(b => {
      b.addEventListener('click', function () {
        openPaymentSettlementModal(this.dataset.id, this.dataset.name, Number(this.dataset.balance) || 0);
      });
    });
  }

  function openPaymentSettlementModal(customerId, customerName, outstandingDue) {
    const modal = document.getElementById('paymentSettleModal');
    if (!modal) return;

    document.getElementById('settleCustName').textContent = customerName;
    document.getElementById('settleDueAmount').textContent = `₹ ${outstandingDue.toFixed(2)}`;
    document.getElementById('settleAmountInput').value = outstandingDue.toFixed(2);
    document.getElementById('settleNoteInput').value = 'Carry Forward';
    modal.dataset.customerId = customerId;
    modal.classList.remove('hidden');
  }

  // --- Plant Rate Catalog Modal ---
  function openRatesModal() {
    renderRatesList();
    document.getElementById('ratesModal')?.classList.remove('hidden');
  }

  function renderRatesList() {
    const container = document.getElementById('ratesListContainer');
    const searchInput = document.getElementById('ratesSearchInput');
    if (!container) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let rates = window.CashmemoDB.getAllRates();
    if (query) {
      rates = rates.filter(r => r.name.toLowerCase().includes(query) || (r.category && r.category.toLowerCase().includes(query)));
    }

    if (rates.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-gray-400">
          <div class="text-sm font-semibold">No plants in catalog</div>
          <div class="text-xs">Click "+ Add Plant" to add custom plants and items</div>
        </div>
      `;
      return;
    }

    container.innerHTML = rates.map(r => `
      <div class="p-3 bg-white border border-gray-200 rounded-lg hover:border-red-700/50 transition-colors flex justify-between items-center">
        <div>
          <div class="font-bold text-sm text-gray-900">${escapeHtml(r.name)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(r.category || 'Plants')}</div>
          <div class="flex space-x-3 text-xs mt-1">
            <span class="font-semibold text-gray-700">Retail: <span class="text-red-900 font-bold font-mono">₹${r.retailPrice}</span></span>
            <span class="font-semibold text-gray-700">Wholesale: <span class="text-blue-900 font-bold font-mono">₹${r.wholesalePrice}</span></span>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button class="px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white font-semibold rounded text-xs btn-add-rate-bill"
            data-name="${escapeHtml(r.name)}"
            data-retail="${r.retailPrice}"
            data-wholesale="${r.wholesalePrice}">
            + Add to Bill
          </button>
          <button class="p-1.5 text-gray-400 hover:text-red-600 transition-colors btn-rate-del" data-id="${r.id}" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-add-rate-bill').forEach(b => {
      b.addEventListener('click', function () {
        const name = this.dataset.name;
        const price = state.isWholesaleMode ? Number(this.dataset.wholesale) : Number(this.dataset.retail);

        const first = state.items[0];
        if (state.items.length === 1 && (!first.description || first.description.trim() === '') && first.amount === 0) {
          first.description = name;
          first.rate = price;
          first.quantity = 1;
        } else {
          state.items.push(createItem(state.items.length + 1, name, 1, price));
        }

        renderEditorItems();
        updateLiveCalculations();
        showToast(`Added ${name} (₹${price}) to bill!`, 'success');
      });
    });

    container.querySelectorAll('.btn-rate-del').forEach(b => {
      b.addEventListener('click', async function () {
        if (confirm('Delete this item from plant rate catalog?')) {
          await window.CashmemoDB.deleteRate(this.dataset.id);
          renderRatesList();
          showToast('Plant deleted from catalog.', 'info');
        }
      });
    });
  }

  // --- Business Profile Settings ---
  function openSettingsModal() {
    const profile = window.CashmemoDB.getBusinessProfile();
    document.getElementById('cfgShopNameHindi').value = profile.shopNameHindi || '';
    document.getElementById('cfgShopNameEnglish').value = profile.shopNameEnglish || '';
    document.getElementById('cfgTagline').value = profile.tagline || '';
    document.getElementById('cfgPhone').value = profile.phone || '';
    document.getElementById('cfgAddress1').value = profile.addressLine1 || '';
    document.getElementById('cfgAddress2').value = profile.addressLine2 || '';
    // GSTIN strictly set to "NaN" if not present
    document.getElementById('cfgGstin').value = profile.gstin || 'NaN';
    document.getElementById('cfgUpiVpa').value = profile.upiVpa || 'dangerousop@ybl';
    document.getElementById('cfgSignerName').value = profile.signerName || 'VISHAL NURSERY';
    document.getElementById('cfgNextMemoNum').value = profile.nextMemoNumber || 1001;
    document.getElementById('cfgEnableTax').checked = Boolean(profile.enableTax);
    document.getElementById('cfgTaxRate').value = profile.defaultTaxPercentage || 0;
    // Terms & Notes strictly matching specification
    document.getElementById('cfgTerms').value = profile.termsNote || 'Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks';

    document.getElementById('settingsModal')?.classList.remove('hidden');
  }

  async function saveSettings() {
    const updated = {
      shopNameHindi: document.getElementById('cfgShopNameHindi').value.trim(),
      shopNameEnglish: document.getElementById('cfgShopNameEnglish').value.trim(),
      tagline: document.getElementById('cfgTagline').value.trim(),
      phone: document.getElementById('cfgPhone').value.trim(),
      addressLine1: document.getElementById('cfgAddress1').value.trim(),
      addressLine2: document.getElementById('cfgAddress2').value.trim(),
      gstin: document.getElementById('cfgGstin').value.trim() || 'NaN',
      upiVpa: document.getElementById('cfgUpiVpa').value.trim(),
      signerName: document.getElementById('cfgSignerName').value.trim(),
      nextMemoNumber: parseInt(document.getElementById('cfgNextMemoNum').value, 10) || 1001,
      enableTax: document.getElementById('cfgEnableTax').checked,
      defaultTaxPercentage: Number(document.getElementById('cfgTaxRate').value) || 0,
      termsNote: document.getElementById('cfgTerms').value.trim() || 'Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks'
    };

    await window.CashmemoDB.saveBusinessProfile(updated);
    closeAllModals();
    updateLiveCalculations();
    showToast('Settings saved to ./data/settings.json!', 'success');
  }

  // --- Backup & Restore ---
  function openBackupModal() {
    document.getElementById('backupModal')?.classList.remove('hidden');
  }

  function downloadBackupJson() {
    const jsonStr = window.CashmemoDB.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cashmemo_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON file downloaded!', 'success');
  }

  function restoreBackupJson(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const res = await window.CashmemoDB.importFullBackup(e.target.result);
      if (res.success) {
        showToast(`Restored: ${res.memosCount} Memos, ${res.customersCount} Customers, ${res.ratesCount} Rates!`, 'success');
        closeAllModals();
        createNewMemo();
      } else {
        showToast(`Restore failed: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop, .drawer-backdrop').forEach(el => el.classList.add('hidden'));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Application Initialization ---
  async function init() {
    // Connect to server-side persistent local storage
    const status = await window.CashmemoDB.initDatabase();

    const profile = window.CashmemoDB.getBusinessProfile();
    state.memoNumber = String(profile.nextMemoNumber || 1001);
    state.taxPercentage = profile.enableTax ? profile.defaultTaxPercentage : 0;

    // Initialize DOM inputs
    document.getElementById('editorMemoNumber').value = state.memoNumber;
    document.getElementById('editorDate').value = state.date;
    document.getElementById('editorDueNote').value = 'Carry Forward';

    // Top Navigation Listeners
    document.getElementById('btnNewMemo')?.addEventListener('click', createNewMemo);
    document.getElementById('btnSaveMemo')?.addEventListener('click', () => saveCurrentMemo(false));
    document.getElementById('btnPrintMemo')?.addEventListener('click', () => saveCurrentMemo(true));
    document.getElementById('btnOpenHistory')?.addEventListener('click', openHistoryDrawer);
    document.getElementById('btnOpenCustomers')?.addEventListener('click', openCustomerModal);
    document.getElementById('btnOpenRates')?.addEventListener('click', openRatesModal);
    document.getElementById('btnOpenSettings')?.addEventListener('click', openSettingsModal);
    document.getElementById('btnOpenBackup')?.addEventListener('click', openBackupModal);
    document.getElementById('btnOpenShortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcutsModal')?.classList.remove('hidden');
    });

    // Theme Switchers
    document.getElementById('themeSelectTraditional')?.addEventListener('click', function () {
      state.previewTheme = 'traditional';
      this.classList.add('bg-red-900', 'text-white');
      this.classList.remove('bg-gray-100', 'text-gray-700');
      document.getElementById('themeSelectModern')?.classList.remove('bg-red-900', 'text-white');
      document.getElementById('themeSelectModern')?.classList.add('bg-gray-100', 'text-gray-700');
      updateLiveCalculations();
    });

    document.getElementById('themeSelectModern')?.addEventListener('click', function () {
      state.previewTheme = 'modern';
      this.classList.add('bg-red-900', 'text-white');
      this.classList.remove('bg-gray-100', 'text-gray-700');
      document.getElementById('themeSelectTraditional')?.classList.remove('bg-red-900', 'text-white');
      document.getElementById('themeSelectTraditional')?.classList.add('bg-gray-100', 'text-gray-700');
      updateLiveCalculations();
    });

    // Retail vs Wholesale Mode
    document.getElementById('rateModeToggle')?.addEventListener('change', function () {
      state.isWholesaleMode = this.checked;
      showToast(`Pricing mode: ${state.isWholesaleMode ? 'Wholesale (थोक मूल्य)' : 'Retail (खुदरा मूल्य)'}`, 'info');
      updateLiveCalculations();
    });

    // Add Row Button
    document.getElementById('btnAddRow')?.addEventListener('click', function () {
      state.items.push(createItem(state.items.length + 1, '', 1, 0));
      renderEditorItems();
      updateLiveCalculations();
    });

    // Inputs Binding
    document.getElementById('editorMemoNumber')?.addEventListener('input', function () {
      state.memoNumber = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorDate')?.addEventListener('input', function () {
      state.date = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorDueDate')?.addEventListener('input', function () {
      state.dueDate = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorCustomerAddress')?.addEventListener('input', function () {
      state.customerAddress = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorPreviousDues')?.addEventListener('input', function () {
      state.previousDues = Number(this.value) || 0;
      updateLiveCalculations();
    });

    document.getElementById('editorDiscount')?.addEventListener('input', function () {
      state.discount = Number(this.value) || 0;
      updateLiveCalculations();
    });

    document.getElementById('editorDiscountType')?.addEventListener('change', function () {
      state.discountType = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorTax')?.addEventListener('input', function () {
      state.taxPercentage = Number(this.value) || 0;
      updateLiveCalculations();
    });

    document.getElementById('editorPaidAmount')?.addEventListener('input', function () {
      state.hasCustomPayment = true;
      state.paidAmount = Number(this.value) || 0;
      updateLiveCalculations();
    });

    document.getElementById('editorPaymentMethod')?.addEventListener('change', function () {
      state.paymentMethod = this.value;
      updateLiveCalculations();
    });

    document.getElementById('editorDueNote')?.addEventListener('input', function () {
      state.paymentStatusNote = this.value;
      updateLiveCalculations();
    });

    // Close buttons
    document.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', closeAllModals));

    // History filter/search
    document.getElementById('historySearchInput')?.addEventListener('input', renderHistoryList);
    document.getElementById('historyFilterSelect')?.addEventListener('change', renderHistoryList);

    // Customer search & add
    document.getElementById('customerSearchInput')?.addEventListener('input', renderCustomerList);
    document.getElementById('btnAddNewCustomerModal')?.addEventListener('click', async function () {
      const name = prompt('Customer Name:');
      if (!name) return;
      const phone = prompt('Mobile Number:') || '';
      const address = prompt('Address:') || '';
      await window.CashmemoDB.saveCustomer({ name, phoneNumber: phone, address });
      renderCustomerList();
      showToast(`Added customer ${name}`, 'success');
    });

    // Rate search & add
    document.getElementById('ratesSearchInput')?.addEventListener('input', renderRatesList);
    document.getElementById('btnAddNewRateModal')?.addEventListener('click', async function () {
      const name = prompt('Plant / Item Name:');
      if (!name) return;
      const retail = Number(prompt('Retail Price (₹):') || 0);
      const wholesale = Number(prompt('Wholesale Price (₹):') || 0);
      const category = prompt('Category (e.g. फूल, फलदार पौधे, गमला):') || 'Plants';
      await window.CashmemoDB.saveRate({ name, retailPrice: retail, wholesalePrice: wholesale, category });
      renderRatesList();
      showToast(`Added ${name} to plant catalog!`, 'success');
    });

    // Settings save
    document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);

    // Backup & Restore
    document.getElementById('btnDownloadBackup')?.addEventListener('click', downloadBackupJson);
    document.getElementById('backupFileInput')?.addEventListener('change', function () {
      if (this.files && this.files[0]) restoreBackupJson(this.files[0]);
    });

    // Settle due action
    document.getElementById('btnConfirmSettle')?.addEventListener('click', async function () {
      const modal = document.getElementById('paymentSettleModal');
      const custId = modal.dataset.customerId;
      const amt = Number(document.getElementById('settleAmountInput').value) || 0;
      const method = document.getElementById('settlePaymentMethod').value;
      const note = document.getElementById('settleNoteInput').value;

      await window.CashmemoDB.recordCustomerPayment(custId, amt, method, note);
      modal.classList.add('hidden');
      renderCustomerList();
      updateLiveCalculations();
      showToast(`Recorded payment of ₹${amt}`, 'success');
    });

    // Initialize Autocomplete, Items, and Hotkeys
    initCustomerAutocomplete();
    renderEditorItems();
    updateLiveCalculations();

    window.KeyboardShortcuts.init({
      onSaveAndPrint: () => saveCurrentMemo(true),
      onSaveOnly: () => saveCurrentMemo(false),
      onNewRow: () => {
        state.items.push(createItem(state.items.length + 1, '', 1, 0));
        renderEditorItems();
        updateLiveCalculations();
        showToast('Inserted new item row (Alt+N)', 'info');
      },
      onToggleHistory: openHistoryDrawer,
      onToggleRates: openRatesModal,
      onToggleCustomers: openCustomerModal,
      onEscape: closeAllModals
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
