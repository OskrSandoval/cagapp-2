---
title: PRD: CagApp 2.0
status: final
created: 2026-09-11
updated: 2026-09-11
---

# PRD: CagApp 2.0

## 0. Document Purpose

Este PRD traduce el [product brief de CagApp 2.0](../../briefs/brief-cagapp2.0-2026-09-10/brief.md) en requisitos concretos para diseño (UX) y arquitectura. Está pensado para que skr (fundador/desarrollador) y sus dos socios (abogado y emprendedor) tengan una referencia común de qué se construye en el MVP y por qué. Estructura: un Glosario define el vocabulario que el resto del documento usa sin sinónimos; las funciones (§4) agrupan los Requisitos Funcionales (FR) con IDs globales estables; los supuestos inferidos llevan `[SUPUESTO]` inline y están indexados en §9.

## 1. Vision

CagApp 2.0 es una app web que convierte la eterna pregunta de "¿dónde hay un baño decente por aquí?" en algo que cualquiera puede responder en segundos — un "Foursquare de los baños" donde la propia comunidad mapea y califica baños de cualquier tipo, desde gasolineras hasta el más nice de la ciudad.

Resuelve un problema que hoy no tiene fuente confiable: Google Maps no trata al baño como categoría propia, y la única opción es preguntar a alguien o tocar la puerta de un negocio. CagApp da un mapa y una lista de baños cercanos, calificados del 1 al 5 por usuarios que hicieron check-in físicamente en el lugar — sin fricción innecesaria en el flujo — lo que da a los datos una confianza que ningún competidor investigado ofrece.

Ningún competidor junta lo que CagApp junta: Flush es funcional pero sin personalidad; SitOrSquat (patrocinada por una marca) se apagó cuando se acabó el interés de marketing; Refuge Restrooms es un nicho específico, no cualquier baño. CagApp combina cobertura amplia, un tono divertido que engancha por gusto (no solo por necesidad), y la confianza del check-in verificado — algo que ninguno de los tres resuelve junto.

Arranca en CDMX, solo en español, como proyecto de aprendizaje con ambición real de funcionar. La meta, medio en broma medio en serio, es que CagApp se vuelva la referencia obligada antes de salir de casa en cualquier ciudad donde exista. Si la cobertura y la comunidad crecen, los propios datos recopilados se convierten en el activo de largo plazo de CagApp (ver §Monetización y el addendum del brief).

## 2. Target User

### 2.1 Jobs To Be Done

- **Como buscador con urgencia**, cuando necesito un baño en la calle (por urgencia o porque ando de viaje), quiero encontrar rápido uno cercano y confiable, para no tener una mala experiencia ni perder tiempo preguntando a extraños.
- **Como reseñador entusiasta**, cuando visito un baño, quiero calificarlo y dejar constancia de mi visita, para participar en la comunidad y sentir que mi aporte cuenta — con o sin urgencia real de por medio.

Ambos perfiles se necesitan mutuamente: sin reseñadores entusiastas no hay suficientes datos para que los buscadores con urgencia encuentren algo útil, y sin gente con una necesidad real, la app pierde su razón de ser práctica. Ese ciclo es el motor de crecimiento del producto, no dos audiencias separadas.

### 2.2 Non-Users (v1)

- Negocios que quieran administrar o reclamar el perfil de su baño — no hay cuenta de negocio en v1 (ver §5 No-Objetivos).
- Usuarios que busquen reseñas generales de un negocio (comida, servicio, precio) — CagApp califica únicamente el baño, no el negocio completo.

### 2.3 Key User Journeys

- **UJ-1. Mario encuentra un baño confiable a media calle.**
  - **Persona + contexto:** Mario, el "buscador con urgencia", va caminando por la Roma Norte y siente la urgencia.
  - **Entry state:** tiene cuenta creada de una sesión anterior; abre CagApp desde el navegador de su celular.
  - **Path:** la app pide permiso de ubicación → muestra el mapa centrado en su posición con los baños cercanos marcados por calificación → Mario alterna a la vista de lista, ordenada por cercanía → elige el baño mejor calificado a 3 cuadras → toca para ver el detalle (calificación promedio, tipo de lugar).
  - **Climax:** Mario confirma que el baño tiene 4.5 estrellas y llega sin sorpresas desagradables.
  - **Resolution:** al llegar, puede hacer check-in y calificar su propia experiencia si quiere (opcional en este journey — ver UJ-2 para el flujo completo de calificar).
  - **Edge case:** si no hay ningún baño registrado cerca, la app se lo dice claramente y lo invita a ser el primero en agregar uno cuando llegue a algún lugar.

