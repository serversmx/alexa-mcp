import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AlexaClient } from './alexa-client.js';
import { describeRoutine } from './routines.js';

const client = new AlexaClient();
const server = new McpServer({
  name: 'alexa-mcp-server',
  version: '1.0.0',
});

// ============================================================
// TOOL: List Echo Devices
// ============================================================
server.registerTool(
  'alexa_list_devices',
  {
    title: 'List Alexa Devices',
    description:
      'List all Amazon Echo devices in your account with their serial numbers, types, and online status.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const devices = await client.getDevices();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: List Smart Home Devices
// ============================================================
server.registerTool(
  'alexa_list_smarthome_devices',
  {
    title: 'List Smart Home Devices',
    description:
      'List all smart home devices registered in Alexa (lights, switches, sensors, etc).',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const devices = await client.getSmarthomeDevices();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: List Smart Home Groups
// ============================================================
server.registerTool(
  'alexa_list_groups',
  {
    title: 'List Smart Home Groups',
    description:
      'List all smart home groups/rooms configured in Alexa. Shows which devices are assigned to each group.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const groups = await client.getSmarthomeGroups();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(groups, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Send Announcement
// ============================================================
server.registerTool(
  'alexa_announce',
  {
    title: 'Send Alexa Announcement',
    description:
      'Send a voice announcement to a specific Echo device. The message will be spoken aloud.',
    inputSchema: z.object({
      serialNumber: z
        .string()
        .describe(
          'Serial number of the Echo device (use alexa_list_devices to find it)'
        ),
      message: z.string().describe('The message to announce'),
    }),
  },
  async ({ serialNumber, message }) => {
    try {
      await client.announce(serialNumber, message);
      return {
        content: [
          {
            type: 'text',
            text: `Announcement sent: "${message}"`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Text Command (simulate voice)
// ============================================================
server.registerTool(
  'alexa_text_command',
  {
    title: 'Send Text Command to Alexa',
    description:
      'Send a text command to Alexa as if you spoke it. Example: "enciende las luces de la cocina"',
    inputSchema: z.object({
      serialNumber: z
        .string()
        .describe('Serial number of the Echo device'),
      command: z
        .string()
        .describe('The text command, as if spoken to Alexa'),
    }),
  },
  async ({ serialNumber, command }) => {
    try {
      await client.textCommand(serialNumber, command);
      return {
        content: [
          {
            type: 'text',
            text: `Command sent: "${command}"`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Set Volume
// ============================================================
server.registerTool(
  'alexa_set_volume',
  {
    title: 'Set Device Volume',
    description: 'Set the volume of a specific Echo device (0-100).',
    inputSchema: z.object({
      serialNumber: z
        .string()
        .describe('Serial number of the Echo device'),
      volume: z
        .number()
        .min(0)
        .max(100)
        .describe('Volume level (0-100)'),
    }),
  },
  async ({ serialNumber, volume }) => {
    try {
      await client.setVolume(serialNumber, volume);
      return {
        content: [
          {
            type: 'text',
            text: `Volume set to ${volume}%`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Get All Volumes
// ============================================================
server.registerTool(
  'alexa_get_volumes',
  {
    title: 'Get All Device Volumes',
    description: 'Get the current volume levels of all Echo devices.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const volumes = await client.getAllDeviceVolumes();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(volumes, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: List Routines
// ============================================================
server.registerTool(
  'alexa_list_routines',
  {
    title: 'List Alexa Routines',
    description:
      'List all Alexa routines configured in the account. Shows routine names, triggers, and actions.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const routines = await client.getRoutines();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(routines, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Execute Routine
// ============================================================
server.registerTool(
  'alexa_execute_routine',
  {
    title: 'Execute Alexa Routine',
    description:
      'Execute an existing Alexa routine by providing its automation definition (from alexa_list_routines).',
    inputSchema: z.object({
      routine: z
        .any()
        .describe(
          'The full routine/automation object as returned by alexa_list_routines'
        ),
    }),
  },
  async ({ routine }) => {
    try {
      await client.executeRoutine(routine);
      return {
        content: [
          {
            type: 'text',
            text: 'Routine executed successfully.',
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Delete Routine
// ============================================================
server.registerTool(
  'alexa_delete_routine',
  {
    title: 'Delete Alexa Routine',
    description:
      'Permanently delete one Alexa routine. Requires both its automationId and its exact name (from alexa_list_routines); nothing is deleted if they do not match. Returns the deleted routine definition so it can be recreated in the Alexa app if needed.',
    inputSchema: z.object({
      automationId: z
        .string()
        .describe('The routine automationId from alexa_list_routines'),
      name: z
        .string()
        .describe('The routine exact name, as a safety check against a wrong ID'),
    }),
  },
  async ({ automationId, name }) => {
    try {
      const routine = await client.deleteRoutine(automationId, name);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { deleted: describeRoutine(routine), definition: routine },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: List Shopping/To-Do Lists
// ============================================================
server.registerTool(
  'alexa_list_lists',
  {
    title: 'List Alexa Lists',
    description:
      'Get all Alexa lists (shopping lists, to-do lists, custom lists).',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const lists = await client.getLists();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(lists, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Get List Items
// ============================================================
server.registerTool(
  'alexa_get_list_items',
  {
    title: 'Get List Items',
    description: 'Get all items from a specific Alexa list.',
    inputSchema: z.object({
      listId: z
        .string()
        .describe(
          'The list ID (use alexa_list_lists to find it)'
        ),
    }),
  },
  async ({ listId }) => {
    try {
      const items = await client.getListItems(listId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Add Item to List
// ============================================================
server.registerTool(
  'alexa_add_list_item',
  {
    title: 'Add Item to List',
    description: 'Add an item to an Alexa list (shopping, to-do, etc).',
    inputSchema: z.object({
      listId: z.string().describe('The list ID'),
      value: z.string().describe('The item text to add'),
    }),
  },
  async ({ listId, value }) => {
    try {
      await client.addListItem(listId, value);
      return {
        content: [
          {
            type: 'text',
            text: `Added "${value}" to list.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Do Not Disturb
// ============================================================
server.registerTool(
  'alexa_do_not_disturb',
  {
    title: 'Set Do Not Disturb',
    description: 'Enable or disable Do Not Disturb on a specific Echo device.',
    inputSchema: z.object({
      serialNumber: z
        .string()
        .describe('Serial number of the Echo device'),
      enabled: z
        .boolean()
        .describe('true to enable DND, false to disable'),
    }),
  },
  async ({ serialNumber, enabled }) => {
    try {
      await client.setDoNotDisturb(serialNumber, enabled);
      return {
        content: [
          {
            type: 'text',
            text: `Do Not Disturb ${enabled ? 'enabled' : 'disabled'}.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Query Smart Home Device State
// ============================================================
server.registerTool(
  'alexa_query_device',
  {
    title: 'Query Smart Home Device',
    description:
      'Query the current state of one or more smart home devices (on/off, brightness, temperature, etc).',
    inputSchema: z.object({
      entityIds: z
        .array(z.string())
        .describe(
          'Array of smart home entity IDs to query (from alexa_list_smarthome_devices)'
        ),
    }),
  },
  async ({ entityIds }) => {
    try {
      const result = await client.querySmarthomeDevices(entityIds);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Speak SSML
// ============================================================
server.registerTool(
  'alexa_speak_ssml',
  {
    title: 'Speak SSML',
    description:
      'Make Alexa speak using SSML (Speech Synthesis Markup Language) for advanced voice control.',
    inputSchema: z.object({
      serialNumber: z
        .string()
        .describe('Serial number of the Echo device'),
      ssml: z
        .string()
        .describe(
          'SSML content (e.g., "<speak>Hello <break time=\\"1s\\"/> World</speak>")'
        ),
    }),
  },
  async ({ serialNumber, ssml }) => {
    try {
      await client.speakSSML(serialNumber, ssml);
      return {
        content: [
          {
            type: 'text',
            text: 'SSML spoken successfully.',
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Update Smart Home Group
// ============================================================
server.registerTool(
  'alexa_update_group',
  {
    title: 'Update Smart Home Group',
    description:
      'Update an existing Alexa smart home group/room. Sets the name and full list of appliance IDs.',
    inputSchema: z.object({
      groupId: z
        .string()
        .describe('The group ID (from alexa_list_groups)'),
      name: z.string().describe('The group/room name'),
      applianceIds: z
        .array(z.string())
        .describe('Full list of appliance IDs to assign to this group'),
    }),
  },
  async ({ groupId, name, applianceIds }) => {
    try {
      await client.updateSmarthomeGroup(groupId, name, applianceIds);
      return {
        content: [
          {
            type: 'text',
            text: `Group "${name}" updated with ${applianceIds.length} devices.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Create Smart Home Group
// ============================================================
server.registerTool(
  'alexa_create_group',
  {
    title: 'Create Smart Home Group',
    description:
      'Create a new Alexa smart home group/room with a name and optional list of appliance IDs.',
    inputSchema: z.object({
      name: z.string().describe('The group/room name'),
      applianceIds: z
        .array(z.string())
        .default([])
        .describe('List of appliance IDs to assign to this group'),
    }),
  },
  async ({ name, applianceIds }) => {
    try {
      await client.createSmarthomeGroup(name, applianceIds);
      return {
        content: [
          {
            type: 'text',
            text: `Group "${name}" created with ${applianceIds.length} devices.`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// TOOL: Delete Smart Home Group
// ============================================================
server.registerTool(
  'alexa_delete_group',
  {
    title: 'Delete Smart Home Group',
    description: 'Delete an Alexa smart home group/room.',
    inputSchema: z.object({
      groupId: z
        .string()
        .describe('The group ID to delete (from alexa_list_groups)'),
    }),
  },
  async ({ groupId }) => {
    try {
      await client.deleteSmarthomeGroup(groupId);
      return {
        content: [
          {
            type: 'text',
            text: 'Group deleted successfully.',
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// Start Server
// ============================================================
const transport = new StdioServerTransport();
await server.connect(transport);
