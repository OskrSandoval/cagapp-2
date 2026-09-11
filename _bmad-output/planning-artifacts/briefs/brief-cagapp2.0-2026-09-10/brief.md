---
title: "Product Brief: CagApp 2.0"
status: final
created: 2026-09-10
updated: 2026-09-11
---

# Product Brief: CagApp 2.0

## Resumen Ejecutivo

CagApp 2.0 es una app web que convierte la eterna pregunta de "¿dónde hay un baño decente por aquí?" en algo que cualquiera puede responder en segundos — un "Foursquare de los baños" donde la propia comunidad mapea y califica baños de cualquier tipo, desde gasolineras hasta el más nice de la ciudad.

Hoy no existe una fuente confiable para esto: Google Maps no trata al baño como su propia categoría, y la única opción es preguntar a alguien o tocar la puerta de un negocio a ver si te lo prestan. CagApp resuelve esto con un mapa y una lista de baños cercanos, calificados del 1 al 5 por usuarios que hicieron check-in físicamente en el lugar — lo que le da a los datos una confianza que ningún competidor investigado ofrece. Al mismo tiempo, el tono divertido y con emojis apela a quienes simplemente disfrutan calificar y compartir, el mismo gancho que hizo crecer a Foursquare, y que mantiene viva la base de datos entre un pico de urgencia y otro.

El proyecto nace de una idea entre tres amigos, pensado primero para aprender construyendo algo real, con ambición de que funcione de verdad: arranca en CDMX, solo en español, con lo esencial para el primer ciclo completo (cuenta, mapa, calificación, check-in). Si la cobertura y la comunidad crecen, la visión a futuro es que los propios datos recopilados — dónde y qué tan buenos son los baños de una ciudad — se conviertan en el activo más valioso de CagApp.

## El Problema

Cuando alguien necesita un baño en la calle — por urgencia o porque anda de viaje — no existe ninguna fuente confiable para saber qué tan limpio, agradable o accesible está el baño de un lugar antes de entrar. Google Maps muestra negocios, pero no dice nada del baño: puede ser una joya o una pesadilla, y hoy la única forma de averiguarlo es preguntarle directamente a otras personas o tocar la puerta de un negocio a ver si te prestan el suyo, sin ninguna garantía de lo que vas a encontrar.

Esto no pasa todos los días — se dispara sobre todo con la urgencia o en viajes y vacaciones — pero cuando pasa, el costo es muy real: desde una mala experiencia hasta, en el mejor de los casos, un hallazgo que vale la pena compartir. Y ahí aparece una segunda oportunidad: hay gente a la que simplemente le gusta calificar, comentar y subir fotos de lo que encuentra — el mismo impulso que alimenta a Foursquare o a las reseñas de restaurantes — y ese grupo es el que puede mantener viva la base de datos de baños incluso cuando nadie más tiene la urgencia del momento.

## La Solución

CagApp es una app web tipo "Foursquare de los baños": una comunidad que mapea y califica baños públicos y de negocios, para que cualquiera pueda saber qué esperar antes de entrar.

Funciona así: el usuario crea una cuenta, abre un mapa con los baños más cercanos (o los ve en lista, ordenados por cercanía), y cuando está físicamente en un lugar puede hacer "check-in" para calificarlo del 1 al 5 (1 = un desastre, 5 = limpio, amplio y hasta huele bien) y, si quiere, subir una foto. Si el baño no existe todavía en la app, primero busca si ya lo agregó alguien más antes de crear uno nuevo, para no duplicar lugares.

La experiencia está pensada para ser divertida y ligera — con emojis, un tono chusco y sin fricción innecesaria. Nace en español, enfocada en CDMX, aunque sin ninguna limitación técnica para crecer a cualquier ciudad del mundo o sumar otros idiomas más adelante.

## Quién Usa Esto

