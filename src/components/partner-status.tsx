'use client';
import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { updatePartnerStatusAction } from '@/app/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Cpu, Satellite, Loader2, Wand2 } from 'lucide-react';
import type { PartnerBank } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './status-badge';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                </>
            ) : (
                <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Adjust Status with AI
                </>
            )}
        </Button>
    )
}

export function PartnerStatus({ partnerBanks }: { partnerBanks: PartnerBank[] }) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAction = async (formData: FormData) => {
    const result = await updatePartnerStatusAction(formData);
    if(result.success) {
        toast({
            title: "AI Analysis Complete",
            description: `Bank status adjusted to ${result.newStatus}. Reason: ${result.reason}`
        });
        formRef.current?.reset();
    } else {
        toast({
            variant: "destructive",
            title: "AI Analysis Failed",
            description: result.error,
        });
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="text-primary" />
          <span>Partner Bank Network</span>
        </CardTitle>
        <CardDescription>
          Monitor and simulate changes to partner bank statuses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {partnerBanks.map(bank => (
            <div key={bank.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-secondary/30">
              <span className="font-medium">{bank.name}</span>
              <StatusBadge status={bank.status} />
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-muted-foreground"><Cpu size={16}/> AI Status Adjustment Tool</h3>
        </div>
        <form ref={formRef} action={handleAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankId">Bank to Adjust</Label>
            <Select name="bankId" required>
              <SelectTrigger id="bankId">
                <SelectValue placeholder="Select a bank" />
              </SelectTrigger>
              <SelectContent>
                {partnerBanks.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="networkConditions">Simulated Network Conditions</Label>
            <Textarea
              id="networkConditions"
              name="networkConditions"
              placeholder="e.g., 'High latency detected', 'All systems nominal'"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="historicalSuccessRate">Historical Success Rate</Label>
            <Slider
              id="historicalSuccessRate"
              name="historicalSuccessRate"
              defaultValue={[0.9]}
              max={1}
              step={0.01}
            />
          </div>
          <CardFooter className="p-0 pt-2">
             <SubmitButton />
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
