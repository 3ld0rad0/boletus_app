/** Descrizione e icona di un codice meteo WMO (Open-Meteo `weather_code`). */
export function describeWeatherCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Sereno', emoji: '☀️' }
  if (code === 1) return { label: 'Prevalentemente sereno', emoji: '🌤️' }
  if (code === 2) return { label: 'Parzialmente nuvoloso', emoji: '⛅' }
  if (code === 3) return { label: 'Coperto', emoji: '☁️' }
  if (code === 45 || code === 48) return { label: 'Nebbia', emoji: '🌫️' }
  if (code >= 51 && code <= 57) return { label: 'Pioggerella', emoji: '🌦️' }
  if (code >= 61 && code <= 67) return { label: 'Pioggia', emoji: '🌧️' }
  if (code >= 71 && code <= 77) return { label: 'Neve', emoji: '🌨️' }
  if (code >= 80 && code <= 82) return { label: 'Rovesci', emoji: '🌦️' }
  if (code === 85 || code === 86) return { label: 'Rovesci di neve', emoji: '🌨️' }
  if (code === 95) return { label: 'Temporale', emoji: '⛈️' }
  if (code === 96 || code === 99) return { label: 'Temporale con grandine', emoji: '⛈️' }
  return { label: 'Condizioni non disponibili', emoji: '❔' }
}
