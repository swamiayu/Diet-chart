// Hand-verified translations for common Indian / Ayurvedic food items and
// categories. This is the FIRST source of truth — MyMemory is only used for
// terms that are not found here, because machine translation frequently gets
// food terms wrong (e.g. "curd" -> literal translation instead of दही).
//
// Keys are lowercase English. Values hold the native script per language.
// To extend: just add a row. Keep the English key lowercase and singular-ish.

export const FOOD_GLOSSARY = {
  // ---------------- Dairy ----------------
  "milk":          { mr: "दूध",            hi: "दूध",            gu: "દૂધ" },
  "curd":          { mr: "दही",            hi: "दही",            gu: "દહીં" },
  "yogurt":        { mr: "दही",            hi: "दही",            gu: "દહીં" },
  "buttermilk":    { mr: "ताक",            hi: "छाछ",            gu: "છાશ" },
  "ghee":          { mr: "तूप",            hi: "घी",             gu: "ઘી" },
  "butter":        { mr: "लोणी",           hi: "मक्खन",          gu: "માખણ" },
  "paneer":        { mr: "पनीर",           hi: "पनीर",           gu: "પનીર" },
  "cottage cheese":{ mr: "पनीर",           hi: "पनीर",           gu: "પનીર" },
  "cream":         { mr: "साय",            hi: "मलाई",           gu: "મલાઈ" },
  "cheese":        { mr: "चीज",            hi: "चीज़",            gu: "ચીઝ" },

  // ---------------- Grains / Cereals ----------------
  "rice":          { mr: "तांदूळ",         hi: "चावल",           gu: "ચોખા" },
  "cooked rice":   { mr: "भात",            hi: "भात",            gu: "ભાત" },
  "wheat":         { mr: "गहू",            hi: "गेहूँ",          gu: "ઘઉં" },
  "barley":        { mr: "जव",             hi: "जौ",             gu: "જવ" },
  "corn":          { mr: "मका",            hi: "मक्का",          gu: "મકાઈ" },
  "maize":         { mr: "मका",            hi: "मक्का",          gu: "મકાઈ" },
  "sorghum":       { mr: "ज्वारी",         hi: "ज्वार",          gu: "જુવાર" },
  "jowar":         { mr: "ज्वारी",         hi: "ज्वार",          gu: "જુવાર" },
  "pearl millet":  { mr: "बाजरी",          hi: "बाजरा",          gu: "બાજરી" },
  "bajra":         { mr: "बाजरी",          hi: "बाजरा",          gu: "બાજરી" },
  "finger millet": { mr: "नाचणी",          hi: "रागी",           gu: "રાગી" },
  "ragi":          { mr: "नाचणी",          hi: "रागी",           gu: "રાગી" },
  "oats":          { mr: "ओट्स",           hi: "जई",             gu: "ઓટ્સ" },
  "semolina":      { mr: "रवा",            hi: "सूजी",           gu: "સોજી" },
  "flattened rice":{ mr: "पोहे",           hi: "पोहा",           gu: "પૌંઆ" },

  // ---------------- Pulses / Legumes ----------------
  "lentils":       { mr: "डाळ",            hi: "दाल",            gu: "દાળ" },
  "green gram":    { mr: "मूग",            hi: "मूंग",           gu: "મગ" },
  "moong":         { mr: "मूग",            hi: "मूंग",           gu: "મગ" },
  "chickpea":      { mr: "हरभरा",          hi: "चना",            gu: "ચણા" },
  "bengal gram":   { mr: "हरभरा",          hi: "चना",            gu: "ચણા" },
  "pigeon pea":    { mr: "तूर",            hi: "अरहर",           gu: "તુવેર" },
  "toor":          { mr: "तूर",            hi: "तूर",            gu: "તુવેર" },
  "black gram":    { mr: "उडीद",           hi: "उड़द",           gu: "અડદ" },
  "urad":          { mr: "उडीद",           hi: "उड़द",           gu: "અડદ" },
  "red lentil":    { mr: "मसूर",           hi: "मसूर",           gu: "મસૂર" },
  "masoor":        { mr: "मसूर",           hi: "मसूर",           gu: "મસૂર" },
  "kidney beans":  { mr: "राजमा",          hi: "राजमा",          gu: "રાજમા" },

  // ---------------- Vegetables ----------------
  "potato":        { mr: "बटाटा",          hi: "आलू",            gu: "બટાકા" },
  "tomato":        { mr: "टोमॅटो",         hi: "टमाटर",          gu: "ટમેટા" },
  "onion":         { mr: "कांदा",          hi: "प्याज़",          gu: "ડુંગળી" },
  "garlic":        { mr: "लसूण",           hi: "लहसुन",          gu: "લસણ" },
  "ginger":        { mr: "आले",            hi: "अदरक",           gu: "આદુ" },
  "spinach":       { mr: "पालक",           hi: "पालक",           gu: "પાલક" },
  "brinjal":       { mr: "वांगे",          hi: "बैंगन",          gu: "રીંગણ" },
  "eggplant":      { mr: "वांगे",          hi: "बैंगन",          gu: "રીંગણ" },
  "okra":          { mr: "भेंडी",          hi: "भिंडी",          gu: "ભીંડા" },
  "lady finger":   { mr: "भेंडी",          hi: "भिंडी",          gu: "ભીંડા" },
  "cauliflower":   { mr: "फुलकोबी",        hi: "फूलगोभी",        gu: "ફુલાવર" },
  "cabbage":       { mr: "कोबी",           hi: "पत्तागोभी",      gu: "કોબીજ" },
  "carrot":        { mr: "गाजर",           hi: "गाजर",           gu: "ગાજર" },
  "peas":          { mr: "वाटाणा",         hi: "मटर",            gu: "વટાણા" },
  "bottle gourd":  { mr: "दुधी भोपळा",     hi: "लौकी",           gu: "દૂધી" },
  "bitter gourd":  { mr: "कारले",          hi: "करेला",          gu: "કારેલા" },
  "cucumber":      { mr: "काकडी",          hi: "खीरा",           gu: "કાકડી" },
  "pumpkin":       { mr: "भोपळा",          hi: "कद्दू",          gu: "કોળું" },
  "radish":        { mr: "मुळा",           hi: "मूली",           gu: "મૂળા" },
  "coriander leaves": { mr: "कोथिंबीर",    hi: "धनिया",          gu: "કોથમીર" },
  "green chilli":  { mr: "हिरवी मिरची",    hi: "हरी मिर्च",      gu: "લીલા મરચા" },
  "drumstick":     { mr: "शेवगा",          hi: "सहजन",           gu: "સરગવો" },
  "fenugreek leaves": { mr: "मेथी",        hi: "मेथी",           gu: "મેથી" },

  // ---------------- Fruits ----------------
  "banana":        { mr: "केळे",           hi: "केला",           gu: "કેળું" },
  "mango":         { mr: "आंबा",           hi: "आम",             gu: "કેરી" },
  "apple":         { mr: "सफरचंद",         hi: "सेब",            gu: "સફરજન" },
  "grapes":        { mr: "द्राक्षे",       hi: "अंगूर",          gu: "દ્રાક્ષ" },
  "pomegranate":   { mr: "डाळिंब",         hi: "अनार",           gu: "દાડમ" },
  "orange":        { mr: "संत्रे",         hi: "संतरा",          gu: "સંતરા" },
  "guava":         { mr: "पेरू",           hi: "अमरूद",          gu: "જામફળ" },
  "papaya":        { mr: "पपई",            hi: "पपीता",          gu: "પપૈયું" },
  "watermelon":    { mr: "कलिंगड",         hi: "तरबूज़",          gu: "તરબૂચ" },
  "lemon":         { mr: "लिंबू",          hi: "नींबू",          gu: "લીંબુ" },
  "coconut":       { mr: "नारळ",           hi: "नारियल",         gu: "નાળિયેર" },
  "dates":         { mr: "खजूर",           hi: "खजूर",           gu: "ખજૂર" },
  "fig":           { mr: "अंजीर",          hi: "अंजीर",          gu: "અંજીર" },
  "sugarcane":     { mr: "ऊस",             hi: "गन्ना",          gu: "શેરડી" },

  // ---------------- Nuts / Dry Fruits ----------------
  "almond":        { mr: "बदाम",           hi: "बादाम",          gu: "બદામ" },
  "cashew":        { mr: "काजू",           hi: "काजू",           gu: "કાજુ" },
  "walnut":        { mr: "अक्रोड",         hi: "अखरोट",          gu: "અખરોટ" },
  "raisins":       { mr: "बेदाणे",         hi: "किशमिश",         gu: "કિસમિસ" },
  "groundnut":     { mr: "शेंगदाणे",       hi: "मूंगफली",        gu: "મગફળી" },
  "peanut":        { mr: "शेंगदाणे",       hi: "मूंगफली",        gu: "મગફળી" },
  "pistachio":     { mr: "पिस्ता",         hi: "पिस्ता",         gu: "પિસ્તા" },

  // ---------------- Spices / Condiments / Sweeteners ----------------
  "salt":          { mr: "मीठ",            hi: "नमक",            gu: "મીઠું" },
  "sugar":         { mr: "साखर",           hi: "चीनी",           gu: "ખાંડ" },
  "jaggery":       { mr: "गूळ",            hi: "गुड़",           gu: "ગોળ" },
  "honey":         { mr: "मध",             hi: "शहद",            gu: "મધ" },
  "turmeric":      { mr: "हळद",            hi: "हल्दी",          gu: "હળદર" },
  "cumin":         { mr: "जिरे",           hi: "जीरा",           gu: "જીરું" },
  "mustard":       { mr: "मोहरी",          hi: "सरसों",          gu: "રાઈ" },
  "black pepper":  { mr: "मिरी",           hi: "काली मिर्च",     gu: "મરી" },
  "asafoetida":    { mr: "हिंग",           hi: "हींग",           gu: "હિંગ" },
  "coriander seeds": { mr: "धने",          hi: "धनिया",          gu: "ધાણા" },
  "red chilli":    { mr: "लाल मिरची",      hi: "लाल मिर्च",      gu: "લાલ મરચું" },
  "cardamom":      { mr: "वेलची",          hi: "इलायची",         gu: "એલચી" },
  "cloves":        { mr: "लवंग",           hi: "लौंग",           gu: "લવિંગ" },
  "cinnamon":      { mr: "दालचिनी",        hi: "दालचीनी",        gu: "તજ" },
  "fenugreek seeds": { mr: "मेथी दाणे",    hi: "मेथी दाना",      gu: "મેથી દાણા" },
  "tamarind":      { mr: "चिंच",           hi: "इमली",           gu: "આમલી" },
  "oil":           { mr: "तेल",            hi: "तेल",            gu: "તેલ" },

  // ---------------- Non-Vegetarian ----------------
  "egg":           { mr: "अंडे",           hi: "अंडा",           gu: "ઈંડું" },
  "fish":          { mr: "मासे",           hi: "मछली",           gu: "માછલી" },
  "chicken":       { mr: "चिकन",           hi: "चिकन",           gu: "ચિકન" },
  "meat":          { mr: "मांस",           hi: "मांस",           gu: "માંસ" },
  "mutton":        { mr: "मटण",            hi: "मटन",            gu: "મટન" },

  // ---------------- Beverages ----------------
  "water":         { mr: "पाणी",           hi: "पानी",           gu: "પાણી" },
  "tea":           { mr: "चहा",            hi: "चाय",            gu: "ચા" },
  "coffee":        { mr: "कॉफी",           hi: "कॉफ़ी",           gu: "કોફી" },
  "warm water":    { mr: "कोमट पाणी",      hi: "गुनगुना पानी",   gu: "નવશેકું પાણી" },
};

