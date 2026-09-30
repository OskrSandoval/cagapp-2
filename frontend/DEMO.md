# Modo demo local

Sirve para ver y probar la app en el navegador sin login real y sin tocar
Supabase ni el backend. La sesión, la API y el GPS son falsos y viven en
memoria. Todo se reinicia al recargar la página.

## Cómo arrancarlo

```bash
cd frontend
npm run dev:demo
```

Abre `http://localhost:5173`. La app entra directo al Mapa con un perfil
autorizado ("Demo"), y el título de la pestaña empieza con `[DEMO]`. Para
revisarla como en un celular, usa el modo de dispositivo de las DevTools
(por ejemplo 360×640 o 390×844).

`npm run dev` sigue igual que siempre, con login real. El modo demo solo se
activa en desarrollo con `VITE_MODO_DEMO=true`, que viene en
`frontend/.env.demo`. `npm run build` no lo incluye.

## Qué hay

- **Ubicación inicial:** Roma Norte (19.4195, -99.162), con precisión de 15m.
- **Baños:** 6 alrededor de la Roma y la Condesa. Café La Plaza está a unos
  78m y deja hacer check-in. Librería Orizaba está a unos 178m y queda
  fuera de rango. Los demás están a más de 500m. Algunos tienen
  calificaciones y otros no.
- **Perfil:** ya tiene una visita (Mercado de Medellín, 4★).
- **Buzón de sugerencias:** encendido.

La API falsa imita los códigos y mensajes del backend real: la regla de 150m
y de precisión del check-in, la ventana de 15 minutos para calificar, las
validaciones de Agregar Baño y de Sugerencias, etc. Los tiles del mapa sí se
cargan de OpenStreetMap.

## Comandos de consola

Todos están en `window.cagappDemo`:

| Comando | Qué hace |
|---|---|
| `cagappDemo.moverA(lat, lng, accuracy?)` | Mueve el GPS falso. Avisa a los `watchPosition` activos y a los `getCurrentPosition` pendientes. Si no mandas `accuracy`, se queda la anterior. |
| `cagappDemo.sacudirGps()` | Vuelve a emitir la misma posición como un objeto nuevo, como el ruido de un GPS real. Sirve para comprobar que Agregar Baño no pierde el foco. |
| `cagappDemo.fallarSiguiente('/banos')` | La siguiente petición a esa ruta responde 500 con el mensaje de error del backend, sea del método que sea: con `'/banos'` falla igual el siguiente `GET /banos` (recargar baños) que el siguiente `POST /banos` (Agregar Baño), el que llegue primero. La que sigue ya funciona. |
| `cagappDemo.buzon(false)` | Apaga el switch de sugerencias (`true` lo prende). Solo acepta `true` o `false`; cualquier otra cosa lanza un error. El botón 💬 se actualiza cuando se vuelve a montar el Mapa, así que recarga o vuelve a entrar. |
| `cagappDemo.estado()` | Devuelve los perfiles, los baños, check-ins, calificaciones y sugerencias en memoria, y la posición del GPS. |

Ejemplos:

```js
// Check-in fuera de rango (403): ir al Zócalo, a más de 2km de todos los
// baños semilla. Luego abre cualquier baño y toca "Hacer check-in".
cagappDemo.moverA(19.4326, -99.1332)

// Precisión mala para probar "GPS medio perdido" (422): parado junto a
// Café La Plaza pero con accuracy de 150m. Toca "Hacer check-in" en Café La Plaza.
cagappDemo.moverA(19.4202, -99.162, 150)

// Forzar un error al traer baños. El Mapa solo vuelve a pedir baños si la
// posición cambia más de 0.0003° en lat o lng, así que hay que moverse más
// que eso (aquí 0.001°, unos 110m) para disparar el refetch que falla.
cagappDemo.fallarSiguiente('/banos')
cagappDemo.moverA(19.4205, -99.162)
```

## Límites

- **Cerrar sesión no hace nada.** `signOut` es falso y la sesión demo nunca
  cambia, así que la app se queda en el Mapa. Para "reiniciar", recarga la
  página.
- **Las pantallas anteriores al Mapa no se alcanzan:** Login, Recuperar
  acceso, Restablecer contraseña, Completar perfil y En espera. La sesión
  siempre existe y el perfil siempre está autorizado. Esas pantallas se
  prueban con `npm run dev` o con los tests.

## Archivos

- `src/demo/datosDemo.js`: los datos semilla.
- `src/demo/apiDemo.js`: la API en memoria (`manejarPeticion(metodo, ruta, cuerpo)`).
- `src/demo/gpsDemo.js`: la geolocalización falsa.
- `src/demo/instalarDemo.js`: reemplaza `supabase.auth`, `window.fetch` (solo
  para `VITE_API_URL`) y `navigator.geolocation`, y expone `window.cagappDemo`.
- `src/main.jsx`: lo carga con un import dinámico antes del primer render.

Si cambia un controlador del backend, hay que ajustar `apiDemo.js` a mano.
