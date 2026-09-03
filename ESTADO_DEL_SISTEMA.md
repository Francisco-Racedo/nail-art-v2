## 🔄 NUEVA FASE DE AUDITORÍA

# Informe de Auditoría de Arquitectura (Fase 1)

## PARTE A: Documentación de la Auditoría

### Pilar 1: Radiografía del Stack y Arquitectura

**1. Distribución y Antipatrones en el App Router**
- La estructura principal respeta convenciones de Next.js App Router aislando `src/app` (Rutas) y `src/components` (UI Cruda).
- **Antipatrón detectado:** Dentro de `src/app/admin/` conviven demasiados propósitos cruzados (`actions.ts`, `dashboard`, `login`, `page.tsx`). Pese a que es admitido colocar Server Actions dentro de las carpetas de ruta, el crecimiento a escala suele requerir aislar Server Actions a carpetas como `src/actions/` para evitar colisión de contextos (Server vs Client) al importar utilidades. A su vez, `src/components/` carece de subdominios (`/components/ui/`, `/components/admin/`, `/components/public/`), lo que a futuro generará un antipatrón de "Big Ball of Mud" u olla de espaguetis visual.

**2. Análisis de Dependencias Genéricas (`package.json`)**
- **Robustez General:** Excelente stack transicional (React 19 + Next 16.3 + Tailwind 4). Dependencias de UI como `framer-motion`, `lucide-react` y utilitarias como `zod` y `tailwind-merge` proveen gran estabilidad.
- **Redundancia (Deuda Técnica):** Existe la presencia del paquete nativo `pg` (^8.23.0). En proyectos con Supabase y construidos Serverless (Vercel), utilizar el cliente nativo de PostgreSQL directo (`pg`) usualmente es un antipatrón, pues agota el pool de conexiones de la base de datos si no se maneja detrás de pgbouncer. El driver oficial de `@supabase/supabase-js` realiza consumos vía API REST/HTTPS que escala sin agotar el connection pool, lo que hace a `pg` innecesario (salvo se use Prisma o Drizzle ORM, los cuales no figuran en las dependencias).

**3. Visualización de Seguridad en Estructura Supabase**
- **Aprobado con Excelencia:** La subdivisión en `lib/supabase/` en (`client.ts`, `server.ts`, `middleware.ts`, `service.ts`) refleja una implementación de grado enterprise. Aislar el cliente del servidor garantiza que los tokens del navegador no filtren contexto al Edge Middleware de Next.js. El archivo `service.ts` sugiere el uso de la *Service Role Key* apartada estrictamente para *bypass* del RLS en tareas administrativas protegidas, un patrón de extrema seguridad muy recomendado.

### Pilar 7: Infraestructura, CI/CD y Observabilidad

**1. Despliegue y Pipelines**
- **Observación:** El proyecto hospeda la carpeta oculta `.vercel`, lo que evidencia Serverless deployment manejado nativamente por PaaS. No hay pipelines customizadas (ej. Github Actions `CI.yml`). Esto garantiza despliegue inmutable (Inmutable Deployments) automático en la rama main, pero excluye puertas de validación preventivas (Test Hooks o Lint Checks previos).
- **Entornos:** La presencia de `.env.local` sin sub-fases estructurales (`.env.preview`, `.env.production`) puede desatar mezclas accidentales de credenciales si no se inyectan dinámicamente.

**2. Logging y Monitoreo**
- **Ausencia Severa:** No existe rastro en configuración, ni librerías de dependencias locales para observabilidad como (Sentry, Datadog o Vercel Analytics nativas configuradas). Si el entorno es Serverless, un Next.js que cae por Out-Of-Memory carecerá de un trace claro asíncrono para su depuración post-mortem.

---

## PARTE B: Plan de Refactorización y Mejora

### Tareas Accionables Priorizadas

#### 🔴 CRÍTICA
- **Supresión de `pg` y Prevención de Agotamiento de Pool:**
  *Justificación:* El driver `pg` abre conexiones persistentes (TCP). En Vercel Serverless Functions, esto provoca cientos de zombies connections por minuto bajo tráfico moderado, tumbando a Supabase.
  *Refactorización:* Aislar/eliminar `pg` y migrar cualquier query persistente a `.from().select()` a través del cliente Supabase JS (rest/HTTPS).
  
#### 🟠 ALTA
- **Estructuración del Directorio `components` (Feature-Sliced Design):**
  *Justificación:* El directorio base es un vertedero.
  *Refactorización:* Segmentación semántica: Mover `AdminNav`, `DashboardAnalytics` y `AjustesClient` hacia `/components/admin/`, mientras `AgendadorTurnos` va hacia `/components/public/`.