- **UJ-2. Ana registra y califica un baño nuevo por gusto.**
  - **Persona + contexto:** Ana, la "reseñadora entusiasta", entra a una cafetería nueva y usa el baño sin ninguna urgencia particular — solo porque le gusta calificar.
  - **Entry state:** autenticada, físicamente dentro del negocio.
  - **Path:** abre CagApp → busca si el baño de esa cafetería ya existe (por nombre o ubicación) → no lo encuentra → lo crea (nombre, ubicación, tipo de lugar) → la app confirma que está dentro del rango de ubicación válido y habilita el check-in → hace check-in → califica 1-5 estrellas.
  - **Climax:** su calificación queda publicada y visible para el resto de la comunidad, ligada a su check-in verificado.
  - **Resolution:** Ana ve su actividad reflejada en su perfil (baños que ha calificado).
  - **Edge case:** si Ana intenta calificar sin haber hecho check-in (por ejemplo, lejos del lugar), la app rechaza la calificación y explica que debe estar físicamente en el baño.

## 3. Glossary

- **Baño** — La entidad central de la app: un lugar físico calificable (gasolinera, restaurante, centro comercial, vía pública, cualquier tipo). Tiene nombre, ubicación geográfica, tipo de lugar, y una calificación promedio derivada de sus Calificaciones.
- **Calificación** — Una puntuación de 1 a 5 estrellas que un Usuario asigna a un Baño tras un Check-in exitoso. 1 = "un desastre", 5 = "limpio, amplio y hasta huele bien". Un Usuario tiene como máximo una Calificación **vigente** por Baño: un nuevo Check-in y Calificación al mismo Baño **reemplaza cuál cuenta como vigente** de ese Usuario para el promedio ("rectificar" una calificación previa) `[confirmado por skr]`. Esto es distinto de borrar el historial — ver FR-10 sobre qué se conserva.
- **Check-in** — Evento que registra que un Usuario estuvo físicamente en la ubicación de un Baño, verificado por la ubicación del dispositivo. Es requisito previo para poder dejar una Calificación.
- **Usuario** — Persona con Cuenta en CagApp. Puede ser, en un mismo momento, un Buscador con Urgencia, un Reseñador Entusiasta, o ambos — son motivaciones de uso, no tipos de cuenta distintos.
- **Buscador con Urgencia** — Perfil de uso: un Usuario que consulta CagApp para encontrar un Baño cercano y confiable ante una necesidad real.
- **Reseñador Entusiasta** — Perfil de uso: un Usuario que hace Check-in y Califica por gusto de participar, sin urgencia necesaria.
- **Cuenta** — Registro obligatorio de un Usuario en CagApp (correo/contraseña o proveedor social), con un nombre para mostrar. Es obligatoria desde el arranque: no hay navegación sin Cuenta.
- **MVP / v1** — El alcance de la primera versión lanzable de CagApp, definido en §6.

## 4. Features

### 4.1 Cuenta de Usuario

**Descripción:** Cualquier persona puede crear una Cuenta y luego iniciar sesión. La Cuenta es obligatoria desde el arranque: no existe modo de navegación anónima — Login/Registro es la puerta de entrada obligatoria antes de ver el Mapa o cualquier otra pantalla `[CAMBIO — revierte la decisión original de "modo lectura sin cuenta"; decidido durante la sesión de UX, ver .memlog.md del UX]`.

**Requisitos Funcionales:**

#### FR-1: Registro de cuenta
Un visitante puede crear una Cuenta con correo y contraseña, o con un proveedor social (Google o Facebook) `[confirmado por skr]`.

