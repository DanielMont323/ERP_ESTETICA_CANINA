/**
 * Helper para manejo de fechas de calendario en el frontend
 * Estas funciones NO dependen de timezone para evitar desfases
 */

/**
 * Formatea una fecha de calendario sin depender de timezone
 * Usa componentes UTC para evitar desfase
 * @param {Date|string} date - Fecha a formatear
 * @returns {String} Fecha en formato DD/MM/YYYY
 */
export const formatCalendarDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Obtiene el día de una fecha de calendario sin depender de timezone
 * @param {Date|string} date - Fecha
 * @returns {Number} Día del mes (1-31)
 */
export const getCalendarDay = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.getUTCDate();
};

/**
 * Obtiene el mes de una fecha de calendario sin depender de timezone
 * @param {Date|string} date - Fecha
 * @returns {Number} Mes (1-12)
 */
export const getCalendarMonth = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.getUTCMonth() + 1;
};

/**
 * Obtiene el año de una fecha de calendario sin depender de timezone
 * @param {Date|string} date - Fecha
 * @returns {Number} Año
 */
export const getCalendarYear = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.getUTCFullYear();
};

/**
 * Obtiene el nombre del mes en español
 * @param {Number} month - Mes (1-12)
 * @returns {String} Nombre del mes
 */
export const getMonthName = (month) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
};

/**
 * Formatea una fecha de calendario con nombre de mes
 * @param {Date|string} date - Fecha a formatear
 * @returns {String} Fecha en formato "DD de Mes"
 */
export const formatCalendarDateWithMonthName = (date) => {
  if (!date) return '';
  const day = getCalendarDay(date);
  const month = getCalendarMonth(date);
  return `${day} de ${getMonthName(month)}`;
};
