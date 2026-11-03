import { createPortal } from 'react-dom'

interface Props {
  title: string
  text: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({ title, text, confirmLabel, danger, onConfirm, onCancel }: Props) {
  // Portale: i pannelli con backdrop-filter altrimenti racchiuderebbero l'overlay fixed.
  return createPortal(
    <div className="modal-layer align-bottom">
      <div className="confirm-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <h2>{title}</h2>
        <p>{text}</p>
        <button type="button" className={`button ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>,
    document.body,
  )
}
