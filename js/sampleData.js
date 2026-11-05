/**
 * Sample seed data matching the Vishal Nursery Android app
 * Default business profile, plant rate catalog, and preset configuration
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
    gstin: "10AAAAA0000A1Z5",
    currencySymbol: "₹",
    memoPrefix: "VN-",
    nextMemoNumber: 1001,
    defaultTaxPercentage: 0.0,
    enableTax: false,
    taxType: "GST", // "GST" or "VAT"
    gstTaxSplit: "CGST_SGST", // "CGST_SGST" (intra-state) or "IGST" (inter-state)
    upiVpa: "dangerousop@ybl",
    signerName: "VISHAL NURSERY",
    printTheme: "traditional", // "traditional" (Maroon paper slip) or "modern" (Clean GST tax invoice)
    termsNote: "भूल-चूक लेनी-देनी (E. & O.E.) • सामान वापस नहीं होगा।"
  };

  const DEFAULT_PLANT_RATES = [
    { id: "pr_1", name: "गुलाब (English Rose in Pot)", category: "फूल (Flowers)", retailPrice: 120, wholesalePrice: 85, hsn: "0602" },
    { id: "pr_2", name: "गेंदा (Marigold Hybrid)", category: "फूल (Flowers)", retailPrice: 25, wholesalePrice: 15, hsn: "0602" },
    { id: "pr_3", name: "गुड़हल (Hibiscus Hawaiian)", category: "फूल (Flowers)", retailPrice: 90, wholesalePrice: 65, hsn: "0602" },
    { id: "pr_4", name: "गुलदावदी (Chrysanthemum)", category: "फूल (Flowers)", retailPrice: 60, wholesalePrice: 40, hsn: "0602" },
    { id: "pr_5", name: "बोगनवेलिया (Bougainvillea Multi-color)", category: "फूल (Flowers)", retailPrice: 150, wholesalePrice: 110, hsn: "0602" },
    { id: "pr_6", name: "मोगरा / बेला (Jasmine Mogra)", category: "फूल (Flowers)", retailPrice: 50, wholesalePrice: 35, hsn: "0602" },
    { id: "pr_7", name: "क्रोटन (Croton Petra in Pot)", category: "शोभाकार पौधे (Ornamental)", retailPrice: 180, wholesalePrice: 130, hsn: "0602" },
    { id: "pr_8", name: "मनी प्लांट (Golden Money Plant)", category: "शोभाकार पौधे (Ornamental)", retailPrice: 80, wholesalePrice: 55, hsn: "0602" },
    { id: "pr_9", name: "अरेका पाम (Areca Palm 3ft)", category: "शोभाकार पौधे (Ornamental)", retailPrice: 250, wholesalePrice: 190, hsn: "0602" },
    { id: "pr_10", name: "स्नेक प्लांट (Sansevieria Snake Plant)", category: "शोभाकार पौधे (Ornamental)", retailPrice: 140, wholesalePrice: 100, hsn: "0602" },
    { id: "pr_11", name: "आम कलम (Mango Amrapali Grafted)", category: "फलदार पौधे (Fruit Plants)", retailPrice: 220, wholesalePrice: 160, hsn: "0602" },
    { id: "pr_12", name: "अमरूद कलम (Guava VNR Bihi)", category: "फलदार पौधे (Fruit Plants)", retailPrice: 160, wholesalePrice: 115, hsn: "0602" },
    { id: "pr_13", name: "कागज़ी नींबू (Seedless Kagzi Lemon)", category: "फलदार पौधे (Fruit Plants)", retailPrice: 130, wholesalePrice: 90, hsn: "0602" },
    { id: "pr_14", name: "अनार (Pomegranate Sindhuri)", category: "फलदार पौधे (Fruit Plants)", retailPrice: 190, wholesalePrice: 140, hsn: "0602" },
    { id: "pr_15", name: "गमला प्लास्टिक 12 इंच (Plastic Gamla 12\")", category: "गमला व सामग्री (Pots & Tools)", retailPrice: 110, wholesalePrice: 85, hsn: "3926" },
    { id: "pr_16", name: "मिट्टी का गमला 10 इंच (Earthen Clay Pot 10\")", category: "गमला व सामग्री (Pots & Tools)", retailPrice: 70, wholesalePrice: 50, hsn: "6914" },
    { id: "pr_17", name: "वर्मीकम्पोस्ट खाद 5 किग्रा (Organic Vermicompost 5kg)", category: "खाद व उर्वरक (Fertilizer)", retailPrice: 150, wholesalePrice: 110, hsn: "3101" },
    { id: "pr_18", name: "नीम खली पाउडर 1 किग्रा (Neem Cake Powder 1kg)", category: "खाद व उर्वरक (Fertilizer)", retailPrice: 65, wholesalePrice: 45, hsn: "3101" }
  ];

  const SAMPLE_CUSTOMERS = [
    {
      id: "cust_1",
      name: "राजेश कुमार सिंह (Rajesh Kumar Singh)",
      phoneNumber: "9835012345",
      address: "वार्ड नं० 14, तकिया, सासाराम",
      outstandingBalance: 350.00,
      totalPurchased: 4850.00,
      totalPaid: 4500.00,
      lastPromiseNote: "Next Day (कल देगा)",
      createdAt: Date.now() - 86400000 * 5
    },
    {
      id: "cust_2",
      name: "विकास वर्मा (Vikas Verma)",
      phoneNumber: "9431287654",
      address: "माँ ताराचण्डी कॉलोनी, सासाराम",
      outstandingBalance: 0.00,
      totalPurchased: 2400.00,
      totalPaid: 2400.00,
      lastPromiseNote: "Fully Paid (चुकता)",
      createdAt: Date.now() - 86400000 * 12
    }
  ];

  window.SampleData = {
    DEFAULT_BUSINESS_PROFILE,
    DEFAULT_PLANT_RATES,
    SAMPLE_CUSTOMERS
  };

})(window);
