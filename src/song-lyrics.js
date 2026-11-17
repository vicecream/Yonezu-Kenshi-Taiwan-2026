// Import source-backed content for the matching current song ID only.
import { SONGS } from "./song-metadata.js";
export const SONG_LYRICS = SONGS.map(song => ({ ...song, lyrics: [] }));
