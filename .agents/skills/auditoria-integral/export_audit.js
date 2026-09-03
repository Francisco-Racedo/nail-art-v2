const fs = require('fs/promises');
const { existsSync } = require('fs');
const path = require('path');

async function exportAudit() {
    const inputPath = process.argv[2];
    const destArgument = process.argv[3];

    if (!inputPath || !existsSync(inputPath)) {
        console.error('❌ Error: Ruta al reporte temporal no válida o archivo inexistente.');
        process.exit(1);
    }

    if (!destArgument) {
        console.error('❌ Error: No se proporcionó ruta de destino.');
        process.exit(1);
    }

    const destPath = path.resolve(process.cwd(), destArgument);
    const destDir = path.dirname(destPath);

    try {
        if (!existsSync(destDir)) {
            await fs.mkdir(destDir, { recursive: true });
        }

        // 1. Lee el contenido del reporte temporal
        const nuevoContenido = await fs.readFile(inputPath, 'utf8');

        // 2. Crea un separador visual para identificar cada fase
        const separador = '\n\n<br><br>\n\n---\n\n## 🔄 NUEVA FASE DE AUDITORÍA\n\n';

        // 3. Adjunta el contenido al final del archivo destino (lo crea si no existe)
        await fs.appendFile(destPath, separador + nuevoContenido, 'utf8');

        // 4. Elimina el archivo temporal
        await fs.unlink(inputPath);

        console.log(`✅ Nuevo reporte adjuntado con éxito en:\n📂 ${destPath}`);

    } catch (error) {
        console.error(`❌ Error crítico al procesar el archivo: ${error.message}`);
        if (existsSync(inputPath)) {
            await fs.unlink(inputPath).catch(() => { });
        }
        process.exit(1);
    }
}

exportAudit();