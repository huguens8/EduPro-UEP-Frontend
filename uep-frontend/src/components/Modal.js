import React from 'react';
import './Modal.css';

export default function Modal({ title, onClose, children, size }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card${size ? ` modal-card-${size}` : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
