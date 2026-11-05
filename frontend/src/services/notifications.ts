import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const SUNSET_NOTIFICATION_ID = 1

export async function cancelSunsetNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({ notifications: [{ id: SUNSET_NOTIFICATION_ID }] })
}

/** Programma (sostituendo la precedente) la notifica di rientro; ignorata senza permesso o se `at` è passato. */
export async function scheduleSunsetNotification(at: Date, sunset: Date): Promise<void> {
  if (!Capacitor.isNativePlatform() || at.getTime() <= Date.now()) return

  let { display } = await LocalNotifications.checkPermissions()
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    display = (await LocalNotifications.requestPermissions()).display
  }
  if (display !== 'granted') return

  const time = sunset.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  await cancelSunsetNotification()
  await LocalNotifications.schedule({
    notifications: [
      {
        id: SUNSET_NOTIFICATION_ID,
        title: 'Tra un’ora tramonta il sole',
        body: `Tramonto alle ${time}: torna verso il punto di partenza.`,
        schedule: { at, allowWhileIdle: true },
      },
    ],
  })
}