#### 🟡 MEDIA
- **Monitoreo Proactivo:**
  *Justificación:* Resolver fallos a ciegas en Server Components es un desafío costoso.
  *Refactorización:* Se sugiere añadir un paquete ligero de observabilidad de errores como `@vercel/analytics` nativo o encapsular *server components* susceptibles.


<br><br>

---

## 🔄 NUEVA FASE DE AUDITORÍA

# Informe de Auditoría Back-End y Seguridad (Fase 2)

## PARTE A: Documentación de la Auditoría

### Pilar 3: Rendimiento y Cuellos de Botella (Capa de Datos)
**Eficiencia de Consultas (Server Actions y APIs)**
- **Fortaleza (Blindaje de Concurrencia):** En `actions.ts` (`reprogramarTurno`), la consulta de validación de choque de horarios es altamente eficiente. Utiliza `.select('id')` para minimizar la carga de memoria (Zero Payload Database Check) garantizando evitar inyecciones N+1 y colisiones en tiempo real.
- **Riesgo:** El cierre de flujos asíncronos en las Server Actions es rústico. No se maneja encapsulamiento con bloques `try/catch` globales en `reprogramarTurno`, lo que provocará que la aplicación "crashee" y muestre un error fatal de Next.js si la red falla en el paso de Supabase, interrumpiendo la experiencia del administrador.

### Pilar 4: Seguridad y Vulnerabilidades

**1. Análisis de Ruta `/api/reservas` (Exposición PII)**
- **Riesgo ALTO (Fuga de Privacidad):** El endpoint `GET` incluye una condicional que, de no poseer el query parameter `date`, despacha `select('*')` exponiendo todo el historial de reservas. Si este endpoint se llama desde el anonimato (y si Supabase RLS no está estrictamente limitando la tabla `reservas`), es una vulnerabilidad crítica que expone nombres, celulares y emails de los clientes al público general.
- **Doble Origen de la Verdad:** El cliente administrador ya está consumiendo el `select('*')` de manera hiper-segura vía **SSR** puro en su `page.tsx`. Mantener este bloque `GET` desprotegido en la API pública es deuda técnica y un riesgo de seguridad injustificado.

**2. Análisis del Webhook de Mercado Pago**
- **Fortaleza Excelente (Mitigación Definitiva de Spoofing):** El webhook presenta una arquitectura **Zero-Trust (Cero Confianza)**. En lugar de confiar ciegamente en el payload del POST (que un atacante podría falsificar), el código toma el `paymentId` y realiza un "Reverse Fetch" hacia `https://api.mercadopago.com/v1/payments/` con el Token privado. Esto purga los riesgos de inyección y hace redundante verificar firmas HMAC, ya que la verdad se le extrae directamente a los servidores originales de MP.
- **Uso seguro de Bypass:** El consumo de `createServiceClient()` (Service Role) está aplicado en estricta conformidad. Se utiliza para marcar silenciosamente un `estado_pago = 'pagado_sena'` de espaldas al cliente sin despertar las alarmas de permisos de RLS.

**3. Riesgos en Server Actions**
- **Vulnerabilidad de Autorización Inversa:** En `actions.ts`, la función `reprogramarTurno` no valida la sesión activa explícitamente (ej. requiriendo `getUser()`). Se asume que solo el administrador en la UI disparará la action, pero si un atacante obtiene el path del Server Action ID, podría iterar identificadores `turnoId` y reprogramar turnos masivamente si las políticas RLS de Supabase lo permiten.

---

## PARTE B: Plan de Refactorización y Mejora

### Tareas Accionables Priorizadas

#### 🔴 CRÍTICAS
- **Cierre del Endpoint Residuario `/api/reservas`:**
  *Justificación:* Vulnerabilidad Activa PII de libre acceso.
  *Refactorización:* Borrar el bloque incondicional (`if (!dateStr)`) o envolver el inicio del bloque `GET` con una validación de sesión obligatoria `await supabase.auth.getUser()`. Si la ruta solo la consumía un antiguo Dashboard de pruebas, debe someterse a *Deprecation*.
- **Validación Explícita en Server Actions (Zero Trust):**
  *Justificación:* Los archivos `actions.ts` no están mágicamente blindados contra CSRF/Ejecución manual si el RLS flaquea.
  *Refactorización:* Inyectar `const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Unanthorized')` en los encabezados de `reprogramarTurno`.

#### 🟠 ALTAS
- **Control de Excepciones Fatal en Actions:**
  *Justificación:* El servidor Next.js entra en *Error Boundary Collapse* si el fetch falla.
  *Refactorización:* Envolver toda la mutación de `reprogramarTurno` dentro de un poderoso `try { ... } catch (e) { return { error: ... } }`.

