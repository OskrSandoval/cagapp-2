---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-cagapp2.0-2026-09-11/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-cagapp2.0-2026-09-11/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cagapp2.0-2026-09-11/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cagapp2.0-2026-09-11/EXPERIENCE.md
---

# CagApp 2.0 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CagApp 2.0, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Un visitante puede registrar una Cuenta con correo/contraseña o proveedor social (Google/Facebook), capturando un nombre para mostrar.
FR2: Un Usuario con Cuenta puede iniciar sesión con las mismas credenciales.
FR3: Un Usuario puede recuperar el acceso a su cuenta vía correo (no aplica a cuentas sociales).
FR4: Un Usuario con Cuenta (autenticado — el login es obligatorio, no hay modo anónimo) puede ver un mapa centrado en su ubicación con los baños cercanos marcados por calificación promedio.
FR5: Un Usuario con Cuenta puede alternar del mapa a una lista de baños ordenada por cercanía.
FR6: Un Usuario con Cuenta puede abrir el detalle de un baño (nombre, ubicación, tipo, calificación promedio).
FR7: Antes de crear un baño nuevo, el sistema obliga a buscar duplicados existentes en un radio de 1.5km.
FR8: Un Usuario con Cuenta puede registrar un baño nuevo (nombre, ubicación, tipo de lugar) tras confirmar que no existía.
FR9: Un Usuario puede hacer check-in en un baño solo si su ubicación está dentro de 150m del baño, con manejo explícito de precisión de GPS insuficiente (reintento) vs. fuera de rango.
FR10: Un Usuario solo puede calificar (1-5 estrellas) un baño inmediatamente después de un check-in exitoso; una nueva calificación reemplaza cuál cuenta como vigente, sin borrar el historial.
FR11: Un Usuario con Cuenta puede ver, en su Perfil, su propia actividad (baños en los que hizo check-in y su calificación vigente) — nunca la de otros usuarios.
FR12: Un Usuario con Cuenta puede ver, en el Detalle de un Baño, una lista pública de calificaciones de otros usuarios (nombre para mostrar, estrellas, fecha) — sin exponer identificadores internos.

### NonFunctional Requirements

NFR1: El mapa debe volverse interactivo (ubicación + baños cercanos visibles) en menos de 3 segundos en una conexión móvil típica, cuando el backend ya está "despierto" (ver tradeoff de cold-start de Render en Additional Requirements).
NFR2: Producto web responsivo, mobile-first; sin apps nativas iOS/Android en v1.
NFR3: Privacidad — la ubicación exacta del dispositivo de un Usuario nunca se muestra a otros usuarios ni se persiste; el check-in solo usa la ubicación en memoria durante esa petición.
NFR4: Seguridad de autenticación — identidad, contraseñas y expiración de sesión delegadas por completo a Supabase Auth; el backend nunca almacena contraseñas.
NFR5: Row Level Security habilitado (deny-by-default) en las tablas de negocio (`baños`, `calificaciones`, `perfiles`) como defensa en profundidad, ya que el backend accede vía `service role key`.
NFR6: Lanzamiento solo en español, enfocado en CDMX (sin selector de idioma en v1).

### Additional Requirements

