import { INTERFACE_TOOL_SPECS } from '../../ai/common/interface-tools';

/**
 * DOMAIN-008 Founder Decision 3: "The AI Steward may present and explain
 * pending decisions, but only the member may approve or dismiss them" —
 * extended here to Connected Experiences: the AI Steward must never be able
 * to connect or revoke a ConnectedAccount, or upload/delete a Document, on
 * the member's behalf. Enforced structurally: the shared, backend-owned
 * interface tool allow-list (DOMAIN-007 Founder Decision 1) simply contains
 * no such tool, for either voice or text. This test fails the moment anyone
 * adds one, forcing an explicit Founder decision instead of a silent scope
 * creep.
 */
describe('AI Steward tool boundary — Connected Experiences', () => {
  const toolNames = INTERFACE_TOOL_SPECS.map((tool) => tool.name);

  it('exposes no tool capable of connecting or revoking a third-party account', () => {
    const forbidden = ['connect_account', 'revoke_account', 'connect_provider', 'authorize_connection'];
    for (const name of forbidden) {
      expect(toolNames).not.toContain(name);
    }
  });

  it('exposes no tool capable of uploading, modifying, or deleting a document', () => {
    const forbidden = ['upload_document', 'delete_document', 'update_document', 'summarize_document'];
    for (const name of forbidden) {
      expect(toolNames).not.toContain(name);
    }
  });

  it('remains exactly the five approved interface-orchestration tools', () => {
    expect(toolNames.sort()).toEqual(
      ['navigate_to_route', 'focus_interface_target', 'focus_form_field', 'open_panel', 'close_panel'].sort(),
    );
  });
});
