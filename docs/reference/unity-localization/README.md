# Classic Pidro translation reference

Original, byte-for-byte Unity catalogs copied on 2026-10-15 from
`~/code/pidro/pidro-unity6/Assets/Resources/Files/Languages/`.
Each UTF-8 file starts with a BOM; split each record at the first `~`.

English has 409 unique keys, Swedish 407. Swedish omits `TID_PrivateRoomName`
and `TID_PublicRoomName`, and spells `TID_XP` with a trailing space.
`TID_DeleteUser` contains Finnish in the Swedish catalog. Audit for other
language mistakes, obsolete flows, inconsistent case, placeholders, and typos.
These are vocabulary references, not runtime catalogs to import wholesale.

Preserve established Pidro terminology where applicable. Translate new features
using that vocabulary; current server rules take precedence over old tutorial
claims. Keep Finnish and Louisiana rule descriptions distinct. Record reused,
adapted, corrected, and newly translated strings in the localization notes.
Do not claim native-speaker approval; list terms still needing human review.
