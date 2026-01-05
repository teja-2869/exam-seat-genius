import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCollegesByState } from '@/data/states-colleges';

interface CollegeSelectProps {
  value: string;
  onChange: (collegeId: string) => void;
  stateCode: string;
  disabled?: boolean;
}

export const CollegeSelect: React.FC<CollegeSelectProps> = ({ value, onChange, stateCode, disabled }) => {
  const colleges = stateCode ? getCollegesByState(stateCode) : [];

  return (
    <div className="space-y-2">
      <Label htmlFor="college">College</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || !stateCode}>
        <SelectTrigger>
          <SelectValue placeholder={stateCode ? "Select your college" : "Select a state first"} />
        </SelectTrigger>
        <SelectContent>
          {colleges.map((college) => (
            <SelectItem key={college.id} value={college.id}>
              {college.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
