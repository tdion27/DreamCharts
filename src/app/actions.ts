'use server';

import { fetchTopTracks, trackGetInfo } from '@/lib/lastfm';
import type { ChartTrack, WeeklyChart } from '@/lib/types';
import { Firestore, collection, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type CreateChartParams = {
    firestore: Firestore;
    chartName: string;
    accounts: string[];
    startDate: Date;
    endDate: Date;
    ownerId: string;
}

type CreateChartResponse = {
  chartId: string;
};

const MAX_CHART_POSITION_SCORE = 40;

export async function createWeeklyChart({ firestore, chartName, accounts, startDate, endDate, ownerId }: CreateChartParams): Promise<CreateChartResponse> {
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts provided.');
    }

    // 1. Generate the chart data for the specific week
    const chartTracks = await generateChartTracks(accounts, startDate, endDate);
    
    const weeklyChartRef = doc(collection(firestore, "weekly_charts"));
    
    const newChartData: Omit<WeeklyChart, 'id'> = {
        chartName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ownerId,
        accounts,
        tracks: chartTracks,
    };

    // 2. Save the single chart document
    try {
        await setDoc(weeklyChartRef, newChartData);
    } catch(serverError: any) {
        // Create the rich, contextual error for the transaction.
        const permissionError = new FirestorePermissionError({
          path: weeklyChartRef.path,
          operation: 'create',
          requestResourceData: newChartData,
        });

        // Emit the error with the global error emitter
        errorEmitter.emit('permission-error', permissionError);
        
        // Also re-throw the error to be caught by the client transition
        throw new Error(`Failed to create chart: ${serverError.message}`);
    }

    return { chartId: weeklyChartRef.id };
}


async function generateChartTracks(accounts: string[], startDate: Date, endDate: Date): Promise<ChartTrack[]> {
    const { placeholderImages } = await import('@/lib/placeholder-images.json');
    
    const from = Math.floor(startDate.getTime() / 1000).toString();
    const to = Math.floor(endDate.getTime() / 1000).toString();

    const allUserTracks = await Promise.all(
      accounts.map(account => 
        fetchTopTracks(account, from, to, MAX_CHART_POSITION_SCORE).then(tracks => ({ account, tracks }))
      )
    );

    const aggregatedPlays: { 
        [key: string]: { 
            title: string; 
            artist: string; 
            score: number;
            totalPlaycount: number;
            playcounts: { [user: string]: number };
        } 
    } = {};

    // 1. Aggregate data from all accounts
    allUserTracks.forEach(({ account, tracks }) => {
        tracks.forEach((track, index) => {
            const key = `${track.artist.name}-${track.name}`.toLowerCase();
            const userPlaycount = parseInt(track.playcount, 10) || 0;
            const trackScore = MAX_CHART_POSITION_SCORE - index;

            if (!aggregatedPlays[key]) {
                aggregatedPlays[key] = {
                    title: track.name,
                    artist: track.artist.name,
                    score: 0,
                    totalPlaycount: 0,
                    playcounts: {}
                };
                // Initialize playcounts for all accounts to ensure no undefined values
                accounts.forEach(acc => {
                    aggregatedPlays[key].playcounts[acc] = 0;
                });
            }

            aggregatedPlays[key].score += trackScore;
            aggregatedPlays[key].totalPlaycount += userPlaycount;
            aggregatedPlays[key].playcounts[account] += userPlaycount;
        });
    });

    // 2. Sort the aggregated tracks by score and take the top 20
    const sortedChart = Object.values(aggregatedPlays)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    
    // 3. Fetch detailed info and construct the final chart tracks
    const chartTracks: ChartTrack[] = await Promise.all(
        sortedChart.map(async (track, index) => {
            let albumArtUrl = placeholderImages[index % placeholderImages.length]?.imageUrl || `https://picsum.photos/seed/${index}/174/174`;
            
            try {
                if (track.artist && track.title) {
                    const trackInfo = await trackGetInfo(track.artist, track.title);
                    const largeImage = trackInfo?.album?.image?.find(img => img.size === 'large')?.['#text'];
                    if (largeImage) {
                        albumArtUrl = largeImage;
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch track info for ${track.title} by ${track.artist}`, e);
            }

            return {
                trackName: track.title || "Unknown Track",
                artistName: track.artist || "Unknown Artist",
                position: index + 1,
                playCount: track.totalPlaycount || 0, // Legacy field, same as totalPlaycount
                score: track.score || 0,
                totalPlaycount: track.totalPlaycount || 0,
                playcounts: track.playcounts || {},
                albumArtUrl,
            };
        })
    );

    return chartTracks;
}
