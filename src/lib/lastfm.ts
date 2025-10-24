import type { LastfmTrack, LastfmTrackInfo } from "./types";

const API_URL = process.env.LASTFM_API_URL;
const API_KEY = process.env.LASTFM_API_KEY;

if (!API_URL || !API_KEY) {
    console.error("Missing Last.fm API credentials. Make sure LASTFM_API_URL and LASTFM_API_KEY are in your .env.local file.");
    // We don't throw an error here to allow the app to build, but API calls will fail.
}

export async function fetchTopTracks(user: string, from: string, to: string, limit: number = 50): Promise<LastfmTrack[]> {
    if (!API_URL || !API_KEY) {
        console.error("Last.fm API credentials not configured.");
        return [];
    }
    const params = new URLSearchParams({
        method: 'user.getweeklytrackchart',
        user,
        from,
        to,
        api_key: API_KEY,
        format: 'json',
        limit: limit.toString(),
    });

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);

        if (!response.ok) {
            console.error(`Failed to fetch data from Last.fm API: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        
        if (data.error) {
            console.error(`Last.fm API Error (fetchTopTracks for ${user}): ${data.message}`);
            return [];
        }

        if (!data.weeklytrackchart || !data.weeklytrackchart.track) {
            return [];
        }

        return data.weeklytrackchart.track;
    } catch (error) {
        console.error("Network error fetching top tracks:", error);
        return [];
    }
}

export async function trackGetInfo(artist: string, track: string): Promise<LastfmTrackInfo | null> {
    if (!API_URL || !API_KEY) {
        console.error("Last.fm API credentials not configured.");
        return null;
    }
    const params = new URLSearchParams({
        method: 'track.getInfo',
        artist,
        track,
        api_key: API_KEY,
        format: 'json',
    });

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        
        if (!response.ok) {
            console.error(`Failed to fetch track info for ${artist} - ${track}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        
        if (data.error) {
            // This is a common error for tracks not found, so we don't need to log it every time.
            // console.error(`Last.fm API Error for track.getInfo (${artist} - ${track}): ${data.message}`);
            return null;
        }

        return data.track;
    } catch (error) {
        console.error("Network error fetching track info:", error);
        return null;
    }
}
