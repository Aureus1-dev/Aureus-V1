import { executeInterfaceTool, type InterfaceToolDeps } from './execute-interface-tool';

function makeDeps(overrides: Partial<InterfaceToolDeps> = {}): InterfaceToolDeps {
  return {
    navigate: jest.fn(),
    activateHighlight: jest.fn().mockReturnValue(true),
    focusField: jest.fn().mockReturnValue(true),
    openPanel: jest.fn(),
    closePanel: jest.fn(),
    ...overrides,
  };
}

describe('executeInterfaceTool', () => {
  it('navigates to the mapped path for an approved route', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('navigate_to_route', JSON.stringify({ route: 'journey' }), deps);
    expect(deps.navigate).toHaveBeenCalledWith('/journey');
    expect(result).toEqual({ ok: true });
  });

  it('rejects a route outside the approved allow-list without navigating', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('navigate_to_route', JSON.stringify({ route: 'admin-panel' }), deps);
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('highlights a registered target', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('focus_interface_target', JSON.stringify({ targetId: 'Home.NextMission' }), deps);
    expect(deps.activateHighlight).toHaveBeenCalledWith('Home.NextMission');
    expect(result).toEqual({ ok: true });
  });

  it('reports failure without throwing when the target is not registered', () => {
    const deps = makeDeps({ activateHighlight: jest.fn().mockReturnValue(false) });
    const result = executeInterfaceTool('focus_interface_target', JSON.stringify({ targetId: 'Nonexistent' }), deps);
    expect(result.ok).toBe(false);
  });

  it('focuses a registered form field', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('focus_form_field', JSON.stringify({ targetId: 'Form.Email' }), deps);
    expect(deps.focusField).toHaveBeenCalledWith('Form.Email');
    expect(result).toEqual({ ok: true });
  });

  it('opens an approved panel', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('open_panel', JSON.stringify({ panelId: 'steward-workspace' }), deps);
    expect(deps.openPanel).toHaveBeenCalledWith('steward-workspace');
    expect(result).toEqual({ ok: true });
  });

  it('closes an approved panel', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('close_panel', JSON.stringify({ panelId: 'steward-workspace' }), deps);
    expect(deps.closePanel).toHaveBeenCalledWith('steward-workspace');
    expect(result).toEqual({ ok: true });
  });

  it('rejects an unapproved panel id without opening it', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('open_panel', JSON.stringify({ panelId: 'admin-console' }), deps);
    expect(deps.openPanel).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('reports failure for an unrecognized tool name', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('delete_everything', '{}', deps);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not a recognized tool');
  });

  it('reports failure for malformed arguments rather than throwing', () => {
    const deps = makeDeps();
    const result = executeInterfaceTool('navigate_to_route', '{not valid json', deps);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Could not parse');
  });
});
