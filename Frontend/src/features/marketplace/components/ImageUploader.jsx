import React, { useState, useRef } from 'react';
import { Camera, AlertTriangle, Star, X } from 'lucide-react';

const MAX_FILES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ImageUploader = ({
  existingImages = [],
  pendingFiles = [],
  onPendingFilesChange,
  onDeleteExisting,
  onSetPrimaryExisting,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const totalCount = existingImages.length + pendingFiles.length;

  const validateAndAddFiles = (filesList) => {
    setErrorMessage('');
    const incoming = Array.from(filesList);

    if (totalCount + incoming.length > MAX_FILES) {
      setErrorMessage(`Maximum ${MAX_FILES} images allowed in total. You can only add ${MAX_FILES - totalCount} more.`);
      return;
    }

    const validFiles = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMessage(`Invalid format for "${file.name}". Only JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`"${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    onPendingFilesChange([...pendingFiles, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePending = (index) => {
    const updated = [...pendingFiles];
    updated.splice(index, 1);
    onPendingFilesChange(updated);
  };

  // Allow user to choose which pending image is primary/main
  const handleSetPrimaryPending = (index) => {
    if (index === 0) return;
    const chosen = pendingFiles[index];
    const rest = pendingFiles.filter((_, i) => i !== index);
    onPendingFilesChange([chosen, ...rest]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: dragOver ? '2px dashed #1d4ed8' : '2px dashed #cbd5e1',
          borderRadius: 12,
          minHeight: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#64748b',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragOver ? '#eff6ff' : '#f8fafc',
          padding: 20,
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#2563eb' }}>
          <Camera size={36} />
        </div>
        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4, fontSize: 15 }}>
          Drag photos here or click to upload
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          JPEG, PNG, WebP up to 5MB (Max {MAX_FILES} photos · {totalCount}/{MAX_FILES} uploaded)
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || totalCount >= MAX_FILES}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {errorMessage && (
        <p className="error-text" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {errorMessage}
        </p>
      )}

      {/* Previews Grid */}
      {(existingImages.length > 0 || pendingFiles.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              Photo Previews (Click to set Main Image)
            </span>
            <span className="muted" style={{ fontSize: 11 }}>
              First image is the cover photo
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* Existing uploaded images */}
            {existingImages.map((img) => (
              <div
                key={img._id || img.key}
                style={{
                  position: 'relative',
                  height: 105,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: img.isPrimary ? '2.5px solid #1d4ed8' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}
              >
                <img
                  src={img.thumbnailUrl || img.url}
                  alt="Listing preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {img.isPrimary && (
                  <span
                    className="pill pill-blue"
                    style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, padding: '2px 6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  >
                    <Star size={10} fill="#fff" /> Main Photo
                  </span>
                )}
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                  {!img.isPrimary && onSetPrimaryExisting && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSetPrimaryExisting(img._id); }}
                      style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                      title="Set as Main Cover Photo"
                    >
                      <Star size={10} /> Main
                    </button>
                  )}
                  {onDeleteExisting && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteExisting(img._id); }}
                      style={{ background: '#b42318', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Photo"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Pending local files */}
            {pendingFiles.map((file, idx) => {
              const previewUrl = URL.createObjectURL(file);
              const isFirst = existingImages.length === 0 && idx === 0;
              return (
                <div
                  key={`${file.name}-${idx}`}
                  style={{
                    position: 'relative',
                    height: 105,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: isFirst ? '2.5px solid #1d4ed8' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {isFirst ? (
                    <span
                      className="pill pill-blue"
                      style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, padding: '2px 6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <Star size={10} fill="#fff" /> Main Photo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSetPrimaryPending(idx); }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 10,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                      title="Set as Main Cover Photo"
                    >
                      <Star size={10} /> Make Main
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemovePending(idx); }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: '#b42318',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 13,
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove Photo"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
