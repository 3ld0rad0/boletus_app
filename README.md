# 🍄 Boletus

App per chi cerca funghi nei boschi:

- **mappa topografica** con la propria posizione GPS in tempo reale;
- **punto di partenza** salvato sul dispositivo, con distanza e direzione per tornarci (funziona anche senza rete e senza account);
- **probabilità di ritrovamento** per specie, su una griglia attorno a te, calcolata con **regole deterministiche** (nessun machine learning) a partire da stagione, quota, temperatura, pioggia e umidità recenti.

Oggi è una web app; in seguito diventerà un'app mobile con [Capacitor](https://capacitorjs.com/).

> ⚠️ **Avvertenza**: Boletus indica solo *dove* potrebbe valere la pena cercare. **Non identifica i funghi e non ne garantisce la commestibilità**: fai sempre controllare il raccolto da un micologo o dall'ispettorato micologico della ASL e rispetta le norme locali sulla raccolta.

## Architettura

```
boletus_app/
├── frontend/   React + TypeScript (Vite), MapLibre GL, Vitest
└── backend/    Python FastAPI, SQLModel (SQLite → PostgreSQL), JWT
```

**Frontend** (`frontend/src`):

| Cartella | Contenuto |
|---|---|
| `core/` | Logica pura in TypeScript, senza React né DOM, completamente testata: geometria (`geo.ts`), motore di punteggio (`scoring.ts`), dati meteo (`weather.ts`) |
| `data/species/` | Regole di ogni specie in JSON |
| `services/` | Adattatori sostituibili: GPS (`location.ts`), archivio locale (`storage.ts`), client API (`api.ts`). Per il mobile basterà aggiungere le implementazioni Capacitor |
| `hooks/`, `components/` | Interfaccia React |

**Backend**: piccolo e dedicato solo ad account e punti salvati. Il calcolo delle probabilità avviene sul client, così potrà funzionare anche offline.

**Dati esterni** (gratuiti, senza chiave):
- [Open-Meteo](https://open-meteo.com/): meteo degli ultimi 10 giorni e quote;
- [OpenTopoMap](https://opentopomap.org/): mappa topografica. Per un uso intensivo o in produzione serve un provider di tile dedicato, configurabile con `VITE_TILE_URL`.

### Come si calcola il punteggio

Ogni fattore riceve un valore da 0 a 1 tramite una **curva trapezoidale** (`min`, `optMin`, `optMax`, `max`): vale 0 fuori dall'intervallo, 1 nella fascia ottimale e cresce o cala linearmente in mezzo.

```
punteggio = 100 × (stagione × quota) × media_pesata(temperatura, pioggia, umidità)
```

- **Stagione** e **quota** sono *bloccanti*: se uno dei due vale 0, il punteggio è 0.
- **Temperatura** (media degli ultimi 5 giorni, corretta per la quota di ogni cella di −0,65 °C ogni 100 m), **pioggia** (totale degli ultimi 10 giorni) e **umidità** (media degli ultimi 10 giorni) si combinano con i pesi definiti nel JSON.
- Fasce: bassa < 33 ≤ media < 66 ≤ alta.
- Il meteo viene letto in un solo punto (il centro della griglia): pioggia e umidità sono quindi uguali in tutte le celle, mentre quota e temperatura variano da cella a cella.

### Aggiungere una specie

Crea un file in `frontend/src/data/species/` (viene caricato e validato automaticamente):

```json
{
  "id": "mazza-di-tamburo",
  "name": "Mazza di tamburo",
  "latinName": "Macrolepiota procera",
  "blocking": {
    "season": [0, 0, 0, 0, 0, 0.5, 0.8, 1, 1, 1, 0.5, 0],
    "elevation": { "min": 0, "optMin": 100, "optMax": 1200, "max": 1800 }
  },
  "weighted": {
    "temperature": { "min": 8, "optMin": 14, "optMax": 24, "max": 30, "weight": 0.35 },
    "rain":        { "min": 5, "optMin": 30, "optMax": 100, "max": 220, "weight": 0.45 },
    "humidity":    { "min": 50, "optMin": 70, "optMax": 100, "max": 100, "weight": 0.2 }
  }
}
```

`season` contiene 12 valori tra 0 e 1, da gennaio a dicembre.

> I valori di `porcino.json` e `finferlo.json` sono **segnaposto plausibili**, da validare con un esperto.

## Avvio in locale

Requisiti: Node.js 20+ e Python 3.12+.

### Backend (porta 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cp .env.example .env
# imposta JWT_SECRET in .env, ad esempio con:
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
.venv/bin/uvicorn app.main:create_app --factory --reload
```

La documentazione interattiva delle API è su http://localhost:8000/docs.

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/health` | Stato del servizio |
| POST | `/auth/register` | Registrazione (`email`, `password` di almeno 8 caratteri) |
| POST | `/auth/login` | Login, restituisce un token JWT |
| GET | `/auth/me` | Utente corrente |
| GET / POST | `/spots` | Elenco e creazione dei propri punti |
| DELETE | `/spots/{id}` | Eliminazione di un proprio punto |

### Frontend (porta 5173)

```bash
cd frontend
npm install
cp .env.example .env   # opzionale
npm run dev
```

Apri http://localhost:5173. Il GPS del browser funziona solo su `localhost` o in HTTPS: per provarlo da telefono serve un tunnel HTTPS oppure `vite --host` con un certificato.

### Test e controlli

```bash
cd frontend && npm test && npm run lint && npm run build
cd backend && .venv/bin/pytest
```

## Roadmap

- [ ] Validare con un esperto le regole delle specie e aggiungerne altre
- [ ] PWA e funzionamento offline (mappa in cache)
- [ ] App mobile con Capacitor: GPS nativo, tracciamento in background, bussola
- [ ] Habitat e tipo di bosco (es. Corine Land Cover, OpenStreetMap)
- [ ] Traccia del percorso e segnalazione dei ritrovamenti
- [ ] PostgreSQL e deploy

## Licenza

Vedi [LICENSE](LICENSE).
