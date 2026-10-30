/**
 * Sanitiza cadenas de texto libre para prevenir Cross-Site Scripting (XSS).
 * Reemplaza caracteres delimitadores de markup HTML.
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida formato y dígito verificador de un RUT chileno usando el algoritmo Módulo 11.
 * @param {string} rutCompleto - Ej: "19.876.543-0" o "19876543-0"
 */
export function validarRutChileno(rutCompleto) {
  if (!rutCompleto || typeof rutCompleto !== 'string') return false;
  
  // Limpieza de puntos y guión
  const limpio = rutCompleto.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += multiplo * parseInt(cuerpo.charAt(i), 10);
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const dvEsperadoNum = 11 - (suma % 11);
  let dvEsperado = '';
  if (dvEsperadoNum === 11) dvEsperado = '0';
  else if (dvEsperadoNum === 10) dvEsperado = 'K';
  else dvEsperado = String(dvEsperadoNum);

  return dv === dvEsperado;
}

/**
 * Valida formato estándar de correo electrónico institucional.
 */
export function validarEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 120;
}