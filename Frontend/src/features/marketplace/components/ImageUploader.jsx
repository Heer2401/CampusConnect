import React, { useState, useRef } from 'react';

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

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: dragOver ? '2px dashed #1d4ed8' : '2px dashed #c7d2e0',
          borderRadius: 10,
          minHeight: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#7d8aa3',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragOver ? '#eff6ff' : '#fafbfd',
          padding: 16,
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 6 }}>⬆️</div>
        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
          Drag photos here or click to upload
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          JPEG, PNG, WebP up to 5MB (Max {MAX_FILES} photos)
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
        <p className="error-text" style={{ marginTop: 8 }}>
          {errorMessage}
        </p>
      )}

      {/* Previews Grid */}
      {(existingImages.length > 0 || pendingFiles.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
          {/* Existing uploaded images */}
          {existingImages.map((img) => (
            <div
              key={img._id || img.key}
              style={{
                position: 'relative',
                height: 100,
                borderRadius: 8,
                overflow: 'hidden',
                border: img.isPrimary ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
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
                  style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, padding: '2px 6px' }}
                >
                  Primary
                </span>
              )}
              <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                {!img.isPrimary && onSetPrimaryExisting && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSetPrimaryExisting(img._id); }}
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 5px', cursor: 'pointer' }}
                    title="Set Primary"
                  >
                    ★
                  </button>
                )}
                {onDeleteExisting && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteExisting(img._id); }}
                    style={{ background: '#b42318', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, width: 20, height: 20, cursor: 'pointer' }}
                    title="Delete"
                  >
                    ×
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
                  height: 100,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: isFirst ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                }}
              >
                <img
                  src={previewUrl}
                  alt={file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {isFirst && (
                  <span
                    className="pill pill-blue"
                    style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, padding: '2px 6px' }}
                  >
                    Primary
                  </span>
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
                    fontSize: 12,
                    width: 20,
                    height: 20,
                    cursor: 'pointer'
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
