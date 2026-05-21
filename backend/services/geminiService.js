const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { categories, paymentMethods } = require('../models/Expense');

const coerceAllowed = (value, allowed, fallback) => {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return allowed.find((entry) => entry.toLowerCase() === normalized) || fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const getGeminiModelCandidates = () => {
  const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return [...new Set([configuredModel, 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'])];
};

const shouldTryNextModel = (error) => {
  const status = error.status || error.response?.status;
  const message = String(error.message || '').toLowerCase();
  return status === 400 || status === 404 || message.includes('not found') || message.includes('not supported');
};

const buildGeminiQuotaError = (error) => {
  const retryMatch = String(error.message || '').match(/Please retry in\s+([0-9.]+)s/i);
  const retryAfterSeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
  const quotaError = new Error(
    'Gemini API quota exceeded for the configured project. Use a Gemini API key from a project with available quota or billing enabled.'
  );
  quotaError.statusCode = 429;
  quotaError.expose = true;
  quotaError.details = {
    provider: 'gemini',
    retryAfterSeconds
  };
  return quotaError;
};

const sanitizeAIExpense = (payload) => {
  const today = new Date().toISOString().slice(0, 10);
  const date = Number.isNaN(Date.parse(payload.date)) ? today : payload.date;
  const items = Array.isArray(payload.items)
    ? payload.items
        .filter((item) => item && item.name)
        .map((item) => ({ name: String(item.name).trim(), price: toNumber(item.price) }))
    : [];

  const subtotal = toNumber(payload.subtotal, items.reduce((sum, item) => sum + item.price, 0));
  const tax = toNumber(payload.tax);
  const total = toNumber(payload.total, subtotal + tax);

  return {
    merchant: String(payload.merchant || 'Unknown Merchant').trim(),
    date,
    items,
    subtotal,
    tax,
    total,
    paymentMethod: coerceAllowed(payload.paymentMethod, paymentMethods, 'Other'),
    category: coerceAllowed(payload.category, categories, 'Others')
  };
};

const analyzeReceiptAI = async (fileUrl, mimeType) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing system initialization variable: GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const fileBuffer = Buffer.isBuffer(fileUrl)
    ? fileUrl
    : Buffer.from((await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: 10 * 1000 * 1000
      })).data);
  const base64Data = fileBuffer.toString('base64');

  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType
    }
  };

  const prompt = `
Analyze this financial artifact receipt, bill, or invoice. Extract data and structure it strictly as a JSON object matching this schema:
{
  "merchant": "String",
  "date": "YYYY-MM-DD",
  "items": [{"name": "String", "price": Number}],
  "subtotal": Number,
  "tax": Number,
  "total": Number,
  "paymentMethod": "Cash | Card | UPI | NetBanking | Other",
  "category": "Food | Travel | Entertainment | Shopping | Medical | Education | Utilities | Bills | Groceries | Others"
}
Fallback to the current date if missing. Return only valid minified JSON with no markdown.
`;

  let result;
  let lastModelError;

  for (const modelName of getGeminiModelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent([prompt, filePart]);
      break;
    } catch (error) {
      const status = error.status || error.response?.status;
      if (status === 429) {
        throw buildGeminiQuotaError(error);
      }
      lastModelError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }

  if (!result) {
    throw new Error(`Gemini model unavailable. Set GEMINI_MODEL to a model that supports generateContent. Last error: ${lastModelError?.message || 'unknown error'}`);
  }

  const responseText = result.response.text().trim();

  try {
    const sanitizedJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return sanitizeAIExpense(JSON.parse(sanitizedJSON));
  } catch (err) {
    throw new Error(`AI Optimization Output Corrupted. Received: ${responseText}`);
  }
};

module.exports = { analyzeReceiptAI };
