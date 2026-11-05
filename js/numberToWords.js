/**
 * NumberToWordsConverter - Indian Numbering System
 * Converts numerical amounts into standard Indian English currency strings
 * e.g., 15420.50 -> "Fifteen Thousand Four Hundred Twenty Rupees and Fifty Paise Only"
 * (Crore, Lakh, Thousand, Hundred, Rupees, Paise)
 */

(function (window) {
  'use strict';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertLessThanThousand(n) {
    const num = Math.floor(n);
    let result = '';

    if (num >= 100) {
      result += units[Math.floor(num / 100)] + ' Hundred ';
    }

    const rem = num % 100;
    if (rem >= 1 && rem <= 19) {
      result += units[rem] + ' ';
    } else if (rem >= 20) {
      result += tens[Math.floor(rem / 10)] + ' ';
      if (rem % 10 > 0) {
        result += units[rem % 10] + ' ';
      }
    }

    return result.trim();
  }

  function convertIndianNumber(n) {
    let num = Math.floor(n);
    if (num === 0) return '';

    const crore = Math.floor(num / 10000000);
    num %= 10000000;

    const lakh = Math.floor(num / 100000);
    num %= 100000;

    const thousand = Math.floor(num / 1000);
    num %= 1000;

    const hundredAndBelow = num;

    let result = '';

    if (crore > 0) {
      result += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (hundredAndBelow > 0) {
      result += convertLessThanThousand(hundredAndBelow);
    }

    return result.trim();
  }

  function convertToIndianRupees(amount, currencyName = 'Rupees', paiseName = 'Paise') {
    const num = Number(amount);
    if (isNaN(num) || num === 0) {
      return `Zero ${currencyName} Only`;
    }

    const totalPaise = Math.round(Math.abs(num) * 100);
    const rupees = Math.floor(totalPaise / 100);
    const paise = totalPaise % 100;

    let words = '';
    if (rupees > 0) {
      words += convertIndianNumber(rupees) + ` ${currencyName}`;
    }
    if (paise > 0) {
      if (words.length > 0) words += ' and ';
      words += convertLessThanThousand(paise) + ` ${paiseName}`;
    }

    words += ' Only';
    if (num < 0) {
      words = 'Minus ' + words;
    }
    return words.trim();
  }

  function splitRupeesAndPaise(amount) {
    const num = Number(amount) || 0;
    const totalPaise = Math.round(Math.abs(num) * 100);
    const rs = Math.floor(totalPaise / 100);
    const ps = totalPaise % 100;
    const psStr = ps === 0 ? '--' : (ps < 10 ? '0' + ps : String(ps));
    return {
      rupees: (num < 0 ? '-' : '') + String(rs),
      paise: psStr
    };
  }

  function formatCurrency(amount, symbol = '₹') {
    const num = Number(amount) || 0;
    return `${symbol} ${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  window.NumberToWordsConverter = {
    convertToIndianRupees,
    splitRupeesAndPaise,
    formatCurrency
  };

})(window);
