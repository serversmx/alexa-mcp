// Helpers for the smart-home device tools (compact listing, enable/disable, delete).
// Pure functions with no network access, so the safety checks can be tested
// without an Amazon session.

/** The appliance ID of a smart-home entry as returned by getSmarthomeDevicesV2. */
function applianceIdOf(device) {
  return device && device.legacyAppliance ? device.legacyAppliance.applianceId : undefined;
}

/**
 * Find the smart-home device that a change request refers to, or throw.
 *
 * The caller must give both the applianceId and the device's exact friendly
 * name. Several devices share a name here ("Living Room", "Braava jet"), and
 * the IDs are long opaque strings, so requiring both keeps a stale or
 * mistyped ID from touching a different device.
 */
export function findDeviceToChange(devices, applianceId, expectedName) {
  if (!Array.isArray(devices)) {
    throw new Error('Unexpected smart-home device list from Amazon.');
  }
  const device = devices.find((d) => applianceIdOf(d) === applianceId);
  if (!device) {
    throw new Error(`No smart-home device with applianceId "${applianceId}". Nothing changed.`);
  }
  if (device.friendlyName !== expectedName) {
    throw new Error(
      `Device ${applianceId} is named "${device.friendlyName}", not "${expectedName}". Nothing changed.`
    );
  }
  return device;
}

/**
 * The group list as an array. getSmarthomeGroups returns { applianceGroups: [...] };
 * an array is accepted too. Anything else throws: the group check guards a delete,
 * so an unrecognised shape must not read as "no groups".
 */
export function groupListOf(groups) {
  if (Array.isArray(groups)) return groups;
  if (groups && Array.isArray(groups.applianceGroups)) return groups.applianceGroups;
  throw new Error('Unexpected smart-home group list from Amazon.');
}

/**
 * Key for an Echo's group entry. Groups list an Echo as '{"dsn":"<serial>","deviceType":"<type>"}'
 * and the device itself carries driverIdentity { namespace: 'AlexaBridge', identifier: '<serial>@<type>' }.
 */
function dsnKey(serial, deviceType) {
  return serial && deviceType ? `dsn:${serial}@${deviceType}` : undefined;
}

function groupMemberKey(member) {
  if (typeof member !== 'string' || !member.startsWith('{')) return member;
  try {
    const parsed = JSON.parse(member);
    return dsnKey(parsed.dsn, parsed.deviceType) || member;
  } catch {
    return member;
  }
}

/** Every key under which a group may list this device: its ID, merged IDs and the Echo dsn form. */
function memberKeysOf(device) {
  const keys = new Set();
  const legacy = (device && device.legacyAppliance) || {};
  if (legacy.applianceId) keys.add(legacy.applianceId);
  for (const id of legacy.mergedApplianceIds || []) keys.add(id);
  const identity = legacy.driverIdentity;
  if (identity && identity.namespace === 'AlexaBridge' && identity.identifier) {
    const [serial, deviceType] = identity.identifier.split('@');
    keys.add(dsnKey(serial, deviceType));
  } else {
    const match = /^AlexaBridge_([^@_]+)@([^_]+)_/.exec(legacy.applianceId || '');
    if (match) keys.add(dsnKey(match[1], match[2]));
  }
  keys.delete(undefined);
  return keys;
}

/**
 * Names of the groups that list this device as a member. Takes the device (so merged
 * IDs and the Echo dsn form match) or a bare applianceId string.
 */
export function groupsContaining(groups, device) {
  const keys = typeof device === 'string' ? new Set([device]) : memberKeysOf(device);
  return groupListOf(groups)
    .filter(
      (g) =>
        Array.isArray(g.applianceIds) && g.applianceIds.some((m) => keys.has(groupMemberKey(m)))
    )
    .map((g) => g.name);
}

/** Refuse to delete a device that a group still lists, so no group is left with a dead entry. */
export function assertNotInGroup(groups, device, name) {
  const inGroups = groupsContaining(groups, device);
  if (inGroups.length > 0) {
    throw new Error(
      `"${name}" is still a member of: ${inGroups.join(', ')}. Remove it from the group first. Nothing deleted.`
    );
  }
}

/**
 * One row per device: the fields needed to pick a target for a change.
 * The raw device listing is ~900k characters, too large to read inline.
 */
export function summarizeDevices(devices, groups = []) {
  if (!Array.isArray(devices)) {
    throw new Error('Unexpected smart-home device list from Amazon.');
  }
  return devices
    .map((d) => {
      const applianceId = applianceIdOf(d);
      return {
        name: d.friendlyName,
        applianceId,
        enablement: d.enablement,
        category: d.displayCategories && d.displayCategories.primary
          ? d.displayCategories.primary.value
          : null,
        manufacturer: d.manufacturer && d.manufacturer.value ? d.manufacturer.value.text : null,
        groups: groupsContaining(groups, d),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.applianceId.localeCompare(b.applianceId));
}
