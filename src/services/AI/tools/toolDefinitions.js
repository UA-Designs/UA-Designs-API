const READ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_project',
      description: 'Get the current project record: name, status, dates, progress, and metadata.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_status',
      description: 'Get the current project status and high-level health summary.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_progress',
      description: 'Get overall project progress and task completion counts.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'List tasks for the current project. Use filters when the user asks about a subset.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: {
            type: 'string',
            enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']
          },
          isCritical: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 50 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_overdue_tasks',
      description: 'List tasks whose planned or scheduled end date is before today and that are not completed or cancelled.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_task',
      description: 'Get one task by id, including dates, status, progress, and assignment.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string', description: 'Task UUID' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_schedule',
      description: 'Get the computed project schedule: CPM duration, critical path, delayed tasks, and finish dates from the scheduling engine.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_task_dependencies',
      description: 'Get predecessor and successor dependencies for a task.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string', description: 'Task UUID' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_resources',
      description: 'Get a compact summary of team, labor, material, equipment, and allocations for the current project.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_risks',
      description: 'Get stored project risks, severity summary, and schedule impact from the risk service. Does not invent scores.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_budget',
      description: 'Get budget, expenses, and earned-value cost metrics from the cost services.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_forecast',
      description: 'Get deterministic cost, schedule, progress, and resource forecasts plus alerts from the forecasting engine. Do not calculate CPI, SPI, EAC, ETC, VAC, or forecast dates yourself.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_forecast_history',
      description: 'Get saved forecast snapshots for this project so you can explain how the forecast changed over time.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_at_risk_projects',
      description: 'List active projects whose deterministic forecast status is at risk. Use when the user asks which projects are at risk.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_what_if_forecast',
      description: 'Run an in-memory what-if scenario through the forecasting engine. Official project records are not changed. Label results as SCENARIO / WHAT-IF.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['scenarioType'],
        properties: {
          scenarioType: {
            type: 'string',
            enum: ['ADD_WORKERS', 'DELAY_TASK', 'MATERIAL_COST_INCREASE', 'REDUCE_REMAINING_DURATION']
          },
          workersToAdd: { type: 'number', description: 'Workers to add for ADD_WORKERS' },
          taskId: { type: 'string', description: 'Task UUID for DELAY_TASK' },
          delayDays: { type: 'number', description: 'Days of delay for DELAY_TASK' },
          percent: { type: 'number', description: 'Percent change for MATERIAL_COST_INCREASE or REDUCE_REMAINING_DURATION' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_schedule_impact',
      description: 'Run the deterministic scheduling engine to calculate what happens if a task is delayed. Do not estimate dates yourself.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'delayDays'],
        properties: {
          taskId: { type: 'string', description: 'UUID of the delayed task' },
          delayDays: { type: 'number', description: 'Whole days of delay to apply' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'propose_schedule',
      description: 'Compute CPM-based suggested start/end dates and store them on suggestion columns only. Official task dates are not changed.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          startDate: { type: 'string', description: 'Optional ISO anchor start date' }
        }
      }
    }
  }
];

const WRITE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Propose creating a task immediately. Only name is required. Fill description, dates, duration, and priority yourself from project context; omit anything you cannot infer. Do not ask the user for a form. Omit assignedTo unless they named a person. Pending human approval.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', description: 'Short recommended description. Write one yourself; do not ask the user.' },
          startDate: { type: 'string', description: 'Optional recommended ISO date. Must be today or later. Never use past/historical project dates.' },
          endDate: { type: 'string', description: 'Optional recommended ISO date. Must be on or after startDate and not in the past.' },
          duration: { type: 'integer', description: 'Optional duration in days. Infer a typical duration; do not ask.' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Default MEDIUM unless the user said otherwise.' },
          assignedTo: { type: 'string', description: 'Optional user UUID. Omit to leave unassigned.' },
          parentTaskId: { type: 'string' },
          reason: { type: 'string', description: 'Why this task should be created' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Propose updating a task. Pending human approval; official records are not changed yet.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
          progress: { type: 'number' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'assign_task',
      description: 'Propose assigning a task. Find the task with get_tasks by name. Omit assignedTo to assign to the current user. Do not ask for UUIDs or a person unless the user named someone else. Pending human approval.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' },
          assignedTo: { type: 'string', description: 'Optional user UUID. Omit to assign to the current user.' },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_task',
      description: 'Propose changing a task start and/or due date. Pending human approval. Use analyze_schedule_impact first when delay impact matters.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_risk',
      description: 'Propose creating a risk record. Pending human approval.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'probability', 'impact'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          probability: { type: 'number', minimum: 0, maximum: 1 },
          impact: { type: 'number', minimum: 0, maximum: 1 },
          scheduleImpactDays: { type: 'integer', minimum: 0 },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_risk',
      description: 'Propose updating a risk. Pending human approval. Official scores are not changed until approved.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['riskId'],
        properties: {
          riskId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          probability: { type: 'number', minimum: 0, maximum: 1 },
          impact: { type: 'number', minimum: 0, maximum: 1 },
          status: {
            type: 'string',
            enum: ['IDENTIFIED', 'ANALYZED', 'MITIGATING', 'MONITORING', 'CLOSED', 'ESCALATED']
          },
          scheduleImpactDays: { type: 'integer', minimum: 0 },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'apply_suggested_schedule',
      description: 'Propose applying previously stored suggested dates to official start/end fields. Pending human approval. Baseline dates stay unchanged.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional subset of task UUIDs. Omit to apply all stored suggestions.'
          },
          reason: { type: 'string' }
        }
      }
    }
  }
];

function getToolDefinitions() {
  return [...READ_TOOLS, ...WRITE_TOOLS];
}

const ALLOWED_TOOL_NAMES = new Set(getToolDefinitions().map((tool) => tool.function.name));

module.exports = {
  READ_TOOLS,
  WRITE_TOOLS,
  getToolDefinitions,
  ALLOWED_TOOL_NAMES
};
