import React, { useState } from 'react';
import { FolderTree, Plus, Search, Edit2, Trash2, Check, X, ShieldAlert, CheckCircle2, Package } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import AdminModal from './AdminModal';

export default function CategoryManagementView({ categories = [], onReload, onToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Form state for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    sortOrder: 0,
    requiresModeration: false,
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setFormData({
      name: '',
      icon: '',
      description: '',
      sortOrder: categories.length + 1,
      requiresModeration: false,
      isActive: true
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      icon: cat.icon || '',
      description: cat.description || '',
      sortOrder: cat.sortOrder ?? 0,
      requiresModeration: Boolean(cat.requiresModeration),
      isActive: cat.isActive !== false
    });
    setFormError('');
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createCategory({
        name: formData.name.trim(),
        icon: formData.icon.trim() || '',
        description: formData.description.trim(),
        sortOrder: Number(formData.sortOrder) || 0,
        requiresModeration: formData.requiresModeration
      });
      setIsCreateOpen(false);
      onToast?.('Category created successfully', 'success');
      onReload?.();
    } catch (err) {
      setFormError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.updateCategory(editingCategory._id, {
        name: formData.name.trim(),
        icon: formData.icon.trim() || '',
        description: formData.description.trim(),
        sortOrder: Number(formData.sortOrder) || 0,
        requiresModeration: formData.requiresModeration,
        isActive: formData.isActive
      });
      setEditingCategory(null);
      onToast?.('Category updated successfully', 'success');
      onReload?.();
    } catch (err) {
      setFormError(err.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await adminApi.updateCategory(cat._id, {
        isActive: !cat.isActive
      });
      onToast?.(`Category "${cat.name}" marked as ${!cat.isActive ? 'Active' : 'Inactive'}`, 'info');
      onReload?.();
    } catch (err) {
      onToast?.(`Failed to update status: ${err.message}`, 'danger');
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setSubmitting(true);
    try {
      await adminApi.deleteCategory(deletingCategory._id);
      setDeletingCategory(null);
      onToast?.('Category deleted successfully', 'success');
      onReload?.();
    } catch (err) {
      onToast?.(`Delete failed: ${err.message}`, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filtered = categories.filter(c =>
    !term ||
    (c.name || '').toLowerCase().includes(term) ||
    (c.slug || '').toLowerCase().includes(term) ||
    (c.description || '').toLowerCase().includes(term)
  );

  return (
    <div>
      <div className="adm-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Marketplace Category Taxonomy</h2>
          <p>Configure campus categories, icons, ordering, and moderation requirements for student listings.</p>
        </div>
        <button type="button" className="adm-btn primary" onClick={openCreate}>
          <Plus size={16} /> Add New Category
        </button>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search categories by name or slug…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search categories"
          />
        </label>
        <div className="adm-cell-sub" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
          Total: <b>{categories.length} categories</b>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Icon</th>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Order</th>
                <th>Moderation Policy</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-empty">
                      <div className="adm-empty-icon"><FolderTree size={24} /></div>
                      <b>No categories found</b>
                      <span>{categories.length > 0 ? 'No categories match your search.' : 'No categories configured in system.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(cat => (
                  <tr key={cat._id}>
                    <td style={{ textAlign: 'center' }}><Package size={18} style={{ color: '#64748b' }} /></td>
                    <td>
                      <div className="adm-cell-title">{cat.name}</div>
                      {cat.description && <div className="adm-cell-sub">{cat.description}</div>}
                    </td>
                    <td><code>{cat.slug}</code></td>
                    <td><span className="adm-pill gray">{cat.sortOrder ?? 0}</span></td>
                    <td>
                      <span className={`adm-pill ${cat.requiresModeration ? 'amber' : 'gray'}`}>
                        {cat.requiresModeration ? 'Requires Review' : 'Auto-approved'}
                      </span>
                    </td>
                    <td>
                      <span className={`adm-pill ${cat.isActive !== false ? 'green' : 'red'}`}>
                        {cat.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="right">
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-btn sm secondary"
                          onClick={() => openEdit(cat)}
                          title="Edit Category"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className={`adm-btn sm ${cat.isActive !== false ? 'secondary' : 'success'}`}
                          onClick={() => handleToggleActive(cat)}
                          title={cat.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {cat.isActive !== false ? <X size={13} /> : <Check size={13} />}
                          {cat.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          className="adm-btn sm danger"
                          onClick={() => setDeletingCategory(cat)}
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <AdminModal
          title="Add New Marketplace Category"
          onClose={() => setIsCreateOpen(false)}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button type="button" className="adm-btn primary" disabled={submitting} onClick={handleCreate}>
                {submitting ? 'Creating...' : 'Create Category'}
              </button>
            </>
          }
        >
          {formError && <div className="adm-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
          <div className="adm-field">
            <label className="adm-label">Category Name *</label>
            <input
              type="text"
              className="adm-input"
              placeholder="e.g. Graphic Calculators & Math Tools"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="adm-field">
              <label className="adm-label">Icon Tag</label>
              <input
                type="text"
                className="adm-input"
                placeholder="e.g. Tools, Electronics"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Display Order</label>
              <input
                type="number"
                className="adm-input"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: e.target.value }))}
              />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label">Description</label>
            <textarea
              className="adm-textarea"
              placeholder="Brief description of items accepted under this category..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="adm-field" style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={formData.requiresModeration}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresModeration: e.target.checked }))}
              />
              Require admin approval before listings in this category become active
            </label>
          </div>
        </AdminModal>
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <AdminModal
          title={`Edit Category: ${editingCategory.name}`}
          onClose={() => setEditingCategory(null)}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={() => setEditingCategory(null)}>Cancel</button>
              <button type="button" className="adm-btn primary" disabled={submitting} onClick={handleUpdate}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          {formError && <div className="adm-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
          <div className="adm-field">
            <label className="adm-label">Category Name *</label>
            <input
              type="text"
              className="adm-input"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="adm-field">
              <label className="adm-label">Icon Tag</label>
              <input
                type="text"
                className="adm-input"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Display Order</label>
              <input
                type="number"
                className="adm-input"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: e.target.value }))}
              />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label">Description</label>
            <textarea
              className="adm-textarea"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="adm-field" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={formData.requiresModeration}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresModeration: e.target.checked }))}
              />
              Require admin approval before listings in this category become active
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              Active in campus marketplace
            </label>
          </div>
        </AdminModal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <AdminModal
          title={`Delete Category: ${deletingCategory.name}`}
          onClose={() => setDeletingCategory(null)}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={() => setDeletingCategory(null)}>Cancel</button>
              <button type="button" className="adm-btn danger" disabled={submitting} onClick={handleDelete}>
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </>
          }
        >
          <p className="adm-note">
            Are you sure you want to delete category <b>{deletingCategory.name}</b>?
            Existing listings in this category will retain their category reference, but students will no longer be able to select it for new listings.
          </p>
        </AdminModal>
      )}
    </div>
  );
}
