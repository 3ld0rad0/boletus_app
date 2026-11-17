# Prompt di scaffolding – Boletus

Sei uno sviluppatore full-stack esperto. Crea lo scaffold iniziale di **Boletus**, un'app web (poi mobile con Capacitor) che aiuta i cercatori di funghi: mappa con GPS in tempo reale, punto di partenza salvato per ritrovare la strada, e punteggio di probabilità di trovare una specie in base a regole deterministiche (NO machine learning). Lavora nel repo esistente (branch `dev`, contiene solo LICENSE e README). Mantieni il codice **semplice, leggero e ben tipizzato**: poche dipendenze, niente over-engineering, commenti solo dove serve.

## Struttura monorepo

```
boletus_app/
├── README.md              # setup, avvio, scelte architetturali, disclaimer
├── .gitignore             # già presente; aggiungi voci mancanti (node_modules, .venv, *.db, .env)
├── frontend/              # React + TypeScript (Vite)
└── backend/               # Python FastAPI
```

## Frontend (`frontend/`)

**Stack:** Vite + React + TypeScript (strict), `maplibre-gl` (usato direttamente o con `react-map-gl/maplibre`), Vitest per i test, ESLint di default Vite. Nessuna libreria di state management: usa hook e context. Nessun CSS framework: CSS semplice.
Scegli MapLibre (non Leaflet) per poter riusare lo stesso motore mappa nella futura app Capacitor.

**Architettura a livelli** (la logica di dominio è pura e indipendente da React/browser):

```
src/
├── core/                      # TS puro, zero dipendenze da React/DOM, 100% testato
│   ├── geo.ts                 # haversine (distanza m), bearing iniziale (gradi), formattazione distanza/direzione, generazione griglia di punti attorno a un centro (raggio e passo configurabili)
│   ├── scoring.ts             # motore regole deterministico (vedi sotto)
│   ├── weather.ts             # client Open-Meteo + aggregazione (vedi sotto)
│   └── types.ts
├── data/species/              # una regola per specie in JSON (dati, non codice)
│   ├── porcino.json
│   └── finferlo.json
├── services/
│   ├── location.ts            # interfaccia LocationProvider { watch(cb, onError): stop; getCurrent() } + implementazione web con navigator.geolocation.watchPosition (enableHighAccuracy). In futuro verrà aggiunta un'implementazione Capacitor: nessun altro file deve dipendere da navigator.geolocation
│   ├── storage.ts             # persistenza locale (localStorage) del punto di partenza, con interfaccia sostituibile
│   └── api.ts                 # client fetch verso il backend (token JWT in memoria + localStorage), base URL da VITE_API_URL
├── hooks/                     # useLocation, useStartPoint, useProbabilityGrid, useAuth
├── components/                # MapView, SpeciesSelector, ProbabilityLegend, StartPointPanel, ScoreDetails, LoginForm, Disclaimer
└── App.tsx
```

