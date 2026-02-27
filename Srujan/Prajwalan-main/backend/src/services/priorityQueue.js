/**
 * Q Nirvana - Priority Queue Algorithm
 * Priority scoring: Emergency(100) > Maternity(80) > OldAge(70) > Child<2yr(60) > General(50)
 * Emergency cases ALWAYS override and are placed first.
 */

const PRIORITY_SCORES = {
    emergency: 100,
    maternity: 80,
    old_age: 70,
    child_under_2: 60,
    general: 50,
};

/**
 * Calculate patient's priority category and score based on attributes
 * @param {Object} patient - { age, is_emergency, is_maternity, gender }
 * @returns {{ priority: string, score: number }}
 */
function calculatePriority(patient) {
    // Priority has been disabled per user request
    return { priority: 'general', score: 50 };
}

/**
 * Compare two queue entries (higher score = higher priority)
 * Tie-break by check-in time (FIFO within same priority)
 */
function compareQueueEntries(a, b) {
    if (b.priority_score !== a.priority_score) {
        return b.priority_score - a.priority_score; // higher score first
    }
    // Same priority → earlier arrival first
    return new Date(a.checked_in_at) - new Date(b.checked_in_at);
}

/**
 * Sort a queue array using the priority algorithm
 * @param {Array} queue - array of queue entries with priority_score and checked_in_at
 * @returns {Array} sorted queue
 */
function sortQueue(queue) {
    return [...queue].sort(compareQueueEntries);
}

/**
 * Insert a new patient into a sorted queue at the correct position
 * @param {Array} queue - existing sorted queue
 * @param {Object} newEntry - new patient queue entry
 * @returns {Array} new sorted queue
 */
function insertIntoQueue(queue, newEntry) {
    const updated = [...queue, newEntry];
    return sortQueue(updated);
}

/**
 * Re-assign queue to next available doctor when current doctor is paused/unavailable
 * @param {Array} queueEntries - current queue entries to reassign
 * @param {string} newDoctorId - doctor to reassign to
 * @returns {Array} updated entries
 */
function reassignQueue(queueEntries, newDoctorId) {
    return queueEntries.map((entry) => ({ ...entry, doctor_id: newDoctorId }));
}

/**
 * Get estimated wait time for a patient at position N
 * Average consultation time = 10 minutes
 * @param {number} position - 1-based position in queue
 * @param {number} avgConsultMinutes - avg consultation duration
 * @returns {number} estimated wait in minutes
 */
function estimateWaitTime(position, avgConsultMinutes = 10) {
    return (position - 1) * avgConsultMinutes;
}

module.exports = {
    PRIORITY_SCORES,
    calculatePriority,
    sortQueue,
    insertIntoQueue,
    reassignQueue,
    estimateWaitTime,
    compareQueueEntries,
};
