'use client';
import { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { simulateTransfer } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Send, Loader2, AlertTriangle, Info } from 'lucide-react';
import type { PartnerBank, User } from '@/lib/types';
import { StatusBadge } from './status-badge';

const initialState = {
  message: '',
  errors: {} as Record<string, string[]>,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          Send Money
        </>
      )}
    </Button>
  );
}

export function TransferForm({ user, partnerBanks, onTransferSuccess }: { user: User, partnerBanks: PartnerBank[], onTransferSuccess?: () => void }) {
  const [state, formAction] = useActionState(simulateTransfer, initialState);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string>('');
  const { toast } = useToast();
  
  const selectedBank = partnerBanks.find(b => b.id === selectedBankId);
  const requiresConfirmation = selectedBank && (selectedBank.status === 'SLOW' || selectedBank.status === 'DOWN');

  // Show toast notification when transfer is successful
  useEffect(() => {
    if (state.message && !state.errors?.from_bank && !state.errors?.to_account && !state.errors?.amount) {
      if (state.success) {
        // Only show toast if this is a new success message
        if (state.message !== lastSuccessMessage) {
          toast({
            title: 'Transfer Successful!',
            description: state.message,
            variant: 'default',
          });
          setLastSuccessMessage(state.message);
          
          // Call the refresh callback to update the UI (only once per success)
          if (onTransferSuccess) {
            console.log('[TRANSFER FORM] Calling onTransferSuccess callback');
            onTransferSuccess();
          } else {
            console.log('[TRANSFER FORM] onTransferSuccess callback not provided');
          }
        }
      } else {
        toast({
          title: 'Transfer Failed',
          description: state.message,
          variant: 'destructive',
        });
      }
    }
  }, [state.message, state.success, state.errors, toast, onTransferSuccess, lastSuccessMessage]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (requiresConfirmation) {
      event.preventDefault();
      setShowDialog(true);
    }
    // If no confirmation required, let the form submit normally
  };

  const handleDialogContinue = () => {
    setShowDialog(false);
    // Submit the form after confirmation
    const form = document.getElementById('transfer-form') as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      formAction(formData);
    }
  };
  
  return (
    <>
      <form id="transfer-form" action={formAction} onSubmit={handleSubmit}>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="text-primary" />
              <span>Make a Transfer</span>
            </CardTitle>
            <CardDescription>
              Send funds to any local bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="hidden" name="userId" value={user.id} />
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="5000"
                required
              />
              {state.errors?.amount && <p className="text-sm text-destructive">{state.errors.amount[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_account">Destination Account</Label>
              <Input
                id="to_account"
                name="to_account"
                placeholder="0123456789"
                required
              />
               {state.errors?.to_account && <p className="text-sm text-destructive">{state.errors.to_account[0]}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="from_bank">Destination Bank</Label>
              <Select name="from_bank" onValueChange={setSelectedBankId} required>
                <SelectTrigger id="from_bank">
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {partnerBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex justify-between w-full">
                        <span>{bank.name}</span>
                        <StatusBadge status={bank.status} className="mr-2"/>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {state.errors?.from_bank && <p className="text-sm text-destructive">{state.errors.from_bank[0]}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="E.g., For groceries"
              />
            </div>
             {selectedBank && (requiresConfirmation || state.message) ? null : <div className="md:col-span-2 h-10"></div> }

             {requiresConfirmation && (
                <div className="md:col-span-2">
                    <Alert variant={selectedBank?.status === 'DOWN' ? 'destructive' : 'default'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Partner Bank Warning</AlertTitle>
                        <AlertDescription>
                            {selectedBank?.name} is currently experiencing issues ({selectedBank?.status}). Your transfer may be delayed.
                        </AlertDescription>
                    </Alert>
                </div>
             )}
              {state.message && !state.errors?.from_bank && !state.errors?.to_account && !state.errors?.amount && (
                <div className="md:col-span-2">
                    <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                        <Info className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800 dark:text-green-300">Success!</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-400">
                            {state.message}
                        </AlertDescription>
                    </Alert>
                </div>
            )}
             {state.message && (state.errors?.from_bank || state.errors?.to_account || state.errors?.amount) && (
                <div className="md:col-span-2">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Transfer Failed</AlertTitle>
                        <AlertDescription>
                            {state.message}
                        </AlertDescription>
                    </Alert>
                </div>
            )}
          </CardContent>
          <CardFooter>
             <SubmitButton />
          </CardFooter>
        </Card>
      </form>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to proceed?</AlertDialogTitle>
            <AlertDialogDescription>
              The destination bank, {selectedBank?.name}, is currently {selectedBank?.status}. 
              This transaction might be delayed or fail. Do you still want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogContinue}>
              Yes, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