**Consecuencias (verificables):**
- El sistema rechaza el registro con un correo ya usado, con mensaje claro.
- La contraseña cumple un mínimo de seguridad razonable (longitud mínima) `[SUPUESTO: sin política de contraseña específica definida por el usuario]`.
- El registro captura un **nombre para mostrar** (display name), usado para atribuir públicamente sus Calificaciones a otros usuarios (ver FR-12) `[NUEVO — requisito descubierto durante la sesión de UX al confirmar que las calificaciones se muestran públicamente con nombre; no existía en la version anterior de este PRD]`.

#### FR-2: Inicio de sesión
Un Usuario con Cuenta puede iniciar sesión con las mismas credenciales que usó al registrarse (correo/contraseña o el proveedor social elegido).

**Consecuencias (verificables):**
- Una sesión iniciada persiste entre visitas (no se pide login en cada uso) hasta que el Usuario cierra sesión explícitamente o expira el periodo definido por arquitectura.

#### FR-3: Recuperar acceso
Un Usuario que olvidó su contraseña puede recuperarla mediante su correo registrado. *(No aplica a cuentas creadas por proveedor social.)*

#### FR-11: Ver mi actividad
Un Usuario con Cuenta puede ver, en su Perfil, la lista de Baños en los que ha hecho Check-in y su Calificación vigente en cada uno. Realiza UJ-2 (resolución).

**Consecuencias (verificables):**
- El Perfil solo muestra la actividad del propio Usuario autenticado, nunca la de otros usuarios `[SUPUESTO: alcance mínimo, sin edición de perfil, foto o bio más allá de esta lista — ver §5]`.

**Notas:** *(`[NOTE FOR PM]`)* Ningún dato del brief cubre requisitos de perfil público (foto, nombre visible, bio) más allá de ver la propia actividad — se deja fuera de v1 por defecto (ver §5).

### 4.2 Descubrimiento de Baños

**Descripción:** Cómo un Usuario con Cuenta encuentra Baños cercanos, una vez autenticado. Realiza UJ-1.

**Requisitos Funcionales:**

#### FR-4: Mapa de baños cercanos
Un Usuario con Cuenta (autenticado) puede ver un mapa centrado en su ubicación actual, con los Baños cercanos marcados según su calificación promedio. Realiza UJ-1. `[CAMBIO: antes decía "cualquier visitante"; ya no existe navegación sin Cuenta]`

**Consecuencias (verificables):**
- El sistema solicita permiso de geolocalización del navegador antes de centrar el mapa; si se niega, muestra un buscador por nombre de zona en vez del mapa geolocalizado `[confirmado durante UX]`.
- Cada marcador del mapa muestra al menos la calificación promedio del Baño.

#### FR-5: Vista de lista
Un Usuario con Cuenta puede alternar del mapa a una lista de Baños cercanos, ordenada por cercanía. Realiza UJ-1.

**Consecuencias (verificables):**
- La lista se reordena si cambia la ubicación del dispositivo.

#### FR-6: Detalle de un baño
Un Usuario con Cuenta puede abrir el detalle de un Baño para ver su nombre, ubicación, tipo de lugar y calificación promedio. Realiza UJ-1.

**Consecuencias (verificables):**
- Si el Baño no tiene ninguna Calificación todavía, el detalle lo indica en vez de mostrar un promedio vacío o en cero.

#### FR-12: Ver calificaciones de otros usuarios
Un Usuario con Cuenta puede ver, en el Detalle de un Baño, una lista de calificaciones individuales de otros usuarios (nombre para mostrar, estrellas, fecha relativa) `[NUEVO — confirmado durante la sesión de UX: la atribución pública de calificaciones es una decisión de producto explícita]`.

**Consecuencias (verificables):**
- Cada entrada muestra el nombre para mostrar del Usuario (FR-1), su Calificación vigente para ese Baño, y hace cuánto la dejó.
- Esta lista nunca expone la ubicación del Usuario que calificó — solo qué calificó y cuándo, no dónde está esa persona ahora (ver Constraints and Guardrails / Privacidad).
- Si el Baño no tiene Calificaciones todavía, se aplica el mismo estado vacío de FR-6.

