import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Lightbulb,
  Lock,
  FileText,
  Tag,
  Clock,
  Repeat,
  Gift,
  MapPin,
  Package,
  Camera,
  Star,
  Send,
  AlertCircle
} from 'lucide-react';
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

  // ── Multi-Step Stepper State ────────────────────────────────────────────────
  // Step 1: Photos & AI
  // Step 2: Item Details (Title, Category, Condition, Description, Tags)
  // Step 3: Pricing & Terms (Dynamic fields based on Listing Type)
  // Step 4: Review & Publish
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState([1]);

  // Form Fields
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

  // AI Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [aiBrand, setAiBrand] = useState('');
  const [aiAge, setAiAge] = useState('');
  const [aiConditionHint, setAiConditionHint] = useState('');
  const [aiMetadata, setAiMetadata] = useState(null);
  const [showAiHints, setShowAiHints] = useState(false);
  const [aiGeneratedFields, setAiGeneratedFields] = useState([]);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [priceEstimateMessage, setPriceEstimateMessage] = useState('');
  const [studyDocument, setStudyDocument] = useState(null);
  const [isCheckingDocument, setIsCheckingDocument] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrMessage, setOcrMessage] = useState('');
  const [checkedStudyDocument, setCheckedStudyDocument] = useState(null);
  const [extractedDocumentText, setExtractedDocumentText] = useState('');

  const invalidatePriceEstimate = () => {
    if (priceEstimate) setPrice('');
    setPriceEstimate(null);
    setPriceEstimateMessage('');
  };

  const invalidateOcrCheck = () => {
    setOcrResult(null);
    setOcrMessage('');
    setCheckedStudyDocument(null);
    setExtractedDocumentText('');
  };

  useEffect(() => {
    if (categories.length > 0 && !category) {
      const match = categories.find((c) =>
        (initialValues.categoryName && (
          c.name.toLowerCase().includes(initialValues.categoryName.toLowerCase()) ||
          initialValues.categoryName.toLowerCase().includes(c.name.toLowerCase())
        )) ||
        (typeof initialValues.category === 'string' && (
          c.name.toLowerCase().includes(initialValues.category.toLowerCase()) ||
          c._id === initialValues.category
        ))
      );
      if (match) {
        setCategory(match._id);
      }
    }
  }, [categories, category, initialValues.category, initialValues.categoryName]);

  // AI Suggestion Trigger
  const handleAiSuggestion = async () => {
    if (!pendingFiles.length) {
      setAiMessage('Please upload at least one photo first to generate suggestions.');
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

      invalidatePriceEstimate();
      const updatedFields = [];
      if (suggestion.title) {
        setTitle(suggestion.title);
        updatedFields.push('title');
      }
      if (suggestion.description) {
        setDescription(suggestion.description);
        updatedFields.push('description');
      }
      if (suggestion.condition) {
        const normalized = suggestion.condition.toLowerCase().replace(/\s+/g, '_');
        if (['new', 'like_new', 'good', 'fair', 'poor'].includes(normalized)) {
          setCondition(normalized);
          updatedFields.push('condition');
        }
      }
      if (suggestion.categoryId) {
        setCategory(suggestion.categoryId);
        updatedFields.push('category');
      } else if (suggestion.category) {
        const matched = categories.find((item) =>
          item.name.toLowerCase() === suggestion.category.toLowerCase() ||
          item.slug?.toLowerCase() === suggestion.category.toLowerCase()
        );
        if (matched) {
          setCategory(matched._id);
          updatedFields.push('category');
        }
      }
      if (suggestion.tags && Array.isArray(suggestion.tags) && suggestion.tags.length > 0) {
        const combined = Array.from(new Set([...tags, ...suggestion.tags])).slice(0, 8);
        setTags(combined);
      }
      if (listingType === 'sell' && Number(suggestion.estimated_price) > 0) {
        setPrice(String(Math.round(Number(suggestion.estimated_price))));
        updatedFields.push('price');
      }

      setAiGeneratedFields(updatedFields);
      setAiSource(suggestion.source || 'AI');
      setAiMetadata(suggestion.ai_metadata || { source: suggestion.source || 'AI', generatedAt: new Date().toISOString() });
      setAiMessage('AI suggestions generated! All fields remain 100% editable in the next step.');
    } catch (error) {
      setAiMessage(
        error.message ||
        'AI assistance is currently offline. You can proceed with manual entry without any issues.'
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleTypeChange = (newType) => {
    setListingType(newType);
    setErrors(prev => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
    if (newType !== 'sell') setPrice('');
    if (newType !== 'rent') {
      setRentalRate('');
      setDeposit('');
    }
    if (newType !== 'exchange') setExchangeFor('');
  };

  const handlePriceEstimate = async () => {
    if (!title.trim() || !category) {
      setPriceEstimateMessage('Add an item title and choose a category first.');
      return;
    }

    setIsEstimatingPrice(true);
    setPriceEstimate(null);
    setPriceEstimateMessage('');
    try {
      const estimate = await listingsApi.estimatePrice({
        title: title.trim(),
        category,
        condition,
      });
      if (estimate.estimated_price === null || estimate.estimated_price === undefined) {
        setPriceEstimateMessage('There are not enough comparable listings yet. Enter a price manually.');
        return;
      }
      setPrice(String(Math.round(Number(estimate.estimated_price))));
      setPriceEstimate(estimate);
      setPriceEstimateMessage('Estimate added. You can edit the price before publishing.');
    } catch (error) {
      setPriceEstimateMessage(error.message || 'Price estimation is unavailable. Enter a price manually.');
    } finally {
      setIsEstimatingPrice(false);
    }
  };

  const runOcrCheck = async () => {
    if (!studyDocument || !category) {
      setOcrMessage('Choose a study document and category first.');
      return null;
    }
    setIsCheckingDocument(true);
    setOcrResult(null);
    setOcrMessage('Extracting text and checking existing study materials…');
    try {
      const result = await listingsApi.checkStudyDocument(studyDocument, category);
      setOcrResult(result);
      setCheckedStudyDocument(studyDocument);
      setExtractedDocumentText(result.extracted_text || '');
      setOcrMessage(result.is_duplicate
        ? `Possible duplicate: ${result.matched_title || 'an existing study material'} (${Math.round(result.similarity * 100)}% similar).`
        : `No duplicate found. Checked against ${result.candidate_count} existing document${result.candidate_count === 1 ? '' : 's'}.`);
      return result;
    } catch (error) {
      setOcrMessage(error.message || 'OCR is unavailable. Save a draft and try again before publishing.');
      return null;
    } finally {
      setIsCheckingDocument(false);
    }
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

  // Step Validations
  const validateStep2 = () => {
    const errs = {};
    if (!title || title.trim().length < 3 || title.trim().length > 100) {
      errs.title = 'Title must be between 3 and 100 characters';
    }
    if (!category) {
      errs.category = 'Please select a category';
    }
    if (!description || description.trim().length < 10 || description.trim().length > 2000) {
      errs.description = 'Description must be between 10 and 2000 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
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
      if (deposit !== '' && Number(deposit) < 0) {
        errs.deposit = 'Security deposit cannot be negative';
      }
    } else if (listingType === 'exchange') {
      if (!exchangeFor || exchangeFor.trim().length < 3 || exchangeFor.trim().length > 300) {
        errs.exchangeFor = 'Please specify what you are seeking in exchange (3–300 chars)';
      }
    }

    if (quantity < 1) {
      errs.quantity = 'Quantity must be at least 1';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToStep = (step) => {
    if (step === 2 && currentStep === 1) {
      // Step 1 photos are optional or recommended
      setCurrentStep(2);
      if (!visitedSteps.includes(2)) setVisitedSteps([...visitedSteps, 2]);
    } else if (step === 3) {
      if (validateStep2()) {
        setCurrentStep(3);
        if (!visitedSteps.includes(3)) setVisitedSteps([...visitedSteps, 3]);
      }
    } else if (step === 4) {
      if (validateStep2() && validateStep3()) {
        setCurrentStep(4);
        if (!visitedSteps.includes(4)) setVisitedSteps([...visitedSteps, 4]);
      }
    } else {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async (e, status = 'active') => {
    e.preventDefault();
    if (!validateStep2() || !validateStep3()) return;

    let documentText = '';
    if (status !== 'draft' && isStudyMaterial && studyDocument) {
      const check = checkedStudyDocument === studyDocument ? ocrResult : await runOcrCheck();
      if (!check) return;
      if (check.is_duplicate) {
        setCurrentStep(2);
        return;
      }
      documentText = check.extracted_text || '';
    }

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
    if (documentText) payload.documentText = documentText;

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

    await onSubmit(payload, pendingFiles);
  };

  // Duplicate Check for Notes / Question Papers
  const selectedCategoryObj = categories.find((c) => c._id === category);
  const selectedCategorySlug = selectedCategoryObj?.slug || selectedCategoryObj?.name?.toLowerCase() || '';
  const isStudyMaterial =
    selectedCategorySlug.includes('note') ||
    selectedCategorySlug.includes('paper') ||
    /notes|question paper|pyq|exam|midsem|endsem/i.test(title);

  const totalPhotosCount = existingImages.length + pendingFiles.length;

  return (
    <form onSubmit={(e) => handleSubmit(e, 'active')}>
      {/* ── Stepper Navigation Bar ─────────────────────────────────────────── */}
      <div className="create-stepper">
        <div
          className={`stepper-step ${currentStep === 1 ? 'active' : visitedSteps.includes(1) ? 'completed' : ''}`}
          onClick={() => goToStep(1)}
        >
          <span className="stepper-number">{visitedSteps.includes(1) && currentStep > 1 ? <Check size={13} /> : '1'}</span>
          <span className="stepper-label">Photos & AI</span>
        </div>
        <div className={`stepper-divider ${currentStep > 1 ? 'active' : ''}`} />

        <div
          className={`stepper-step ${currentStep === 2 ? 'active' : visitedSteps.includes(2) ? 'completed' : ''}`}
          onClick={() => goToStep(2)}
        >
          <span className="stepper-number">{visitedSteps.includes(2) && currentStep > 2 ? <Check size={13} /> : '2'}</span>
          <span className="stepper-label">Item Details</span>
        </div>
        <div className={`stepper-divider ${currentStep > 2 ? 'active' : ''}`} />

        <div
          className={`stepper-step ${currentStep === 3 ? 'active' : visitedSteps.includes(3) ? 'completed' : ''}`}
          onClick={() => goToStep(3)}
        >
          <span className="stepper-number">{visitedSteps.includes(3) && currentStep > 3 ? <Check size={13} /> : '3'}</span>
          <span className="stepper-label">Pricing & Terms</span>
        </div>
        <div className={`stepper-divider ${currentStep > 3 ? 'active' : ''}`} />

        <div
          className={`stepper-step ${currentStep === 4 ? 'active' : ''}`}
          onClick={() => goToStep(4)}
        >
          <span className="stepper-number">4</span>
          <span className="stepper-label">Review & Publish</span>
        </div>
      </div>

      {/* ── STEP 1: Add Photos & AI Assistance ─────────────────────────────── */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Photos Upload Column */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
                  Upload Photos
                </h2>
                <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                  Add up to 6 clear photos. The first photo is your main cover image.
                </p>
              </div>
              <span className="pill pill-blue" style={{ fontSize: 12 }}>
                {totalPhotosCount}/6 Photos
              </span>
            </div>

            <ImageUploader
              existingImages={existingImages}
              pendingFiles={pendingFiles}
              onPendingFilesChange={setPendingFiles}
              onDeleteExisting={onDeleteExistingImage}
              onSetPrimaryExisting={onSetPrimaryExistingImage}
              disabled={isSubmitting}
            />

            <div className="step-nav-footer">
              <span className="muted" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={15} style={{ color: '#d97706' }} /> Tip: Photos increase response rates by over 3x on campus.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => goToStep(2)}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                Next: Enter Item Details →
              </button>
            </div>
          </div>

          {/* AI Assistance Column */}
          <div className="card" style={{ padding: 24, background: '#faf5ff', border: '1.5px solid #e9d5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={20} color="#7e22ce" />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#581c87', margin: 0 }}>
                AI Listing Assistant
              </h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b21a8', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Upload an item photo and our campus AI will automatically analyze it to draft title, category, condition, and description.
            </p>

            <div style={{ background: '#ffffff', borderRadius: 10, padding: 14, border: '1px solid #f3e8ff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95' }}>
                  Optional Hints (Improves Accuracy)
                </span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7c3aed',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  onClick={() => setShowAiHints(prev => !prev)}
                >
                  {showAiHints ? 'Hide hints' : '+ Add hints'}
                </button>
              </div>

              {showAiHints && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Brand / Model / Course (e.g. Casio FX-991, MTH101)"
                    value={aiBrand}
                    onChange={(e) => setAiBrand(e.target.value)}
                    style={{ fontSize: 13, padding: '8px 10px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Age (e.g. 1 semester)"
                      value={aiAge}
                      onChange={(e) => setAiAge(e.target.value)}
                      style={{ fontSize: 13, padding: '8px 10px' }}
                    />
                    <select
                      value={aiConditionHint}
                      onChange={(e) => setAiConditionHint(e.target.value)}
                      style={{ fontSize: 13, padding: '8px 10px' }}
                    >
                      <option value="">Condition hint</option>
                      <option value="new">New</option>
                      <option value="like_new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAiSuggestion}
              disabled={isSubmitting || isSuggesting || pendingFiles.length === 0}
              style={{
                width: '100%',
                background: '#7c3aed',
                borderColor: '#6d28d9',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {isSuggesting ? (
                'Analyzing Photo with AI…'
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} /> Generate Listing Draft with AI
                </span>
              )}
            </button>

            {aiMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  background: aiMessage.includes('unavailable') ? '#fef2f2' : '#f0fdf4',
                  color: aiMessage.includes('unavailable') ? '#991b1b' : '#166534',
                  border: `1px solid ${aiMessage.includes('unavailable') ? '#fecaca' : '#bbf7d0'}`,
                  lineHeight: 1.45
                }}
              >
                {aiMessage}
              </div>
            )}

            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: 11, color: '#6b21a8', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Lock size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span><b>Student Control Guaranteed:</b> AI provides suggestions only. You can edit, adjust, or completely rewrite every field in Step 2.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Item Details ───────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto', padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
              Item Details
            </h2>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              Fields marked with <span className="required-star">*</span> are required.
            </p>
          </div>

          {/* Title */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="title">
                Title <span className="required-star">*</span>
              </label>
              <span className="muted" style={{ fontSize: 11 }}>
                {title.length}/100
              </span>
            </div>
            <input
              id="title"
              placeholder="e.g. Thomas Calculus 14th Edition with Solution Guide"
              value={title}
              maxLength={100}
              onChange={(e) => {
                invalidatePriceEstimate();
                setTitle(e.target.value);
              }}
              className={errors.title ? 'error' : ''}
            />
            {errors.title ? (
              <span className="error-text">{errors.title}</span>
            ) : (
              <div className="form-field-helper">
                Include brand, model, author, or edition for quick peer search discovery.
              </div>
            )}
          </div>

          {/* Category */}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="category">
              Category <span className="required-star">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                invalidatePriceEstimate();
                invalidateOcrCheck();
                setCategory(e.target.value);
              }}
              disabled={categoriesLoading}
              className={errors.category ? 'error' : ''}
            >
              <option value="">
                {categoriesLoading ? 'Loading categories...' : 'Select a Category'}
              </option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
            {errors.category ? (
              <span className="error-text">{errors.category}</span>
            ) : (
              <div className="form-field-helper">
                Categorizing your item helps counterparties find it through browse filters.
              </div>
            )}
          </div>

          {/* Duplicate Notice for Study Material / Question Papers */}
          {isStudyMaterial && (
            <div style={{ marginTop: 16 }}>
              <div className="academic-duplicate-warning" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FileText size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
                <p><b>Sharing Academic Study Material?</b> Upload the notes or question paper to check for duplicates before publishing.</p>
              </div>
              <label htmlFor="studyDocument" style={{ marginTop: 10 }}>Study document (PDF or image, optional)</label>
              <input
                id="studyDocument"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    setOcrMessage('Document must be 10 MB or smaller.');
                    event.target.value = '';
                    return;
                  }
                  setStudyDocument(file);
                  invalidateOcrCheck();
                }}
              />
              {studyDocument && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{studyDocument.name}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                    setStudyDocument(null);
                    invalidateOcrCheck();
                  }}>Remove document</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={runOcrCheck} disabled={isCheckingDocument || !category}>
                    {isCheckingDocument ? 'Checking…' : 'Check for duplicates'}
                  </button>
                </div>
              )}
              {ocrMessage && (
                <p role="status" style={{ fontSize: 12, margin: '8px 0 0', color: ocrResult?.is_duplicate ? '#b91c1c' : ocrResult ? '#166534' : '#475569' }}>{ocrMessage}</p>
              )}
            </div>
          )}

          {/* Condition */}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="condition">
              Condition <span className="required-star">*</span>
            </label>
            <select
              id="condition"
              value={condition}
              onChange={(e) => {
                invalidatePriceEstimate();
                setCondition(e.target.value);
              }}
            >
              <option value="new">New (Unopened, in original packaging)</option>
              <option value="like_new">Like New (Barely used, zero flaws)</option>
              <option value="good">Good (Lightly used, fully functional)</option>
              <option value="fair">Fair (Noticeable cosmetic wear, fully working)</option>
              <option value="poor">Poor (Heavy wear, suitable for spare parts/rough use)</option>
            </select>
            <div className="form-field-helper">
              Accurate condition builds your campus reputation and avoids disputes at physical meetup.
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="description">
                Description <span className="required-star">*</span>
              </label>
              <span className="muted" style={{ fontSize: 11 }}>
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="description"
              rows={4}
              placeholder="Provide details about the item's condition, subject, semester, or included accessories (e.g., covers, cables, markings)."
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'error' : ''}
              style={{ resize: 'vertical' }}
            />
            {errors.description ? (
              <span className="error-text">{errors.description}</span>
            ) : (
              <div className="form-field-helper">
                Minimum 10 characters. Mentioning any highlights or flaws helps buyers decide faster.
              </div>
            )}
          </div>

          {/* Search Tags */}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="tags">Search Tags (Up to 8 tags)</label>
            <input
              id="tags"
              placeholder="e.g. sem3, calculus, engineering, drafter (press Enter)"
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
          </div>

          {/* Step Footer Navigation */}
          <div className="step-nav-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => goToStep(1)}
            >
              ← Back: Photos
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goToStep(3)}
              style={{ padding: '10px 22px' }}
            >
              Next: Pricing & Terms →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Pricing & Terms (Dynamic Form Based on Listing Type) ────── */}
      {currentStep === 3 && (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto', padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
              Pricing & Handover Terms
            </h2>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              Choose your listing type. The form adapts dynamically to show only relevant fields.
            </p>
          </div>

          {/* Dynamic Listing Type Cards */}
          <div className="listing-type-cards">
            <div
              className={`type-select-card ${listingType === 'sell' ? 'active' : ''}`}
              onClick={() => handleTypeChange('sell')}
            >
              <Tag size={20} className="type-select-icon" style={{ color: '#2563eb' }} />
              <span className="type-select-title">Sell</span>
              <span className="type-select-desc">Direct campus purchase</span>
            </div>

            <div
              className={`type-select-card ${listingType === 'rent' ? 'active' : ''}`}
              onClick={() => handleTypeChange('rent')}
            >
              <Clock size={20} className="type-select-icon" style={{ color: '#16a34a' }} />
              <span className="type-select-title">Rent</span>
              <span className="type-select-desc">Temporary borrowing</span>
            </div>

            <div
              className={`type-select-card ${listingType === 'exchange' ? 'active' : ''}`}
              onClick={() => handleTypeChange('exchange')}
            >
              <Repeat size={20} className="type-select-icon" style={{ color: '#9333ea' }} />
              <span className="type-select-title">Exchange</span>
              <span className="type-select-desc">Item-for-item barter</span>
            </div>

            <div
              className={`type-select-card ${listingType === 'giveaway' ? 'active' : ''}`}
              onClick={() => handleTypeChange('giveaway')}
            >
              <Gift size={20} className="type-select-icon" style={{ color: '#d97706' }} />
              <span className="type-select-title">Giveaway</span>
              <span className="type-select-desc">Free community gift</span>
            </div>
          </div>

          {/* ── Dynamic Fields Based on Listing Type ──────────────────────── */}
          {/* A. Sell Fields */}
          {listingType === 'sell' && (
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <label htmlFor="price" style={{ marginTop: 0 }}>
                Selling Price (₹) <span className="required-star">*</span>
              </label>
              <input
                id="price"
                type="number"
                min="1"
                placeholder="e.g. 450"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPriceEstimate(null);
                  setPriceEstimateMessage('');
                }}
                className={errors.price ? 'error' : ''}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePriceEstimate}
                disabled={isEstimatingPrice || !title.trim() || !category}
                style={{ marginTop: 10 }}
              >
                {isEstimatingPrice ? 'Estimating…' : 'Get price estimate'}
              </button>
              {priceEstimateMessage && (
                <div className="form-field-helper" role="status" style={{ marginTop: 8 }}>
                  {priceEstimateMessage}
                </div>
              )}
              {priceEstimate && (
                <div className="form-field-helper" style={{ marginTop: 4 }}>
                  Suggested range: ₹{Math.round(priceEstimate.price_low)}–₹{Math.round(priceEstimate.price_high)}
                  {' '}from {priceEstimate.comparable_count} comparable listing{priceEstimate.comparable_count === 1 ? '' : 's'}.
                  {priceEstimate.excluded_outlier_count > 0 && (
                    <> {priceEstimate.excluded_outlier_count} unusual price{priceEstimate.excluded_outlier_count === 1 ? ' was' : 's were'} excluded.</>
                  )}
                </div>
              )}
              {errors.price ? (
                <span className="error-text">{errors.price}</span>
              ) : (
                <div className="form-field-helper" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lightbulb size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>Tip: Fair campus pricing (30–50% below retail) ensures fast sales among students.</span>
                </div>
              )}
            </div>
          )}

          {/* B. Rent Fields */}
          {listingType === 'rent' && (
            <div style={{ background: '#f0fdf4', padding: 18, borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label htmlFor="rentalRate" style={{ marginTop: 0 }}>
                    Rental Rate (₹) <span className="required-star">*</span>
                  </label>
                  <input
                    id="rentalRate"
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={rentalRate}
                    onChange={(e) => setRentalRate(e.target.value)}
                    className={errors.rentalRate ? 'error' : ''}
                  />
                  {errors.rentalRate && <span className="error-text">{errors.rentalRate}</span>}
                </div>
                <div>
                  <label htmlFor="rentalPeriod" style={{ marginTop: 0 }}>
                    Per Period <span className="required-star">*</span>
                  </label>
                  <select
                    id="rentalPeriod"
                    value={rentalPeriod}
                    onChange={(e) => setRentalPeriod(e.target.value)}
                  >
                    <option value="day">Per Day</option>
                    <option value="week">Per Week</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label htmlFor="deposit" style={{ marginTop: 0 }}>
                  Security Deposit (₹) <span className="muted" style={{ fontWeight: 400 }}>(Optional, Refundable)</span>
                </label>
                <input
                  id="deposit"
                  type="number"
                  min="0"
                  placeholder="e.g. 200"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className={errors.deposit ? 'error' : ''}
                />
                {errors.deposit ? (
                  <span className="error-text">{errors.deposit}</span>
                ) : (
                  <div className="form-field-helper" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={12} style={{ flexShrink: 0 }} />
                    <span>Refunded in full to the renter when the item is returned in good condition.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. Exchange Fields */}
          {listingType === 'exchange' && (
            <div style={{ background: '#faf5ff', padding: 18, borderRadius: 12, border: '1px solid #e9d5ff', marginBottom: 20 }}>
              <label htmlFor="exchangeFor" style={{ marginTop: 0 }}>
                What do you want in exchange? <span className="required-star">*</span>
              </label>
              <input
                id="exchangeFor"
                placeholder="e.g. Looking for Data Structures book (2nd Ed.) or scientific calculator"
                value={exchangeFor}
                onChange={(e) => setExchangeFor(e.target.value)}
                className={errors.exchangeFor ? 'error' : ''}
              />
              {errors.exchangeFor ? (
                <span className="error-text">{errors.exchangeFor}</span>
              ) : (
                <div className="form-field-helper">
                  Be specific so peers know what trade proposals you are willing to accept.
                </div>
              )}
            </div>
          )}

          {/* D. Giveaway Fields */}
          {listingType === 'giveaway' && (
            <div style={{ background: '#fef3c7', padding: 16, borderRadius: 12, border: '1px solid #fde68a', marginBottom: 20 }}>
              <b style={{ color: '#92400e', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Gift size={16} /> Free Campus Giveaway (₹0)
              </b>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#b45309', lineHeight: 1.45 }}>
                This item will be listed for free campus pickup. Sharing items gives them a second life and boosts your Campus Eco Score!
              </p>
            </div>
          )}

          {/* Shared Handover & Quantity Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <div>
              <label htmlFor="pickupLocation" style={{ marginTop: 0 }}>
                Campus Pickup Location
              </label>
              <input
                id="pickupLocation"
                placeholder="e.g. Central Library Foyer / Main Canteen"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
              <div className="form-field-helper" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} style={{ flexShrink: 0 }} />
                <span>Where you prefer to physically meet counterparties on campus.</span>
              </div>
            </div>
            <div>
              <label htmlFor="quantity" style={{ marginTop: 0 }}>
                Quantity Available
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={errors.quantity ? 'error' : ''}
              />
              {errors.quantity && <span className="error-text">{errors.quantity}</span>}
            </div>
          </div>

          {/* Step Footer Navigation */}
          <div className="step-nav-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => goToStep(2)}
            >
              ← Back: Item Details
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goToStep(4)}
              style={{ padding: '10px 22px' }}
            >
              Next: Review & Publish →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review and Publish ─────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="card" style={{ maxWidth: 840, margin: '0 auto', padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>
              Review Your Listing
            </h2>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              Verify how your listing will appear to counterparties before publishing.
            </p>
          </div>

          {/* Interactive Preview Card */}
          <div className="review-preview-box">
            {/* Left: Photos Preview */}
            <div>
              <div
                style={{
                  width: '100%',
                  height: 220,
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {pendingFiles.length > 0 ? (
                  <img
                    src={URL.createObjectURL(pendingFiles[0])}
                    alt="Cover preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : existingImages.length > 0 ? (
                  <img
                    src={existingImages[0].url}
                    alt="Cover preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: '#94a3b8' }}>
                      <Camera size={32} />
                    </div>
                    <span style={{ fontSize: 12 }}>No photo uploaded</span>
                  </div>
                )}
                {totalPhotosCount > 0 && (
                  <span
                    className="pill pill-blue"
                    style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Star size={11} fill="#fff" /> Main Photo ({totalPhotosCount} total)
                  </span>
                )}
              </div>
            </div>

            {/* Right: Key Specs Preview */}
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className="pill pill-blue">
                  {selectedCategoryObj?.name || 'General Item'}
                </span>
                <span className={`pill ${listingType === 'rent' ? 'pill-green' : listingType === 'exchange' ? 'pill-purple' : listingType === 'giveaway' ? 'pill-yellow' : 'pill-gray'}`}>
                  {listingType.toUpperCase()}
                </span>
                <span className="pill pill-gray" style={{ textTransform: 'capitalize' }}>
                  {condition.replace('_', ' ')}
                </span>
              </div>

              <h3 style={{ fontSize: 20, margin: '0 0 10px 0', color: '#0f172a' }}>
                {title || 'Untitled Listing'}
              </h3>

              {/* Pricing Callout */}
              <div style={{ marginBottom: 14 }}>
                {listingType === 'sell' && (
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#1d4ed8' }}>
                    ₹{price || 0} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Fixed Price</span>
                  </div>
                )}
                {listingType === 'rent' && (
                  <div>
                    <span style={{ fontSize: 26, fontWeight: 800, color: '#166534' }}>
                      ₹{rentalRate || 0}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>/{rentalPeriod}</span>
                    {deposit ? <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>(Deposit: ₹{deposit})</span> : null}
                  </div>
                )}
                {listingType === 'exchange' && (
                  <div style={{ color: '#6b21a8' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Seeking in trade:</span> {exchangeFor || 'Item exchange'}
                  </div>
                )}
                {listingType === 'giveaway' && (
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                    Free Item (₹0)
                  </div>
                )}
              </div>

              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-line', margin: '0 0 12px 0' }}>
                {description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {pickupLocation || 'Campus meetup spot to be coordinated'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Package size={13} /> Qty: {quantity}
                </span>
              </div>

              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {tags.map(t => (
                    <span key={t} className="chip-tag" style={{ fontSize: 11 }}>#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publishing Policy Notice */}
          <div
            style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: '#166534'
            }}
          >
            <Check size={16} />
            <span>
              <b>Instant Live Publishing:</b> Your listing will be visible across the campus marketplace immediately upon confirmation.
            </span>
          </div>

          {/* Step 4 Final Actions */}
          <div className="step-nav-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => goToStep(3)}
              disabled={isSubmitting}
            >
              ← Back to Edit
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, 'draft')}
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ minWidth: 160 }}
              >
                {isSubmitting ? (
                  'Publishing...'
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Send size={15} /> Publish Listing Now
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