- **Sin starter/scaffold especificado** — Arquitectura define dos proyectos separados creados manualmente: `frontend/` (React + Vite) y `backend/` (Node + Express), no un generador de proyecto único. La Épica 1 debe incluir el setup manual de ambos, conectados a un proyecto de Supabase.
- Paradigma backend: Arquitectura en Capas (`rutas → controladores → servicios → acceso a datos`), con dirección de dependencia de una sola vía (AD-2).
- Límite frontend/backend: el frontend solo usa el SDK de Supabase para login/sesión; toda la demás lógica de negocio pasa por la API de Node, que usa la `service role key` (AD-1).
- Modelo de datos: tabla `calificaciones` append-only (solo `INSERT`, columna `secuencia` bigserial para desempate de timestamps); tabla `perfiles` separada de `auth.users` de Supabase, creada explícitamente vía `POST /perfiles` tras el registro (no vía trigger de base de datos); tabla `baños` con campo `zona` para el fallback de búsqueda por zona (AD-3, AD-10).
- Cálculo de distancia: una sola función Haversine compartida en la capa de servicios, usada tanto para el radio de check-in (150m) como para la búsqueda de duplicados (1.5km) (AD-4).
- Manejo de precisión de GPS: el frontend envía `{lat, lng, accuracy}` en cada intento de check-in; el backend distingue "fuera de rango" de "precisión insuficiente" (AD-8).
- Autenticación entre frontend/backend: JWT de Supabase enviado como `Authorization: Bearer <token>`, verificado por el backend en cada request protegido (AD-5, AD-12).
- Forma de respuestas de la API: recurso directo en JSON + código HTTP, errores como `{ "error": "mensaje" }` (AD-7). La lista pública de FR12 solo expone `{nombre_para_mostrar, estrellas, created_at}` (AD-11).
- Vocabulario en español en tablas, columnas de negocio, rutas y variables de dominio; columnas técnicas genéricas (`id`, `created_at`) en inglés por convención de Postgres/Supabase (AD-6).
- Despliegue: backend en Render (plan gratis, cold-start de 30-60s tras 15min inactivo — tradeoff aceptado, en tensión con NFR1 para la primera petición tras inactividad), frontend en Vercel (plan gratis, uso no comercial), base de datos/Auth en Supabase.
- Configuración y secretos: `service role key` y demás credenciales en variables de entorno (`.env` local excluido de git, variables de entorno de Render/Vercel en producción) — nunca committeadas.
- Sin estrategia de pruebas automatizadas definida para el MVP (diferido explícitamente en Arquitectura).

### UX Design Requirements