**Notas:** *(`[NOTE FOR PM]`)* Cuántas entradas se muestran, el orden (más recientes primero, se asume) y si hay paginación no están definidos — quedan para UX/arquitectura.

### 4.3 Registro de un Baño Nuevo

**Descripción:** Cómo la comunidad agrega Baños que todavía no existen en CagApp, evitando duplicados. Realiza UJ-2.

**Requisitos Funcionales:**

#### FR-7: Buscar antes de crear
Un Usuario con Cuenta que quiere agregar un Baño primero debe buscar/ver si ya existe uno igual o muy cercano, antes de que el sistema le permita crear uno nuevo. Realiza UJ-2.

**Consecuencias (verificables):**
- El sistema sugiere Baños existentes dentro de un radio de **1.5 km** de la ubicación actual antes de habilitar el formulario de creación `[confirmado por skr]`.

#### FR-8: Crear un baño nuevo
Un Usuario con Cuenta puede registrar un Baño nuevo con nombre, ubicación (tomada del dispositivo) y tipo de lugar, cuando confirmó que no existía. Realiza UJ-2.

**Consecuencias (verificables):**
- El Baño creado queda inmediatamente visible en el mapa y la lista para todos los usuarios.

### 4.4 Check-in y Calificación

**Descripción:** El corazón de la confianza de CagApp: solo se puede calificar un Baño después de comprobar que el Usuario estuvo físicamente ahí. Realiza UJ-2.

**Requisitos Funcionales:**

#### FR-9: Check-in con verificación de ubicación
Un Usuario con Cuenta puede hacer check-in en un Baño solo cuando la ubicación de su dispositivo está dentro de **150 metros** de la ubicación registrada del Baño `[confirmado por skr]`. Realiza UJ-2.

**Consecuencias (verificables):**
- El sistema rechaza el check-in y explica el motivo cuando el Usuario está fuera de rango.
- Cuando el GPS del dispositivo no logra una precisión suficiente para confirmar los 150 metros (común en zonas densas de CDMX o baños en interiores), el sistema lo indica y ofrece reintentar en vez de rechazar en silencio `[SUPUESTO: mecanismo exacto de reintento/tolerancia por precisión de GPS queda para arquitectura]`.
- El check-in exitoso guarda únicamente la asociación Usuario–Baño–momento; no guarda un historial de ubicación continua del dispositivo `[confirmado por skr]`.

#### FR-10: Calificar tras check-in
Un Usuario solo puede asignar una Calificación (1 a 5 estrellas) a un Baño inmediatamente después de un Check-in exitoso en ese Baño. Realiza UJ-2.

**Consecuencias (verificables):**
- El sistema no expone una vía para calificar un Baño sin check-in previo (ni por URL directa ni por la interfaz).
- La calificación promedio del Baño se recalcula y refleja la nueva Calificación **vigente** de inmediato.
- "Reemplazar" es un reemplazo **a nivel de visualización y promedio** (solo la Calificación vigente de un Usuario cuenta para el promedio del Baño y es la que ese Usuario puede editar). El registro de cada Check-in y Calificación anterior se conserva en el modelo de datos — no se borra — para sostener el activo de datos de largo plazo descrito en §Monetización. `[confirmado por skr — resuelve la tensión entre "rectificar" y "conservar series de tiempo"]`

**NFRs específicos de esta función:**
- La verificación de ubicación del check-in no debe exponer públicamente la ubicación exacta del Usuario a otros usuarios — solo confirma internamente que el check-in es válido `[confirmado por skr]`.

## 5. No-Objetivos (Explícitos)

