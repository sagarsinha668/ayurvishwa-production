import React, { useState } from 'react';
import { Search, Loader2, User, Phone, MapPin, Hash, Pill, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { searchPharmacistVisitOptimized, giveMedicines, type PrescribedMedicineItem, type Visit } from '@/services/api';
import toast from 'react-hot-toast';
import { calculateAge } from '@/utils/dateUtils';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useMedicineContext } from '@/context/MedicineContext';

interface GiveMedicineTabProps {
  hospitalId: string;
}

const GiveMedicineTab: React.FC<GiveMedicineTabProps> = ({ hospitalId }) => {
  const { medicineNames } = useMedicineContext();
  const [tokenNumber, setTokenNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [medicines, setMedicines] = useState<PrescribedMedicineItem[]>([]);
  const [dispensing, setDispensing] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = async () => {
    if (!tokenNumber.trim()) {
      toast.error('Please enter a token number');
      return;
    }

    setLoading(true);
    setVisit(null);
    setMedicines([]);

    try {
      const result = await searchPharmacistVisitOptimized(parseInt(tokenNumber), hospitalId);
      if (result) {
        setVisit(result);
        // Initialize medicines from prescription
        setMedicines(result.prescribedMedicines || []);
      } else {
        toast.error('No visit found for this token today');
      }
    } catch (error) {
      toast.error('Failed to search visit');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = () => {
    const newItem: PrescribedMedicineItem = {
      medicineName: '',
      quantity: 1,
      dosage: '',
      instructions: '',
      kala: '',
      anupana: ''
    };
    setMedicines([...medicines, newItem]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleUpdateMedicine = (index: number, field: keyof PrescribedMedicineItem, value: any) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleGiveMedicine = async () => {
    if (!visit) return;

    // Validate: Backend only needs medicineName (it looks up by name), not medicineId
    const invalid = medicines.some(m => !m.medicineName?.trim() || (m.quantity ?? 0) <= 0);
    if (invalid) {
      toast.error('Please ensure all medicines have a name and quantity greater than 0');
      return;
    }

    // Ensure visit ID exists
    const visitId = (visit as any)._id || (visit as any).id;
    if (!visitId) {
      toast.error('Visit ID is missing. Please search by token again.');
      return;
    }

    setDispensing(true);
    try {
      await giveMedicines(visitId, hospitalId, medicines);
      toast.success('Medicines dispensed successfully');
      setVisit({ ...visit, medicineGiven: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dispense medicines');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Patient by Token
          </CardTitle>
          <CardDescription>Enter token number to fetch prescribed medicines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Token Number"
                value={tokenNumber}
                onChange={(e) => setTokenNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {visit && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Patient Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{(visit as any).patientId?.name}</h2>
                  <p className="text-sm text-muted-foreground">{calculateAge((visit as any).patientId?.dob)} yrs, {(visit as any).patientId?.sex}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {(visit as any).patientId?.phoneNo || (visit as any).patientId?.phoneNumber}
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    {(visit as any).patientId?.address?.street && `${(visit as any).patientId.address.street}, `}
                    {(visit as any).patientId?.address?.city}
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Token: {(visit as any).visitToken || (visit as any).tokenNumber}</Badge>
                  {visit.medicineGiven ? (
                    <Badge className="bg-green-100 text-green-700">Given</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-md">Prescribed Medicines</CardTitle>
                  <CardDescription>Verify and update medicines to be dispensed</CardDescription>
                </div>
                {!visit.medicineGiven && (
                  <Button size="sm" variant="outline" onClick={handleAddMedicine}>
                    <Plus className="h-4 w-4 mr-2" /> Add Medicine
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {visit.medicineGiven ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                      <CheckCircle2 className="h-5 w-5" />
                      Medicines already dispensed for this visit
                    </div>

                    <div className="space-y-3">
                      {(visit.givenMedicines || []).map((m, i) => (
                        <Card key={i} className="bg-muted/30 border-primary/10">
                          <div className="p-4 space-y-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Pill className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Dispensed Medicine</span>
                              </div>
                              <p className="text-base font-bold text-primary leading-tight break-words">
                                {m.medicineName}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Qty</Label>
                                <p className="text-sm font-bold">{m.quantity}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Dosage</Label>
                                <p className="text-sm font-bold">{m.dosage || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Kala</Label>
                                <p className="text-sm font-bold">{m.kala || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Anupana</Label>
                                <p className="text-sm font-bold">{m.anupana || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {medicines.map((m, i) => (
                        <Card key={i} className="bg-muted/30 border-primary/10 hover:border-primary/30 transition-all overflow-hidden">
                          <div className="p-4 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Search className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Select Medicine</span>
                                </div>
                                <div className="relative">
                                  <Input
                                    value={activeSearchIndex === i ? searchTerm : m.medicineName}
                                    onFocus={() => {
                                      setActiveSearchIndex(i);
                                      setSearchTerm(m.medicineName);
                                    }}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Type to search medicines..."
                                    className="font-bold border-primary/20 focus-visible:ring-primary/30 h-11 pr-10"
                                  />
                                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />

                                  {activeSearchIndex === i && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40 bg-transparent"
                                        onClick={() => setActiveSearchIndex(null)}
                                      />
                                      <Card className="absolute z-50 w-full mt-1.5 shadow-2xl border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <ScrollArea className="h-64">
                                          <div className="p-2 space-y-1 bg-background">
                                            {medicineNames
                                              .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                              .map(item => (
                                                <button
                                                  key={item.id}
                                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-primary/5 rounded-md transition-all group"
                                                  onClick={() => {
                                                    const updated = [...medicines];
                                                    updated[i] = {
                                                      ...updated[i],
                                                      medicineName: item.name,
                                                      medicineId: item.id
                                                    };
                                                    setMedicines(updated);
                                                    setActiveSearchIndex(null);
                                                  }}
                                                >
                                                  <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                    <Pill className="h-4 w-4 text-primary" />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-primary truncate">{item.name}</p>
                                                    <p className="text-[10px] uppercase text-muted-foreground/60 tracking-wider font-black">Verified Medicine</p>
                                                  </div>
                                                  <Plus className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                              ))}
                                            {searchTerm && medicineNames.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                              <div className="p-8 text-center text-muted-foreground">
                                                <Pill className="h-6 w-6 mx-auto mb-2 opacity-20" />
                                                <p className="text-xs font-medium">No medicines found matching "{searchTerm}"</p>
                                                <p className="text-[10px] mt-1">Please check the spelling or add to inventory first.</p>
                                              </div>
                                            )}
                                          </div>
                                        </ScrollArea>
                                      </Card>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMedicine(i)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 -mt-1 -mr-1 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Qty</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={m.quantity ?? ''}
                                  onChange={(e) => handleUpdateMedicine(i, 'quantity', parseInt(e.target.value) || 0)}
                                  className="h-9 font-bold bg-background"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Dosage</Label>
                                <Input
                                  value={m.dosage}
                                  onChange={(e) => handleUpdateMedicine(i, 'dosage', e.target.value)}
                                  placeholder="e.g. 1-0-1"
                                  className="h-9 font-bold bg-background"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Kala</Label>
                                <Input
                                  value={m.kala || ''}
                                  onChange={(e) => handleUpdateMedicine(i, 'kala', e.target.value)}
                                  placeholder="e.g. Before Meal"
                                  className="h-9 font-bold bg-background"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Anupana</Label>
                                <Input
                                  value={m.anupana || ''}
                                  onChange={(e) => handleUpdateMedicine(i, 'anupana', e.target.value)}
                                  placeholder="e.g. Warm Water"
                                  className="h-9 font-bold bg-background"
                                />
                              </div>
                              <div className="space-y-1.5 col-span-2 md:col-span-1 lg:col-span-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Instructions</Label>
                                <Input
                                  value={m.instructions || ''}
                                  onChange={(e) => handleUpdateMedicine(i, 'instructions', e.target.value)}
                                  placeholder="Special notes..."
                                  className="h-9 text-xs italic bg-background"
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {medicines.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                        <Pill className="h-8 w-8 mx-auto mb-3 opacity-20" />
                        <p>No medicines prescribed.</p>
                        <p className="text-xs">Click "Add Medicine" to create a new entry.</p>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleGiveMedicine}
                        disabled={dispensing || medicines.length === 0}
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {dispensing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pill className="h-4 w-4 mr-2" />}
                        Give Medicines
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiveMedicineTab;
