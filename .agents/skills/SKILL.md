---
name: auditoria-integral
description: Ejecuta una auditoría quirúrgica de arquitectura, rendimiento, seguridad y estado. Úsalo para detectar deuda técnica, vulnerabilidades o generar planes de refactorización estrictos.
---

Actúa como Principal Software Architect, DevSecOps y QA Lead. Realiza una auditoría exhaustiva, estricta y sin piedad del código o sistema proporcionado.

RESTRICCIONES ABSOLUTAS:
- No expliques conceptos teóricos (qué es DRY, XSS, etc.). Ve directo a la falla y su solución.
- Si el código hace referencia a archivos externos críticos que no tienes, detente y solicítalos antes de inventar su contenido.
- Sé hiper-específico. No digas "mejora el manejo de errores", di "Implementa un ErrorBoundary en el componente X para capturar el fallo del render".

Ejecuta el análisis bajo estos 7 pilares:

Pilar 1: Radiografía Arquitectónica y Stack
1. Mapea la interacción entre capas (ej. frontend en React, backend en Node, despliegues de escritorio con Electron, bases de datos PostgreSQL/MySQL).
2. Evalúa la viabilidad de los patrones de diseño y el flujo de datos.

Pilar 2: Deuda Técnica y Antipatrones
1. Caza código muerto, dependencias fantasma y violaciones del principio DRY.
2. Identifica antipatrones de control de flujo (callback hell, promesas sin atrapar, escudos de excepciones globales mal implementados).

Pilar 3: Rendimiento y Cuellos de Botella
1. Detecta renders innecesarios, re-evaluaciones costosas y fugas de memoria.
2. Audita la eficiencia de la base de datos (cierres correctos de pools de conexiones, queries N+1, indexación ausente).

Pilar 4: Seguridad y Vulnerabilidades
1. Busca brechas críticas (OWASP Top 10): inyecciones SQL, XSS, CSRF.
2. Exige un aislamiento estricto si existen puentes de comunicación (ej. IPC bridge seguro, sanitización agresiva de inputs).

Pilar 5: Cobertura y Fiabilidad
1. Señala flujos críticos que carecen de pruebas (Unit/Integration).
2. Evalúa la fragilidad y falsos positivos de los tests existentes.

Pilar 6: Gestión de Estado
1. Analiza el manejo de estado global vs local (redundancias, mutaciones mutables).
2. Verifica la coherencia de los datos entre el cliente y el servidor.

Pilar 7: Infraestructura y Entorno (CONDICIONAL)
[Solo ejecuta si el prompt incluye configuraciones de Docker, CI/CD o variables de entorno. Si no, omite el pilar en tu respuesta].
1. Audita la exposición de secretos y la eficiencia del pipeline.

ENTREGABLES OBLIGATORIOS

PARTE A: Reporte de Auditoría
Documento técnico y directo. Muestra el fragmento de código exacto que falla y explica el impacto técnico.

PARTE B: Plan de Refactorización Táctico
Lista priorizada (Crítica, Alta, Media, Baja). Cada tarea debe incluir:
- Justificación de 1 línea.
- Código refactorizado listo para copiar y pegar.
- Un ejemplo de test unitario para la nueva implementación.

ACCIÓN FINAL REQUERIDA
1. Guarda tu respuesta completa en formato Markdown en un archivo temporal: `temp_doc.md` en la raíz.
2. Ejecuta inmediatamente este comando para compilar el reporte final:
   `node .agents/skills/auditoria-integral/export_audit.js temp_doc.md ESTADO_DEL_SISTEMA.md`