**El buscador con urgencia** — alguien que anda en la calle, de viaje, o simplemente urgido, y necesita saber ya si hay un baño decente cerca. Abre CagApp, ve el mapa, elige el más cercano con buena calificación, y resuelve su problema en segundos. Éxito para esta persona: encontrar rápido un baño confiable sin sorpresas desagradables.

**El reseñador entusiasta** — alguien a quien simplemente le gusta calificar, comentar y subir fotos de los baños que visita, por diversión o por ese gusto de dejar su marca (el mismo impulso que hace que la gente suba check-ins a Foursquare o reseñas a Google Maps). Este usuario no necesariamente tiene una urgencia — solo quiere participar. Éxito para esta persona: sentir que su calificación cuenta y ver su actividad reflejada en la app.

Ambos tipos de usuario se necesitan mutuamente: sin reseñadores entusiastas no hay suficientes datos para que los buscadores con urgencia encuentren algo útil, y sin gente con una necesidad real, la app pierde su razón de ser práctica.

## Qué Hace Diferente a CagApp

Ya existen buscadores de baños (como Flush) y hasta hubo un experimento respaldado por una marca grande (SitOrSquat), pero ninguno combina las tres cosas que CagApp junta: **cobertura amplia** (cualquier tipo de baño, no un nicho específico como Refuge Restrooms); **enganche por diversión** (tono con emojis, fotos, el gusto de calificar y compartir — algo que ninguno de los competidores investigados hace: Flush es puramente funcional y sin personalidad, Google Maps ni siquiera trata el baño como categoría propia); y **utilidad real** cuando se necesita — el mapa y el check-in resuelven el problema concreto de "¿a dónde voy ahora mismo?".

La ventaja honesta de CagApp no es tecnología ni un secreto de negocio — es que nadie ha construido bien esta combinación de diversión + utilidad + cobertura amplia. Eso, junto con el check-in obligatorio (que ningún competidor investigado exige), le da más confianza a los datos que un formulario abierto sin verificación.

## Alcance

**En la v1 (MVP):**
- Cuenta/perfil de usuario (registro e inicio de sesión)
- Mapa con baños cercanos
- Vista de lista ordenada por cercanía
- Calificación general de 1 a 5 estrellas
- Check-in con verificación de ubicación para poder calificar
- Tono de marca divertido, con emojis, en toda la experiencia
- Lanzamiento en español, con foco inicial en CDMX

**Fuera de la v1 (se suma después):**
- Subir fotos del baño
- Comentarios en texto además de la estrella
- Versión en inglés / selector de idioma
- Resolver calificaciones de mala fe más allá del check-in (moderación, reportes, etc.)
- Negocios como tipo de usuario (reclamar su lugar, responder reseñas)
- Explorar el valor de los datos recopilados (ver `addendum.md`)

## Criterios de Éxito

En los primeros meses después de lanzar, CagApp está funcionando si:
- Hay al menos **50 baños registrados en CDMX** — suficiente cobertura para que un buscador con urgencia encuentre algo útil cerca casi siempre.
- **La gente regresa a calificar** más de una vez, sin que se les pida — la señal de que el gancho de diversión/comunidad realmente engancha, y no es solo utilidad puntual.

## Visión

*"Llega Google y me la compra por una cantidad millonaria y yo no vuelvo a pensar en trabajar."* — la meta no tan secreta detrás de CagApp.

En serio: si todo sale bien, CagApp se convierte en la referencia obligada antes de salir de casa en cualquier ciudad donde exista — con miles de baños calificados por check-ins reales, no reseñas genéricas de Google Maps. Ese volumen de datos verificados sobre calidad y ubicación de baños se vuelve, en sí mismo, el activo más valioso de la empresa (ver `addendum.md` para más detalle de esta idea).

Con esa base de datos y esa comunidad, CagApp se vuelve atractiva para algún patrocinador o comprador estratégico — una marca de higiene, una cadena de negocios, o alguien que quiera integrar esos datos a su propio producto — interesado no solo en la marca divertida, sino en la información que nadie más tiene recopilada de esta forma.
