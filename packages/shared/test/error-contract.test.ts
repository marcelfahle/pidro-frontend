import { afterEach, describe, expect, it } from "bun:test";
import manifest from "../../../docs/contracts/backend-localization-errors.json";
import {
  catalogs,
  localizedError,
  localizedFieldErrors,
  setLocale,
  t,
  validateCatalogs,
} from "../src/i18n";
import { en, sv } from "../src/i18n/sections/errors";

afterEach(() => setLocale("en"));

describe("real backend localization contract", () => {
  it("covers exactly every manifest code and required interpolation in both catalogs", () => {
    expect(Object.keys(en).sort()).toEqual(
      manifest.errors.map((e) => `error.${e.code}`).sort(),
    );
    expect(validateCatalogs(en, sv)).toEqual([]);
    for (const entry of manifest.errors) {
      const key = `error.${entry.code}` as keyof typeof en;
      expect(
        [...en[key].matchAll(/%\{([^}]+)\}/g)].map((m) => m[1]).sort(),
      ).toEqual(Object.keys(entry.params).sort());
      for (const param of Object.values(entry.params))
        expect(param.type).toBe("integer");
      expect(catalogs.en[key]).toBe(en[key]);
    }
  });

  for (const locale of ["en", "sv"] as const) {
    it(`${locale}: renders every new REST/channel code and validates every numeric parameter`, () => {
      setLocale(locale);
      for (const entry of manifest.errors) {
        const params = Object.fromEntries(
          Object.keys(entry.params).map((name) => [name, 7]),
        );
        const payload = { error_code: entry.code, error_params: params };
        const expected = t(`error.${entry.code}` as keyof typeof en, params);
        expect(localizedError(payload)).toBe(expected);
        expect(localizedError({ response: { data: payload } })).toBe(expected);
        expect(
          localizedError(
            Object.assign(new Error("private exception"), { cause: payload }),
          ),
        ).toBe(expected);
        for (const name of Object.keys(params)) {
          for (const invalid of [
            undefined,
            "7",
            "%{message}",
            "<script>",
            -1,
            1.5,
            Infinity,
            NaN,
            {},
            Number.MAX_SAFE_INTEGER + 1,
          ]) {
            expect(
              localizedError({
                ...payload,
                error_params: { ...params, [name]: invalid },
              }),
            ).toBe(t("error.request_failed"));
          }
        }
      }
    });

    it(`${locale}: supports old stable codes, structured precedence and top-level code/params`, () => {
      setLocale(locale);
      for (const payload of [
        { errors: [{ code: "ROOM_FULL", detail: "DO NOT SHOW" }] },
        { error: "ROOM_FULL" },
        { reason: "room_full" },
        { code: "room_full" },
      ])
        expect(localizedError(payload)).toBe(t("error.room_full"));
      expect(
        localizedError({ code: "field_too_short", params: { count: 3 } }),
      ).toBe(t("error.field_too_short", { count: 3 }));
      for (const code of [
        "cannot_block_self",
        "player_not_in_room",
        "seat_not_controlled",
        "invalid_locked",
        "invalid_claim_ticket",
        "profile_unavailable",
      ] as const) {
        for (const payload of [
          { error: code.toUpperCase() },
          { errors: [{ code: code.toUpperCase() }] },
          { reason: code },
        ])
          expect(localizedError(payload)).toBe(t(`error.${code}`));
      }
      expect(
        localizedError({ error_code: "room_not_found", error: "ROOM_FULL" }),
      ).toBe(t("error.room_not_found"));
      expect(
        localizedError({
          error: "SEAT_REQUIRES_GAMES",
          min_games: 10,
          games_played: 2,
        }),
      ).toBe(
        t("error.seat_requires_games", { min_games: 10, games_played: 2 }),
      );
      for (const error of [
        undefined,
        null,
        "Room full",
        new Error("private SQL exception"),
        { errors: { detail: "private" } },
        { reason: "Room full" },
        { error_code: "claim_ticket_invalid" },
        { error: "CLAIM_TICKET_INVALID" },
        { error_code: "new_future_code", error: "ROOM_FULL" },
        { code: "__proto__" },
      ]) {
        expect(localizedError(error, "error.action_failed")).toBe(
          t("error.action_failed"),
        );
      }
      expect(
        localizedError({
          error_code: "room_full",
          error_params: {
            message: "PRIVATE",
            count: "PRIVATE",
            defaultValue: "PRIVATE",
          },
        }),
      ).toBe(t("error.room_full"));
    });

    it(`${locale}: localizes new fields and safely falls back for old/unknown validators`, () => {
      setLocale(locale);
      expect(
        localizedFieldErrors({
          response: {
            data: {
              field_errors: [
                {
                  field: "username",
                  error_code: "field_too_short",
                  error_params: { count: 3 },
                },
                {
                  field: "room.config",
                  error_code: "future_validator",
                  error_params: { message: "PRIVATE" },
                },
                {
                  field: "bio",
                  error_code: "field_too_long",
                  error_params: { count: "PRIVATE" },
                },
                { field: "__proto__", error_code: "field_required" },
              ],
              errors: { username: ["PRIVATE"], email: ["PRIVATE"] },
            },
          },
        }),
      ).toEqual({
        username: t("error.field_too_short", { count: 3 }),
        "room.config": t("error.field_invalid"),
        bio: t("error.field_invalid"),
        email: t("error.field_invalid"),
      });
      expect(localizedFieldErrors(new Error("PRIVATE"))).toEqual({});
    });
  }
});
