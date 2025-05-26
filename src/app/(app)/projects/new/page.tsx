
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type KeyPersonnel } from "@/contexts/ProjectContext";
import { useOrganizationContext, type Organization, ALL_ORGANIZATIONS_ID } from "@/contexts/OrganizationContext"; // Import OrganizationContext
import { ArrowLeft, ArrowRight, CheckCircle, Users, MapPin, UserPlus, Briefcase } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type WizardAvailablePersonnel = {
  id: string;
  name: string;
  capabilities: string[];
};

const initialAvailablePersonnelList: WizardAvailablePersonnel[] = [
  { id: "user001", name: "Alice Wonderland", capabilities: ["Director", "Producer", "Lead Camera Op"] },
  { id: "user002", name: "Bob The Builder", capabilities: ["Audio Engineer", "Grip", "Technical Director"] },
  { id: "user003", name: "Charlie Chaplin", capabilities: ["Producer", "Editor", "Writer"] },
  { id: "user004", name: "Diana Prince", capabilities: ["Drone Pilot", "Photographer", "Camera Operator"] },
  { id: "user005", name: "Edward Scissorhands", capabilities: ["Grip", "Set Designer", "Editor"] },
  { id: "user006", name: "Fiona Gallagher", capabilities: ["Coordinator", "Project Manager"] },
  { id: "user007", name: "George Jetson", capabilities: ["Tech Lead", "IT Support", "Streaming Engineer"] },
];

const allPossibleCapabilities = [
  "Director", "Producer", "Lead Camera Op", "Camera Operator", "Drone Pilot",
  "Audio Engineer", "Grip", "Technical Director", "Editor", "Writer",
  "Photographer", "Set Designer", "Coordinator", "Project Manager", "IT Support",
  "Streaming Engineer", "Assistant"
];


const keyPersonnelSchema = z.object({
  personnelId: z.string(),
  name: z.string(),
  projectRole: z.string().min(1, "Role is required."),
});

const projectWizardSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  organizationId: z.string().min(1, { message: "Please select an organization." }), // Added organizationId
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(), 
});

type ProjectWizardFormDataInternal = z.infer<typeof projectWizardSchema>;

// Match ProjectContext's ProjectFormData but ensure organizationId is handled separately.
type ProjectContextInputData = Omit<import('@/contexts/ProjectContext').ProjectFormData, 'organizationId' | 'createdByUserId'> & {
  location?: string;
  keyPersonnel?: KeyPersonnel[];
};

const TOTAL_STEPS = 4; // Remains 4 steps, org selection is part of Step 1 if needed.

