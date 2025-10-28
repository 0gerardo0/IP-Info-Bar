# Contribuir a IP Info Bar

¡Gracias por tu interés en contribuir a IP Info Bar! Este documento proporciona pautas para contribuir al proyecto.

## Cómo Contribuir

### Reportar Bugs

Si encuentras un bug, por favor abre un issue incluyendo:

- Descripción clara del problema
- Pasos para reproducir el bug
- Comportamiento esperado vs. comportamiento actual
- Versión de GNOME Shell
- Logs relevantes (usa `journalctl -f -o cat /usr/bin/gnome-shell`)

### Sugerir Mejoras

Para sugerir nuevas características o mejoras:

1. Abre un issue describiendo tu propuesta
2. Explica el caso de uso y los beneficios
3. Si es posible, proporciona ejemplos de implementación

### Enviar Pull Requests

1. **Fork** el repositorio
2. **Crea una rama** para tu característica (`git checkout -b feature/nueva-caracteristica`)
3. **Realiza tus cambios** siguiendo las pautas de estilo
4. **Prueba tus cambios** en un entorno GNOME Shell anidado
5. **Commit** tus cambios con mensajes descriptivos
6. **Push** a tu fork
7. Abre un **Pull Request** con una descripción detallada de los cambios

## Pautas de Estilo

### JavaScript

- La indentación sigue el patrón establecido en el código existente:
  - Métodos de clase usan 4 espacios de indentación base
  - Código dentro de métodos usa 2 espacios adicionales (total 6 espacios desde el margen)
  - Bloques anidados añaden 2 espacios por nivel
- Sigue las convenciones de nomenclatura de GJS/GNOME Shell
- Añade comentarios JSDoc para funciones públicas
- Maneja errores apropiadamente
- **Importante:** Mantén consistencia con el estilo existente del código

### Python

- Sigue PEP 8
- Usa espacios de 4 caracteres para indentación
- Añade docstrings a todas las funciones
- Maneja excepciones de manera apropiada

### Commits

- Usa mensajes de commit descriptivos en español o inglés
- Primera línea: resumen breve (máx. 50 caracteres)
- Líneas adicionales: explicación detallada si es necesario

## Pruebas

Antes de enviar un PR, asegúrate de:

1. Probar la extensión en GNOME Shell (verifica que tu versión esté incluida en el array `shell-version` de `metadata.json` - actualmente: 45, 46, 47, 48)
2. Verificar que no hay errores en los logs
3. Comprobar que todas las funcionalidades existentes siguen funcionando
4. Probar en modo simple y detallado

## Recursos

- [Documentación de GNOME Shell Extensions](https://gjs.guide/extensions/)
- [GJS Documentation](https://gjs-docs.gnome.org/)
- [psutil Documentation](https://psutil.readthedocs.io/)

## Código de Conducta

Por favor, mantén un ambiente respetuoso y colaborativo. Trata a todos los contribuidores con respeto y profesionalismo.

## Licencia

Al contribuir a este proyecto, aceptas que tus contribuciones se licencien bajo la GPL v3.