- CagApp no es un directorio de reseñas generales de negocios — solo califica el Baño, no el servicio, la comida ni el precio del lugar.
- No hay cuenta de negocio ni forma de que un negocio reclame o administre su Baño en v1.
- No hay moderación de calificaciones de mala fe más allá de la barrera del check-in (sin reportes, sin baneos, sin revisión manual) en v1 — se acepta el riesgo de que alguien físicamente presente deje una calificación de mala fe (ej. contra un competidor), apostando a que el requisito de check-in ya filtra la mayoría del abuso remoto; SM-C1 vigila si esto se vuelve un problema real.
- No hay comentarios de texto ni fotos en v1 — solo la estrella.
- No hay selector de idioma ni versión en inglés en v1 — lanza únicamente en español.
- No hay mecánicas de gamificación (insignias, rachas, rankings tipo "alcalde") en el MVP — confirmado como candidato fuerte para v1.1, no para el lanzamiento inicial.
- No hay apps nativas de iOS/Android — solo web responsivo `[confirmado por skr]`.
- No hay monetización activa en v1 (ver §Monetización).

## 6. Alcance del MVP

### 6.1 Dentro de Alcance

- Cuenta de usuario (registro por correo/contraseña y por Google/Facebook, inicio de sesión, recuperación de contraseña)
- Mapa con baños cercanos
- Vista de lista ordenada por cercanía
- Detalle de un baño con calificación promedio y lista pública de calificaciones de otros usuarios (nombre para mostrar + estrellas + fecha)
- Crear un baño nuevo (con búsqueda previa para evitar duplicados)
- Check-in con verificación de ubicación
- Calificación general de 1 a 5 estrellas
- Tono de marca divertido y con emojis en toda la experiencia
- Lanzamiento en español, enfocado en CDMX

### 6.2 Fuera de Alcance para el MVP

- Subir fotos del baño — se suma en v1.1
- Comentarios en texto además de la estrella — se suma en v1.1
- Versión en inglés / selector de idioma — se suma en v1.1
- Moderación de calificaciones de mala fe más allá del check-in (reportes, revisión) — se evalúa si se vuelve un problema real
- Negocios como tipo de cuenta (reclamar su lugar, responder reseñas) — sin fecha definida
- `[NOTE FOR PM]` Explorar el valor comercial de los datos recopilados (licenciar a gobiernos/negocios) — es central en la Visión del brief mas no es una decisión de producto para v1; revisar cuando haya suficiente cobertura de datos. El modelo de datos del MVP debe diseñarse pensando en esta explotación futura aunque no se use comercialmente todavía (ver nota de arquitectura abajo).
- Mecánicas de gamificación (insignias, rachas, rankings) — se suma en v1.1, confirmado

## 7. Métricas de Éxito

**Primarias**
- **SM-1**: Baños registrados en CDMX — objetivo: al menos 50 en los primeros meses tras el lanzamiento. Valida FR-7, FR-8.
- **SM-2**: Usuarios que regresan a calificar más de una vez sin que se les pida — objetivo: al menos el **20% de los usuarios que hicieron su primer check-in+calificación repiten un segundo check-in+calificación dentro de 60 días**, sin ningún recordatorio/notificación de por medio `[confirmado por skr]`. Valida FR-9, FR-10.

**Contra-métricas (no optimizar)**
- **SM-C1**: Proporción de baños duplicados o check-ins sospechosos — no se debe perseguir el número de SM-1 a costa de calidad de datos (crear baños duplicados o forzar check-ins inválidos). Contrapesa a SM-1.

## 8. Preguntas Abiertas

1. ¿Cuándo exactamente (qué señal de cobertura/tracción) dispara el trabajo de explorar el valor comercial de los datos recopilados (licenciar a gobiernos, negocios)? Ver Visión del brief y el addendum — confirmado que es post-MVP, pero sin gatillo concreto todavía.
2. Gamificación (insignias, rachas, ranking) queda confirmada para v1.1 — falta definir el diseño concreto de la mecánica cuando se aborde esa fase.

## 9. Índice de Supuestos

- §4.1 FR-1 — Política de contraseña mínima no definida por el usuario; se asume un mínimo de seguridad razonable a definir en arquitectura.
- §4.1 FR-11 — Alcance mínimo del Perfil (sin edición, foto o bio más allá de la lista de actividad).
- §4.4 FR-9 — Mecanismo exacto de reintento/tolerancia cuando el GPS no logra precisión suficiente para el check-in queda para arquitectura.
- §4.2 FR-12 — Cantidad de entradas, orden y paginación de la lista de calificaciones de otros usuarios no están definidos.
- §Constraints and Guardrails / Seguridad — Detalle técnico de implementación de autenticación queda para arquitectura.

