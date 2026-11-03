import { Icon } from './Icon'

interface Props {
  open: boolean
  onClose: () => void
}

export function Disclaimer({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="modal-layer">
      <div className="notice-modal" role="alertdialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <div className="notice-mark">
          <Icon name="warning" size={30} />
        </div>
        <p className="eyebrow">Prima di iniziare</p>
        <h2 id="disclaimer-title">Cerca in sicurezza</h2>
        <ul>
          <li>
            Boletus indica solo <strong>dove</strong> potrebbe valere la pena cercare, con stime approssimative
            basate su meteo, quota e stagione.
          </li>
          <li>
            <strong>Non identifica i funghi e non ne garantisce la commestibilità.</strong> Fai sempre controllare
            il raccolto da un micologo o dall’ispettorato micologico della tua ASL.
          </li>
          <li>Rispetta le norme locali sulla raccolta (permessi, quantità, giorni e orari consentiti).</li>
          <li>
            Il GPS può essere impreciso o non disponibile e la batteria può scaricarsi: porta con te una mappa
            cartacea, una bussola e comunica a qualcuno dove vai.
          </li>
        </ul>
        <button type="button" className="button primary" onClick={onClose}>
          Ho capito
        </button>
      </div>
    </div>
  )
}