export default function NewProjectWizardPage() {
  const router = useRouter();
  const { addProject } = useProjectContext();
  const { organizations, selectedOrganizationId: globalSelectedOrgId, isLoadingOrganizations } = useOrganizationContext();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [currentAvailablePersonnel, setCurrentAvailablePersonnel] = useState<WizardAvailablePersonnel[]>(initialAvailablePersonnelList);
  const [isAddPersonnelDialogOpen, setIsAddPersonnelDialogOpen] = useState(false);
  const [newPersonnelName, setNewPersonnelName] = useState("");
  const [newPersonnelCapabilities, setNewPersonnelCapabilities] = useState<Record<string, boolean>>({});
  const [notifyTeam, setNotifyTeam] = useState(true); 

  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors, isValid: isFormOverallValid },
    reset,
    clearErrors,
  } = useForm<ProjectWizardFormDataInternal>({
    resolver: zodResolver(projectWizardSchema),
    mode: "onChange", 
    defaultValues: {
      name: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      description: "",
      status: "Planning",
      organizationId: globalSelectedOrgId !== ALL_ORGANIZATIONS_ID ? globalSelectedOrgId || "" : "", // Pre-fill if specific org is selected globally
      location: "",
      keyPersonnel: [],
      selectedPersonnelMap: {},
    },
  });

  const selectedPersonnelMap = watch("selectedPersonnelMap", {});
  const watchedKeyPersonnel = watch("keyPersonnel", []);
  const watchedOrganizationId = watch("organizationId"); // Watch for changes in Step 1's org selection

  // Pre-fill organizationId if a global one is selected
  useEffect(() => {
    if (globalSelectedOrgId !== ALL_ORGANIZATIONS_ID && globalSelectedOrgId && getValues("organizationId") !== globalSelectedOrgId) {
      setValue("organizationId", globalSelectedOrgId, { shouldValidate: true, shouldDirty: true });
    }
  }, [globalSelectedOrgId, getValues, setValue]);


  useEffect(() => {
    const currentKeyPersonnelValues = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];
    let mapChanged = false;

    Object.keys(selectedPersonnelMap || {}).forEach(personId => {
      if (selectedPersonnelMap?.[personId]) {
        const existingEntry = currentKeyPersonnelValues.find(kp => kp.personnelId === personId);
        const personDetails = currentAvailablePersonnel.find(p => p.id === personId);
        if (personDetails) {
            newKeyPersonnelArray.push({
            personnelId: personId,
            name: personDetails.name,
            projectRole: existingEntry?.projectRole || "",
            });
        }
      }
    });

    // Compare new array with existing to prevent unnecessary updates
    if (newKeyPersonnelArray.length !== currentKeyPersonnelValues.length || 
        !newKeyPersonnelArray.every((newItem, index) => 
            newItem.personnelId === currentKeyPersonnelValues[index]?.personnelId &&
            newItem.projectRole === currentKeyPersonnelValues[index]?.projectRole
        )) {
        mapChanged = true;
    }

    if (mapChanged) {
        setValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }

  }, [selectedPersonnelMap, getValues, setValue, currentAvailablePersonnel]);


  useEffect(() => {
    if (currentStep === 3 && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places && locationInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        { types: ["address"] }
      );
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setValue("location", place.formatted_address, { shouldValidate: true, shouldDirty: true });
        }
      });
    }
  }, [currentStep, setValue]);

  const handleAddNewPersonnelToRoster = () => {
    if (!newPersonnelName.trim()) {
      toast({ title: "Error", description: "New personnel name cannot be empty.", variant: "destructive" });
      return;
    }
    const selectedCapabilities = Object.entries(newPersonnelCapabilities)
      .filter(([, isSelected]) => isSelected)
      .map(([capability]) => capability);

    if (selectedCapabilities.length === 0) {
      toast({ title: "Error", description: "Please select at least one capability.", variant: "destructive" });
      return;
    }

    const newId = `user_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPerson: WizardAvailablePersonnel = {
      id: newId,
      name: newPersonnelName.trim(),
      capabilities: selectedCapabilities,
    };
    setCurrentAvailablePersonnel(prev => [...prev, newPerson]);
    setValue("selectedPersonnelMap", { ...getValues("selectedPersonnelMap"), [newId]: true }, { shouldDirty: true });
    toast({ title: "Team Member Added", description: `${newPerson.name} added to roster and selected for this project.` });
    setIsAddPersonnelDialogOpen(false);
    setNewPersonnelName("");
    setNewPersonnelCapabilities({});
  };

  const handleNextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) {
      isValidStep = await trigger(["name", "startDate", "endDate", "status", "organizationId"]);
    } else if (currentStep === 2) {
      const keyPersonnelValues = getValues("keyPersonnel") || [];
      isValidStep = await trigger("keyPersonnel"); 
      if (keyPersonnelValues.length > 0 && !isValidStep) {
         toast({
            title: "Missing Roles",
            description: "Please assign a project role to all selected key personnel.",
            variant: "destructive",
          });
      } else if (keyPersonnelValues.length > 0 && isValidStep) {
        // if valid and has personnel, ensure errors are clear
        clearErrors("keyPersonnel");
      } else {
         // No personnel selected, or validation passed
         isValidStep = true;
         clearErrors("keyPersonnel");
      }
    } else if (currentStep === 3) {
      isValidStep = await trigger("location");
    } else {
      isValidStep = true;
    }

    if (isValidStep) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    } else if (currentStep === 1 && (errors.name || errors.startDate || errors.endDate || errors.status || errors.organizationId)) {
      toast({ title: "Core Details Incomplete", description: "Please fill all required fields for Step 1, including Organization.", variant: "destructive" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit: SubmitHandler<ProjectWizardFormDataInternal> = (data) => {
    const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && kp.projectRole) || [];
    const projectDataForContext: ProjectContextInputData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
      status: data.status,
      location: data.location,
      keyPersonnel: finalKeyPersonnel,
      // organizationId is handled by addProject directly
    };

    const currentUserId = "user_admin_demo"; // Placeholder for actual user ID

    addProject(projectDataForContext, data.organizationId, currentUserId);
    
    let toastMessage = `Project "${data.name}" has been successfully created.`;
    if (notifyTeam && finalKeyPersonnel.length > 0) {
      console.log("SIMULATING: Sending project creation notifications to team members:", finalKeyPersonnel.map(p => p.name).join(", "));
      toastMessage += " Team members would be notified.";
    } else if (notifyTeam && finalKeyPersonnel.length === 0) {
      toastMessage += " No team members were selected to notify.";
    }

    toast({
      title: "Project Created!",
      description: toastMessage,
    });
    router.push("/projects");
    reset();
  };

  const progressValue = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Project Setup Wizard</h1>
          <p className="text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}: Guiding you through project creation.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Exit
        </Button>
      </div>

      <Progress value={progressValue} className="w-full mb-4" />

      <Dialog open={isAddPersonnelDialogOpen} onOpenChange={setIsAddPersonnelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Team Member to Roster</DialogTitle>
            <DialogDescription>
              Define the new team member's name and their general capabilities.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-personnel-name" className="text-right">Name</Label>
              <Input
                id="new-personnel-name"
                value={newPersonnelName}
                onChange={(e) => setNewPersonnelName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-1">Capabilities</Label>
              <ScrollArea className="col-span-3 h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {allPossibleCapabilities.map(cap => (
                    <div key={cap} className="flex items-center gap-2">
                      <Checkbox
                        id={`cap-${cap}`}
                        checked={!!newPersonnelCapabilities[cap]}
                        onCheckedChange={(checked) => {
                          setNewPersonnelCapabilities(prev => ({ ...prev, [cap]: !!checked }));
                        }}
                      />
                      <Label htmlFor={`cap-${cap}`} className="font-normal text-sm">{cap}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsAddPersonnelDialogOpen(false); setNewPersonnelName(""); setNewPersonnelCapabilities({});
            }}>Cancel</Button>
            <Button type="button" onClick={handleAddNewPersonnelToRoster}>Save New Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-lg">
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Step 1: Core Project Details</CardTitle>
                <CardDescription>Basic information for your new project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                { (globalSelectedOrgId === ALL_ORGANIZATIONS_ID || !globalSelectedOrgId ) && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationId">Organization <span className="text-destructive">*</span></Label>
                    <Controller
                      name="organizationId"
                      control={control}
                      render={({ field }) => (
                        <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isLoadingOrganizations}
                        >
                          <SelectTrigger className={errors.organizationId ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select organization for this project" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org: Organization) => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.organizationId && <p className="text-xs text-destructive mt-1">{errors.organizationId.message}</p>}
                  </div>
                )}
                {globalSelectedOrgId && globalSelectedOrgId !== ALL_ORGANIZATIONS_ID && (
                     <div className="space-y-2">
                        <Label>Organization</Label>
                        <Input value={organizations.find(o => o.id === globalSelectedOrgId)?.name || "Selected Organization"} readOnly disabled className="bg-muted/50" />
                     </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
                    <Input id="startDate" type="date" {...register("startDate")} className={errors.startDate ? "border-destructive" : ""} />
                    {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
                    <Input id="endDate" type="date" {...register("endDate")} className={errors.endDate ? "border-destructive" : ""} />
                    {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Planning", "In Progress", "Completed", "On Hold", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" {...register("description")} placeholder="Provide a brief overview of the project." />
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
             <>
              <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-accent" />Step 2: Assign Key Personnel & Roles</CardTitle>
                  <CardDescription>Select team members and their project-specific roles.</CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsAddPersonnelDialogOpen(true)} className="shrink-0 mt-2 sm:mt-0">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New to Roster
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Available Team Members:</Label>
                <ScrollArea className="h-72 w-full rounded-md border p-3">
                  {currentAvailablePersonnel.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No personnel in roster. Add some first.</p>}
                  {currentAvailablePersonnel.map((person) => {
                    const isSelected = !!selectedPersonnelMap?.[person.id];
                    const keyPersonnelEntryIndex = watchedKeyPersonnel.findIndex(kp => kp.personnelId === person.id);
                    
                    return (
                      <div key={person.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors min-h-[48px] border-b last:border-b-0">
                        <div className="flex items-center flex-shrink-0 mb-2 sm:mb-0">
                          <Checkbox
                            id={`person-select-${person.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentMap = getValues("selectedPersonnelMap") || {};
                              setValue("selectedPersonnelMap", { ...currentMap, [person.id]: !!checked }, { shouldDirty: true });
                            }}
                            className="mr-2.5"
                          />
                          <Label htmlFor={`person-select-${person.id}`} className="font-normal sm:w-40 truncate" title={person.name}>
                            {person.name}
                          </Label>
                        </div>

                        {isSelected && keyPersonnelEntryIndex !== -1 && watchedKeyPersonnel[keyPersonnelEntryIndex] && (
                          <div className="w-full sm:w-60 sm:ml-auto">
                            <Controller
                              name={`keyPersonnel.${keyPersonnelEntryIndex}.projectRole`}
                              control={control}
                              defaultValue=""
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger className={errors.keyPersonnel?.[keyPersonnelEntryIndex]?.projectRole ? "border-destructive h-9" : "h-9"}>
                                    <SelectValue placeholder="Select role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {person.capabilities && person.capabilities.length > 0 ? (
                                      person.capabilities.map(capability => (
                                        <SelectItem key={`${person.id}-${capability}`} value={capability}>
                                          {capability}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="" disabled>No capabilities</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.keyPersonnel?.[keyPersonnelEntryIndex]?.projectRole && (
                              <p className="text-xs text-destructive mt-1">
                                {errors.keyPersonnel[keyPersonnelEntryIndex]?.projectRole?.message}
                              </p>
                            )}
                          </div>
                        )}
                         {isSelected && keyPersonnelEntryIndex === -1 && (
                            <p className="text-xs text-muted-foreground italic w-full text-center sm:text-left sm:w-60 sm:ml-auto">Assigning role...</p>
                         )}
                      </div>
                    );
                  })}
                </ScrollArea>
                 <p className="text-xs text-muted-foreground">
                  Select personnel to add them to this project. Then, choose their specific role for this project from their capabilities.
                </p>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-6 w-6 text-accent" />Step 3: Set Project Location</CardTitle>
                <CardDescription>Specify the primary location or venue for this project. (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="location-input">Project Location</Label>
                  <Input
                    id="location-input"
                    ref={locationInputRef}
                    {...register("location")}
                    placeholder="e.g., City Conference Center, Remote, Multiple Venues"
                    className={errors.location ? "border-destructive" : ""}
                  />
                  {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
                   <p className="text-xs text-muted-foreground mt-1">
                    Start typing for address suggestions (Google Maps Autocomplete needs API key setup).
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle>Step 4: Review & Create Project</CardTitle>
                <CardDescription>Please review the project details below before creating.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Project Name:</h3>
                  <p className="text-lg font-semibold">{getValues("name")}</p>
                </div>
                 <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Organization:</h3>
                  <p className="text-sm">{organizations.find(o => o.id === getValues("organizationId"))?.name || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Start Date:</h3>
                    <p>{getValues("startDate")}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">End Date:</h3>
                    <p>{getValues("endDate")}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status:</h3>
                  <p>{getValues("status")}</p>
                </div>
                {getValues("description") && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Description:</h3>
                    <p className="whitespace-pre-wrap text-sm">{getValues("description")}</p>
                  </div>
                )}
                {getValues("location") && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Project Location:</h3>
                    <p className="text-sm">{getValues("location")}</p>
                  </div>
                )}
                {watchedKeyPersonnel.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Key Personnel & Roles:</h3>
                    <ul className="list-disc list-inside pl-4 mt-1">
                      {watchedKeyPersonnel.map(kp => (
                        <li key={kp.personnelId} className="text-sm">{kp.name}: <span className="font-semibold">{kp.projectRole || "N/A"}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No key personnel assigned.</p>
                )}
                <div className="flex items-center space-x-2 pt-4">
                  <Checkbox
                    id="notifyTeam"
                    checked={notifyTeam}
                    onCheckedChange={(checked) => setNotifyTeam(!!checked)}
                  />
                  <Label htmlFor="notifyTeam" className="font-normal text-sm">
                    Notify selected team members about this new project.
                  </Label>
                </div>
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between border-t pt-6 mt-6">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            )}
            {currentStep === 1 && <div />} 

            {currentStep < TOTAL_STEPS && (
              <Button type="button" onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button type="submit" disabled={!isFormOverallValid}>
                <CheckCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
