import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Eye,
  ShieldCheck,
  CheckCircle2,
  X,
  UploadCloud,
  Image as ImageIcon,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { listingsApi } from '../api/listingsApi';
import '../CreateListing.css';

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ListingForm = ({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  existingImages = [],
  onDeleteExistingImage,
  onSetPrimaryExistingImage,
  isEditMode = false,
}) => {
  const { categories, loading: categoriesLoading } = useCategories();
  const fileInputRef = useRef(null);

  // ── Multi-Step Stepper State ──────────────────────────────────────────────
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
  const [rentalPeriod, setRentalPeriod] = useState(initialValues.rentalPeriod || 'day');
  const [deposit, setDeposit] = useState(initialValues.deposit !== undefined ? initialValues.deposit : '');
  const [exchangeFor, setExchangeFor] = useState(initialValues.exchangeFor || '');
  const [pickupLocation, setPickupLocation] = useState(initialValues.pickupLocation || '');
  const [quantity, setQuantity] = useState(initialValues.quantity || 1);
  const [tags, setTags] = useState(initialValues.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Photos
  const [pendingFiles, setPendingFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // AI Suggestion State
  const [aiHints, setAiHints] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [aiMetadata, setAiMetadata] = useState(null);

  // Teammate Features: Price Estimation & OCR Study Document Check
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

  const totalPhotosCount = existingImages.length + pendingFiles.length;

  // ── Photo Upload Handlers ──────────────────────────────────────────────────
  const validateAndAddFiles = (filesList) => {
    setPhotoError('');
    const incoming = Array.from(filesList);

    if (totalPhotosCount + incoming.length > MAX_PHOTOS) {
      setPhotoError(`Maximum ${MAX_PHOTOS} photos allowed. You can only add ${MAX_PHOTOS - totalPhotosCount} more.`);
      return;
    }

    const validFiles = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setPhotoError(`Invalid format for "${file.name}". JPEG, PNG, or WebP only.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setPhotoError(`"${file.name}" exceeds 5MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    setPendingFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryPending = (index) => {
    if (index === 0) return;
    setPendingFiles((prev) => {
      const chosen = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [chosen, ...rest];
    });
  };

  // ── AI Suggestion Trigger ──────────────────────────────────────────────────
  const handleAiSuggestion = async () => {
    if (!pendingFiles.length && !existingImages.length) {
      setAiMessage('Please upload at least one photo first to generate suggestions.');
      return;
    }
    setIsSuggesting(true);
    setAiMessage('');
    try {
      const targetFile = pendingFiles[0];
      const suggestion = await listingsApi.suggestFromImage(targetFile, {
        description: aiHints,
        nameOrBrand: aiHints,
      });

      invalidatePriceEstimate();
      if (suggestion.title) setTitle(suggestion.title);
      if (suggestion.description) setDescription(suggestion.description);
      if (suggestion.condition) {
        const norm = suggestion.condition.toLowerCase().replace(/\s+/g, '_');
        if (['new', 'like_new', 'good', 'fair', 'poor'].includes(norm)) setCondition(norm);
      }
      if (suggestion.categoryId) {
        setCategory(suggestion.categoryId);
      } else if (suggestion.category) {
        const matched = categories.find((item) =>
          item.name.toLowerCase() === suggestion.category.toLowerCase() ||
          item.slug?.toLowerCase() === suggestion.category.toLowerCase()
        );
        if (matched) setCategory(matched._id);
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
      setAiMessage('Listing draft generated! Fields are pre-filled and editable in the next step.');
    } catch (error) {
      setAiMessage(
        error.message ||
        'AI assistance is currently offline. You can proceed with manual entry without any issues.'
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  // ── Tag Handlers ───────────────────────────────────────────────────────────
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        if (tags.length >= 8) {
          setErrors((prev) => ({ ...prev, tags: 'Maximum 8 tags allowed' }));
          return;
        }
        setTags([...tags, val]);
        setTagInput('');
        setErrors((prev) => ({ ...prev, tags: null }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // ── Price Estimation ───────────────────────────────────────────────────────
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

  // ── OCR Document Check ─────────────────────────────────────────────────────
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

  // ── Step Validations ───────────────────────────────────────────────────────
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
    if (step === 2) {
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
    if (e) e.preventDefault();
    if (!validateStep2() || !validateStep3()) return;

    let documentText = '';
    if (status !== 'draft' && isStudyMaterial && studyDocument) {
      const check = checkedStudyDocument === studyDocument ? ocrResult : await runOcrCheck();
      if (!check) return;
      if (check.is_duplicate) {
        goToStep(2);
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
      ...(documentText ? { documentText } : {}),
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

  const selectedCategoryObj = categories.find((c) => c._id === category);
  const isStudyMaterial = Boolean(
    selectedCategoryObj?.slug &&
    ['notes-study-material', 'notes', 'study-material', 'question-papers'].includes(
      selectedCategoryObj.slug
    )
  );

  // Cover image for preview
  const primaryPendingPreview = pendingFiles.length > 0 ? URL.createObjectURL(pendingFiles[0]) : null;
  const primaryExistingPreview = existingImages.length > 0 ? (existingImages[0].url || existingImages[0].thumbnailUrl) : null;
  const coverImage = primaryPendingPreview || primaryExistingPreview;

  // Checklist computation for Step 4
  const hasPhotos = totalPhotosCount > 0;
  const hasDetails = title.trim().length >= 3 && category && description.trim().length >= 10;
  const hasPricing =
    listingType === 'sell' ? Number(price) > 0 :
    listingType === 'rent' ? Number(rentalRate) > 0 :
    listingType === 'exchange' ? exchangeFor.trim().length >= 3 : true;

  // Step tips for the sidebar
  const STEP_TIPS = {
    1: {
      title: 'Clear photos get 3x more responses.',
      desc: 'Use good lighting and show the item from multiple angles.',
    },
    2: {
      title: 'Specific titles win searches.',
      desc: 'Include brand, model and key features.',
    },
    3: {
      title: 'Fair pricing, quick handovers.',
      desc: 'Check similar listings and keep deposits reasonable.',
    },
    4: {
      title: "You're in control.",
      desc: 'You can edit or unpublish anytime after posting.',
    },
  };

  const currentTip = STEP_TIPS[currentStep] || STEP_TIPS[1];

  return (
    <form onSubmit={(e) => handleSubmit(e, 'active')}>
      <div className="create-listing-layout">
        {/* ── Left Sidebar (Vertical Stepper & Tip Box) ───────────────────── */}
        <aside className="create-sidebar">
          {/* Vertical Stepper Card */}
          <div className="stepper-card">
            <div className="stepper-card-header">
              <span className="stepper-card-title">{isEditMode ? 'EDIT LISTING' : 'NEW LISTING'}</span>
              <span className="stepper-card-count">{currentStep}/4</span>
            </div>
            <div className="stepper-progress-track">
              <div
                className="stepper-progress-fill"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>

            <div className="vertical-steps-list">
              {/* Step 1 */}
              <div
                className={`vertical-step-item ${currentStep === 1 ? 'active' : visitedSteps.includes(1) && currentStep > 1 ? 'completed' : ''}`}
                onClick={() => goToStep(1)}
              >
                <div className={`vertical-step-line ${currentStep > 1 ? 'completed' : ''}`} />
                <div className="vertical-step-circle">
                  {currentStep > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
                </div>
                <div className="vertical-step-info">
                  <span className="vertical-step-title">Photos & AI</span>
                  <span className="vertical-step-desc">Upload photos</span>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`vertical-step-item ${currentStep === 2 ? 'active' : visitedSteps.includes(2) && currentStep > 2 ? 'completed' : ''}`}
                onClick={() => goToStep(2)}
              >
                <div className={`vertical-step-line ${currentStep > 2 ? 'completed' : ''}`} />
                <div className="vertical-step-circle">
                  {currentStep > 2 ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <div className="vertical-step-info">
                  <span className="vertical-step-title">Item Details</span>
                  <span className="vertical-step-desc">Title, category & condition</span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`vertical-step-item ${currentStep === 3 ? 'active' : visitedSteps.includes(3) && currentStep > 3 ? 'completed' : ''}`}
                onClick={() => goToStep(3)}
              >
                <div className={`vertical-step-line ${currentStep > 3 ? 'completed' : ''}`} />
                <div className="vertical-step-circle">
                  {currentStep > 3 ? <Check size={14} strokeWidth={3} /> : '3'}
                </div>
                <div className="vertical-step-info">
                  <span className="vertical-step-title">Pricing & Terms</span>
                  <span className="vertical-step-desc">Choose how to list it</span>
                </div>
              </div>

              {/* Step 4 */}
              <div
                className={`vertical-step-item ${currentStep === 4 ? 'active' : ''}`}
                onClick={() => goToStep(4)}
              >
                <div className="vertical-step-circle">4</div>
                <div className="vertical-step-info">
                  <span className="vertical-step-title">Review & Publish</span>
                  <span className="vertical-step-desc">One last look, then live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tip Card */}
          <div className="tip-card">
            <div className="tip-card-icon">
              <Lightbulb size={18} />
            </div>
            <div>
              <div className="tip-card-title">{currentTip.title}</div>
              <div className="tip-card-desc">{currentTip.desc}</div>
            </div>
          </div>
        </aside>

        {/* ── Right Content Panels (Steps 1–4) ────────────────────────────── */}
        <div className="create-main-panel">
          {/* ════════════ STEP 1: Photos & AI ════════════ */}
          {currentStep === 1 && (
            <div>
              <div className="step1-grid">
                {/* Left: Photos Upload Card */}
                <div className="create-card">
                  <div className="create-card-header">
                    <div className="create-card-header-left">
                      <div className="create-card-icon-badge">
                        <ImageIcon size={19} />
                      </div>
                      <div>
                        <h2 className="create-card-title">Photos & AI</h2>
                        <div className="create-card-sub">
                          Step 1 of 4 • Upload up to 6 clear photos
                        </div>
                      </div>
                    </div>
                    <span className="pill-count-badge">
                      {totalPhotosCount}/6 photos
                    </span>
                  </div>

                  {/* Dropzone */}
                  <div
                    className={`dropzone-box ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="dropzone-cloud-icon">
                      <UploadCloud size={24} />
                    </div>
                    <div className="dropzone-main-text">
                      Drag and drop photos here, or click to upload
                    </div>
                    <div className="dropzone-sub-text">
                      JPEG, PNG, WebP • up to 5MB each (max 6 photos)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={totalPhotosCount >= MAX_PHOTOS}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          validateAndAddFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>

                  {photoError && (
                    <p style={{ color: '#dc2626', fontSize: 12, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} /> {photoError}
                    </p>
                  )}

                  {/* 6-Slot Preview Strip */}
                  <div className="photo-strip-section">
                    <div className="photo-strip-header">
                      <span className="photo-strip-title">Photo Previews (Click to set cover)</span>
                      <span className="photo-strip-sub">First photo is the cover</span>
                    </div>

                    <div className="photo-slots-row">
                      {/* Existing Uploaded Images */}
                      {existingImages.map((img, idx) => (
                        <div
                          key={img._id || idx}
                          className={`photo-slot filled ${img.isPrimary ? 'is-cover' : ''}`}
                          onClick={() => onSetPrimaryExistingImage && onSetPrimaryExistingImage(img._id)}
                          title={img.isPrimary ? 'Cover photo' : 'Click to make cover'}
                        >
                          <img src={img.thumbnailUrl || img.url} alt="Listing upload" />
                          {img.isPrimary && <span className="photo-slot-cover-pill">Cover</span>}
                          {onDeleteExistingImage && (
                            <button
                              type="button"
                              className="photo-slot-remove-btn"
                              onClick={(e) => { e.stopPropagation(); onDeleteExistingImage(img._id); }}
                              title="Delete photo"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Pending Local Files */}
                      {pendingFiles.map((file, idx) => {
                        const preview = URL.createObjectURL(file);
                        const isCover = existingImages.length === 0 && idx === 0;
                        return (
                          <div
                            key={`${file.name}-${idx}`}
                            className={`photo-slot filled ${isCover ? 'is-cover' : ''}`}
                            onClick={() => handleSetPrimaryPending(idx)}
                            title={isCover ? 'Cover photo' : 'Click to set as cover'}
                          >
                            <img src={preview} alt={file.name} />
                            {isCover && <span className="photo-slot-cover-pill">Cover</span>}
                            <button
                              type="button"
                              className="photo-slot-remove-btn"
                              onClick={(e) => { e.stopPropagation(); handleRemovePending(idx); }}
                              title="Remove photo"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}

                      {/* + Add Photo slot if fewer than 6 */}
                      {totalPhotosCount < MAX_PHOTOS && (
                        <div
                          className="photo-slot add-slot"
                          onClick={() => fileInputRef.current?.click()}
                          title="Add photo"
                        >
                          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                          <span>Add photo</span>
                        </div>
                      )}

                      {/* Remaining Empty Slots */}
                      {Array.from({ length: Math.max(0, MAX_PHOTOS - totalPhotosCount - 1) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="photo-slot empty-placeholder">
                          <ImageIcon size={18} strokeWidth={1.5} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: AI Listing Assistant Card */}
                <div className="create-card ai-assistant-card">
                  <div>
                    <div className="create-card-header" style={{ marginBottom: 12 }}>
                      <div className="create-card-header-left">
                        <div className="create-card-icon-badge">
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <h3 className="create-card-title">AI Listing Assistant</h3>
                          <div className="create-card-sub">Optional • suggestions only</div>
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                      Add a hint or two and the campus AI drafts a title, category, condition and description from your photos.
                    </p>

                    <textarea
                      rows={4}
                      className="ai-hints-textarea"
                      placeholder="e.g. Titan watch, barely used, 1 year old..."
                      value={aiHints}
                      onChange={(e) => setAiHints(e.target.value)}
                    />

                    <button
                      type="button"
                      className="btn-generate-ai"
                      onClick={handleAiSuggestion}
                      disabled={isSuggesting || totalPhotosCount === 0}
                    >
                      <Sparkles size={16} />
                      {isSuggesting ? 'Analyzing Photo with AI…' : 'Generate listing draft'}
                    </button>

                    {aiMessage && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 10,
                          borderRadius: 8,
                          fontSize: 12,
                          background: aiMessage.includes('offline') || aiMessage.includes('first') ? '#fef2f2' : '#f0fdf4',
                          color: aiMessage.includes('offline') || aiMessage.includes('first') ? '#991b1b' : '#166534',
                          border: `1px solid ${aiMessage.includes('offline') || aiMessage.includes('first') ? '#fecaca' : '#bbf7d0'}`,
                          lineHeight: 1.45,
                        }}
                      >
                        {aiMessage}
                      </div>
                    )}
                  </div>

                  <div className="student-guarantee-note">
                    <Lock size={15} style={{ flexShrink: 0, marginTop: 1, color: '#0d9488' }} />
                    <span>
                      <b>Student control guaranteed:</b> AI only suggests — you can edit or rewrite every field in the next step.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bottom-actions-row">
                <button
                  type="button"
                  className="btn-action-draft"
                  onClick={(e) => handleSubmit(e, 'draft')}
                  disabled={isSubmitting}
                >
                  <Save size={15} /> Save as draft
                </button>
                <button
                  type="button"
                  className="btn-action-continue"
                  onClick={() => goToStep(2)}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 2: Item Details ════════════ */}
          {currentStep === 2 && (
            <div>
              <div className="create-card">
                <div className="create-card-header">
                  <div className="create-card-header-left">
                    <div className="create-card-icon-badge">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="create-card-title">Item Details</h2>
                      <div className="create-card-sub">
                        Step 2 of 4 • Tell us about your item
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="form-field-group">
                  <div className="field-label-row">
                    <label className="field-label" htmlFor="listing-title">
                      Title <span className="required-asterisk">*</span>
                    </label>
                    <span className="char-counter">{title.length}/100</span>
                  </div>
                  <input
                    id="listing-title"
                    className="field-input"
                    placeholder="e.g. Titan Men's Analog Watch with Date"
                    value={title}
                    maxLength={100}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {errors.title ? (
                    <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.title}</p>
                  ) : (
                    <div className="field-subtext">
                      Include brand, model or edition so peers can find it easily.
                    </div>
                  )}
                </div>

                {/* Category & Condition Row */}
                <div className="form-field-group">
                  <div className="two-col-fields">
                    <div>
                      <label className="field-label" htmlFor="listing-category" style={{ display: 'block', marginBottom: 5 }}>
                        Category <span className="required-asterisk">*</span>
                      </label>
                      <select
                        id="listing-category"
                        className="field-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={categoriesLoading}
                      >
                        <option value="">
                          {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                        </option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="listing-condition" style={{ display: 'block', marginBottom: 5 }}>
                        Condition <span className="required-asterisk">*</span>
                      </label>
                      <select
                        id="listing-condition"
                        className="field-select"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                      >
                        <option value="new">New (Unopened, original box)</option>
                        <option value="like_new">Like New (Barely used)</option>
                        <option value="good">Good (Lightly used, functional)</option>
                        <option value="fair">Fair (Noticeable cosmetic wear)</option>
                        <option value="poor">Poor (Heavy wear / rough use)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="form-field-group">
                  <div className="field-label-row">
                    <label className="field-label" htmlFor="listing-description">
                      Description <span className="required-asterisk">*</span>
                    </label>
                    <span className="char-counter">{description.length}/2000</span>
                  </div>
                  <textarea
                    id="listing-description"
                    rows={4}
                    className="field-textarea"
                    placeholder="What is it, how old, why are you letting it go..."
                    value={description}
                    maxLength={2000}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {errors.description ? (
                    <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.description}</p>
                  ) : (
                    <div className="field-subtext">
                      Mention key features, usage duration and any flaws to help buyers decide faster.
                    </div>
                  )}
                </div>

                {/* Academic Duplicate Check (when study material is selected) */}
                {isStudyMaterial && (
                  <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <FileText size={18} style={{ color: '#0d9488', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                          Sharing Academic Study Material?
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                          Upload the notes or question paper to check for duplicates across campus before publishing.
                        </div>
                      </div>
                    </div>

                    <label htmlFor="studyDocument" className="field-label" style={{ marginTop: 12, display: 'block' }}>
                      Study document (PDF or image, optional)
                    </label>
                    <input
                      id="studyDocument"
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                      className="field-input"
                      style={{ background: '#fff' }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>📄 {studyDocument.name}</span>
                        <button
                          type="button"
                          className="btn-action-draft"
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
                          onClick={() => {
                            setStudyDocument(null);
                            invalidateOcrCheck();
                          }}
                        >
                          Remove document
                        </button>
                        <button
                          type="button"
                          className="btn-action-continue"
                          style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6 }}
                          onClick={runOcrCheck}
                          disabled={isCheckingDocument || !category}
                        >
                          {isCheckingDocument ? 'Checking duplicate…' : 'Check for duplicates'}
                        </button>
                      </div>
                    )}

                    {ocrMessage && (
                      <p
                        role="status"
                        style={{
                          fontSize: 12,
                          margin: '8px 0 0',
                          fontWeight: 600,
                          color: ocrResult?.is_duplicate ? '#b91c1c' : ocrResult ? '#166534' : '#475569'
                        }}
                      >
                        {ocrMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Search Tags */}
                <div className="form-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="listing-tags" style={{ display: 'block', marginBottom: 5 }}>
                    Search Tags (up to 8)
                  </label>
                  <input
                    id="listing-tags"
                    className="field-input"
                    placeholder="e.g. titan, watch, analog, black"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                  <div className="field-subtext">Press Enter to add tags.</div>

                  {errors.tags && (
                    <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.tags}</p>
                  )}

                  {tags.length > 0 && (
                    <div className="tags-chip-container">
                      {tags.map((t) => (
                        <span key={t} className="tag-badge-chip">
                          #{t}
                          <button
                            type="button"
                            className="tag-badge-remove"
                            onClick={() => handleRemoveTag(t)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bottom-actions-row">
                <button
                  type="button"
                  className="btn-action-back"
                  onClick={() => goToStep(1)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn-action-continue"
                  onClick={() => goToStep(3)}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 3: Pricing & Terms ════════════ */}
          {currentStep === 3 && (
            <div>
              <div className="create-card">
                <div className="create-card-header">
                  <div className="create-card-header-left">
                    <div className="create-card-icon-badge">
                      <Tag size={18} />
                    </div>
                    <div>
                      <h2 className="create-card-title">Pricing & Terms</h2>
                      <div className="create-card-sub">
                        Step 3 of 4 • Choose how to list it
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Type Selector Cards */}
                <div className="type-selector-grid">
                  <div
                    className={`type-select-card-mockup ${listingType === 'sell' ? 'active' : ''}`}
                    onClick={() => {
                      setListingType('sell');
                      setErrors((prev) => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
                    }}
                  >
                    <div className="type-select-icon-box">
                      <Tag size={19} />
                    </div>
                    <span className="type-select-name">Sell</span>
                    <span className="type-select-sub">Direct campus purchase</span>
                  </div>

                  <div
                    className={`type-select-card-mockup ${listingType === 'rent' ? 'active' : ''}`}
                    onClick={() => {
                      setListingType('rent');
                      setErrors((prev) => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
                    }}
                  >
                    <div className="type-select-icon-box">
                      <Clock size={19} />
                    </div>
                    <span className="type-select-name">Rent</span>
                    <span className="type-select-sub">Temporary borrowing</span>
                  </div>

                  <div
                    className={`type-select-card-mockup ${listingType === 'exchange' ? 'active' : ''}`}
                    onClick={() => {
                      setListingType('exchange');
                      setErrors((prev) => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
                    }}
                  >
                    <div className="type-select-icon-box">
                      <Repeat size={19} />
                    </div>
                    <span className="type-select-name">Exchange</span>
                    <span className="type-select-sub">Item-for-item barter</span>
                  </div>

                  <div
                    className={`type-select-card-mockup ${listingType === 'giveaway' ? 'active' : ''}`}
                    onClick={() => {
                      setListingType('giveaway');
                      setErrors((prev) => ({ ...prev, price: null, rentalRate: null, exchangeFor: null }));
                    }}
                  >
                    <div className="type-select-icon-box">
                      <Gift size={19} />
                    </div>
                    <span className="type-select-name">Giveaway</span>
                    <span className="type-select-sub">Free community gift</span>
                  </div>
                </div>

                {/* Dynamic Inputs Based on Listing Type */}
                {/* 1. Rent Fields */}
                {listingType === 'rent' && (
                  <div>
                    <div className="two-col-fields">
                      <div>
                        <label className="field-label" htmlFor="rent-rate" style={{ display: 'block', marginBottom: 5 }}>
                          Rental Rate (₹) <span className="required-asterisk">*</span>
                        </label>
                        <input
                          id="rent-rate"
                          type="number"
                          min="1"
                          className="field-input"
                          placeholder="e.g. 100"
                          value={rentalRate}
                          onChange={(e) => setRentalRate(e.target.value)}
                        />
                        {errors.rentalRate && (
                          <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.rentalRate}</p>
                        )}
                      </div>

                      <div>
                        <label className="field-label" htmlFor="rent-period" style={{ display: 'block', marginBottom: 5 }}>
                          Per Period <span className="required-asterisk">*</span>
                        </label>
                        <select
                          id="rent-period"
                          className="field-select"
                          value={rentalPeriod}
                          onChange={(e) => setRentalPeriod(e.target.value)}
                        >
                          <option value="day">Per Day</option>
                          <option value="week">Per Week</option>
                          <option value="month">Per Month</option>
                        </select>
                      </div>
                    </div>

                    {/* Deposit Highlight Box */}
                    <div className="deposit-highlight-box">
                      <div className="deposit-highlight-label">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                        Security Deposit (₹) (Optional, Refundable)
                      </div>
                      <input
                        type="number"
                        min="0"
                        className="field-input"
                        placeholder="e.g. 500"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                      />
                      <div className="deposit-subtext">
                        <Lock size={12} /> Refunded in full to the renter when the item is returned in good condition.
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Sell Fields */}
                {listingType === 'sell' && (
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="sell-price" style={{ display: 'block', marginBottom: 5 }}>
                      Price (₹) <span className="required-asterisk">*</span>
                    </label>
                    <input
                      id="sell-price"
                      type="number"
                      min="1"
                      className="field-input"
                      placeholder="e.g. 450"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        setPriceEstimate(null);
                        setPriceEstimateMessage('');
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn-action-draft"
                        style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                        onClick={handlePriceEstimate}
                        disabled={isEstimatingPrice || !title.trim() || !category}
                      >
                        {isEstimatingPrice ? 'Estimating…' : '✨ Get AI price estimate'}
                      </button>
                    </div>
                    {priceEstimateMessage && (
                      <div className="field-subtext" role="status" style={{ marginTop: 6, color: '#64748b' }}>
                        {priceEstimateMessage}
                      </div>
                    )}
                    {priceEstimate && (
                      <div className="field-subtext" style={{ marginTop: 4, color: '#0d9488', fontWeight: 600 }}>
                        Suggested range: ₹{Math.round(priceEstimate.price_low)}–₹{Math.round(priceEstimate.price_high)}
                        {' '}from {priceEstimate.comparable_count} comparable listing{priceEstimate.comparable_count === 1 ? '' : 's'}.
                        {priceEstimate.excluded_outlier_count > 0 && (
                          <> ({priceEstimate.excluded_outlier_count} unusual price{priceEstimate.excluded_outlier_count === 1 ? ' was' : 's were'} excluded)</>
                        )}
                      </div>
                    )}
                    {errors.price ? (
                      <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.price}</p>
                    ) : (
                      <div className="field-subtext">Fair campus pricing ensures fast sales among peers.</div>
                    )}
                  </div>
                )}

                {/* 3. Exchange Fields */}
                {listingType === 'exchange' && (
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="exchange-for" style={{ display: 'block', marginBottom: 5 }}>
                      Looking to exchange for <span className="required-asterisk">*</span>
                    </label>
                    <input
                      id="exchange-for"
                      className="field-input"
                      placeholder="e.g. Scientific Calculator or Casio FX-991EX"
                      value={exchangeFor}
                      onChange={(e) => setExchangeFor(e.target.value)}
                    />
                    {errors.exchangeFor ? (
                      <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.exchangeFor}</p>
                    ) : (
                      <div className="field-subtext">Be specific about the items or models you are willing to accept.</div>
                    )}
                  </div>
                )}

                {/* 4. Giveaway Fields */}
                {listingType === 'giveaway' && (
                  <div className="deposit-highlight-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                    <div className="deposit-highlight-label" style={{ color: '#b45309' }}>
                      <Gift size={16} /> Free Community Gift • Price will be set to ₹0
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.45 }}>
                      Sharing items with peers gives them a second life and helps fellow students!
                    </p>
                  </div>
                )}

                {/* Pickup Location & Quantity Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 14, marginTop: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="pickup-location" style={{ display: 'block', marginBottom: 5 }}>
                      Campus Pickup Location <span className="required-asterisk">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#0284c7' }} />
                      <input
                        id="pickup-location"
                        className="field-input"
                        style={{ paddingLeft: 34 }}
                        placeholder="e.g. Canteen, Library gate, Hostel C lobby"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                      />
                    </div>
                    <div className="field-subtext">Where you prefer to physically meet counterparties on campus.</div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="quantity" style={{ display: 'block', marginBottom: 5 }}>
                      Quantity Available
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      className="field-input"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    {errors.quantity && (
                      <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0 0' }}>{errors.quantity}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bottom-actions-row">
                <button
                  type="button"
                  className="btn-action-back"
                  onClick={() => goToStep(2)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn-action-continue"
                  onClick={() => goToStep(4)}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ STEP 4: Review & Publish ════════════ */}
          {currentStep === 4 && (
            <div>
              <div className="create-card">
                <div className="create-card-header">
                  <div className="create-card-header-left">
                    <div className="create-card-icon-badge">
                      <Check size={18} />
                    </div>
                    <div>
                      <h2 className="create-card-title">Review & Publish</h2>
                      <div className="create-card-sub">
                        Step 4 of 4 • One last look, then live
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                  Listing Preview
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  This is how others will see your listing.
                </div>

                <div className="review-preview-card">
                  <div className="review-preview-media">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover preview" />
                    ) : (
                      <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                        <Camera size={32} style={{ margin: '0 auto 4px auto', display: 'block' }} />
                        <span style={{ fontSize: 12 }}>No photo uploaded</span>
                      </div>
                    )}
                    <span className={`review-type-badge badge-${listingType}`}>
                      {listingType === 'sell' && 'Buy'}
                      {listingType === 'rent' && 'Rent'}
                      {listingType === 'exchange' && 'Swap'}
                      {listingType === 'giveaway' && 'Free'}
                    </span>
                  </div>

                  <div className="review-card-body">
                    <h3 className="review-title">
                      {title || 'Titan Men\'s Analog Watch with Date'}
                    </h3>

                    <div className="review-price-row">
                      {listingType === 'sell' && (
                        <span className="review-price-val">₹{price || 450}</span>
                      )}
                      {listingType === 'rent' && (
                        <>
                          <span className="review-price-val">₹{rentalRate || 100} / {rentalPeriod}</span>
                          {deposit ? <span className="review-price-meta">(Deposit: ₹{deposit})</span> : null}
                        </>
                      )}
                      {listingType === 'exchange' && (
                        <span className="review-price-val">Swap: {exchangeFor || 'Item barter'}</span>
                      )}
                      {listingType === 'giveaway' && (
                        <span className="review-price-val">Free</span>
                      )}
                    </div>

                    <div className="review-pills-row">
                      <span className="review-pill review-pill-cat">
                        {selectedCategoryObj?.name || 'Clothing & Accessories'}
                      </span>
                      <span className="review-pill review-pill-cond">
                        {condition.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>

                    <p className="review-desc-text">
                      {description || 'Sleek and professional item in great condition. Perfect for campus use.'}
                    </p>

                    <div className="review-meta-row">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} style={{ color: '#0284c7' }} /> {pickupLocation || 'Canteen'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Package size={13} style={{ color: '#0284c7' }} /> Qty: {quantity}
                      </span>
                    </div>

                    {tags.length > 0 && (
                      <div className="review-tags-row">
                        {tags.map((t) => (
                          <span key={t} className="tag-badge-chip" style={{ fontSize: 11 }}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bottom-actions-row">
                <button
                  type="button"
                  className="btn-action-back"
                  onClick={() => goToStep(3)}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-action-draft"
                    disabled={isSubmitting}
                    onClick={(e) => handleSubmit(e, 'draft')}
                  >
                    <Save size={15} /> Save as draft
                  </button>
                  <button
                    type="submit"
                    className="btn-action-publish"
                    disabled={isSubmitting}
                  >
                    <Send size={15} />
                    {isSubmitting ? 'Publishing…' : 'Publish listing now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
