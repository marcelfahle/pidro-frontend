import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import Yoga from 'yoga-layout';
import * as tokens from '../../src/design/tokens.ts';

// Evaluate the real style objects without loading React Native into Bun.
const source = ts.createSourceFile(
  'BevelButton.tsx',
  readFileSync(new URL('../../src/components/ui/BevelButton.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
function styleConstant(name) {
  let expression = '';
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      expression = node.initializer.getText(source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return new Function('StyleSheet', ...Object.keys(tokens), `return (${expression});`)(
    { create: (value) => value },
    ...Object.values(tokens)
  );
}
const styles = styleConstant('styles');
const sizes = styleConstant('FACE_SIZES');

// Yoga's RN compatibility mode is essential: browser flexbox misses this bug.
// This is a layout-engine model, not a device/rendering test.
function buttonHeight(availableHeight, wood, grow) {
  const config = Yoga.Config.create();
  config.setErrata(Yoga.ERRATA_ALL);
  const node = () => Yoga.Node.create(config);
  const screen = node();
  screen.setWidth(390);
  screen.setHeight(availableHeight);
  const panel = node();
  panel.setPadding(Yoga.EDGE_ALL, 32);
  screen.insertChild(panel, 0);
  const rim = node();
  rim.setAlignSelf(Yoga.ALIGN_FLEX_START);
  rim.setMinHeight(styles.rim.minHeight);
  rim.setPadding(Yoga.EDGE_ALL, wood ? 2 : 1.25);
  panel.insertChild(rim, 0);
  const keyline = wood ? node() : rim;
  if (wood) {
    keyline.setPadding(Yoga.EDGE_ALL, 1);
    rim.insertChild(keyline, 0);
  }
  const face = node();
  face.setFlexGrow(grow);
  face.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
  face.setPadding(Yoga.EDGE_VERTICAL, sizes.md.paddingVertical);
  face.setPadding(Yoga.EDGE_HORIZONTAL, sizes.md.paddingHorizontal);
  keyline.insertChild(face, 0);
  const label = node();
  label.setWidth(130);
  label.setHeight(wood ? 25 : 21);
  face.insertChild(label, 0);
  screen.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
  const height = rim.getComputedHeight();
  screen.freeRecursive();
  config.free();
  return height;
}

test('bevel buttons stay content-height in a bounded native layout', () => {
  for (const height of [375, 844]) {
    for (const wood of [true, false]) {
      const actual = buttonHeight(height, wood, styles.face.flexGrow ?? 0);
      // Independent label + vertical padding + material chrome calculation.
      expect(actual).toBeCloseTo(wood ? 57 : 50, 0);
    }
    // Mutation control: prove this fixture detects the original growing face.
    expect(buttonHeight(height, true, 1)).toBeGreaterThan(100);
  }
});
