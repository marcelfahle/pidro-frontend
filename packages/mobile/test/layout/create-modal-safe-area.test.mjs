import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('creation owns a native safe-area provider inside the modal boundary', () => {
  const source = ts.createSourceFile(
    'CreateRoomModal.tsx',
    readFileSync(
      new URL('../../src/components/lobby/CreateRoomModal.tsx', import.meta.url),
      'utf8'
    ),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let checked = false;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'Modal') {
      const provider = node.children.find(
        (child) =>
          ts.isJsxElement(child) &&
          child.openingElement.tagName.getText(source) === 'SafeAreaProvider'
      );
      expect(provider).toBeDefined();
      if (!provider || !ts.isJsxElement(provider)) return;
      expect(
        provider.children.some(
          (child) =>
            ts.isJsxSelfClosingElement(child) && child.tagName.getText(source) === 'CreateRoomForm'
        )
      ).toBe(true);
      // Window metrics cached at app startup must not seed a remounting modal after rotation.
      expect(
        provider.openingElement.attributes.properties.some(
          (attribute) =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'initialMetrics'
        )
      ).toBe(false);
      checked = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(checked).toBe(true);
});
