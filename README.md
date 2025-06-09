# ElysiaJS Timer Widget API

Este proyecto implementa una API de temporizador simple utilizando ElysiaJS y Bun, con comunicación en tiempo real a través de WebSockets y endpoints HTTP para control.

## Características

- **Control del Temporizador:**
    - `setTime(newTime: number)`: Establece el temporizador a un valor específico en segundos.
    - `add(seconds: number)`: Añade segundos al tiempo actual del temporizador.
    - `rest(seconds: number)`: Resta segundos del tiempo actual del temporizador (no permite valores negativos, se detiene en 0).
    - `getTime(): number`: Obtiene el tiempo actual del temporizador en segundos.
- **Comunicación por WebSocket (`/ws`):**
    - Envía actualizaciones del temporizador en tiempo real a los clientes conectados.
    - Permite a los clientes enviar comandos para controlar el temporizador (`setTime`, `addTime`, `restTime`, `getTime`, `start`, `stop`).
    - El temporizador inicia una cuenta regresiva automáticamente cuando un cliente se conecta o cuando se modifica el tiempo.
- **Endpoints HTTP:**
    - `POST /timer/set`: Establece el tiempo del temporizador. Payload: `{ "time": number }`
    - `POST /timer/add`: Añade tiempo al temporizador. Payload: `{ "seconds": number }`
    - `POST /timer/rest`: Resta tiempo del temporizador. Payload: `{ "seconds": number }`
    - `GET /timer/time`: Obtiene el tiempo actual del temporizador.
- **Cliente de Ejemplo:**
    - Un archivo `public/index.html` simple que se conecta al WebSocket y permite interactuar con el temporizador.

## Requisitos Previos

- [Bun](https://bun.sh/) (v1.0.0 o superior recomendado)

## Instalación

1. Clona el repositorio (o crea los archivos como se describe).
2. Navega al directorio del proyecto:
   ```bash
   cd APIREST
   ```
3. Instala las dependencias:
   ```bash
   bun install
   ```

## Uso

### Iniciar el Servidor de Desarrollo

Este comando iniciará el servidor con recarga en caliente (`--hot`):

```bash
bun run dev
```

El servidor estará disponible en `http://localhost:3000`.
El endpoint WebSocket estará en `ws://localhost:3000/ws`.

### Iniciar el Servidor para Producción (Ejemplo)

```bash
bun run start
```

### Cliente WebSocket de Ejemplo

Para usar el cliente de ejemplo, una vez que el servidor esté corriendo, abre el archivo `public/index.html` en tu navegador.

**Nota:** Para que `public/index.html` sea servido directamente por ElysiaJS, necesitarías agregar el plugin `@elysiajs/static` o una configuración similar. Tal como está, debes abrirlo directamente desde tu sistema de archivos o servirlo con otro servidor web mientras el backend de ElysiaJS está corriendo.

## Estructura del Proyecto

```
APIREST/
├── public/
│   └── index.html       # Cliente WebSocket de ejemplo
├── src/
│   ├── index.ts         # Lógica del servidor ElysiaJS, endpoints HTTP y WebSocket
│   └── timer.ts         # Clase y lógica del temporizador
├── package.json         # Dependencias y scripts del proyecto
├── tsconfig.json        # Configuración de TypeScript
└── README.md            # Este archivo
```

## Comandos WebSocket (Cliente -> Servidor)

Los mensajes enviados al WebSocket deben ser un objeto JSON con la siguiente estructura:

```json
{
  "action": "<nombre_de_la_accion>",
  "value": <valor_opcional_dependiendo_de_la_accion>
}
```

Acciones disponibles:
- `setTime`: Establece el tiempo. `value` debe ser un número (segundos).
- `addTime`: Añade tiempo. `value` debe ser un número (segundos).
- `restTime`: Resta tiempo. `value` debe ser un número (segundos).
- `getTime`: Solicita el tiempo actual. No requiere `value`.
- `start`: Inicia/reanuda la cuenta regresiva del temporizador en el servidor para este cliente.
- `stop`: Detiene la cuenta regresiva del temporizador en el servidor para este cliente.

## Mensajes WebSocket (Servidor -> Cliente)

El servidor enviará mensajes JSON con diferentes `type`:

- `initialTime`: Enviado al conectar, con el tiempo actual. `{ "type": "initialTime", "time": number }`
- `timeUpdate`: Enviado durante la cuenta regresiva o después de una modificación. `{ "type": "timeUpdate", "time": number }`
- `timerEnd`: Enviado cuando el temporizador llega a cero. `{ "type": "timerEnd", "message": "Timer finished!" }`
- `status`: Mensajes de estado general. `{ "type": "status", "message": string }`
- `error`: En caso de error en el procesamiento del mensaje. `{ "type": "error", "message": string }`