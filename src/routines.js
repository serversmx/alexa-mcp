// Helpers for alexa_delete_routine. Pure functions with no network access,
// so the safety check can be tested without an Amazon session.

/**
 * Find the routine that a delete request refers to, or throw.
 *
 * The caller must give both the automationId and the routine's exact name, so
 * a wrong or stale ID can't delete a different routine than the one intended.
 */
export function findRoutineToDelete(routines, automationId, expectedName) {
  if (!Array.isArray(routines)) {
    throw new Error('Unexpected routine list from Amazon.');
  }
  const routine = routines.find((r) => r.automationId === automationId);
  if (!routine) {
    throw new Error(`No routine with automationId "${automationId}". Nothing deleted.`);
  }
  if (routine.name !== expectedName) {
    throw new Error(
      `Routine ${automationId} is named "${routine.name}", not "${expectedName}". Nothing deleted.`
    );
  }
  return routine;
}

/** Short summary of a routine for logs and tool output. */
export function describeRoutine(routine) {
  const trigger = routine.triggers && routine.triggers[0];
  return {
    automationId: routine.automationId,
    name: routine.name,
    status: routine.status,
    trigger: trigger ? trigger.type : null,
  };
}
