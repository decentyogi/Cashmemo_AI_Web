/**
 * Default Business Configuration & Clean Initial State
 * Zero dummy seed records: Rate lists and customer profiles start 100% empty.
 */

(function (window) {
  'use strict';

  const DEFAULT_BUSINESS_PROFILE = {
    shopNameHindi: "विशाल नर्सरी",
    shopNameEnglish: "Vishal Nursery",
    tagline: "हमारे यहाँ हर प्रकार के फूल, पेड़-पौधा जैसे-गुलाब, गुलदावदी, गेंदा, क्रोटन सब गमले में तैयार पौधा भी मिलता है।",
    phone: "7631873743",
    email: "vishalnursery.sasaram@gmail.com",
    addressLine1: "ग्राम-कोटा, माँ ताराचण्डी रोड (माँ सीताराम मंदिर)",
    addressLine2: "पो०-सासाराम (रोहतास), बिहार - 821115",
    gstin: "NaN",
    currencySymbol: "₹",
    memoPrefix: "VN-",
    nextMemoNumber: 1001,
    defaultTaxPercentage: 0.0,
    enableTax: false,
    taxType: "GST",
    gstTaxSplit: "CGST_SGST",
    upiVpa: "dangerousop@ybl",
    signerName: "VISHAL NURSERY",
    printTheme: "traditional",
    termsNote: "Thanks For Visiting Vishal Nurshri !! Visit Again... Thanks"
  };

  // Clean initial state: zero hardcoded dummy rates or customers
  const DEFAULT_PLANT_RATES = [];
  const SAMPLE_CUSTOMERS = [];

  window.SampleData = {
    DEFAULT_BUSINESS_PROFILE,
    DEFAULT_PLANT_RATES,
    SAMPLE_CUSTOMERS
  };

})(window);