// Verified translations for the food CATEGORY labels used across the app.
export const CATEGORY_GLOSSARY = {
  "dairy":              { mr: "दुग्धजन्य पदार्थ", hi: "दुग्ध उत्पाद",   gu: "ડેરી ઉત્પાદનો" },
  "fruits":             { mr: "फळे",              hi: "फल",             gu: "ફળ" },
  "vegetables":         { mr: "भाज्या",           hi: "सब्ज़ियाँ",       gu: "શાકભાજી" },
  "grains":             { mr: "धान्य",            hi: "अनाज",           gu: "અનાજ" },
  "cereals":            { mr: "धान्य",            hi: "अनाज",           gu: "અનાજ" },
  "pulses":             { mr: "कडधान्ये",         hi: "दालें",          gu: "કઠોળ" },
  "legumes":            { mr: "कडधान्ये",         hi: "दालें",          gu: "કઠોળ" },
  "spices":             { mr: "मसाले",            hi: "मसाले",          gu: "મસાલા" },
  "condiments":         { mr: "मसाले",            hi: "मसाले",          gu: "મસાલા" },
  "beverages":          { mr: "पेये",             hi: "पेय",            gu: "પીણાં" },
  "non-vegetarian":     { mr: "मांसाहार",         hi: "मांसाहार",       gu: "માંસાહાર" },
  "sweeteners":         { mr: "गोड पदार्थ",       hi: "मीठा",           gu: "ગળ્યું" },
  "oils":               { mr: "तेल व स्निग्ध पदार्थ", hi: "तेल व वसा",  gu: "તેલ અને ચરબી" },
  "nuts":               { mr: "सुकामेवा",         hi: "सूखे मेवे",      gu: "સૂકો મેવો" },
  "dry fruits":         { mr: "सुकामेवा",         hi: "सूखे मेवे",      gu: "સૂકો મેવો" },
};

// Build one combined lookup so the translation service can hit either set.
export function glossaryLookup(text, lang) {
  if (!text) return null;
  const key = text.trim().toLowerCase();
  const fromFood = FOOD_GLOSSARY[key]?.[lang];
  if (fromFood) return fromFood;
  const fromCat = CATEGORY_GLOSSARY[key]?.[lang];
  if (fromCat) return fromCat;
  return null;
}
