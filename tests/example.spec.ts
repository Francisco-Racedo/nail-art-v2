import { test, expect } from '@playwright/test';

test.describe('Sistema de Reserva de Turnos v3 (Fran & Romy Nails)', () => {
  test('1. Calendario de 2 meses visible, sin cobro de seña y con bloques de 1h 30m (08:30 a 20:00)', async ({ page }) => {
    await page.goto('/');

    const tituloAgenda = page.locator('h2', { hasText: 'Agenda tu Turno' });
    await expect(tituloAgenda).toBeVisible();

    // El calendario visual propio de 2 meses debe estar visible
    const calendario = page.getByTestId('calendario-reserva');
    await expect(calendario).toBeVisible();

    // El cobro de seña 50% debe estar oculto (suspendido)
    await expect(page.getByText('Seña 50%')).toHaveCount(0);

    // Seleccionar el primer día disponible del calendario
    const primerDiaLibre = calendario.locator('button[data-fecha]:not([disabled])').first();
    await expect(primerDiaLibre).toBeVisible();
    await primerDiaLibre.click();

    // Verificar que aparecen los bloques de 1h 30m (08:30, 10:00, 18:00)
    await expect(page.getByRole('button', { name: /08:30/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /10:00/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /18:00/ })).toBeVisible();
    // Verificar que el turno de las 21:00 está deshabilitado por defecto para clientes online
    await expect(page.getByRole('button', { name: /21:00/ })).toHaveCount(0);
  });

  test('2. Flujo completo: reserva PENDIENTE, prevención de colisión, seguimiento en vivo y reprogramación por cliente', async ({ page, request }) => {
    // Buscamos un día libre del mes siguiente para la prueba
    const dispRes = await request.get('/api/disponibilidad');
    expect(dispRes.ok()).toBeTruthy();
    const dispData = await dispRes.json();

    const diasLibres = Object.values(dispData.dias as Record<string, any>).filter(
      (d: any) => !d.cerrado && d.libresCount >= 3
    );
    expect(diasLibres.length).toBeGreaterThan(1);

    const dia1 = diasLibres[diasLibres.length - 2];
    const dia2 = diasLibres[diasLibres.length - 1];
    const hora1 = dia1.horariosBase.find((h: string) => !dia1.ocupados.some((o: any) => o.horario === h));
    const hora2 = dia2.horariosBase.find((h: string) => !dia2.ocupados.some((o: any) => o.horario === h));

    const celRandom = `3819${Math.floor(100000 + Math.random() * 899999)}`;

    // 1. Crear reserva en estado PENDIENTE
    const postRes = await request.post('/api/reservas', {
      data: {
        nombre: 'María Prueba Playwright',
        celular: celRandom,
        email: 'maria@test.com',
        fecha_nacimiento: '1996-11-18',
        servicio: 'Esmaltado Semipermanente Liso ($17.000)',
        fecha: dia1.fecha,
        horario: hora1,
      },
    });
    expect(postRes.ok()).toBeTruthy();
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.estado).toBe('pendiente');
    expect(postData.codigo).toBeTruthy();

    const codigo = postData.codigo;

    try {
      // 2. Intentar reservar el mismo horario con otro celular -> debe rechazar por colisión (409)
      const colisionRes = await request.post('/api/reservas', {
        data: {
          nombre: 'Otro Cliente',
          celular: '3818887766',
          fecha_nacimiento: '1992-05-10',
          servicio: 'Esmaltado Semipermanente Liso ($17.000)',
          fecha: dia1.fecha,
          horario: hora1,
        },
      });
      expect(colisionRes.status()).toBe(409);

      // 3. Intentar segunda reserva futura con el mismo celular -> debe rechazar (1 turno activo por celular)
      const dupCelRes = await request.post('/api/reservas', {
        data: {
          nombre: 'María Prueba Playwright',
          celular: celRandom,
          fecha_nacimiento: '1996-11-18',
          servicio: 'Esmaltado Semipermanente Liso ($17.000)',
          fecha: dia2.fecha,
          horario: hora2,
        },
      });
      expect(dupCelRes.status()).toBe(409);

      // 4. Abrir la página en vivo del cliente (/mi-turno/[codigo])
      await page.goto(`/mi-turno/${codigo}`);
      await expect(page.getByText('Pendiente de confirmación')).toBeVisible();
      await expect(page.getByText('María Prueba Playwright')).toBeVisible();

      // 5. Reprogramar el turno desde el enlace del cliente
      const patchRes = await request.patch(`/api/mi-turno/${codigo}`, {
        data: {
          accion: 'reprogramar',
          nuevaFecha: dia2.fecha,
          nuevoHorario: hora2,
        },
      });
      expect(patchRes.ok()).toBeTruthy();
    } finally {
      // Limpiar cancelando/eliminando el turno de prueba
      await request.patch(`/api/mi-turno/${codigo}`, {
        data: { accion: 'cancelar' },
      });
    }
  });

  test('3. Protección de rutas administrativas (/admin/dashboard redirige a /admin/login)', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('4. Verificación 100% Responsive en Móvil (375x812): Página del Cliente y Panel Admin sin desborde horizontal', async ({ page }) => {
    // Emular pantalla móvil (iPhone / Android compacto 375x812)
    await page.setViewportSize({ width: 375, height: 812 });

    // A. Verificar página del cliente en móvil
    await page.goto('/');
    await expect(page.getByTestId('calendario-reserva')).toBeVisible();
    const overflowCliente = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflowCliente).toBe(false);

    // B. Verificar login y panel del administrador en móvil
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'franciscor829@gmail.com');
    await page.fill('input[name="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByText('Agenda y Turnos')).toBeVisible();

    const overflowAdmin = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflowAdmin).toBe(false);

    // C. Verificar pestaña Ajustes en móvil
    await page.goto('/admin/dashboard/ajustes');
    await expect(page.getByText('Ajustes & Servicios')).toBeVisible();
    const overflowAjustes = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflowAjustes).toBe(false);
  });
});
