const axios = require('axios');

const getListingSuggestions = async ({
  file,
  description = '',
  nameOrBrand = '',
  age = '',
  condition = '',
}) => {
  if (!file || !file.buffer) throw new Error('A listing image is required');
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';

  const payload = {
    image_base64: file.buffer.toString('base64'),
    content_type: file.mimetype || 'image/jpeg',
    description: description || undefined,
    name_or_brand: nameOrBrand || undefined,
    age: age || undefined,
    condition: condition || undefined,
  };

  const response = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/api/v1/listings/suggest`,
    payload,
    { timeout: 35000, maxBodyLength: 10 * 1024 * 1024 }
  );

  return response.data;
};

const estimateListingPrice = async ({ title, category, condition, comparableItems = [] }) => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  const response = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/api/v1/pricing/estimate`,
    { title, category, condition, comparable_items: comparableItems },
    { timeout: 10000 }
  );
  return response.data;
};

const evaluateListingMatches = async ({ listing, wantedPosts }) => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  const response = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/api/v1/matching/evaluate`,
    { listing, wanted_posts: wantedPosts },
    { timeout: 35000 }
  );
  return response.data;
};

const extractUploadedDocument = async ({ file }) => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

  const extracted = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/api/v1/ocr/check-upload`,
    form,
    { timeout: 120000 }
  );
  return extracted.data;
};

const compareDocumentText = async ({ documentText, candidates = [], threshold = 0.82 }) => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  const response = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/api/v1/ocr/check`,
    { document_text: documentText, candidates, threshold },
    { timeout: 30000 }
  );
  return response.data;
};

module.exports = {
  getListingSuggestions,
  estimateListingPrice,
  evaluateListingMatches,
  extractUploadedDocument,
  compareDocumentText,
};
