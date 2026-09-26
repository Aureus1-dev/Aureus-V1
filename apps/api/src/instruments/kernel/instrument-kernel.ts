import {
  InstrumentActionDefinition,
  InstrumentBlueprint,
  InstrumentExecutionAssessment,
  InstrumentExecutionRequest,
  InstrumentInstance,
  InstrumentKernelIssue,
  InstrumentKernelValidation,
  InstrumentLifecycle,
} from './instrument.contracts';

const FORBIDDEN_WILDCARD_TOKENS = new Set(['*', 'ALL', 'ANY', 'EVERYTHING']);

const LIFECYCLE_TRANSITIONS: Record<InstrumentLifecycle, ReadonlySet<InstrumentLifecycle>> = {
  DRAFT: new Set(['READY', 'RETIRED']),
  READY: new Set(['ACTIVE', 'DRAFT', 'RETIRED']),
  ACTIVE: new Set(['PAUSED', 'RETIRED', 'GRADUATED']),
  PAUSED: new Set(['ACTIVE', 'RETIRED', 'GRADUATED']),
  RETIRED: new Set([]),
  GRADUATED: new Set([]),
};

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isForbiddenWildcard(value: string): boolean {
  return FORBIDDEN_WILDCARD_TOKENS.has(value.trim().toUpperCase());
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function pushIssue(issues: InstrumentKernelIssue[], code: string, message: string, path: string): void {
  issues.push({ code, message, path });
}

function validateAction(
  action: InstrumentActionDefinition,
  path: string,
  issues: InstrumentKernelIssue[],
): void {
  if (isBlank(action.key)) pushIssue(issues, 'ACTION_KEY_REQUIRED', 'Action key is required', `${path}.key`);
  if (isBlank(action.name)) pushIssue(issues, 'ACTION_NAME_REQUIRED', 'Action name is required', `${path}.name`);
  if (isBlank(action.purpose)) pushIssue(issues, 'ACTION_PURPOSE_REQUIRED', 'Action purpose is required', `${path}.purpose`);

  if (action.executionClass === 'EXTERNAL_MUTATION' && !action.requiresIdempotencyKey) {
    pushIssue(
      issues,
      'EXTERNAL_MUTATION_REQUIRES_IDEMPOTENCY',
      'External mutations must require an idempotency key so retry cannot duplicate a consequential action',
      `${path}.requiresIdempotencyKey`,
    );
  }

  const authorityKeys = action.authority.map((requirement) => requirement.key);
  for (const duplicate of duplicateValues(authorityKeys)) {
    pushIssue(issues, 'DUPLICATE_AUTHORITY_KEY', `Duplicate authority requirement key: ${duplicate}`, `${path}.authority`);
  }

  for (const [index, requirement] of action.authority.entries()) {
    const requirementPath = `${path}.authority[${index}]`;
    if (isBlank(requirement.key)) {
      pushIssue(issues, 'AUTHORITY_KEY_REQUIRED', 'Authority requirement key is required', `${requirementPath}.key`);
    }
    if (isBlank(requirement.purpose)) {
      pushIssue(issues, 'AUTHORITY_PURPOSE_REQUIRED', 'Every permission request must state a bounded purpose', `${requirementPath}.purpose`);
    }
    if (isForbiddenWildcard(requirement.resourceClass)) {
      pushIssue(issues, 'WILDCARD_AUTHORITY_FORBIDDEN', 'Instrument authority may not request wildcard resources', `${requirementPath}.resourceClass`);
    }
  }

  const evidenceKeys = action.evidence.map((requirement) => requirement.key);
  for (const duplicate of duplicateValues(evidenceKeys)) {
    pushIssue(issues, 'DUPLICATE_EVIDENCE_KEY', `Duplicate evidence requirement key: ${duplicate}`, `${path}.evidence`);
  }

  for (const [index, requirement] of action.evidence.entries()) {
    const requirementPath = `${path}.evidence[${index}]`;
    if (isBlank(requirement.key)) {
      pushIssue(issues, 'EVIDENCE_KEY_REQUIRED', 'Evidence requirement key is required', `${requirementPath}.key`);
    }
    if (isBlank(requirement.description)) {
      pushIssue(issues, 'EVIDENCE_DESCRIPTION_REQUIRED', 'Evidence requirement must say what proves the work', `${requirementPath}.description`);
    }
  }

  if (isBlank(action.completion.criterion)) {
    pushIssue(issues, 'COMPLETION_CRITERION_REQUIRED', 'Every action needs an observable definition of done', `${path}.completion.criterion`);
  }

  for (const evidenceKey of action.completion.evidenceKeys) {
    if (!evidenceKeys.includes(evidenceKey)) {
      pushIssue(
        issues,
        'UNKNOWN_COMPLETION_EVIDENCE',
        `Completion references evidence key that is not declared: ${evidenceKey}`,
        `${path}.completion.evidenceKeys`,
      );
    }
  }

  if (action.executionClass === 'EXTERNAL_MUTATION' && action.completion.evidenceKeys.length === 0) {
    pushIssue(
      issues,
      'EXTERNAL_MUTATION_REQUIRES_COMPLETION_EVIDENCE',
      'Consequential external actions cannot be considered done without evidence',
      `${path}.completion.evidenceKeys`,
    );
  }

  if (action.risk === 'HIGH') {
    const hasIndependentVerification = action.evidence.some(
      (requirement) => requirement.required && (requirement.verifier === 'INDEPENDENT' || requirement.verifier === 'HUMAN'),
    );
    if (!hasIndependentVerification) {
      pushIssue(
        issues,
        'HIGH_RISK_REQUIRES_INDEPENDENT_VERIFICATION',
        'High-risk actions require independent or human verification',
        `${path}.evidence`,
      );
    }
  }
}

export function validateInstrumentBlueprint(blueprint: InstrumentBlueprint): InstrumentKernelValidation {
  const issues: InstrumentKernelIssue[] = [];

  if (blueprint.schemaVersion !== 'instrument-blueprint/v1') {
    pushIssue(issues, 'BLUEPRINT_SCHEMA_UNSUPPORTED', 'Unsupported Instrument Blueprint schema', 'schemaVersion');
  }
  if (isBlank(blueprint.key)) pushIssue(issues, 'BLUEPRINT_KEY_REQUIRED', 'Blueprint key is required', 'key');
  if (isBlank(blueprint.version)) pushIssue(issues, 'BLUEPRINT_VERSION_REQUIRED', 'Blueprint version is required', 'version');
  if (isBlank(blueprint.name)) pushIssue(issues, 'BLUEPRINT_NAME_REQUIRED', 'Blueprint name is required', 'name');
  if (isBlank(blueprint.domain)) pushIssue(issues, 'BLUEPRINT_DOMAIN_REQUIRED', 'Blueprint domain is required', 'domain');
  if (isBlank(blueprint.purpose)) pushIssue(issues, 'BLUEPRINT_PURPOSE_REQUIRED', 'Blueprint purpose is required', 'purpose');

  for (const [index, dataClass] of blueprint.declaredDataClasses.entries()) {
    if (isBlank(dataClass) || isForbiddenWildcard(dataClass)) {
      pushIssue(
        issues,
        'WILDCARD_DATA_CLASS_FORBIDDEN',
        'Blueprints must declare bounded data classes; wildcard access is forbidden',
        `declaredDataClasses[${index}]`,
      );
    }
  }

  const workflowKeys = blueprint.workflows.map((workflow) => workflow.key);
  for (const duplicate of duplicateValues(workflowKeys)) {
    pushIssue(issues, 'DUPLICATE_WORKFLOW_KEY', `Duplicate workflow key: ${duplicate}`, 'workflows');
  }

  for (const [workflowIndex, workflow] of blueprint.workflows.entries()) {
    const workflowPath = `workflows[${workflowIndex}]`;
    if (isBlank(workflow.key)) pushIssue(issues, 'WORKFLOW_KEY_REQUIRED', 'Workflow key is required', `${workflowPath}.key`);
    if (isBlank(workflow.name)) pushIssue(issues, 'WORKFLOW_NAME_REQUIRED', 'Workflow name is required', `${workflowPath}.name`);
    if (isBlank(workflow.purpose)) pushIssue(issues, 'WORKFLOW_PURPOSE_REQUIRED', 'Workflow purpose is required', `${workflowPath}.purpose`);

    const actionKeys = workflow.actions.map((action) => action.key);
    for (const duplicate of duplicateValues(actionKeys)) {
      pushIssue(issues, 'DUPLICATE_ACTION_KEY', `Duplicate action key: ${duplicate}`, `${workflowPath}.actions`);
    }

    workflow.actions.forEach((action, actionIndex) => {
      validateAction(action, `${workflowPath}.actions[${actionIndex}]`, issues);
    });
  }

  return { valid: issues.length === 0, issues };
}

export function validateInstrumentInstance(instance: InstrumentInstance): InstrumentKernelValidation {
  const issues: InstrumentKernelIssue[] = [];

  if (instance.schemaVersion !== 'instrument-instance/v1') {
    pushIssue(issues, 'INSTANCE_SCHEMA_UNSUPPORTED', 'Unsupported Instrument Instance schema', 'schemaVersion');
  }
  if (isBlank(instance.id)) pushIssue(issues, 'INSTANCE_ID_REQUIRED', 'Instrument instance id is required', 'id');
  if (isBlank(instance.blueprint.key)) pushIssue(issues, 'INSTANCE_BLUEPRINT_KEY_REQUIRED', 'Blueprint key is required', 'blueprint.key');
  if (isBlank(instance.blueprint.version)) pushIssue(issues, 'INSTANCE_BLUEPRINT_VERSION_REQUIRED', 'Blueprint version is required', 'blueprint.version');
  if (isBlank(instance.owner.id)) pushIssue(issues, 'INSTANCE_OWNER_REQUIRED', 'Instrument owner is required', 'owner.id');
  if (isBlank(instance.workspaceKey)) pushIssue(issues, 'PRIVATE_WORKSPACE_REQUIRED', 'Every Instrument requires a private workspace namespace', 'workspaceKey');
  if (isForbiddenWildcard(instance.workspaceKey)) {
    pushIssue(issues, 'WILDCARD_WORKSPACE_FORBIDDEN', 'Instrument workspace must be an exact private namespace', 'workspaceKey');
  }
  if (isBlank(instance.objective)) pushIssue(issues, 'INSTANCE_OBJECTIVE_REQUIRED', 'Instrument instance must name the owner objective it is carrying', 'objective');
  if (instance.lifecycle === 'GRADUATED' && isBlank(instance.graduatedBusinessTenantId)) {
    pushIssue(
      issues,
      'GRADUATED_TENANT_REQUIRED',
      'A graduated Instrument must point to the business tenant that now carries the work',
      'graduatedBusinessTenantId',
    );
  }
  if (instance.lifecycle !== 'GRADUATED' && instance.graduatedBusinessTenantId) {
    pushIssue(
      issues,
      'GRADUATED_TENANT_PREMATURE',
      'Business graduation reference is only valid after the Instrument is graduated',
      'graduatedBusinessTenantId',
    );
  }

  return { valid: issues.length === 0, issues };
}

export function canTransitionInstrumentLifecycle(
  from: InstrumentLifecycle,
  to: InstrumentLifecycle,
): boolean {
  return from === to || LIFECYCLE_TRANSITIONS[from].has(to);
}

export function assessInstrumentExecution(request: InstrumentExecutionRequest): InstrumentExecutionAssessment {
  const blueprintValidation = validateInstrumentBlueprint(request.blueprint);
  if (!blueprintValidation.valid) {
    return {
      decision: 'DENY',
      reasons: ['Instrument Blueprint is invalid and cannot execute'],
    };
  }

  const instanceValidation = validateInstrumentInstance(request.instance);
  if (!instanceValidation.valid) {
    return {
      decision: 'DENY',
      reasons: ['Instrument Instance is invalid and cannot execute'],
    };
  }

  if (
    request.instance.blueprint.key !== request.blueprint.key ||
    request.instance.blueprint.version !== request.blueprint.version
  ) {
    return {
      decision: 'DENY',
      reasons: ['Instrument Instance is not pinned to this exact Blueprint version'],
    };
  }

  if (request.instance.lifecycle !== 'ACTIVE') {
    return {
      decision: 'DENY',
      reasons: [`Instrument must be ACTIVE to execute; current lifecycle is ${request.instance.lifecycle}`],
    };
  }

  const workflow = request.blueprint.workflows.find((candidate) => candidate.key === request.workflowKey);
  if (!workflow) {
    return { decision: 'DENY', reasons: ['Requested workflow is not declared by this Blueprint'] };
  }

  const action = workflow.actions.find((candidate) => candidate.key === request.actionKey);
  if (!action) {
    return { decision: 'DENY', reasons: ['Requested action is not declared by this workflow'], workflow };
  }

  if (action.requiresIdempotencyKey && isBlank(request.idempotencyKey)) {
    return {
      decision: 'DENY',
      reasons: ['This action requires an idempotency key before execution'],
      workflow,
      action,
    };
  }

  const missingDecisions: string[] = [];
  const denied: string[] = [];
  const approvals: string[] = [];

  for (const requirement of action.authority) {
    const decision = request.authorityDecisions[requirement.key];
    if (!decision) missingDecisions.push(requirement.key);
    else if (decision === 'DENY') denied.push(requirement.key);
    else if (decision === 'NEEDS_APPROVAL') approvals.push(requirement.key);
  }

  if (missingDecisions.length > 0) {
    return {
      decision: 'DENY',
      reasons: [`Current authority decision missing for: ${missingDecisions.join(', ')}`],
      workflow,
      action,
    };
  }

  if (denied.length > 0) {
    return {
      decision: 'DENY',
      reasons: [`Authority denied for: ${denied.join(', ')}`],
      workflow,
      action,
    };
  }

  if (approvals.length > 0) {
    return {
      decision: 'NEEDS_APPROVAL',
      reasons: [`Explicit approval is still required for: ${approvals.join(', ')}`],
      workflow,
      action,
    };
  }

  return {
    decision: 'PERMIT',
    reasons: ['Blueprint, private instance, lifecycle, idempotency, and current authority gates are satisfied'],
    workflow,
    action,
  };
}
