/**
 * Whether a closed game channel rejoins by itself. A close the server ordered
 * with `force_disconnect` (missed turns) leaves the player away until they say
 * they are back; any other close (a dropped socket, a server restart) rejoins
 * while a screen still shows the table.
 */
export function reconnectsAfterClose(away: boolean, openScreens: number) {
  return !away && openScreens > 0;
}
