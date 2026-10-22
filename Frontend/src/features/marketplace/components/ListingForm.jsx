import React, { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { listingsApi } from '../api/listingsApi';
import { ImageUploader } from './ImageUploader';

const showAiSuggestionSlot = import.meta.env.VITE_FEATURE_AI_SUGGESTIONS !== 'false';

export const ListingForm = ({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  existingImages = [],
  onDeleteExistingImage,
  onSetPrimaryExistingImage
}) => {
  const { categories, loading: categoriesLoading } = useCategories();

  const [listingType, setListingType] = useState(initialValues.listingType || 'sell');
  const [title, setTitle] = useState(initialValues.title || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [category, setCategory] = useState(initialValues.category?._id || initialValues.category || '');
  const [condition, setCondition] = useState(initialValues.condition || 'good');
  const [price, setPrice] = useState(initialValues.price !== undefined ? initialValues.price : '');
  const [rentalRate, setRentalRate] = useState(initialValues.rentalRate !== undefined ? initialValues.rentalRate : '');
  const [rentalPeriod, setRentalPeriod] = useState(initialValues.rentalPeriod || 'week');
  const [deposit, setDeposit] = useState(initialValues.deposit !== undefined ? initialValues.deposit : '');
  const [exchangeFor, setExchangeFor] = useState(initialValues.exchangeFor || '');
  const [pickupLocation, setPickupLocation] = useState(initialValues.pickupLocation || '');
  const [quantity, setQuantity] = useState(initialValues.quantity || 1);
  const [tags, setTags] = useState(initialValues.tags || []);
  const [tagInput, setTagInput] = useState('');

  const [pendingFiles, setPendingFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [aiBrand, setAiBrand] = useState('');
  const [aiAge, setAiAge] = useState('');
  const [aiConditionHint, setAiConditionHint] = useState('');
  const [aiMetadata, setAiMetadata] = useState(null);
  const [showAiHints, setShowAiHints] = useState(false);

  const handleAiSuggestion = async () => {
    if (!pendingFiles.length) {
      setAiMessage('Add a photo first to get listing suggestions.');
      return;
    }
    setIsSuggesting(true);
    setAiMessage('');
    try {
      const suggestion = await listingsApi.suggestFromImage(pendingFiles[0], {
        description,
        nameOrBrand: aiBrand,
        age: aiAge,
        condition: aiConditionHint,
      });

      if (suggestion.title) setTitle(suggestion.title);
      if (suggestion.description) setDescription(suggestion.description);
      if (suggestion.condition) {
        const normalizedCondition = suggestion.condition.toLowerCase().replace(/\s+/g, '_');
        if (['new', 'like_new', 'good', 'fair', 'poor'].includes(normalizedCondition)) {
          setCondition(normalizedCondition);
        }
      }
      if (suggestion.categoryId) {
        setCategory(suggestion.categoryId);
      } else if (suggestion.category) {
        const matchedCategory = categories.find((item) =>
          item.name.toLowerCase() === suggestion.category.toLowerCase()
          || item.slug?.toLowerCase() === suggestion.category.toLowerCase()
        );
        if (matchedCategory) setCategory(matchedCategory._id);
      }
      if (suggestion.tags && Array.isArray(suggestion.tags) && suggestion.tags.length > 0) {
        const combined = Array.from(new Set([...tags, ...suggestion.tags])).slice(0, 8);
        setTags(combined);
      }
      if (listingType === 'sell' && Number(suggestion.estimated_price) > 0) {
        setPrice(String(Math.round(Number(suggestion.estimated_price))));
      }
      setAiSource(suggestion.source || 'AI');
      setAiMetadata(suggestion.ai_metadata || { source: suggestion.source || 'AI', generatedAt: new Date().toISOString() });
      setAiMessage(
        suggestion.category && !categories.some((item) =>
          item.name.toLowerCase() === suggestion.category.toLowerCase()
          || item.slug?.toLowerCase() === suggestion.category.toLowerCase()
        )
          ? `Suggestions filled in! Category “${suggestion.category}” isn't in your category list, so please select one manually.`
          : 'Suggestions filled in! Review and edit them before saving or publishing.'
      );
    } catch (error) {
      setAiMessage(error.message || 'AI suggestions are unavailable. You can continue filling the form manually.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleTypeChange = (newType) => {
    setListingType(newType);
    setErrors(prev => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
    // Clear other type-specific fields on change
    if (newType !== 'sell') setPrice('');
    if (newType !== 'rent') {
      setRentalRate('');
      setDeposit('');
    }
    if (newType !== 'exchange') setExchangeFor('');
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (val && !tags.includes(val)) {
        if (tags.length >= 8) {
          setErrors(prev => ({ ...prev, tags: 'Maximum 8 tags allowed' }));
          return;
        }
        setTags([...tags, val]);
        setTagInput('');
        setErrors(prev => ({ ...prev, tags: null }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const validate = () => {
    const errs = {};

    if (!title || title.trim().length < 3 || title.trim().length > 100) {
      errs.title = 'Title must be between 3 and 100 characters';
    }

    if (!description || description.trim().length < 10 || description.trim().length > 2000) {
      errs.description = 'Description must be between 10 and 2000 characters';
    }

    if (!category) {
      errs.category = 'Please select a category';
    }

    if (listingType === 'sell') {
      if (price === '' || price === null || Number(price) <= 0) {
        errs.price = 'Price is required and must be greater than 0';
      }
    } else if (listingType === 'rent') {
      if (rentalRate === '' || rentalRate === null || Number(rentalRate) <= 0) {
        errs.rentalRate = 'Rental rate is required and must be greater than 0';
      }
      if (!['day', 'week', 'month'].includes(rentalPeriod)) {
        errs.rentalPeriod = 'Please select a rental period';
      }
    } else if (listingType === 'exchange') {
      if (!exchangeFor || exchangeFor.trim().length < 3 || exchangeFor.trim().length > 300) {
        errs.exchangeFor = 'Exchange description must be between 3 and 300 characters';
      }
    }

    if (quantity < 1) {
      errs.quantity = 'Quantity must be at least 1';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e, status = 'active') => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      listingType,
      condition,
      pickupLocation: pickupLocation.trim(),
      quantity: Number(quantity),
      tags,
      status,
    };

    if (listingType === 'sell') {
      payload.price = Number(price);
    } else if (listingType === 'rent') {
      payload.rentalRate = Number(rentalRate);
      payload.rentalPeriod = rentalPeriod;
      if (deposit !== '') payload.deposit = Number(deposit);
    } else if (listingType === 'exchange') {
      payload.exchangeFor = exchangeFor.trim();
    } else if (listingType === 'giveaway') {
      payload.price = 0;
    }

    if (aiMetadata || aiSource) {
      payload.aiMeta = {
        isAiGenerated: true,
        source: aiSource || 'AI',
        ...(aiMetadata || {}),
      };
    }

    onSubmit(payload, pendingFiles);
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, 'active')}>
      <div className="grid2">
        {/* Left Column: Photos & AI slot */}
        <div className="card">
          <h2 style={{ fontSize: 16 }}>Listing Photos</h2>
          <ImageUploader
            existingImages={existingImages}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
            onDeleteExisting={onDeleteExistingImage}
            onSetPrimaryExisting={onSetPrimaryExistingImage}
            disabled={isSubmitting}
          />

          {/* AI listing suggestions */}
          {showAiSuggestionSlot && (
            <div
              className="card"
              style={{
                background: '#f5f3ff',
                marginTop: 16,
                borderLeft: '4px solid #7c3aed',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#5b21b6' }}>✨ AI Listing Generator {aiSource && <small>({aiSource})</small>}</b>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6d28d9',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  onClick={() => setShowAiHints(prev => !prev)}
                >
                  {showAiHints ? 'Hide optional hints' : '+ Add optional hints'}
                </button>
              </div>
              <p className="muted" style={{ marginTop: 4, marginBottom: 10, fontSize: 13 }}>
                Upload a photo to automatically draft title, category, description, and condition.
              </p>

              {showAiHints && (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Brand / Model (optional hint, e.g. Casio FX-991EX)"
                    value={aiBrand}
                    onChange={(e) => setAiBrand(e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px', background: '#fff' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Age / Usage (e.g. 6 mos, 1 yr)"
                      value={aiAge}
                      onChange={(e) => setAiAge(e.target.value)}
                      style={{ fontSize: 13, padding: '6px 10px', background: '#fff' }}
                    />
                    <select
                      value={aiConditionHint}
                      onChange={(e) => setAiConditionHint(e.target.value)}
                      style={{ fontSize: 13, padding: '6px 10px', background: '#fff' }}
                    >
                      <option value="">Condition hint (optional)</option>
                      <option value="new">New</option>
                      <option value="like_new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAiSuggestion}
                disabled={isSubmitting || isSuggesting || categoriesLoading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isSuggesting ? 'Analyzing photo with AI…' : 'Generate Details with AI'}
              </button>
              {aiMessage && (
                <p
                  className="muted"
                  role="status"
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: aiMessage.includes('unavailable') ? '#b91c1c' : '#4338ca',
                    fontWeight: 500
                  }}
                >
                  {aiMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Listing Details */}
        <div className="card">
          {/* Type Selector Tabs */}
          <label style={{ marginTop: 0 }}>Listing Type</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['sell', 'rent', 'exchange', 'giveaway'].map((type) => (
              <button
                key={type}
                type="button"
                className={`chip ${listingType === type ? 'active' : ''}`}
                style={{ flex: 1, textTransform: 'capitalize', textAlign: 'center', margin: 0 }}
                onClick={() => handleTypeChange(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Title */}
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            placeholder="e.g. Used Calculus Textbook (8th Ed.)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={errors.title ? 'error' : ''}
          />
          {errors.title && <span className="error-text">{errors.title}</span>}

          {/* Category */}
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={categoriesLoading}
            className={errors.category ? 'error' : ''}
          >
            <option value="">Select a Category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category && <span className="error-text">{errors.category}</span>}

          {/* Type-Specific Fields */}
          {listingType === 'sell' && (
            <div>
              <label htmlFor="price">Price (₹) *</label>
              <input
                id="price"
                type="number"
                placeholder="₹450"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={errors.price ? 'error' : ''}
              />
              {errors.price && <span className="error-text">{errors.price}</span>}
            </div>
          )}

          {listingType === 'rent' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="rentalRate">Rental Rate (₹) *</label>
                <input
                  id="rentalRate"
                  type="number"
                  placeholder="₹25"
                  value={rentalRate}
                  onChange={(e) => setRentalRate(e.target.value)}
                  className={errors.rentalRate ? 'error' : ''}
                />
                {errors.rentalRate && <span className="error-text">{errors.rentalRate}</span>}
              </div>
              <div>
                <label htmlFor="rentalPeriod">Per Period *</label>
                <select
                  id="rentalPeriod"
                  value={rentalPeriod}
                  onChange={(e) => setRentalPeriod(e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="deposit">Security Deposit (₹) (Optional)</label>
                <input
                  id="deposit"
                  type="number"
                  placeholder="₹200"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                />
              </div>
            </div>
          )}

          {listingType === 'exchange' && (
            <div>
              <label htmlFor="exchangeFor">What do you want in exchange? *</label>
              <input
                id="exchangeFor"
                placeholder="e.g. Looking for Algorithms textbook or Python book"
                value={exchangeFor}
                onChange={(e) => setExchangeFor(e.target.value)}
                className={errors.exchangeFor ? 'error' : ''}
              />
              {errors.exchangeFor && <span className="error-text">{errors.exchangeFor}</span>}
            </div>
          )}

          {listingType === 'giveaway' && (
            <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: 8, marginTop: 14 }}>
              <b style={{ color: '#92400e', fontSize: 13 }}>Free Item</b>
              <p className="muted" style={{ fontSize: 12 }}>
                This item is listed as a campus giveaway at ₹0 price.
              </p>
            </div>
          )}

          {/* Condition */}
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          {/* Description */}
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            rows="3"
            placeholder="Lightly used, all pages intact, no markings."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-text">{errors.description}</span>}

          {/* Pickup Location & Quantity */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label htmlFor="pickupLocation">Pickup Location</label>
              <input
                id="pickupLocation"
                placeholder="e.g. Hostel Block C / Main Canteen"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <label htmlFor="tags">Tags (Up to 8 tags, press Enter or comma)</label>
          <input
            id="tags"
            placeholder="e.g. calculus, sem3, maths"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
          {errors.tags && <span className="error-text">{errors.tags}</span>}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {tags.map((tag) => (
                <span key={tag} className="chip-tag">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'draft')}
            >
              Save Draft
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {isSubmitting ? 'Saving...' : 'Publish Listing'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
