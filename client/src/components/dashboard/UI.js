import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import './UI.css';

/* ── Button ─────────────────────────────────────────────────────────── */
export const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, icon, className = '', ...props
}) => (
  <button
    className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''} ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading && <span className="btn-spinner" aria-hidden="true" />}
    {!loading && icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
    <span>{children}</span>
  </button>
);

/* ── Card ────────────────────────────────────────────────────────────── */
export const Card = ({ children, className = '', padding = true, ...props }) => (
  <div className={`card ${padding ? 'card-padded' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="card-header">
    <div>
      <h2 className="card-title">{title}</h2>
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="card-action">{action}</div>}
  </div>
);

/* ── Badge ───────────────────────────────────────────────────────────── */
export const Badge = ({ children, variant = 'default', size = 'md' }) => (
  <span className={`badge badge-${variant} badge-${size}`}>{children}</span>
);

/* ── Input ───────────────────────────────────────────────────────────── */
export const Input = ({ label, error, hint, id, required, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label} {required && <span className="form-required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'form-input-error' : ''}`}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        required={required}
        {...props}
      />
      {hint && !error && <p className="form-hint" id={`${inputId}-hint`}>{hint}</p>}
      {error && (
        <p className="form-error" id={`${inputId}-error`} role="alert">
          <AlertCircle size={12} aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
};

/* ── Select ──────────────────────────────────────────────────────────── */
export const Select = ({ label, error, id, required, children, ...props }) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={selectId}>
          {label} {required && <span className="form-required" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`form-input form-select ${error ? 'form-input-error' : ''}`}
        aria-invalid={!!error}
        required={required}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="form-error" role="alert">
          <AlertCircle size={12} aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
};

/* ── Modal ───────────────────────────────────────────────────────────── */
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

/* ── Empty State ──────────────────────────────────────────────────────── */
export const EmptyState = ({ icon, title, message, action }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
    <h3 className="empty-state-title">{title}</h3>
    {message && <p className="empty-state-message">{message}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

/* ── Loading Spinner ──────────────────────────────────────────────────── */
export const Spinner = ({ size = 'md', label = 'Loading…' }) => (
  <div className="spinner-container" role="status">
    <div className={`spinner spinner-${size}`} aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </div>
);

/* ── Alert ───────────────────────────────────────────────────────────── */
const ALERT_ICONS = {
  info: <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  danger: <AlertCircle size={16} />
};

export const Alert = ({ variant = 'info', children }) => (
  <div className={`alert alert-${variant}`} role="alert">
    <span aria-hidden="true">{ALERT_ICONS[variant]}</span>
    <span>{children}</span>
  </div>
);

/* ── Stat Card ────────────────────────────────────────────────────────── */
export const StatCard = ({ label, value, icon, variant = 'default', trend }) => (
  <div className={`stat-card stat-card-${variant}`}>
    <div className="stat-card-body">
      <div>
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {trend && <p className="stat-card-trend">{trend}</p>}
      </div>
      <div className="stat-card-icon" aria-hidden="true">{icon}</div>
    </div>
  </div>
);

/* ── Table ───────────────────────────────────────────────────────────── */
export const Table = ({ children }) => (
  <div className="table-container" role="region" aria-label="Data table">
    <table className="table">{children}</table>
  </div>
);

export const TableHead = ({ columns }) => (
  <thead>
    <tr>
      {columns.map((col, i) => (
        <th key={i} scope="col" style={{ width: col.width }}>
          {col.label}
        </th>
      ))}
    </tr>
  </thead>
);
