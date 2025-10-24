
"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Minus,
  User,
  UserPlus,
  Trash2,
  Wand2,
  Loader2,
  Share2,
  ChevronDown,
  PlusCircle,
  History,
  Download
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from 'html-to-image';


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ClientSong, WeeklyChart } from "@/lib/types";
import { createWeeklyChart } from "@/app/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { ChartImage } from "./chart-image";


function getPreviousFriday() {
    const today = new Date();
    const day = today.getDay();
    const prevFriday = new Date(today);
    prevFriday.setDate(today.getDate() - (day < 5 ? day + 2 : day - 5));
    prevFriday.setHours(0, 0, 0, 0);
    return prevFriday;
}

export default function ChartifyClient() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [newAccount, setNewAccount] = useState("");
  
  const [chartName, setChartName] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  
  const [activeChart, setActiveChart] = useState<WeeklyChart | null>(null);
  const [activeTracks, setActiveTracks] = useState<ClientSong[] | null>(null);

  const [isCreatingChart, startCreateChartTransition] = useTransition();
  const [isGeneratingImage, startGenerateImageTransition] = useTransition();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  
  const imageRef = useRef<HTMLDivElement>(null);


  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if(activeChart?.tracks) {
        const clientSongs: ClientSong[] = activeChart.tracks.map((track, index) => ({
            rank: track.position,
            title: track.trackName,
            artist: track.artistName,
            albumArtUrl: track.albumArtUrl,
            score: track.score,
            totalPlaycount: track.totalPlaycount,
            playcounts: track.playcounts,
            // TODO: Implement rank change logic by comparing with previous chart
            change: 'new', 
            previousRank: null, 
        }));
        setActiveTracks(clientSongs);
    } else {
        setActiveTracks(null);
    }
  }, [activeChart]);

  const handleAddAccount = () => {
    if (newAccount && !accounts.includes(newAccount)) {
      setAccounts([...accounts, newAccount]);
      setNewAccount("");
    }
  };

  const handleRemoveAccount = (accountToRemove: string) => {
    setAccounts(accounts.filter((account) => account !== accountToRemove));
  };

  const handleCreateChart = () => {
    if (!user || !firestore) {
         toast({ variant: "destructive", title: "You must be logged in."});
         return;
    }
    if (accounts.length === 0) {
      toast({ variant: "destructive", title: "No accounts", description: "Please add at least one Last.fm account."});
      return;
    }
     if (!chartName) {
      toast({ variant: "destructive", title: "No chart name", description: "Please enter a name for the chart."});
      return;
    }

    startCreateChartTransition(async () => {
      try {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
        
        // Find the date of the most recent Friday.
        const mostRecentFriday = new Date(today);
        mostRecentFriday.setDate(today.getDate() - ((dayOfWeek + 2) % 7)); // (dayOfWeek - 5 + 7) % 7 is equivalent
        mostRecentFriday.setHours(23, 59, 59, 999);

        // This Friday is the end date of the CURRENT week. We want the PREVIOUS week.
        const endDateOfCompletedWeek = new Date(mostRecentFriday);
        endDateOfCompletedWeek.setDate(mostRecentFriday.getDate() - 7);

        const startDateOfCompletedWeek = new Date(endDateOfCompletedWeek);
        startDateOfCompletedWeek.setDate(endDateOfCompletedWeek.getDate() - 6);
        startDateOfCompletedWeek.setHours(0, 0, 0, 0);


        await createWeeklyChart({
          firestore,
          chartName,
          accounts,
          startDate: startDateOfCompletedWeek,
          endDate: endDateOfCompletedWeek,
          ownerId: user.uid,
        });

        toast({ title: "Chart created!", description: "Your new weekly chart has been saved." });
        setOpenCreateDialog(false);
      } catch (error: any) {
        console.error("Chart creation failed:", error);
        toast({ variant: "destructive", title: "Chart Creation Error", description: error.message || "Could not create the chart. Check the console for details." });
      }
    });
  };

  const onGenerateImage = useCallback(() => {
    if (!imageRef.current) {
      return;
    }

    startGenerateImageTransition(async () => {
        setIsImageDialogOpen(true);
        setGeneratedImage(null);
        try {
            const dataUrl = await htmlToImage.toPng(imageRef.current!, { 
                cacheBust: true,
                pixelRatio: 2, // for higher resolution
             });
            setGeneratedImage(dataUrl);
        } catch(err) {
            console.error("Image generation failed:", err);
            toast({
                variant: "destructive",
                title: "Image Generation Error",
                description: "Could not generate the chart image. Please try again.",
            });
            setIsImageDialogOpen(false);
        }
    })
  }, [imageRef, toast]);


  return (
    <>
      {/* Hidden element for generating image */}
      {activeChart && activeTracks && (
          <div className="absolute -left-[9999px] -top-[9999px]">
                <ChartImage 
                    ref={imageRef}
                    chartTitle={activeChart.chartName}
                    tracks={activeTracks.slice(0, 10)}
                    startDate={new Date(activeChart.startDate)}
                    endDate={new Date(activeChart.endDate)}
                />
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-8">
          
          <ChartList onSelectChart={setActiveChart} activeChartId={activeChart?.id}/>
          
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full font-bold">
                <PlusCircle className="mr-2"/>
                Create New Chart
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Weekly Chart</DialogTitle>
                <DialogDescription>
                  This chart will be for the most recently completed week (Friday - Thursday).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="group-name">Chart Name</Label>
                    <Input
                      id="group-name"
                      placeholder="e.g., My Friends' Top 20"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Accounts</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="lastfm_username"
                          value={newAccount}
                          onChange={(e) => setNewAccount(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                        />
                        <Button onClick={handleAddAccount} size="icon" aria-label="Add Account">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                  </div>

                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                    {accounts.map((account) => (
                      <div
                        key={account}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <span>{account}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAccount(account);}}
                          aria-label={`Remove ${account}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
              </div>

              <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateChart} disabled={isCreatingChart} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    {isCreatingChart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isCreatingChart ? 'Generating...' : 'Generate & Save'}
                  </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Share Image Dialog */}
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Your Chart Is Ready to Share!</DialogTitle>
                <DialogDescription>
                  Download the image below and share it with your friends on social media.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center p-4 min-h-[400px] bg-muted/50 rounded-md">
                {isGeneratingImage && !generatedImage && (
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Generating your chart image...</p>
                  </div>
                )}
                {generatedImage && (
                  <Image
                      src={generatedImage}
                      alt="Generated chart"
                      width={800}
                      height={800}
                      className="rounded-lg shadow-lg w-full h-auto object-contain"
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>Close</Button>
                <Button asChild disabled={!generatedImage}>
                  <a href={generatedImage || ""} download={`${activeChart?.chartName || 'dreamchart'}.png`}>
                    <Download className="mr-2"/> Download
                  </a>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <AnimatePresence mode="wait">
            {!activeChart && !isCreatingChart && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="flex h-[50vh] flex-col items-center justify-center text-center shadow-lg">
                  <CardHeader>
                    <Award className="mx-auto h-16 w-16 text-primary/30" />
                    <CardTitle className="font-headline text-2xl mt-4">
                      Your Charts Await
                    </CardTitle>
                    <CardDescription>
                      Select a chart from the list or create a new one to get started.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )}

            {isCreatingChart && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline">
                      Generating...
                    </CardTitle>
                    <CardDescription>
                      Aggregating listening data from Last.fm...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-16 w-16 rounded-md" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTracks && activeChart && !isCreatingChart && (
              <motion.div
                key={activeChart.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="font-headline text-2xl">{activeChart.chartName}</CardTitle>
                        <CardDescription>
                            {new Date(activeChart.startDate).toLocaleDateString()} - {new Date(activeChart.endDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={onGenerateImage} disabled={isGeneratingImage}>
                        <Share2 className="mr-2"/> Share
                      </Button>
                    </CardHeader>
                    <CardContent>
                        {activeTracks.length > 0 ? (
                            <ChartDisplay songs={activeTracks} />
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No tracks found for this chart.
                            </div>
                        )}
                    </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function ChartList({ onSelectChart, activeChartId }: { onSelectChart: (chart: WeeklyChart) => void; activeChartId?: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [charts, setCharts] = useState<WeeklyChart[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const chartsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'weekly_charts'),
            where('ownerId', '==', user.uid)
        );
    }, [user, firestore]);

    useEffect(() => {
        if (!chartsQuery) {
            setCharts([]);
            setIsLoading(false);
            return;
        };

        setIsLoading(true);
        const unsubscribe = onSnapshot(chartsQuery, (querySnapshot) => {
            const chartData: WeeklyChart[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Ensure Timestamps are converted to serializable strings (ISO strings)
                const startDate = (data.startDate as Timestamp)?.toDate().toISOString();
                const endDate = (data.endDate as Timestamp)?.toDate().toISOString();

                chartData.push({
                    id: doc.id,
                    ...data,
                    startDate,
                    endDate,
                } as WeeklyChart);
            });
            // Sort on the client side
            chartData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setCharts(chartData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching charts: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [chartsQuery]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <History className="h-5 w-5"/>
                    My Charts
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <p>Loading charts...</p>}
                {!isLoading && charts.length === 0 && (
                    <p className="text-sm text-muted-foreground">You haven't created any charts yet.</p>
                )}
                {!isLoading && charts.length > 0 && (
                    <ul className="space-y-2">
                        {charts.map(chart => (
                            <li key={chart.id}>
                                <Button
                                    variant={activeChartId === chart.id ? "secondary" : "ghost"}
                                    className="w-full justify-start text-left h-auto"
                                    onClick={() => onSelectChart(chart)}
                                >
                                    <div className="flex flex-col">
                                        <span>{chart.chartName}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(chart.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function ChartDisplay({ songs }: { songs: ClientSong[] }) {
    const [highlightedUser, setHighlightedUser] = useState<string | null>(null);
    const allUsers = Array.from(new Set(songs.flatMap(song => Object.keys(song.playcounts))));

     const handleHighlightUser = (user: string) => {
        setHighlightedUser(currentUser => currentUser === user ? null : user);
    };

    return (
        <div className="space-y-4">
             {allUsers.length > 1 && (
                <div>
                    <p className="text-sm font-medium mb-2">Highlight a user's contributions:</p>
                    <div className="flex flex-wrap gap-2">
                        {allUsers.map(user => (
                            <Badge
                                key={user}
                                variant={highlightedUser === user ? "default" : "secondary"}
                                onClick={() => handleHighlightUser(user)}
                                className="cursor-pointer transition-colors"
                            >
                                {user}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
            <ol className="space-y-1">
            {songs.map((song) => (
                <SongItem 
                key={song.rank} 
                song={song}
                isHighlighted={!!highlightedUser && !!song.playcounts[highlightedUser]}
                highlightedUser={highlightedUser}
                />
            ))}
            </ol>
        </div>
    );
}


function SongItem({ song, isHighlighted, highlightedUser }: { song: ClientSong, isHighlighted: boolean, highlightedUser: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const rankChange =
    song.change === "new" ? (
      <Badge variant="secondary" className="bg-accent text-accent-foreground">NEW</Badge>
    ) : song.change === "up" ? (
      <ArrowUp className="h-4 w-4 text-green-500" />
    ) : song.change === "down" ? (
      <ArrowDown className="h-4 w-4 text-red-500" />
    ) : (
      <Minus className="h-4 w-4 text-gray-400" />
    );
  
  const sortedPlaycounts = Object.entries(song.playcounts || {}).sort(([, a], [, b]) => b - a);

  return (
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
        <li className={cn(
            "rounded-lg transition-colors",
            isHighlighted ? "bg-accent/20" : "hover:bg-muted/50",
            isOpen && (isHighlighted ? "bg-accent/30" : "bg-muted/50")
        )}>
            <CollapsibleTrigger asChild>
                <div className="flex items-center gap-4 p-2 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 w-12 text-lg font-bold text-muted-foreground shrink-0">
                        <span>{song.rank}</span>
                        {/* {rankChange} */}
                    </div>
                    <div className="relative h-16 w-16 shrink-0">
                      <Image
                          src={song.albumArtUrl}
                          alt={`Album art for ${song.title}`}
                          fill
                          sizes="64px"
                          className="rounded-md shadow-md object-cover"
                          data-ai-hint="album cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="font-bold text-foreground truncate">{song.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground shrink-0 ml-2">
                        <p className="font-bold text-lg">{song.score}</p>
                        <p className="text-xs">points</p>
                    </div>
                    <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transform transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                        }`}
                    />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent asChild>
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <div className="pl-[104px] pr-4 pb-3">
                        <div className="border-t pt-2 mt-1">
                            <h4 className="font-semibold text-sm mb-2">Play Count Breakdown:</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {sortedPlaycounts.map(([user, count]) => (
                                    <li key={user} className="flex justify-between items-center">
                                        <span className={cn(
                                            "flex items-center gap-2",
                                            isHighlighted && user === highlightedUser ? "font-bold text-accent-foreground" : ""
                                        )}>
                                            <User className="h-3 w-3" />
                                            {user}
                                        </span>
                                        <span className={cn(
                                            "font-medium",
                                            isHighlighted && user === highlightedUser ? "text-accent-foreground" : "text-foreground"
                                        )}>
                                            {count} plays
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </CollapsibleContent>
        </li>
    </Collapsible>
  );
}

    
    