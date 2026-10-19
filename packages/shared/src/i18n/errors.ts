import { t, type TranslationKey } from "./index";
import { en } from "./sections/errors";

type Body = Record<string, unknown>;
const owns = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): Body | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Body)
    : undefined;

/** REST Axios errors, plain channel replies and Error wrappers retain one shape. */
export function errorPayload(error: unknown): Body {
  const outer = object(error) ?? {};
  return object(object(outer.response)?.data) ?? object(outer.cause) ?? outer;
}

// Explicit stable legacy identifiers, not English sentences or slugified text.
const legacy: Record<string, string> = {
  SEAT_REQUIRES_GAMES: "seat_requires_games",
  SEAT_REQUIRES_PASSWORD: "seat_requires_password",
  PROFILE_UNAVAILABLE: "profile_unavailable",
  SEAT_TAKEN: "seat_taken",
  NO_SEAT_FOR_YOU: "no_seat_for_you",
  TEAM_FULL: "team_full",
  INVALID_POSITION: "invalid_position",
  ROOM_NOT_FOUND: "room_not_found",
  ROOM_FULL: "room_full",
  ALREADY_IN_ROOM: "already_in_room",
  ALREADY_IN_THIS_ROOM: "already_in_this_room",
  NOT_IN_ROOM: "not_in_room",
  PLAYER_NOT_IN_ROOM: "player_not_in_room",
  SEAT_NOT_CONTROLLED: "seat_not_controlled",
  INVALID_LOCKED: "invalid_locked",
  ACCOUNT_REQUIRED: "account_required",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_TAKEN: "email_taken",
  USERNAME_TAKEN: "username_taken",
  CLASSIC_NAME_RESERVED: "classic_name_reserved",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  ACCOUNT_INACTIVE: "account_inactive",
  ALREADY_CLAIMED: "already_claimed",
  USER_ALREADY_CLAIMED: "user_already_claimed",
  PROVIDER_ALREADY_LINKED: "provider_already_linked",
  CLAIM_TICKET_EXPIRED: "claim_ticket_expired",
  INVALID_CLAIM_TICKET: "invalid_claim_ticket",
  CLAIM_TICKET_BINDING_MISMATCH: "claim_ticket_binding_mismatch",
  CLAIM_STATE_CHANGED: "claim_state_changed",
  CLAIM_BINDING_REQUIRED: "claim_binding_required",
  AGE_NOT_ELIGIBLE: "age_not_eligible",
  AGE_ALREADY_SET: "age_already_set",
  NOT_A_GUEST: "not_a_guest",
  CREATION_CONFLICT: "creation_conflict",
  INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN:
    "invalid_or_expired_password_reset_token",
  TABLE_FULL: "table_full",
  TABLE_STARTED: "table_started",
  TABLE_CLOSED: "table_closed",
  TABLE_LOCKED: "table_locked",
  INVITE_EXPIRED: "invite_expired",
  INVITE_REVOKED: "invite_revoked",
  INVITE_MOVED: "invite_moved",
  INVITE_LIMIT: "invite_limit",
  KICKED: "kicked",
  CANNOT_FRIEND_SELF: "cannot_friend_self",
  CANNOT_BLOCK_SELF: "cannot_block_self",
  USER_NOT_FOUND: "user_not_found",
  QUERY_TOO_SHORT: "query_too_short",
};
type ErrorKey = keyof typeof en;
function keyFor(code: unknown): ErrorKey | undefined {
  const key = `error.${typeof code === "string" ? code : ""}`;
  return owns(en, key) ? (key as ErrorKey) : undefined;
}
function render(body: Body): string | undefined {
  const first = Array.isArray(body.errors) ? object(body.errors[0]) : undefined;
  // A structured unknown code must not be reinterpreted as a conflicting legacy code.
  const structured = body.error_code ?? first?.error_code;
  const raw = body.code ?? first?.code ?? body.error ?? body.reason;
  const key =
    structured !== undefined
      ? keyFor(structured)
      : keyFor(
          typeof raw === "string" && owns(legacy, raw) ? legacy[raw] : raw,
        );
  if (!key) return undefined;
  const params =
    object(body.error_params ?? first?.error_params ?? body.params) ?? body;
  const values: Record<string, number> = {};
  // All v1 params are integers. Only catalog-declared names can reach interpolation.
  for (const match of en[key].matchAll(/%\{([^}]+)\}/g)) {
    const value = params[match[1]];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      return undefined;
    values[match[1]] = value;
  }
  return t(key, values);
}

export function localizedError(
  error: unknown,
  fallback: TranslationKey = "error.request_failed",
): string {
  return render(errorPayload(error)) ?? t(fallback);
}

export function localizedFieldErrors(error: unknown): Record<string, string> {
  const body = errorPayload(error);
  const result: Record<string, string> = {};
  const add = (field: unknown, message: string) => {
    if (
      typeof field !== "string" ||
      !field ||
      ["__proto__", "constructor", "prototype"].includes(field)
    )
      return;
    if (!owns(result, field)) result[field] = message;
  };
  if (Array.isArray(body.field_errors)) {
    for (const entry of body.field_errors) {
      const item = object(entry);
      if (item) add(item.field, render(item) ?? t("error.field_invalid"));
    }
  }
  // Old changeset field maps retain field identity, never their English messages.
  for (const [field, value] of Object.entries(object(body.errors) ?? {})) {
    if (Array.isArray(value)) add(field, t("error.field_invalid"));
  }
  return result;
}
