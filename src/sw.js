import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

// Repris à l'identique de la config generateSW d'avant (tuiles de carte et polices,
// mis en cache pour que l'app reste utilisable hors-ligne une fois déjà visitée).
registerRoute(
  ({ url }) => url.hostname === 'basemaps.cartocdn.com',
  new CacheFirst({
    cacheName: 'tuiles-carte',
    plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 })]
  })
)
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'polices',
    plugins: [new ExpirationPlugin({ maxEntries: 20 })]
  })
)

/* ------------------------------------------------------------------ */
/* Notifications push : l'Edge Function `notifier-partenaire` envoie    */
/* un payload JSON { titre, corps, url } signé avec la clé VAPID.       */
/* ------------------------------------------------------------------ */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch { /* payload non-JSON, on ignore */ }

  event.waitUntil(
    self.registration.showNotification(data.titre || 'Nos envies', {
      body: data.corps || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const ouvert = clients.find((c) => c.url.includes(self.location.origin))
      if (ouvert) return ouvert.focus()
      return self.clients.openWindow(url)
    })
  )
})
