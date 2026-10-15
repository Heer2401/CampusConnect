const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { requireAuth, requireRole } = require('../services/integration/auth.adapter');

router.get('/', getCategories);
router.get('/:idOrSlug', getCategory);

router.post('/', requireAuth, requireRole('admin'), createCategory);
router.patch('/:id', requireAuth, requireRole('admin'), updateCategory);
router.delete('/:id', requireAuth, requireRole('admin'), deleteCategory);

module.exports = router;
