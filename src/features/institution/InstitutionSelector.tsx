import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Map } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { State, City } from 'country-state-city';

interface InstitutionSelectorProps {
    onInstitutionSelected: (institution: any) => void;
    disabled?: boolean;
    mode?: 'login' | 'registration';
}

export const InstitutionSelector: React.FC<InstitutionSelectorProps> = ({ onInstitutionSelected, disabled, mode = 'login' }) => {
    const [selectedStateIso, setSelectedStateIso] = useState('');
    const [selectedStateName, setSelectedStateName] = useState('');
    const [selectedDistrictName, setSelectedDistrictName] = useState('');

    const [colleges, setColleges] = useState<any[]>([]);
    const [selectedCollegeId, setSelectedCollegeId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [allJsonColleges, setAllJsonColleges] = useState<any[]>([]);

    // If we are in registration mode, fetch the massive college JSON dataset.
    useEffect(() => {
        if (mode === 'registration') {
            setIsLoading(true);
            fetch('/colleges.json')
                .then(res => res.json())
                .then((data: any[]) => {
                    const indexedData = data.map((c, i) => ({ ...c, _rawIdx: i }));
                    setAllJsonColleges(indexedData);
                })
                .catch(err => console.error("Error loading colleges list:", err))
                .finally(() => setIsLoading(false));
        }
    }, [mode]);

    // Get all states in India
    const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);

    // Get cities (districts) for selected state
    const districts = useMemo(() => {
        if (!selectedStateIso) return [];
        return City.getCitiesOfState('IN', selectedStateIso);
    }, [selectedStateIso]);

    const handleStateChange = (isoCode: string) => {
        setSelectedStateIso(isoCode);
        const stateObj = indianStates.find(s => s.isoCode === isoCode);
        setSelectedStateName(stateObj?.name || '');
        setSelectedDistrictName('');
        setSelectedCollegeId('');
        setColleges([]);
        onInstitutionSelected(null);
    };

    const handleDistrictChange = (districtName: string) => {
        setSelectedDistrictName(districtName);
        setSelectedCollegeId('');
        onInstitutionSelected(null);
    };

    // Fetch colleges when both state and district are selected
    useEffect(() => {
        const fetchColleges = async () => {
            if (!selectedStateName) {
                setColleges([]);
                return;
            }

            setIsLoading(true);
            try {
                if (mode === 'registration') {
                    // Registration Mode: Look up from dataset
                    let filtered = allJsonColleges.filter(c => c.state === selectedStateName);

                    if (selectedDistrictName) {
                        const term = selectedDistrictName.toLowerCase();
                        filtered = filtered.filter(c =>
                            c.district?.toLowerCase() === term ||
                            c.college?.toLowerCase().includes(term) ||
                            c.university?.toLowerCase().includes(term)
                        );
                    }

                    const formattedData = filtered.map(c => ({
                        id: `dataset_${c._rawIdx}`,
                        name: c.college,
                        state: c.state,
                        district: c.district || selectedDistrictName, // default to what they searched to ensure consistency
                        university: c.university,
                        collegeCode: c.college_type,
                        verificationStatus: 'pending' // Default new registrations to pending
                    }));
                    setColleges(formattedData);
                } else {
                    // Login Mode: Look up verified tenants from Firestore
                    let q = query(
                        collection(db, 'institutions'),
                        where('state', '==', selectedStateName),
                        // Only fetch verified ones for Login Auth
                        where('verificationStatus', '==', 'verified')
                    );

                    if (selectedDistrictName) {
                        q = query(q, where('district', '==', selectedDistrictName));
                    }

                    const snapshot = await getDocs(q);
                    const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setColleges(fetched);
                }
            } catch (error) {
                console.error("Error fetching colleges:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // We use a small timeout to avoid thrashing local filter when typing isn't an issue, just keeps effects clean
        const timer = setTimeout(() => {
            fetchColleges();
        }, 100);

        return () => clearTimeout(timer);
    }, [selectedStateName, selectedDistrictName, mode, allJsonColleges]);

    const handleCollegeChange = (id: string) => {
        setSelectedCollegeId(id);
        const college = colleges.find(c => c.id === id);
        onInstitutionSelected(college || null);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Select State</Label>
                <Select value={selectedStateIso} onValueChange={handleStateChange} disabled={disabled || isLoading}>
                    <SelectTrigger>
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Choose your state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        {indianStates.map(state => (
                            <SelectItem key={state.isoCode} value={state.isoCode}>
                                {state.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Select District / City</Label>
                <Select value={selectedDistrictName} onValueChange={handleDistrictChange} disabled={!selectedStateIso || disabled || isLoading}>
                    <SelectTrigger>
                        <Map className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Choose your district" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        {districts.map(district => (
                            <SelectItem key={district.name} value={district.name}>
                                {district.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Select Institution</Label>
                <Select value={selectedCollegeId} onValueChange={handleCollegeChange} disabled={!selectedStateName || disabled || isLoading}>
                    <SelectTrigger>
                        <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder={isLoading ? "Loading Colleges..." : "Choose your institution"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        {colleges.length === 0 && !isLoading ? (
                            <SelectItem value="none" disabled>
                                {mode === 'registration' ? 'Choose state and district to see colleges' : 'No verified institutions found'}
                            </SelectItem>
                        ) : (
                            colleges.map(college => (
                                <SelectItem key={college.id} value={college.id}>
                                    {college.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
