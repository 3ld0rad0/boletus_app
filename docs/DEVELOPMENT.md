# Development

Boletus is a React + TypeScript app (Vite, Leaflet, Capacitor) with no backend: every calculation runs on the device.

## Run it locally

Requires Node.js 20+.

```bash
make setup   # install dependencies
make dev     # start the frontend on http://localhost:5173
make test    # run the tests
make lint    # lint
make build   # production build
```

The browser GPS only works on `localhost` or over HTTPS.

Optional variables in `frontend/.env` (see `frontend/.env.example`):

- `VITE_THUNDERFOREST_API_KEY`: Thunderforest maps. Without a key, OpenTopoMap is used.
- `VITE_TILE_URL`: use a different tile provider.

## Android app

```bash
make apk
```

Builds the frontend, syncs it with Capacitor and creates the debug APK in `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. It needs JDK 21 and the Android SDK; their paths can be set with `JAVA_HOME` and `ANDROID_HOME` (defaults: `~/dev/jdk-21` and `~/dev/android-sdk`). To open the project in Android Studio: `cd frontend && npm run cap:android`.

To regenerate the launcher icons from `frontend/assets/`: `cd frontend && npx @capacitor/assets generate --android`.

## Project layout

| Folder (`frontend/src`) | Content |
|---|---|
| `core/` | Pure, tested TypeScript logic: geometry, scoring, weather, area scan, land cover, tracking |
| `data/species/` | Rules of each species, as JSON |
| `data/` | Species profiles, loading tips and quips |
| `services/` | Adapters: GPS, local storage, map and data caches, area scan |
| `hooks/`, `components/` | React interface |

## External data

All free and keyless:

- [Open-Meteo](https://open-meteo.com/): weather of the last 10 days.
- [Terrain Tiles (Terrarium)](https://registry.opendata.aws/terrain-tiles/) on AWS: elevation, read from the tile pixels.
- [CORINE Land Cover 2018](https://land.copernicus.eu/pan-european/corine-land-cover) (Copernicus / EEA): forests, grassland and built-up areas at 100 m. Without it the score is computed without vegetation.
- [Nominatim](https://nominatim.org/) (OpenStreetMap): name of the town nearest to the suggested area.
- [Thunderforest](https://www.thunderforest.com/) (Outdoors) or OpenTopoMap: map tiles.

## Today's best area

Once a day the app runs a two-step scan (`core/areaScan.ts`, `services/areaScan.ts`):

1. **Coarse scan**: one point every 12 km within 120 km (about 320), with weather, elevation and season, scoring every species.
2. **Refinement**: the 3 best areas, far from each other, are recomputed on a 2.5 km grid with vegetation and distance from built-up areas. The best final score wins; the app then warms the caches and downloads the map tiles around it.

## How the score works

Each factor gets a value from 0 to 1 through a **trapezoid curve** (`min`, `optMin`, `optMax`, `max`): 0 outside the range, 1 in the optimal band, linear in between.

```
multiplier = 1 − influence × (1 − value)
```

- **Season**, **elevation** and **distance from built-up areas** are *non-blocking* multipliers, with influence 0.7, 0.5 and 0.4 (`scoring.ts`): a value of 0 lowers the score to 30%, 50% and 60% respectively. Season is mid-month based and interpolated between adjacent months; distance is 0 within 200 m of a built-up area and 1 beyond 1 km.
- **Temperature** (mean of the last 5 days, corrected for each cell's elevation by −0.65 °C per 100 m), **rain** (total of the last 10 days) and **humidity** (mean of the last 10 days) are combined with the weights defined in the JSON.
- **Vegetation** (optional per species): the cell's habitat (from CORINE) is compared with the `weighted.habitat` preferences. If the data is missing, the factor is left out of the average.
- **Likely forest** (Calabria only): the cell details show an estimate of the forest type from habitat and elevation (`core/forestType.ts`). It is a heuristic and does not enter the score.
- **Bands**: very low (< 17), low (17–32), medium-low (33–49), medium-high (50–65), high (66–82), very high (≥ 83).
- Weather is read at a single point per grid: rain and humidity are the same in every cell, while elevation and temperature change from cell to cell.

## Add a species

Create a file in `frontend/src/data/species/` (it is loaded and validated automatically):

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

`season` holds 12 values between 0 and 1, from January to December.

> The species values are **plausible placeholders** and should be validated by a mycology expert.
