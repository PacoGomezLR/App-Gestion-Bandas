# MaestroTareas

## Objetivo del proyecto

Aplicación móvil para gestionar la actividad de una banda.

Stack actual:

- TypeScript
- React Native
- Expo
- Expo Router
- react-native-calendars

La aplicación debe poder evolucionar hacia un calendario compartido para una banda con conciertos, ensayos, reuniones, técnicos, usuarios, roles, información económica privada, recordatorios y sincronización.

## Estado actual

Estamos trabajando primero de forma local.

Actualmente existen eventos con:

- id
- título
- tipo
- fecha
- estado

Tipos de evento:

- concierto
- ensayo
- reunion
- otro

Estados:

- pendiente
- confirmado
- cancelado

La aplicación permite actualmente:

- mostrar eventos
- crear eventos
- editar eventos
- eliminar eventos
- seleccionar fecha mediante calendario
- mostrar fechas en formato DD-MM-AAAA
- mostrar calendario en español

## Prioridad actual

Antes de añadir nuevas funcionalidades, organizar correctamente el código y separar responsabilidades.

La arquitectura debe evolucionar progresivamente hacia:

```
src/
├── app/
├── components/
├── hooks/
├── types/
├── utils/
├── data/
├── config/
└── services/
```

No crear carpetas o abstracciones que todavía no sean necesarias.

## Reglas de desarrollo

- Usar TypeScript.
- No usar `any` salvo que exista una razón técnica justificada.
- Mantener el tipado estricto.
- No eliminar funcionalidad existente para simplificar una tarea.
- No realizar refactorizaciones grandes fuera del alcance solicitado.
- No modificar varios módulos innecesariamente.
- Mantener componentes pequeños y con una responsabilidad clara.
- Evitar duplicación de lógica.
- Preferir código sencillo y legible frente a abstracciones prematuras.
- No introducir backend todavía.
- No introducir autenticación todavía.
- No introducir base de datos todavía.
- No introducir notificaciones todavía.
- No introducir estado global hasta que exista una necesidad real.
- No instalar dependencias sin comprobar primero su compatibilidad con la versión de Expo utilizada.
- No ejecutar `npm audit fix --force`.
- No actualizar Expo, React Native o dependencias principales sin autorización explícita.

## Expo

El proyecto utiliza Expo.

Antes de proponer APIs, librerías o comandos relacionados con Expo:

1. Consultar la documentación actual mediante las herramientas oficiales de Expo cuando sea necesario.
2. Comprobar compatibilidad con la versión instalada.
3. Preferir `npx expo install` cuando Expo gestione la dependencia.

En PowerShell puede ser necesario utilizar:

`npx.cmd`

o:

`npm.cmd`

porque la ejecución de scripts `.ps1` puede estar bloqueada.

## Arquitectura

Separar responsabilidades.

Ejemplo:

- `types/`: tipos e interfaces TypeScript.
- `components/`: componentes visuales reutilizables.
- `hooks/`: lógica React reutilizable cuando tenga sentido.
- `utils/`: funciones puras auxiliares.
- `data/`: datos temporales o de prueba.
- `config/`: configuración.
- `services/`: acceso futuro a APIs o persistencia.

`app/` debe centrarse principalmente en composición de pantallas y navegación.

No mover lógica a un hook simplemente para reducir líneas de un componente. Crear hooks cuando exista una responsabilidad React claramente reutilizable o separable.

## Eventos

El tipo `Evento` es una entidad central de la aplicación.

No modificar su estructura sin revisar el impacto en:

- creación
- edición
- listado
- calendario
- tests

Las fechas deben mantenerse internamente en formato:

`YYYY-MM-DD`

Ejemplo:

`2026-03-12`

Para mostrarlas al usuario se utilizará:

`DD-MM-YYYY`

Ejemplo:

`12-03-2026`

No cambiar el formato interno porque `react-native-calendars` trabaja con `YYYY-MM-DD`.

## Calendario

Se utiliza:

`react-native-calendars`

El calendario debe:

- estar en español
- comenzar la semana en lunes
- permitir seleccionar fechas
- utilizar el formato interno `YYYY-MM-DD`

No sustituir la librería sin una razón técnica y autorización.

## Calidad

Después de cambios relevantes:

1. comprobar errores TypeScript
2. ejecutar tests relacionados
3. comprobar que la aplicación sigue arrancando
4. comprobar que no se ha eliminado funcionalidad existente

No cambiar tests simplemente para hacerlos pasar si existe un fallo real en el código.

## Tests

Vamos a utilizar progresivamente:

- Jest
- jest-expo
- React Native Testing Library

Los tests deben comprobar comportamiento observable.

Evitar snapshots grandes y frágiles.

Priorizar pruebas de:

- utilidades
- validaciones
- creación de eventos
- edición
- eliminación
- componentes
- navegación cuando se implemente

Más adelante se podrán añadir tests E2E.

## Forma de trabajar

Cuando recibas una tarea:

1. analiza primero el código existente
2. explica brevemente qué vas a cambiar
3. limita el cambio al alcance solicitado
4. implementa
5. revisa errores TypeScript
6. ejecuta tests relevantes si existen
7. informa exactamente de los archivos modificados

Si detectas algo fuera del alcance, indícalo pero no lo cambies automáticamente.

No inventes requisitos.

## Git

Mantener cambios pequeños y comprensibles.

No usar:

`git add .`

sin revisar antes los archivos modificados.

No hacer commit, push, merge o eliminar ramas salvo que se solicite expresamente.

Los mensajes de commit deben estar en español y describir claramente el cambio.
