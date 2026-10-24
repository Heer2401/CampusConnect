import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Shared modal for all admin dialogs.
 * Closes on Escape and on backdrop click; locks background scroll while open.
 */
export default function AdminModal({ title, onClose, children, footer, maxWidth }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="adm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="adm-modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="adm-modal-head">
          <h2>{title}</h2>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
