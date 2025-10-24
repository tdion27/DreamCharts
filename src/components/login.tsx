'use client';

import { useAuth, initiateAnonymousSignIn } from '@/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User } from 'lucide-react';

export default function Login() {
  const auth = useAuth();

  const handleAnonymousSignIn = () => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  };

  return (
    <div className="flex items-center justify-center h-full -mt-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Welcome to DreamCharts</CardTitle>
          <CardDescription>Sign in to create and view your weekly music charts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnonymousSignIn} className="w-full" variant="secondary">
            <User className="mr-2 h-4 w-4" />
            Continue as Guest
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
