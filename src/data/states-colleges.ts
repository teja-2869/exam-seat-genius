export interface College {
  id: string;
  name: string;
  stateCode: string;
}

export interface State {
  code: string;
  name: string;
}

// Sample data - you can expand this with actual states and colleges
export const states: State[] = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'DL', name: 'Delhi' },
];

export const colleges: College[] = [
  // Andhra Pradesh
  { id: 'AP001', name: 'Andhra University', stateCode: 'AP' },
  { id: 'AP002', name: 'JNTU Kakinada', stateCode: 'AP' },
  { id: 'AP003', name: 'Sri Venkateswara University', stateCode: 'AP' },
  
  // Karnataka
  { id: 'KA001', name: 'Indian Institute of Science', stateCode: 'KA' },
  { id: 'KA002', name: 'National Institute of Technology Karnataka', stateCode: 'KA' },
  { id: 'KA003', name: 'Bangalore University', stateCode: 'KA' },
  { id: 'KA004', name: 'Visvesvaraya Technological University', stateCode: 'KA' },
  
  // Maharashtra
  { id: 'MH001', name: 'Indian Institute of Technology Bombay', stateCode: 'MH' },
  { id: 'MH002', name: 'University of Mumbai', stateCode: 'MH' },
  { id: 'MH003', name: 'Savitribai Phule Pune University', stateCode: 'MH' },
  
  // Tamil Nadu
  { id: 'TN001', name: 'Indian Institute of Technology Madras', stateCode: 'TN' },
  { id: 'TN002', name: 'Anna University', stateCode: 'TN' },
  { id: 'TN003', name: 'University of Madras', stateCode: 'TN' },
  
  // Delhi (using DL for Delhi)
  { id: 'DL001', name: 'Indian Institute of Technology Delhi', stateCode: 'DL' },
  { id: 'DL002', name: 'Delhi University', stateCode: 'DL' },
  { id: 'DL003', name: 'Jawaharlal Nehru University', stateCode: 'DL' },
];

export const getCollegesByState = (stateCode: string): College[] => {
  return colleges.filter(college => college.stateCode === stateCode);
};

export const getCollegeById = (collegeId: string): College | undefined => {
  return colleges.find(college => college.id === collegeId);
};

export const getStateByCode = (stateCode: string): State | undefined => {
  return states.find(state => state.code === stateCode);
};