**Funzionalità MVP:**
1. **Mappa** (MapLibre) a schermo intero con stile raster configurabile via `VITE_TILE_URL` (default OpenTopoMap, con attribuzione corretta). Marker della posizione utente aggiornato in tempo reale, con cerchio di accuratezza. Gestisci permesso negato, GPS non disponibile e HTTPS richiesto con messaggi chiari.
2. **Punto di partenza**: pulsante "Salva punto di partenza" (salva in locale subito; se loggato lo sincronizza col backend). Pannello che mostra in tempo reale distanza e direzione (bearing, freccia ruotata + punto cardinale) dal punto di partenza alla posizione corrente. Il punto è mostrato sulla mappa e può essere eliminato/sostituito. Deve funzionare anche senza account e senza rete.
3. **Probabilità funghi**: selettore specie; griglia (default 7×7, raggio 3 km, configurabile in una costante) attorno alla posizione (o al centro mappa se non c'è GPS) con celle colorate secondo il punteggio (layer GeoJSON, scala di colori + legenda a 3 fasce: bassa/media/alta). Click su una cella → pannello `ScoreDetails` con punteggio e **motivazioni per fattore** (es. "Pioggia ultimi 10 gg: ottimale", "Quota: troppo bassa").
4. **Account** minimale: registrazione/login, lista dei punti salvati. L'app resta usabile senza login.
5. **Disclaimer** sempre accessibile: l'app indica solo *dove* cercare, NON identifica funghi né ne garantisce la commestibilità; rispettare le norme locali di raccolta.

### Motore di scoring (`core/scoring.ts`)

Funzione pura: `score(species: SpeciesRules, inputs: ScoreInputs): ScoreResult`.

- **Input** per cella: `month` (1-12), `elevationM`, `tempMeanC` (media ultimi giorni, corretta per quota), `rainSumMm` (ultimi 10 gg), `humidityMeanPct` (media ultimi 10 gg).
- **Curva trapezoidale** per ogni fattore: `{ min, optMin, optMax, max }` → 0 sotto `min` e sopra `max`, 1 tra `optMin` e `optMax`, rampa lineare nei tratti intermedi. Per la stagione: tabella mese → valore 0..1.
- **Combinazione ibrida:** fattori **bloccanti** (stagione, altitudine) combinati per **prodotto**; fattori **pesati** (temperatura, pioggia, umidità) combinati con **media pesata** (pesi nel JSON, normalizzati). `punteggio = round(100 * prodotto_bloccanti * media_pesata)`.
- **Output:** `{ score: 0-100, band: "low"|"medium"|"high", factors: [{ id, value: 0-1, label, verdict: "ottimale"|"accettabile"|"scarso", blocking: boolean }] }`. Soglie fasce: <33 bassa, <66 media, altrimenti alta (costanti configurabili).
- **Schema JSON specie:** `id`, `name`, `latinName`, `blocking: {season, elevation}`, `weighted: {temperature, rain, humidity}` con trapezi e `weight`. Valida lo schema in fase di caricamento (funzione di validazione semplice, senza librerie pesanti). I valori numerici iniziali di `porcino.json` e `finferlo.json` sono **placeholder plausibili da validare con un esperto**: indicalo in un campo `"_note"` e nel README.

### Dati meteo (`core/weather.ts`)

- Open-Meteo (gratuito, senza chiave): **una sola chiamata** forecast API per il centro della griglia con `past_days=10`, variabili orarie `temperature_2m, relative_humidity_2m, precipitation`; aggrega in media temperatura, somma pioggia e media umidità sugli ultimi 10 giorni. Quota del centro dal campo `elevation` della risposta.
- **Quota per cella**: una chiamata all'Elevation API di Open-Meteo con tutte le coordinate della griglia (batch ≤ 100 punti).
- **Temperatura per cella** = temperatura del centro corretta con gradiente verticale di 0,65 °C ogni 100 m rispetto alla quota del centro; pioggia e umidità uguali per tutte le celle (approssimazione dichiarata nei commenti).
- Cache in memoria/localStorage per ~1 ora per chiave (lat/lon arrotondate a 2 decimali); gestisci errori di rete con messaggio non bloccante.

### Test (Vitest)

Test unitari per: trapezio (bordi e rampe), combinazione bloccanti × pesati (un bloccante a 0 azzera il punteggio), fasce, haversine/bearing con valori noti, generazione griglia, aggregazione meteo con fixture JSON, validazione schema specie.

## Backend (`backend/`)

**Stack:** Python 3.12, FastAPI, SQLModel (SQLite per l'MVP, `DATABASE_URL` da env per passare a PostgreSQL), `pyjwt`, `pwdlib[argon2]` per l'hashing password, `pydantic-settings`, pytest + httpx. Gestione dipendenze con `pyproject.toml`, venv in `.venv`.

```
backend/
├── pyproject.toml
├── .env.example               # DATABASE_URL, JWT_SECRET, JWT_EXPIRE_MINUTES, CORS_ORIGINS
├── app/
│   ├── main.py                # app FastAPI, CORS da env, router, /health
│   ├── config.py              # Settings (pydantic-settings); JWT_SECRET obbligatorio, nessun default insicuro
│   ├── db.py                  # engine, sessione, create_all all'avvio
│   ├── models.py              # User(id, email unico, password_hash, created_at); Spot(id, user_id FK, name, kind "start"|"note", lat, lon, created_at)
│   ├── schemas.py             # modelli Pydantic di input/output (mai esporre password_hash); validazione lat ∈ [-90,90], lon ∈ [-180,180], lunghezze nome
│   ├── security.py            # hash/verify password, creazione/verifica JWT, dipendenza get_current_user
│   └── routers/
│       ├── auth.py            # POST /auth/register, POST /auth/login → access token
│       └── spots.py           # GET /spots, POST /spots, DELETE /spots/{id}: solo i propri (404 se non dell'utente)
└── tests/                     # registrazione/login, accesso negato senza token, isolamento tra utenti, validazione coordinate
```

Requisiti di sicurezza: nessun segreto nel codice o in git (solo `.env.example`), password minime 8 caratteri, messaggio di login generico (non rivelare se l'email esiste), query sempre filtrate per `user_id`, CORS limitato alle origini configurate.

## Operatività

- `frontend/.env.example` con `VITE_API_URL` e `VITE_TILE_URL`; proxy/CORS per sviluppo locale (frontend :5173, backend :8000).
- Script: `npm run dev|build|test|lint` (frontend); comandi documentati nel README per `uvicorn app.main:app --reload` e `pytest`.
- README con: descrizione, architettura, come avviare, come aggiungere una specie (nuovo JSON), roadmap (offline/PWA, Capacitor, tracciamento in background, habitat, ritrovamenti), disclaimer.

## Fuori scopo (NON implementare ora)

Machine learning, riconoscimento funghi, habitat/copertura forestale, offline/tile cache, tracciamento in background, community/ritrovamenti, deploy/CI.

## Modalità di lavoro

1. Prima di scrivere codice, mostra il piano dei file; poi implementa a passi piccoli.
2. Dopo ogni blocco esegui test, lint e build; correggi finché tutto passa.
3. Verifica finale: avvia backend e frontend, testa registrazione/login via curl e che il frontend compili e si carichi.
4. Fai commit piccoli e descrittivi sul branch `dev`.
