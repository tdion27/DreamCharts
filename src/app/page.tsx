"use client";

import ChartifyClient from "@/components/chartify-client";
import Header from "@/components/header";
import Login from "@/components/login";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";


export default function Home() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 w-full container mx-auto py-8 px-4">
        {user ? <ChartifyClient /> : <Login />}
      </main>
    </div>
  );
}
