import React, { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { categoriesApi } from '../../marketplace/api/categoriesApi';
import { wantedPostsApi } from '../api/wantedPostsApi';

export default function WantedPostsPage() {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [mine, setMine] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', budgetMax: '' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await wantedPostsApi.list({ mine }));
    } catch (err) {
      setError(err.message || 'Could not load wanted posts.');
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useEffect(() => {
    categoriesApi.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await wantedPostsApi.create(form);
      setForm({ title: '', description: '', categoryId: '', budgetMax: '' });
      setMessage('Wanted post created. Matching listings will trigger a notification.');
      await loadPosts();
    } catch (err) {
      setError(err.message || 'Could not create wanted post.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (id) => {
    try {
      await wantedPostsApi.close(id);
      await loadPosts();
    } catch (err) {
      setError(err.message || 'Could not close wanted post.');
    }
  };

  return (
    <div className="marketplace-page page" style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, color: '#0f172a' }}>Wanted items</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>Post what you need. CampusConnect will match it against new listings.</p>
      </div>

      <div className="wanted-posts-layout">
        <form className="card" onSubmit={handleCreate} style={{ padding: 22 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> Post a wanted item</h2>
          <label htmlFor="wanted-title">Item title</label>
          <input id="wanted-title" value={form.title} maxLength={160} required onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Casio FX-991EX calculator" />
          <label htmlFor="wanted-description" style={{ marginTop: 12 }}>Details</label>
          <textarea id="wanted-description" value={form.description} maxLength={2000} required rows={4} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add edition, condition, or other details" />
          <label htmlFor="wanted-category" style={{ marginTop: 12 }}>Category</label>
          <select id="wanted-category" value={form.categoryId} required onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Select a category</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <label htmlFor="wanted-budget" style={{ marginTop: 12 }}>Maximum budget (₹, optional)</label>
          <input id="wanted-budget" type="number" min="0" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} placeholder="e.g. 800" />
          <button className="btn btn-primary" type="submit" disabled={busy || !form.categoryId} style={{ marginTop: 16, width: '100%' }}>{busy ? 'Posting…' : 'Post wanted item'}</button>
          {message && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{message}</p>}
          {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
        </form>

        <section className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={18} /> {mine ? 'My open wanted posts' : 'Open campus requests'}</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMine((value) => !value)}>{mine ? 'View all' : 'View mine'}</button>
          </div>
          {loading ? <p className="muted">Loading wanted posts…</p> : posts.length === 0 ? <p className="muted">No open wanted posts here yet.</p> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {posts.map((post) => (
                <article key={post._id} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{post.title}</strong>
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{post.categoryId?.name || 'Any category'} · {post.budgetMax != null ? `Budget up to ₹${post.budgetMax}` : 'No budget set'}</div>
                    </div>
                    {mine && <button className="btn btn-secondary btn-sm" type="button" aria-label="Close wanted post" title="Close request" onClick={() => handleClose(post._id)}><X size={14} /></button>}
                  </div>
                  <p style={{ margin: '10px 0 0', color: '#475569', fontSize: 13 }}>{post.description}</p>
                </article>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, margin: '16px 0 0', display: 'flex', alignItems: 'flex-start', gap: 6 }}><Check size={14} style={{ flexShrink: 0 }} /> Matching happens when eligible listings are published or approved. You’ll receive a notification when a match is found.</p>
        </section>
      </div>
    </div>
  );
}
