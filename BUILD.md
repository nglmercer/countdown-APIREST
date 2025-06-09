# Guía de Build para Elysia Timer Widget

## Requisitos Previos

- [Bun](https://bun.sh/) instalado en tu sistema
- Node.js (opcional, pero recomendado para desarrollo)
- Git (para control de versiones)

## Pasos para el Build

### 1. Instalación de Dependencias

```bash
# Instalar todas las dependencias del proyecto
bun install
```

### 2. Desarrollo

Para ejecutar la aplicación en modo desarrollo con hot-reload:

```bash
bun run dev
```

### 3. Build de Producción

Para crear una build de producción:

```bash
# Compilar TypeScript a JavaScript
bun build ./src/index.ts --outdir ./dist --target node

# O alternativamente, puedes usar el comando start
bun run start
```

> **Nota Importante**: Si encuentras el error:
> ```
> error: Browser build cannot require() Node.js builtin: "dgram"
> ```
> 
> Esto ocurre porque algunas dependencias (como `multicast-dns`) requieren módulos nativos de Node.js. Para solucionarlo, siempre usa el flag `--target node` al hacer el build:
> ```bash
> bun build ./src/index.ts --outdir ./dist --target node
> ```

### 4. Estructura de Directorios

- `src/`: Contiene el código fuente
- `dist/`: Directorio de salida para los archivos compilados
- `node_modules/`: Dependencias instaladas

### 5. Scripts Disponibles

- `bun run dev`: Inicia el servidor en modo desarrollo con hot-reload
- `bun run start`: Inicia el servidor en modo producción

### 6. Configuración

El proyecto utiliza las siguientes configuraciones principales:

- TypeScript configurado en `tsconfig.json`
- Dependencias gestionadas en `package.json`
- ElysiaJS como framework web
- Soporte para decoradores habilitado

### 7. Despliegue

Para desplegar la aplicación:

1. Asegúrate de tener todas las dependencias instaladas:
```bash
bun install
```

2. Crea la build de producción:
```bash
bun build ./src/index.ts --outdir ./dist
```

3. Inicia el servidor:
```bash
bun run start
```

### 8. Variables de Entorno

Si necesitas configurar variables de entorno, crea un archivo `.env` en la raíz del proyecto.

### 9. Solución de Problemas

Si encuentras problemas durante el build:

1. **Error con módulos nativos de Node.js**:
   - Si ves errores relacionados con módulos como `dgram`, `net`, `fs`, etc.
   - Solución: Añade el flag `--target node` al comando de build:
```bash
bun build ./src/index.ts --outdir ./dist --target node
```

2. Limpia la caché de Bun:
```bash
bun cache clean
```

3. Elimina la carpeta `dist` y `node_modules`:
```bash
rm -rf dist node_modules
```

4. Reinstala las dependencias:
```bash
bun install
```

### 10. Notas Adicionales

- La aplicación está configurada para usar ESM (ECMAScript Modules)
- El hot-reload está habilitado en modo desarrollo
- Los decoradores están habilitados para TypeScript
- La aplicación utiliza el puerto por defecto de Bun (3000) 