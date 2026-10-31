// Offline checks for src/devices.js (no Amazon session needed). Run: npm test
import assert from 'node:assert/strict';
import {
  findDeviceToChange,
  groupsContaining,
  assertNotInGroup,
  groupListOf,
  summarizeDevices,
} from '../src/devices.js';

const dev = (name, applianceId, enablement = 'ENABLED') => ({
  friendlyName: name,
  enablement,
  legacyAppliance: { applianceId },
  displayCategories: { primary: { value: 'LIGHT' } },
  manufacturer: { value: { text: 'Acme' } },
});

const devices = [
  dev('Backup', 'SKILL_a_1'),
  dev('Living Room', 'SKILL_b_2'),
  dev('Living Room', 'SKILL_c_3', 'DISABLED_BY_CUSTOMER'),
];
const groups = [
  { name: 'Rabbit Town', applianceIds: ['SKILL_b_2', 'SKILL_c_3'] },
  { name: 'Empty', applianceIds: [] },
];

// 1. Matching id + name returns the device.
assert.equal(findDeviceToChange(devices, 'SKILL_a_1', 'Backup'), devices[0]);

// 2. Unknown id is refused.
assert.throws(() => findDeviceToChange(devices, 'SKILL_zzz', 'Backup'), /No smart-home device/);

// 3. Right id, wrong name is refused and names the real device.
assert.throws(
  () => findDeviceToChange(devices, 'SKILL_a_1', 'Thermostat'),
  /is named "Backup", not "Thermostat"/
);

// 4. Same-name devices are told apart by id.
assert.equal(findDeviceToChange(devices, 'SKILL_c_3', 'Living Room'), devices[2]);

// 5. A non-array listing is refused.
assert.throws(() => findDeviceToChange({}, 'SKILL_a_1', 'Backup'), /Unexpected/);

// 6. Group membership lookups; a grouped device cannot be deleted.
assert.deepEqual(groupsContaining(groups, 'SKILL_b_2'), ['Rabbit Town']);
assert.deepEqual(groupsContaining(groups, 'SKILL_a_1'), []);
assert.doesNotThrow(() => assertNotInGroup(groups, 'SKILL_a_1', 'Backup'));
assert.throws(
  () => assertNotInGroup(groups, 'SKILL_b_2', 'Living Room'),
  /still a member of: Rabbit Town/
);

// 7. Summary is compact, sorted by name and carries group names.
const rows = summarizeDevices(devices, groups);
assert.deepEqual(
  rows.map((r) => [r.name, r.applianceId, r.groups.length]),
  [
    ['Backup', 'SKILL_a_1', 0],
    ['Living Room', 'SKILL_b_2', 1],
    ['Living Room', 'SKILL_c_3', 1],
  ]
);
assert.equal(rows[0].manufacturer, 'Acme');
assert.equal(rows[2].enablement, 'DISABLED_BY_CUSTOMER');

// 8. getSmarthomeGroups returns { applianceGroups: [...] }; the raw wrapper must work,
//    otherwise the delete guard silently finds no groups.
const wrapped = { applianceGroups: groups };
assert.deepEqual(groupsContaining(wrapped, 'SKILL_b_2'), ['Rabbit Town']);
assert.throws(() => assertNotInGroup(wrapped, 'SKILL_b_2', 'Living Room'), /still a member of/);
assert.equal(summarizeDevices(devices, wrapped)[1].groups[0], 'Rabbit Town');

// 9. An unrecognised group list is refused instead of reading as "no groups".
assert.throws(() => groupListOf(undefined), /Unexpected smart-home group list/);
assert.throws(() => groupListOf({}), /Unexpected smart-home group list/);
assert.throws(() => assertNotInGroup({ groups: [] }, 'SKILL_b_2', 'Living Room'), /Unexpected/);

// 10. Merged IDs: an Echo's group entry is the SonarCloud ID listed in mergedApplianceIds,
//     not its AlexaBridge applianceId.
const echo = {
  friendlyName: 'Restroom Butler',
  enablement: 'ENABLED',
  legacyAppliance: {
    applianceId: 'AlexaBridge_G6G1EV07046406FS@A2U21SRK4QGSE1_G6G1EV07046406FS',
    mergedApplianceIds: [
      'AAA_SonarCloudService_041f8195-78ce-3395-8bff-a5bb479349b4',
      'AlexaBridge_G6G1EV07046406FS@A2U21SRK4QGSE1_G6G1EV07046406FS',
    ],
    driverIdentity: { namespace: 'AlexaBridge', identifier: 'G6G1EV07046406FS@A2U21SRK4QGSE1' },
  },
};
const vibe = [
  { name: 'Vibe Cave', applianceIds: ['AAA_SonarCloudService_041f8195-78ce-3395-8bff-a5bb479349b4'] },
];
assert.deepEqual(groupsContaining(vibe, echo), ['Vibe Cave']);
assert.throws(() => assertNotInGroup(vibe, echo, 'Restroom Butler'), /still a member of: Vibe Cave/);

// 11. dsn form: groups list an Echo as a JSON string with its serial and device type.
const dsnGroups = [
  { name: 'Vibe Cave', applianceIds: ['{"dsn":"G6G1EV07046406FS","deviceType":"A2U21SRK4QGSE1"}'] },
  { name: 'Other', applianceIds: ['{"dsn":"G6G1EV07046406FS","deviceType":"SOMETHINGELSE"}', '{not json'] },
];
const echoNoMerge = {
  friendlyName: 'Restroom Butler',
  legacyAppliance: { applianceId: echo.legacyAppliance.applianceId, driverIdentity: echo.legacyAppliance.driverIdentity },
};
assert.deepEqual(groupsContaining(dsnGroups, echoNoMerge), ['Vibe Cave']);
// Without driverIdentity the dsn is read from the AlexaBridge applianceId.
assert.deepEqual(
  groupsContaining(dsnGroups, { legacyAppliance: { applianceId: echo.legacyAppliance.applianceId } }),
  ['Vibe Cave']
);

// 12. A device that no group lists still comes back empty (no false positives).
assert.deepEqual(groupsContaining(vibe, devices[0]), []);
assert.deepEqual(groupsContaining(dsnGroups, devices[0]), []);

console.log('devices.test.mjs: all checks passed');
