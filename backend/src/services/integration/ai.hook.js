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

module.exports = {
  getListingSuggestions,
};
