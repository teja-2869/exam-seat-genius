import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { states } from '@/data/states-colleges';

interface StateSelectProps {
  value: string;
  onChange: (stateCode: string) => void;
  disabled?: boolean;
}

export const StateSelect: React.FC<StateSelectProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="state">State</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select your state" />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state.code} value={state.code}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
