# Estado del Sistema: Nail Art Studio v2

Este documento sirve como memoria centralizada del proyecto para proveer contexto inmediato a cualquier IA o desarrollador futuro. Detalla la arquitectura exacta, la seguridad, dependencias y reglas de negocio del sistema actual.

## 🛠 Stack Tecnológico y Arquitectura
- **Framework:** Next.js 16 (App Router)
- **Base de Datos & Auth:** Supabase (PostgreSQL + Supabase SSR Authentication)
- **Estilos:** Tailwind CSS v4 + Tailwind Animate, UI con efectos glassmorphism.
- **Gestión de Estado Servidor:** TanStack Query (`react-query`) para fetching de datos en vivo (polling cada 5 segundos para mantener agenda sincronizada en múltiples dispositivos).
- **Animaciones CSS:** `@keyframes slideUpNative` personalizada en `globals.css` (clase `.animate-bottom-sheet` con duración 2.5s) implementada para garantizar animaciones tipo "Bottom Sheet" nativas en móviles.
- **Despliegue:** Vercel (Integración continua con GitHub).

## 🗄 Estructura de Base de Datos (PostgreSQL en Supabase)

### 1. `config` (Configuración global del negocio)
- **Columnas:** `id` (int), `hora_inicio` (time), `hora_fin` (time), `intervalo_minutos` (int), `nombre_negocio` (text), `whatsapp_numero` (text).
- **RLS (Políticas):**
  - **Público (Anon):** `SELECT` permitido para nutrir la web de clientes (links de WhatsApp dinámicos, cálculo de horarios).
  - **Admin (Auth):** `UPDATE` permitido usando filtro global `.neq('id', 0)` (para esquivar bloqueos de lectura/escritura previos).

### 2. `servicios` (Catálogo de uñas y spa)
- **Columnas:** `id` (int), `nombre` (text), `subtitulo` (text), `descripcion` (text), `precio` (numeric), `categoria` (text), `estado` (enum/text), `icono` (text), `destacado` (bool).
- **RLS (Políticas):**
  - **Público (Anon):** `SELECT` permitido para ver el catálogo y llenar el select de opciones de los visitantes.
  - **Admin (Auth):** `INSERT`, `UPDATE`, `DELETE` total garantizados en RLS.

### 3. `reservas` (Turnos agendados)
- **Columnas:** `id` (int), `nombre` (text), `servicio` (text), `fecha` (date), `horario` (time), `estado` (varchar default 'pendiente').
- **RLS (Políticas):**
  - **Público (Anon):**
    - `SELECT`: Solo extrae `horario` y `estado` mediante el endpoint `/api/reservas/[fecha]` para proteger los nombres de los clientes. Código de color Front-end: Pendiente (Ámbar ⏳), Confirmado (Verde Esmeralda 🔒), Completado (Rosa Fucsia 💅).
    - `INSERT`: Los clientes pueden agendar su propio turno (crea una fila predeterminada a 'pendiente').
  - **Admin (Auth):**
    - `UPDATE` (cambiar estados), `DELETE` totalmente habilitados (con lógica de confirmación de 2 pasos en la UI para evitar toques fantasmas).

## 🔐 Autenticación y Seguridad
- Rutas bajo `/admin` protegidas por el Middleware de Supabase SSR (`middleware.ts`).
- Los envíos de formularios del panel admin son procesados vía Server Actions (`actions.ts`) y validados estrictamente con el esquema anti-errores de **Zod**.

## 🐛 Bugs Históricos Solucionados (Para no revertir y tener cuidado)
- **Conflicto de SCROLL MÓVIL y BOTONES OCULTOS:** Los modales tienen la regla tailwind `overscroll-contain` (para frenar scroll chaining / arrastre de fondo) y un gran `padding-bottom` (pb-32) para no trabarse por detrás de la botonera de navegación principal fija inferior. 
- **Animaciones "Bottom Sheet":** Tailwind Animations nativos son vulnerables o sobre-suscritos a fallas de purga. Por ello usan explícitamente `slideUpNative` en CSS plano. Además la barra horizontal (`w-12 h-1.5`) de los modales es clickeable explícitamente para el descarte intuitivo.
- **Race conditions en guardado:** Prohibido hacer _SELECT antes de UPDATE_ en la misma consulta a Supabase si las reglas RLS son finas. Siempre usar `.update` con filtro genérico o pasar por autenticación JWT fuerte.

## 🚀 Guía de Despliegue
Cualquier subida de código debe realizarse por Git:
```bash
git add .
git commit -m "Descripción"
git push origin main
```
Vercel compilará automáticamente al detectar los cambios en la rama `main`. Variables de entorno obligatorias en producción:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
