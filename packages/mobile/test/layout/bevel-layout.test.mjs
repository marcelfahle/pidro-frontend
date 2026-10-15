import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import Yoga from 'yoga-layout';
import * as tokens from '../../src/design/tokens.ts';

// Evaluate the real style objects without loading React Native into Bun.
function styleConstant(file, name) {
  const source = ts.createSourceFile(
    file,
    readFileSync(new URL(`../../src/components/ui/${file}`, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
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
const styles = styleConstant('BevelButton.tsx', 'styles');
const sizes = styleConstant('BevelButton.tsx', 'FACE_SIZES');
const bevel = styleConstant('Bevel.tsx', 'styles');
const tile = styleConstant('HomeTileButton.tsx', 'styles');

// Yoga's RN compatibility mode is essential: browser flexbox misses this bug.
// This is a layout-engine model, not a device/rendering test.
function layout(
  availableHeight,
  {
    wood,
    faceGrow,
    keylineGrow,
    minHeight,
    pads,
    row = false,
    height,
    shrink = { keyline: bevel.keyline.flexShrink ?? 0, face: bevel.face.flexShrink ?? 0 },
    padding = sizes.md.paddingVertical,
    labelHeight = wood ? 25 : 21,
  }
) {
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
  rim.setMinHeight(minHeight);
  if (height) rim.setHeight(height);
  rim.setPadding(Yoga.EDGE_ALL, pads.rim);
  if (row) {
    // Home's tile row: two `flex: 1` rims side by side.
    const tiles = node();
    tiles.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
    panel.insertChild(tiles, 0);
    rim.setFlex(tile.rim.flex);
    tiles.insertChild(rim, 0);
  } else {
    rim.setAlignSelf(Yoga.ALIGN_FLEX_START);
    panel.insertChild(rim, 0);
  }
  const keyline = wood ? node() : rim;
  if (wood) {
    keyline.setFlexGrow(keylineGrow);
    keyline.setFlexShrink(shrink.keyline);
    keyline.setPadding(Yoga.EDGE_ALL, pads.key);
    rim.insertChild(keyline, 0);
  }
  const face = node();
  face.setFlexGrow(faceGrow);
  face.setFlexShrink(shrink.face);
  face.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
  face.setAlignItems(Yoga.ALIGN_CENTER);
  face.setPadding(Yoga.EDGE_VERTICAL, padding);
  face.setPadding(Yoga.EDGE_HORIZONTAL, sizes.md.paddingHorizontal);
  keyline.insertChild(face, 0);
  const label = node();
  label.setWidth(130);
  label.setHeight(labelHeight);
  face.insertChild(label, 0);
  screen.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
  const heights = {
    rim: rim.getComputedHeight(),
    face: face.getComputedHeight(),
    labelTop: label.getComputedTop(),
  };
  screen.freeRecursive();
  config.free();
  return heights;
}

const LITE = { rim: 2, key: 1 };
function buttonHeight(availableHeight, wood, faceGrow, keylineGrow) {
  return layout(availableHeight, {
    wood,
    faceGrow,
    keylineGrow,
    minHeight: styles.rim.minHeight,
    pads: wood ? LITE : { rim: 1.25, key: 0 },
  }).rim;
}

test('bevel buttons stay content-height in a bounded native layout', () => {
  const faceGrow = styles.face.flexGrow ?? 0;
  const keylineGrow = bevel.keyline.flexGrow ?? 0;
  for (const height of [375, 844]) {
    for (const wood of [true, false]) {
      const actual = buttonHeight(height, wood, faceGrow, keylineGrow);
      // Independent label + vertical padding + material chrome calculation.
      expect(actual).toBeCloseTo(wood ? 57 : 50, 0);
    }
    // Mutation controls: prove this fixture detects the original growing face
    // (fixed in PR 41) and the growing keyline of 69a2d05.
    expect(buttonHeight(height, true, 1, keylineGrow)).toBeGreaterThan(100);
    expect(buttonHeight(height, true, faceGrow, 1)).toBeGreaterThan(100);
  }
});

test('a filling tile face covers its whole minimum-height rim', () => {
  const minHeight = tile.phoneRim.minHeight;
  const hero = { rim: 2.5, key: 1.5 };
  const tileLayout = (keylineGrow) =>
    layout(844, {
      wood: true,
      faceGrow: tile.face.flexGrow ?? 0,
      keylineGrow,
      minHeight,
      pads: hero,
      row: true,
    });
  const filled = tileLayout(bevel.fill.flexGrow ?? 0);
  expect(filled.rim).toBe(164);
  expect(filled.face).toBe(164 - 2 * (2.5 + 1.5));
  // Control: without the opt-in the face shrinks to its content.
  expect(tileLayout(0).face).toBeLessThan(100);
});

test('a wood face shrinks into a rim with a set height and centres its label', () => {
  // The age screen's Continue: a 68 rim (hero chrome) around lg padding and a 35 label,
  // which together want 2 * (2.5 + 1.5) + 2 * 17 + 35 = 77.
  const continueLayout = (shrink) =>
    layout(844, {
      wood: true,
      faceGrow: 0,
      keylineGrow: 0,
      minHeight: styles.rim.minHeight,
      pads: { rim: 2.5, key: 1.5 },
      height: 68,
      ...(shrink && { shrink }),
      padding: sizes.lg.paddingVertical,
      labelHeight: 35,
    });
  const fixed = continueLayout();
  expect(fixed.rim).toBe(68);
  expect(fixed.face).toBe(68 - 2 * (2.5 + 1.5));
  // Centred in the face, give or take Yoga's pixel rounding.
  expect(Math.abs(fixed.labelTop - (60 - 35) / 2)).toBeLessThanOrEqual(0.5);
  // Control: without shrinking, the face hangs 9px out of the rim.
  expect(continueLayout({ keyline: 0, face: 0 }).face).toBe(69);
});
