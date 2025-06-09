// src/config.ts

export const P2P_SERVICE_TYPE = 'apiserver-com';
export const P2P_SERVICE_PROTOCOL = 'tcp';
export const P2P_INSTANCE_NAME_PREFIX = 'TimerPluginApp_';
export const P2P_MESSAGE_DELIMITER = '\n';

// Podrías añadir configuraciones de Fastify aquí también si lo deseas
export const API_HOST = '0.0.0.0';
export const API_PORT = getPortFromArgs() || parseInt(process.env.PORT || "3001", 10);

/**
 * Obtiene un número de puerto de los argumentos de la línea de comandos.
 * @param prefix - El prefijo a buscar (ej: "--port=").
 * @returns El número de puerto o null si no se encuentra.
 */
export function getPortFromArgs(prefix: string = "--port="): number | null {
    // Convierte el prefijo a minúsculas para la comparación
    const lowerCasePrefix = prefix.toLowerCase();
    
    // Busca un argumento que, convertido a minúsculas, empiece con el prefijo
    const arg = process.argv.find(arg => arg.toLowerCase().startsWith(lowerCasePrefix));
    
    if (arg) {
        const portStr = arg.split('=')[1];
        if (portStr) {
            const port = parseInt(portStr, 10);
            // Comprueba si es un número válido
            return !isNaN(port) ? port : null;
        }
    }
    return null;
}

// Puedes mantener esto para depuración durante el desarrollo
console.log("Puerto API:", API_PORT);