/**
 * Sanitiza una cadena de texto plano para prevenir ataques XSS e inyección HTML/JS.
 * Remueve etiquetas, scripts maliciosos y caracteres especiales de control.
 */
export function sanitizarTextoPlano(input) {
  if (!input || typeof input !== 'string') return '';

  let limpio = input
    // Remueve etiquetas HTML completas (ej. <script>, <div>, etc.)
    .replace(/<[^>]*>?/gm, '')
    // Remueve atributos o llamadas javascript: o eventos inline (onclick, onerror)
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Reemplaza caracteres angulares restantes por entidades seguras
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return limpio.trim();
}

/**
 * Valida que un nombre o texto libre contenga únicamente caracteres seguros permitidos
 * (letras, espacios, acentos, guiones y puntos), bloqueando código o símbolos extraños.
 */
export function validarTextoSeguro(input) {
  const textoLimpio = sanitizarTextoPlano(input);
  // Expresión regular estricta para nombres y descripciones en el sistema KONOR
  const regexSegura = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-\.]+$/;
  
  return {
    esValido: regexSegura.test(textoLimpio),
    valorLimpio: textoLimpio
  };
}