const axios = require('axios');

// Placeholder for AI Service integration
const getListingSuggestions = async (imageUrl) => {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/api/suggestions`, {
      image_url: imageUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching AI suggestions:', error.message);
    throw new Error('AI Service unavailable');
  }
};

module.exports = {
  getListingSuggestions
};
