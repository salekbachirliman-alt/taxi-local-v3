# Taxi Local v3

Nueva base de interfaz para Taxi Local. Proyecto PWA estático pensado para alojarse en GitHub Pages.

## Incluye
- Pantalla inicial con Pedir taxi, Soy conductor y acceso discreto de administración.
- Formulario de solicitud sin cuenta, con permiso de ubicación y alternativa de dirección manual.
- Formularios de registro e inicio de sesión para conductores.
- Validación visual de contraseña: mínimo 8 caracteres, una mayúscula, un número y un símbolo.
- Esqueleto del panel del conductor con Mapa, Agenda y Perfil.
- Manifest y service worker básicos para instalación/caché.

## Estado importante
Esta entrega es una **base de interfaz**, no una aplicación operativa conectada a producción. Los formularios no crean cuentas ni envían reservas a un servidor. Antes de ponerla en uso real hay que configurar y probar:
1. Proyecto Supabase correcto y claves públicas.
2. Esquema SQL, restricciones y políticas RLS.
3. Roles seguros de conductor y administrador.
4. Aprobación administrativa.
5. Reserva atómica para impedir que dos conductores acepten el mismo viaje.
6. Proveedor de mapas/geocodificación y ubicación real de la zona Parkings.
7. Pruebas en iPhone y despliegue de GitHub Pages.

## Configuración
Edita `config.js` únicamente cuando se faciliten los datos del proyecto Supabase correcto. Nunca publiques claves `service_role` ni secretos en el navegador.

## Despliegue
En GitHub, abre **Settings → Pages**, selecciona la rama principal y la carpeta `/ (root)`. Guarda y espera a que finalice el despliegue. La disponibilidad de Pages depende de la configuración del repositorio.
