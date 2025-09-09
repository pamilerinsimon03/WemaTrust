'use client';

import { useRouter } from 'next/navigation';
import { Banknote, Shield, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mock user data that would typically come from an API
const users = [
  { id: 'admin', name: 'Admin', description: 'Simulate bank network issues', icon: Shield },
  { id: 'user1', name: 'Demo User 1', description: 'Account: *******789', icon: UserIcon },
  { id: 'user2', name: 'Demo User 2', description: 'Account: *******210', icon: UserIcon },
];

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (userId: string) => {
    localStorage.setItem('userId', userId);
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-primary p-3 rounded-lg">
              <Banknote className="text-primary-foreground h-8 w-8" />
            </div>
        </div>
        <h1 className="text-4xl font-bold text-primary">WemaTrust</h1>
        <p className="text-muted-foreground">Reliable and Innovative Banking</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Select a Demo User</CardTitle>
          <CardDescription>Choose a profile to experience the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="w-full h-auto py-4 justify-start text-left"
              onClick={() => handleLogin(user.id)}
            >
              <user.icon className="mr-4 h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold">{user.name}</span>
                <span className="text-sm text-muted-foreground">{user.description}</span>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
            <p>This is a prototype for demonstration purposes only.</p>
        </footer>
    </div>
  );
}
