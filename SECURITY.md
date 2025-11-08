# Política de Seguridad

## Versiones Soportadas

Actualmente, solo la versión más reciente de IP Info Bar recibe actualizaciones de seguridad:

| Versión | Soportada          |
| ------- | ------------------ |
| 1.2     | :white_check_mark: |
| < 1.2   | :x:                |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad en IP Info Bar, por favor repórtala de manera responsable:

1. **NO** abras un issue público sobre vulnerabilidades de seguridad
2. Envía un correo electrónico al mantenedor del proyecto describiendo:
   - El tipo de vulnerabilidad
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de solución (si las tienes)

## Consideraciones de Seguridad

### Información Sensible

Esta extensión accede a:
- Direcciones IP locales y públicas
- Información de interfaces de red
- Estado de conexiones SSH
- Direcciones MAC

**Importante:** Esta información se muestra en el panel superior de GNOME Shell y puede ser visible para otros usuarios si compartes tu pantalla.

### Conexiones de Red

La extensión realiza una solicitud HTTPS a `https://api4.ipify.org` para obtener tu dirección IP pública. 

- **Servicio utilizado:** [ipify](https://www.ipify.org/) - Un servicio público y gratuito para obtener direcciones IP
- **Datos enviados:** Solo una solicitud HTTP GET sin datos personales
- **Datos recibidos:** Tu dirección IP pública (que es información que cualquier sitio web puede ver)
- **Privacidad:** ipify no almacena logs ni realiza seguimiento ([política de privacidad](https://www.ipify.org/))

Ten en cuenta que se realiza esta conexión externa cada vez que se actualiza la información (cada 15 segundos, con caché de 20 segundos).

### Permisos

El backend de Python requiere acceso a:
- Información de red del sistema (`psutil.net_if_addrs()`)
- Conexiones de red (`psutil.net_connections()`)

Estos permisos son necesarios para la funcionalidad básica de la extensión.

## Mejores Prácticas

Para los usuarios:
- Revisa el código antes de instalar la extensión
- Ten cuidado al compartir pantallas que muestren información de red
- Mantén la extensión actualizada

Para los desarrolladores:
- Nunca almacenes credenciales o secretos en el código
- Valida y sanitiza todas las entradas
- Maneja errores de manera segura sin exponer información sensible
- Revisa las dependencias regularmente para vulnerabilidades conocidas
