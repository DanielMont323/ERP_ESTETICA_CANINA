/**
 * Helper para manejar zona horaria GMT-7 (Tepic, Nayarit, México)
 */

/**
 * Obtiene la fecha actual en zona horaria GMT-7
 * @returns {Date} Fecha actual ajustada a GMT-7
 */
const getCurrentDateGMT7 = () => {
  const now = new Date();
  // Ajustar a GMT-7 (restar 7 horas del UTC)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const gmt7 = new Date(utc - (7 * 3600000));
  return gmt7;
};

/**
 * Convierte una fecha a zona horaria GMT-7
 * @param {Date} date - Fecha a convertir
 * @returns {Date} Fecha ajustada a GMT-7
 */
const toGMT7 = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const gmt7 = new Date(utc - (7 * 3600000));
  return gmt7;
};

/**
 * Formatea una fecha en zona horaria GMT-7 para mostrar
 * @param {Date} date - Fecha a formatear
 * @returns {String} Fecha formateada en local (GMT-7)
 */
const formatGMT7 = (date) => {
  if (!date) return '';
  const gmt7 = toGMT7(date);
  return gmt7.toLocaleString('es-MX', {
    timeZone: 'America/Mazatlan', // GMT-7
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Obtiene el inicio del día en GMT-7
 * @param {Date} date - Fecha de referencia
 * @returns {Date} Inicio del día en GMT-7 (00:00:00)
 */
const startOfDayGMT7 = (date) => {
  const gmt7 = toGMT7(date || new Date());
  gmt7.setHours(0, 0, 0, 0);
  return gmt7;
};

/**
 * Obtiene el fin del día en GMT-7
 * @param {Date} date - Fecha de referencia
 * @returns {Date} Fin del día en GMT-7 (23:59:59.999)
 */
const endOfDayGMT7 = (date) => {
  const gmt7 = toGMT7(date || new Date());
  gmt7.setHours(23, 59, 59, 999);
  return gmt7;
};

/**
 * ============================================================
 * FUNCIONES PARA FECHAS DE CALENDARIO (NO DEPENDEN DE TIMEZONE)
 * ============================================================
 */

/**
 * Crea una fecha de calendario a partir de un string YYYY-MM-DD
 * Usa hora 12:00 UTC para evitar problemas de cambio de día con timezone
 * @param {String} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Fecha en UTC con hora 12:00:00
 */
const createCalendarDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  // Crear fecha a las 12:00 UTC (mediodía) para evitar cambio de día con timezone
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

/**
 * Formatea una fecha de calendario sin depender de timezone
 * Usa componentes UTC para evitar desfase
 * @param {Date} date - Fecha a formatear
 * @returns {String} Fecha en formato DD/MM/YYYY
 */
const formatCalendarDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parsea una fecha de calendario desde un string YYYY-MM-DD
 * Alias de createCalendarDate para consistencia
 * @param {String} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Fecha en UTC con hora 12:00:00
 */
const parseCalendarDate = (dateStr) => {
  return createCalendarDate(dateStr);
};

module.exports = {
  getCurrentDateGMT7,
  toGMT7,
  formatGMT7,
  startOfDayGMT7,
  endOfDayGMT7,
  // Funciones para fechas de calendario
  createCalendarDate,
  formatCalendarDate,
  parseCalendarDate
};