---

## Aesthetic and Tone

CagApp usa un tono divertido, ligero y "chusco" en toda la copy de producto (mensajes de error, textos de onboarding, estados vacíos) — con emojis como parte del lenguaje visual, no decoración ocasional. El nombre mismo ("CagApp") ya marca la pauta: la marca no se toma en serio a sí misma, aunque el producto sí resuelve un problema real. Toda copy nueva debe leerse como algo que el propio Reseñador Entusiasta compartiría con gusto, no como texto corporativo neutro.

## Information Architecture

Superficies de nivel superior en el MVP:
- **Registro / Inicio de sesión** — puerta de entrada obligatoria; correo/contraseña y proveedores sociales. Ninguna otra pantalla es accesible sin pasar por aquí primero.
- **Mapa** (pantalla de inicio tras autenticarse) — baños cercanos, permiso de ubicación.
- **Lista** — misma información que el mapa, vista alternativa ordenada por cercanía.
- **Detalle de Baño** — nombre, tipo, calificación promedio, botón de check-in si el usuario está en rango, y la lista pública de calificaciones de otros usuarios (FR-12).
- **Crear Baño** — formulario, precedido por la búsqueda de duplicados (FR-7).
- **Check-in / Calificar** — flujo corto post-verificación de ubicación.
- **Perfil** — actividad propia del Usuario (baños calificados). Ver FR-11.

## Monetización

No hay monetización activa en el MVP — CagApp v1 es gratuita, sin anuncios ni cobros. La dirección de largo plazo (ver Visión del brief y su addendum) es que los propios datos recopilados — ubicaciones y calidad verificada de baños — se conviertan en el activo de valor, potencialmente licenciable a gobiernos municipales o negocios, o atractivo para un comprador/patrocinador estratégico. Ninguna decisión de monetización está tomada para v1; se revisita cuando haya suficiente cobertura de datos (ver Pregunta Abierta 1).

`[NOTE FOR PM → Arquitectura]` Aunque no se explota comercialmente en v1, el modelo de datos debe diseñarse desde el inicio para que esa información (check-ins, calificaciones, ubicaciones, tipos de baño, series de tiempo) quede bien estructurada y conservada — no descartada ni agregada de forma que impida análisis o licenciamiento futuro. Confirmado por skr como prioridad: "garantizar que se guarde la información" desde ahora, aunque su explotación sea posterior al MVP.

## Cross-Cutting NFRs

- **Velocidad de carga:** dado que el "buscador con urgencia" es el trabajo principal (§2.1), el mapa debe volverse interactivo (mostrar la ubicación del usuario y al menos los baños más cercanos) en menos de 3 segundos en una conexión móvil típica `[confirmado por skr]`.

## Platform

Web responsivo únicamente — optimizado para navegador móvil, ya que el caso de uso principal (encontrar/calificar un baño) ocurre mientras el usuario está en movimiento. Sin apps nativas de iOS/Android en v1 `[confirmado por skr]`. Requiere acceso a geolocalización del navegador para el mapa, la búsqueda por cercanía y la verificación de check-in.

## Constraints and Guardrails

**Privacidad**
- El check-in solo registra la asociación Usuario–Baño–momento; no se guarda ni expone un historial de movimiento continuo del Usuario `[confirmado por skr]`.
- La ubicación exacta del dispositivo de un Usuario nunca se muestra a otros usuarios — solo se usa internamente para validar el check-in y centrar el mapa/lista del propio Usuario.
- Esto es distinto de la atribución pública de Calificaciones (FR-12): mostrar **quién** calificó un Baño y **cuándo** es una decisión de producto confirmada; mostrar **dónde está esa persona ahora** sigue estando fuera de alcance sin excepción. Un futuro contribuyente no debe confundir ambas cosas.

**Seguridad**
- Autenticación estándar (correo/contraseña con hash seguro, o delegada a Google/Facebook) `[SUPUESTO: detalle técnico de implementación queda para arquitectura]`.
