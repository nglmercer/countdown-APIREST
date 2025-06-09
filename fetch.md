¡Por supuesto! Aquí tienes un `README.md` completo y bien formateado que puedes usar para tu proyecto. Incluye la descripción, cómo empezar y la documentación detallada de la API con todos los ejemplos `curl` que desarrollamos.

---

# API de Temporizadores (Timer API)

Un servicio RESTful robusto y escalable construido con Fastify y TypeScript para crear, gestionar y modificar múltiples temporizadores en tiempo real. Este proyecto incluye persistencia de datos y notificaciones a través de WebSockets (no documentado aquí) para clientes suscritos.

## ✨ Características

-   **Gestión de Múltiples Temporizadores**: Crea y controla un número ilimitado de temporizadores, cada uno con su propio ID único.
-   **API RESTful**: Endpoints claros y semánticos para una fácil integración.
-   **Modificaciones de Tiempo Avanzadas**: No solo puedes establecer un tiempo, sino también añadir, restar, multiplicar, dividir y reiniciar.
-   **Persistencia**: El estado de los temporizadores se guarda periódicamente, permitiendo la recuperación tras un reinicio del servidor.
-   **Estadísticas Globales**: Obtén una visión general del estado de todos los temporizadores activos.
-   **Alto Rendimiento**: Construido sobre Fastify, uno de los frameworks web más rápidos para Node.js.
-   **Tipado Seguro**: Desarrollado con TypeScript para un código más robusto y mantenible.

## 🚀 Cómo Empezar

Sigue estos pasos para tener el servidor funcionando localmente.

### Prerrequisitos

-   [Node.js](https://nodejs.org/) (versión 16 o superior)
-   [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
    o
    ```bash
    yarn install
    ```

3.  **Inicia el servidor:**
    ```bash
    npm start
    ```

El servidor estará escuchando en `http://localhost:3000` (o el puerto que hayas configurado).

## 📚 Documentación de la API

La API utiliza el prefijo `/timers`. Todas las peticiones y respuestas son en formato JSON.

---

### Gestión del Temporizador

#### 1. Crear o Establecer un Temporizador

Establece un tiempo específico para un temporizador. Si el temporizador no existe, se creará. Esta operación es idempotente.

-   **Endpoint**: `PUT /timers/:timerId`
-   **Parámetros**:
    -   `timerId` (string | number): El identificador único del temporizador.
-   **Cuerpo (Body)**:
    ```json
    {
      "time": 300
    }
    ```
-   **Ejemplo `curl`**:
    ```bash
    curl -X PUT -H "Content-Type: application/json" \
      -d '{"time": 300}' \
      http://localhost:3000/timers/my-game-timer
    ```
-   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "success": true,
      "timerId": "my-game-timer",
      "currentTime": 300,
      "state": "running"
    }
    ```

#### 2. Eliminar un Temporizador

Elimina un temporizador del sistema.

-   **Endpoint**: `DELETE /timers/:timerId`
-   **Ejemplo `curl`**:
    ```bash
    curl -X DELETE http://localhost:3000/timers/my-game-timer
    ```
-   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Timer my-game-timer removed."
    }
    ```
-   **Respuesta de Error (404 Not Found)**:
    ```json
    {
      "success": false,
      "error": "Timer not found or cannot be removed."
    }
    ```

---

### Modificación de Tiempo

Estas rutas usan `PATCH` para indicar una modificación parcial del recurso.

#### 1. Añadir Tiempo

Añade una cantidad de segundos al tiempo actual del temporizador.

-   **Endpoint**: `PATCH /timers/:timerId/add`
-   **Cuerpo (Body)**: `{ "seconds": <number> }`
-   **Ejemplo `curl`**:
    ```bash
    curl -X PATCH -H "Content-Type: application/json" \
      -d '{"seconds": 60}' \
      http://localhost:3000/timers/my-game-timer/add
    ```

#### 2. Restar Tiempo

Resta una cantidad de segundos del tiempo actual. El tiempo no puede ser negativo.

-   **Endpoint**: `PATCH /timers/:timerId/subtract`
-   **Cuerpo (Body)**: `{ "seconds": <number> }`
-   **Ejemplo `curl`**:
    ```bash
    curl -X PATCH -H "Content-Type: application/json" \
      -d '{"seconds": 30}' \
      http://localhost:3000/timers/my-game-timer/subtract
    ```

#### 3. Multiplicar Tiempo

Multiplica el tiempo actual por un factor.

-   **Endpoint**: `PATCH /timers/:timerId/multiply`
-   **Cuerpo (Body)**: `{ "factor": <number> }`
-   **Ejemplo `curl`**:
    ```bash
    curl -X PATCH -H "Content-Type: application/json" \
      -d '{"factor": 1.5}' \
      http://localhost:3000/timers/my-game-timer/multiply
    ```

#### 4. Dividir Tiempo

Divide el tiempo actual por un divisor.

-   **Endpoint**: `PATCH /timers/:timerId/divide`
-   **Cuerpo (Body)**: `{ "divisor": <number> }`
-   **Ejemplo `curl`**:
    ```bash
    curl -X PATCH -H "Content-Type: application/json" \
      -d '{"divisor": 2}' \
      http://localhost:3000/timers/my-game-timer/divide
    ```

---

### Acciones y Consultas

#### 1. Reiniciar Temporizador

Reinicia el temporizador a su valor inicial (el último valor establecido con `PUT`).

-   **Endpoint**: `POST /timers/:timerId/reset`
-   **Ejemplo `curl`**:
    ```bash
    curl -X POST http://localhost:3000/timers/my-game-timer/reset
    ```

#### 2. Obtener Estado de un Temporizador

Devuelve el estado detallado de un temporizador específico.

-   **Endpoint**: `GET /timers/:timerId/status`
-   **Ejemplo `curl`**:
    ```bash
    curl http://localhost:3000/timers/my-game-timer/status
    ```
-   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "timerId": "my-game-timer",
      "currentTime": 255,
      "initialTime": 300,
      "state": "running",
      "createdAt": "2023-10-27T10:30:00.000Z"
    }
    ```

#### 3. Obtener Estadísticas Globales

Devuelve estadísticas sobre todos los temporizadores gestionados por el sistema.

-   **Endpoint**: `GET /timers/stats`
-   **Ejemplo `curl`**:
    ```bash
    curl http://localhost:3000/timers/stats
    ```
-   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "total": 5,
      "running": 3,
      "stopped": 1,
      "completed": 1,
      "expired": 0
    }
    ```

## 🛠️ Tecnologías Utilizadas

-   **Framework**: [Fastify](https://www.fastify.io/)
-   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
-   **Entorno de ejecución**: [Node.js](https://nodejs.org/)