UX-DR1: Implementar la paleta de color "Naranja Foursquare" con los tokens exactos de `DESIGN.md` (bg #FFFFFF, surface #FFF8F3, primary #D53C19, primary-ink #FFFFFF, text #2B1B12, muted #8A6A5A, success #1F7A45, success-surface #E6F4EB, success-border #BFE6CC, warning #CB3E48, border #F2D9CC, star-off #E8D9CE) — valores ya corregidos para pasar contraste WCAG AA.
UX-DR2: Tipografía del sistema (sin webfont propia) con 7 roles por peso/tamaño: display (24px/800), heading (16px/800), label (13px/700), button (15px/800), body (14px/400), meta (12.5px/400), caption (11px/400).
UX-DR3: Implementar los siguientes componentes con su especificación visual (DESIGN.md) y comportamental (EXPERIENCE.md) — nombres canónicos, usar exactamente estos: Wordmark/logo, Pestañas segmentadas, Campo de texto, Botón primario, Botón social, Ícono de Perfil, Toggle Mapa/Lista, FAB Agregar Baño, Pin de mapa, Tarjeta hero de Detalle, Chip de rango, Banner de confirmación, Etiqueta de calificación, Selector de calificación, Lista de referencia de calificaciones, Paso de búsqueda de duplicados, Formulario de creación, Lista "Lo que dice la gente".
UX-DR4: Navegación sin barra de navegación inferior — Ícono de Perfil fijo arriba-izquierda, Toggle Mapa/Lista fijo arriba-derecha (ambos flotando sobre el mapa), FAB Agregar Baño flotante centrado abajo. Navegación de detalle por flecha de retroceso, un nivel a la vez.
UX-DR5: Implementar todos los siguientes Estados definidos en EXPERIENCE.md § State Patterns: cold-open no autenticado (redirige a Login), correo duplicado en registro, credenciales incorrectas, contraseña débil, permiso de geolocalización denegado (fallback buscar por zona), sin baños cercanos (invita a agregar el primero), baño sin calificaciones todavía, dentro de rango de check-in, fuera de rango de check-in, precisión de GPS insuficiente (ofrece reintentar), check-in exitoso, intento de calificar sin check-in previo (rechazado), re-check-in/re-calificar (reemplaza vigente), sesión persistente entre visitas, Crear Baño con duplicado encontrado, error de validación en formulario de creación, confirmación de creación exitosa, Perfil vacío (usuario nuevo), Mapa en estado de carga, Detalle con deep link inválido/baño inexistente, Lista comparte estado vacío del Mapa.
UX-DR6: Accesibilidad — cumplir contraste AA con los tokens corregidos de UX-DR1; tap targets ≥24×24px mínimo (pines de mapa necesitan área de toque invisible ampliada) y ≥40-44px para controles principales (botón de retroceso, ícono de Perfil); asociar `<label for>`/`<input id>` en formularios; `aria-label` en botones de solo ícono (Perfil, retroceso); campo de contraseña con `type="password"` real y `autocomplete` correcto.
UX-DR7: Tono "chusco" (divertido, con emojis en momentos clave, nunca corporativo neutro) en toda la copy de producto — usar las cadenas de ejemplo ya definidas en EXPERIENCE.md § Voice and Tone (tabla Do/Don't) y las 5 captions de calificación (💩 Un desastre / 😬 Sobrevivible, de panza / 😐 Normalito, ni fu ni fa / 🙂 Bien limpio, sin drama / 🤩 Limpio, amplio y hasta huele bien).
UX-DR8: Usar los 3 mockups HTML aprobados en `ux-cagapp2.0-2026-09-11/mockups/` (key-login.html, key-mapa.html, key-detalle-checkin.html) como referencia visual pixel-level para esas pantallas específicas; el resto de pantallas (Lista, Crear Baño, Perfil) se construyen desde las tablas de EXPERIENCE.md/DESIGN.md sin mockup — no está definido a nivel de píxel.
UX-DR9: Sección Inspiration & Anti-patterns de EXPERIENCE.md — el patrón de IA está inspirado en el check-in de Foursquare; NO modelar la app según Flush (sin personalidad), SitOrSquat (dependencia de un solo patrocinador), ni Refuge Restrooms (nicho único) — decisiones de diseño ya descartadas explícitamente.

### FR Coverage Map

FR1: Epic 1 - Registro de cuenta
FR2: Epic 1 - Inicio de sesión
FR3: Epic 1 - Recuperar acceso
FR4: Epic 2 - Mapa de baños cercanos
FR5: Epic 2 - Vista de lista
FR6: Epic 2 - Detalle de un baño
FR7: Epic 2 - Buscar antes de crear (deduplicación)
FR8: Epic 2 - Crear un baño nuevo
FR9: Epic 3 - Check-in con verificación de ubicación
FR10: Epic 3 - Calificar tras check-in
FR11: Epic 4 - Ver mi actividad (Perfil)
FR12: Epic 4 - Ver calificaciones de otros usuarios

## Epic List

### Epic 1: Cuenta y Acceso
Cualquier persona puede crear una cuenta, iniciar sesión y recuperar su acceso. Es la puerta de entrada obligatoria a CagApp — no existe navegación sin cuenta.
**FRs covered:** FR1, FR2, FR3

### Epic 2: Baños — Descubrir y Agregar
Un usuario autenticado puede ver el mapa y la lista de baños cercanos, abrir el detalle de un baño, y agregar uno nuevo cuando no existe (con búsqueda de duplicados obligatoria antes de crear).
**FRs covered:** FR4, FR5, FR6, FR7, FR8

### Epic 3: Check-in y Calificación
Un usuario puede hacer check-in verificado por ubicación en un baño y, solo después de ese check-in, calificarlo de 1 a 5 estrellas. Es el mecanismo de confianza central del producto.
**FRs covered:** FR9, FR10

### Epic 4: Actividad y Comunidad
Un usuario puede ver su propia actividad de calificación (Perfil) y ver públicamente qué calificaron otros usuarios en el detalle de cada baño.
**FRs covered:** FR11, FR12

## Epic 1: Cuenta y Acceso

Cualquier persona puede crear una cuenta, iniciar sesión y recuperar su acceso. Es la puerta de entrada obligatoria a CagApp — no existe navegación sin cuenta.

### Story 1.1: Registro de cuenta

> **Nota:** el registro/inicio de sesión social (Google/Facebook) descrito en los AC de abajo quedó diferido — la implementación de esta historia cubre solo correo/contraseña. Ver `_bmad-output/implementation-artifacts/deferred-work.md`.

As a visitante,
I want crear una cuenta con correo/contraseña o con Google/Facebook,
So that pueda acceder a CagApp.

**Acceptance Criteria:**

**Given** que no tengo cuenta
**When** lleno el formulario con correo, contraseña y nombre para mostrar
**Then** se crea mi cuenta en Supabase Auth y mi fila de perfil (AD-10)
**And** quedo autenticado automáticamente

**Given** que elijo registrarme con Google o Facebook
**When** autorizo el acceso
**Then** se crea mi cuenta y perfil de la misma forma

**Given** que el correo ya está registrado
**When** intento crear la cuenta
**Then** el sistema lo rechaza con un mensaje claro

**Given** que mi contraseña no cumple el mínimo de Supabase Auth
**When** intento registrarme
**Then** veo el error correspondiente

**Given** que es la primera vez que se levanta el proyecto
**When** sigo la configuración inicial (frontend Vite + backend Express + proyecto de Supabase conectados)
**Then** ambos corren localmente y se comunican entre sí

### Story 1.2: Inicio de sesión y puerta de entrada obligatoria

As a usuario con cuenta,
I want iniciar sesión con mis credenciales,
So that pueda volver a usar CagApp sin registrarme de nuevo.

**Acceptance Criteria:**

**Given** que tengo cuenta
**When** ingreso credenciales correctas
**Then** quedo autenticado y mi sesión persiste entre visitas

**Given** que ingreso credenciales incorrectas
**When** intento iniciar sesión
**Then** veo un mensaje de error claro

**Given** que no estoy autenticado
**When** abro CagApp
**Then** se me redirige a Login/Registro antes de ver cualquier otra pantalla — no existe modo de navegación anónima

**Given** que cierro sesión explícitamente
**When** vuelvo a abrir la app
**Then** se me pide iniciar sesión de nuevo

### Story 1.3: Recuperar acceso

As a usuario que olvidó su contraseña,
I want recuperarla vía correo,
So that no quede bloqueado fuera de mi cuenta.

**Acceptance Criteria:**

**Given** que olvidé mi contraseña
**When** la solicito con mi correo registrado
**Then** recibo instrucciones para restablecerla

**Given** que mi cuenta es de Google/Facebook
**When** intento recuperar contraseña
**Then** el sistema indica que no aplica

## Epic 2: Baños — Descubrir y Agregar

Un usuario autenticado puede ver el mapa y la lista de baños cercanos, abrir el detalle de un baño, y agregar uno nuevo cuando no existe (con búsqueda de duplicados obligatoria antes de crear).

### Story 2.1: Ver baños cercanos en el mapa

As a usuario autenticado,
I want ver un mapa con los baños cercanos a mi ubicación,
So that sepa qué opciones tengo cerca.

**Acceptance Criteria:**

**Given** que abro CagApp autenticado
**When** se carga el Mapa
**Then** veo mi ubicación y los baños cercanos marcados con su calificación promedio
**And** el mapa se vuelve interactivo en menos de 3 segundos en conexión móvil típica cuando el backend ya está activo

**Given** que niego el permiso de geolocalización
**When** el Mapa intenta cargar
**Then** se muestra un buscador por nombre de zona en vez del mapa geolocalizado

**Given** que no hay ningún baño registrado cerca
**When** veo el Mapa
**Then** la app me lo dice claramente y me invita a ser el primero en agregar uno

**Given** que los pines se colorean por nivel de calificación
**When** veo el mapa
**Then** cada pin también muestra el número exacto, no solo el color

### Story 2.2: Alternar a vista de lista

As a usuario autenticado,
I want ver los baños cercanos en una lista ordenada por cercanía,
So that pueda escanear las opciones más fácil que en el mapa.

**Acceptance Criteria:**

**Given** que estoy viendo el Mapa
**When** toco el botón de alternar arriba a la derecha
**Then** veo la Lista con los mismos baños ordenados por cercanía

**Given** que cambia mi ubicación
**When** estoy en la Lista
**Then** se reordena automáticamente

**Given** que estoy en la Lista
**When** toco el botón de alternar
**Then** regreso al Mapa

### Story 2.3: Ver el detalle de un baño

As a usuario autenticado,
I want ver el detalle de un baño,
So that pueda decidir si voy antes de llegar.

**Acceptance Criteria:**

**Given** que toco un pin del mapa o una fila de la lista
**When** se abre el Detalle
**Then** veo nombre, ubicación, tipo de lugar, calificación promedio y distancia

**Given** que el baño no tiene ninguna calificación todavía
**When** veo su Detalle
**Then** se indica explícitamente en vez de mostrar un promedio vacío o en cero

### Story 2.4: Agregar un baño nuevo (con búsqueda de duplicados)

As a usuario autenticado,
I want agregar un baño que no existe en CagApp,
So that la comunidad pueda encontrarlo y calificarlo.

**Acceptance Criteria:**

**Given** que toco el botón "Agregar Baño"
**When** indico la ubicación
**Then** el sistema busca baños existentes en un radio de 1.5km antes de dejarme continuar

**Given** que se encuentra un baño existente cercano
**When** reviso los resultados
**Then** se me muestra ese baño en vez de dejarme crear un duplicado

**Given** que no existe ningún baño cercano
**When** confirmo que quiero crear uno nuevo
**Then** puedo llenar nombre, ubicación, zona y tipo de lugar

**Given** que creo el baño
**When** se guarda
**Then** queda inmediatamente visible en el mapa y la lista para todos los usuarios

## Epic 3: Check-in y Calificación

Un usuario puede hacer check-in verificado por ubicación en un baño y, solo después de ese check-in, calificarlo de 1 a 5 estrellas. Es el mecanismo de confianza central del producto.

### Story 3.1: Hacer check-in en un baño

As a usuario autenticado,
I want hacer check-in cuando estoy físicamente en un baño,
So that pueda calificarlo con confianza para la comunidad.

**Acceptance Criteria:**

**Given** que estoy dentro de 150m de un baño
**When** toco "Hacer check-in"
**Then** el check-in se registra exitosamente y veo confirmación

**Given** que estoy fuera de 150m
**When** intento hacer check-in
**Then** el sistema lo rechaza y explica el motivo

**Given** que mi GPS no tiene suficiente precisión para confirmar los 150m
**When** intento el check-in
**Then** el sistema me indica que no puede confirmar y me ofrece reintentar, en vez de rechazar en silencio

**Given** que el check-in es exitoso
**When** se guarda
**Then** solo se registra la asociación usuario-baño-momento, sin historial de ubicación continua ni exposición de mi ubicación a otros usuarios

### Story 3.2: Calificar un baño tras el check-in

As a usuario que acaba de hacer check-in,
I want calificar el baño de 1 a 5 estrellas,
So that deje constancia de mi experiencia.

**Acceptance Criteria:**

**Given** que hice check-in exitoso
**When** elijo una calificación de 1 a 5 estrellas
**Then** se publica y el promedio del baño se recalcula de inmediato

**Given** que no he hecho check-in en ese baño
**When** intento calificar (por interfaz o URL directa)
**Then** el sistema no me lo permite

**Given** que ya había calificado este baño antes
**When** hago check-in y califico de nuevo
**Then** mi nueva calificación reemplaza cuál cuenta como vigente para el promedio, sin borrar el historial anterior

**Given** que elijo cada número de estrella
**When** lo selecciono
**Then** veo el mensaje chusco correspondiente (💩 Un desastre ... 🤩 Limpio, amplio y hasta huele bien)

## Epic 4: Actividad y Comunidad

Un usuario puede ver su propia actividad de calificación (Perfil) y ver públicamente qué calificaron otros usuarios en el detalle de cada baño.

### Story 4.1: Ver mi actividad en el Perfil

As a usuario autenticado,
I want ver mi propia actividad de check-ins y calificaciones,
So that sienta que mi aporte cuenta.

**Acceptance Criteria:**

**Given** que he hecho check-in y calificado baños
**When** abro mi Perfil
**Then** veo la lista de baños en los que hice check-in y mi calificación vigente en cada uno

**Given** que soy un usuario nuevo sin actividad
**When** abro mi Perfil
**Then** veo un estado vacío que me invita a calificar mi primer baño, no una lista vacía sin contexto

**Given** que abro mi Perfil
**When** veo mi actividad
**Then** nunca se muestra la actividad de otros usuarios

### Story 4.2: Ver calificaciones de otros usuarios en un baño

As a usuario autenticado,
I want ver qué calificaron otros usuarios en el detalle de un baño,
So that tenga más contexto antes de decidir ir.

**Acceptance Criteria:**

**Given** que abro el Detalle de un baño con calificaciones
**When** lo veo
**Then** aparece una lista "Lo que dice la gente" con el nombre para mostrar, las estrellas y la fecha relativa de cada calificación

**Given** que veo esa lista
**When** inspecciono los datos que expone
**Then** nunca incluye un identificador interno del usuario ni su ubicación

**Given** que el baño no tiene calificaciones todavía
**When** veo esa sección
**Then** se aplica el mismo estado vacío del Detalle