#### 🟡 MEDIAS
- **Manejo Estricto del Query Param de Fecha:**
  *Justificación:* Si el parámetro `date` no coincide con el YYYY-MM-DD validado por Zod, inunda el log del backend de errores SQL mal formados.
  *Refactorización:* Extraer `zod` al método `GET` y validar rápidamente el string antes del request a Supabase.


<br><br>

---

## 🔄 NUEVA FASE DE AUDITORÍA

# Informe de Auditoría Frontend y UI (Fase 3 - Final)

## PARTE A: Documentación de la Auditoría

### Pilar 2: Detección de Deuda Técnica y Antipatrones (UI)
- **Monolitos React (Fat Components):** Los componentes proporcionados violan el Principio de Responsabilidad Única (SRP). 
  - `AgendaCalendar.tsx` (700+ líneas) asume responsabilidades de paginación de semanas, renderizado de grillas temporales, cálculo matemático de fechas lunares, manejo de eventos click, generación de links de WhatsApp e interacción de modal flotante. Todo en un solo archivo.
- **Validación Primitiva:** A pesar de tener importado `@tanstack/react-query` y usarlo para obtener configuraciones, el estado crítico de disponibilidad se solicita usando `fetch` crudo atado a callbacks sin manejo de expiración (`staleTime`). Además, `zod` se evalúa mediante un `.safeParse` manual en `handleSubmit` en lugar de acoplarlo limpiamente con integradores como `react-hook-form`.

### Pilar 3: Rendimiento y Cuellos de Botella (Fugas de Renders)
- **Bloqueos por Renderizado en Cascada (Re-renders):** 
  - En `AgendadorTurnos.tsx`, al tipear cada letra del input "Nombre", todo el componente vuelve a evaluarse, forzando a React a recalcular la grilla interactiva visual de turnos y las variables subyacentes una docena de veces por segundo. 
  - En `AgendaCalendar.tsx`, el despliegue del Drawer (Modal) para editar un turno habita dentro del mismo contexto léxico de la grilla principal. Alterar variables como `nuevaFecha` en el Modal re-evalúa y frena innecesariamente el tablero de turnos que está quieto por debajo.

### Pilar 6: Gestión de Estado y Flujo de Datos
- **Caos de Hook Múltiple (Primitive State Hell):** 
  En `AgendadorTurnos.tsx` se apilan **16 declaraciones consecutivas** de `useState` (ej. `nombre`, `celular`, `email`, `servicio`, `fecha`, `horario`, `loading`, `submitted`, `wppEnviado`). Al ser variables estricatmente interdependientes en un flujo único de reserva, su gestión mediante estados primitivos genera colisiones y dificulta vaciar o resetear el formulario (que acaba siendo una rutina manual inmensa).
- **Redundancia Predictiva:** Las mutaciones locales obligan a ejecutar forzosamente `router.refresh()` en el panel de administrador, ignorando la reconciliación optimista (Optimistic UI Updates).

---

## PARTE B: Plan de Refactorización y Mejora

### Tareas Accionables Priorizadas

#### 🔴 CRÍTICA
- **Migración a Máquinas de Estado (useReducer o Zustand):**
  *Justificación:* Controlar 16 primitivos separados para un formulario es matemáticamente el triple de riesgoso a colisiones y bugs de reseteo.
  *Refactorización:* Consolidar el estado de visitante en un solo objeto `initialState = { datosVisitante: {}, reservaInfo: {}, uiStatus: {} }` operado estructuralmente mediante `useReducer`.

#### 🟠 ALTA
- **Desacoplamiento Estructural Extremo (Separation of Concerns):**
  *Justificación:* El mantenimiento de 700 líneas visuales es intratable y mata el flujo de frames (FPS) durante las pulsaciones de teclado en móviles.
  *Refactorización:* Partir `AgendaCalendar` en piezas microscópicas inyectables: `<WeekNavigator />`, `<EventGrid disableRenders />`, `<TurnoBottomSheet />`. Partir `AgendadorTurnos` excluyendo explícitamente el `<VisitorForm />` a un contexto separado de la grilla de selección de fechas.
- **Implementación de React-Hook-Form:**
  *Justificación:* Los formularios controlados manualmente a letra viva estrangulan el render de React.
  *Refactorización:* Sustituir los form locales por `react-hook-form` asociado al `FormVisitanteSchema` de Zod, delegando el estado del teclado fuera del Event Loop principal.

#### 🟡 MEDIA
- **Sustitución de Fetchs Aislados por React Query:**
  *Justificación:* React Query ya existe en las dependencias. Desaprovecharlo en el *fetching* más importante (buscar disponibilidad tras pinchar una fecha) es ilógico.
  *Refactorización:* Convertir `const res = await fetch(...)` al cambiar de fecha en un robusto `const { data } = useQuery(['disponibilidad', fechaSelected], ...)` con caché perimetral.
