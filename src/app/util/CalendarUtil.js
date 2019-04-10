import dateFormat from 'dateformat';

/**
 * Utility class to handle calendar event management functionality.
 *
 */
class CalendarUtil {
    /**
     * format date object
     *
     * @param {Object} date - Date object
     * @returns {number}
     */
    dateFormat(date) {
        return dateFormat(date, 'UTC:m/d/yyyy, H:MM:ss');
    }
}

export default new CalendarUtil();
