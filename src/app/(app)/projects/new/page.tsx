
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
import { useOrganizationContext, type Organization, ALL_ORGANIZATIONS_ID } from "@/contexts/OrganizationContext";
import { ArrowLeft, ArrowRight, CheckCircle, Users, MapPin, UserPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AddPersonnelToRosterDialog, type WizardAvailablePersonnel } from "@/components/modals/AddPersonnelToRosterDialog";
import { PHOTOGRAPHY_ROLES } from "@/app/(app)/personnel/page"; 

// Simplified structure for available personnel in the wizard
interface Step2AvailablePersonnel extends WizardAvailablePersonnel {
  personnelId: string; // Ensure this matches KeyPersonnel.personnelId
  projectRole: string; // Initialize, will be set by user
}


const initialAvailablePersonnelList: Step2AvailablePersonnel[] = [
  { id: "user001", personnelId: "user001", name: "Alice Wonderland", capabilities: ["Photographer", "Editor"], projectRole: "" },
  { id: "user002", personnelId: "user002", name: "Bob The Builder", capabilities: ["Photographer", "Editor"], projectRole: "" },
  { id: "user003", personnelId: "user003", name: "Charlie Chaplin", capabilities: ["Project Manager"], projectRole: "" },
  { id: "user004", personnelId: "user004", name: "Diana Prince", capabilities: ["Photographer"], projectRole: "" },
  { id: "user005", personnelId: "user005", name: "Edward Scissorhands", capabilities: ["Editor"], projectRole: "" },
  { id: "user006", personnelId: "user006", name: "Fiona Gallagher", capabilities: ["Photographer"], projectRole: "" },
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
  organizationId: z.string().min(1, { message: "Please select an organization." }),
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(), 
});

type ProjectWizardFormDataInternal = z.infer<typeof projectWizardSchema>;

type ProjectContextInputData = Omit<import('@/contexts/ProjectContext').ProjectFormData, 'organizationId' | 'createdByUserId'> & {
  location?: string;
  keyPersonnel?: KeyPersonnel[];
};

const TOTAL_STEPS = 4;

export default function NewProjectWizardPage() {
  const router = useRouter();
  const { addProject } = useProjectContext();
  const { organizations, selectedOrganizationId: globalSelectedOrgId, isLoadingOrganizations } = useOrganizationContext();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [currentAvailablePersonnel, setCurrentAvailablePersonnel] = useState<Step2AvailablePersonnel[]>(initialAvailablePersonnelList);
  const [isAddPersonnelDialogOpen, setIsAddPersonnelDialogOpen] = useState(false);
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
      organizationId: globalSelectedOrgId !== ALL_ORGANIZATIONS_ID ? globalSelectedOrgId || "" : (organizations.length > 0 ? organizations[0].id : ""),
      location: "",
      keyPersonnel: [],
      selectedPersonnelMap: {},
    },
  });
  
  const { fields: keyPersonnelFields, append, remove, update } = useFieldArray({
    control,
    name: "keyPersonnel",
    keyName: "fieldId" // Use a different key name than default 'id' to avoid conflict with personnel.id
  });

  const selectedPersonnelMap = watch("selectedPersonnelMap", {});
  const watchedKeyPersonnel = watch("keyPersonnel", []);
  const watchedOrganizationId = watch("organizationId");

  useEffect(() => {
    if (globalSelectedOrgId !== ALL_ORGANIZATIONS_ID && globalSelectedOrgId && getValues("organizationId") !== globalSelectedOrgId) {
      setValue("organizationId", globalSelectedOrgId, { shouldValidate: true, shouldDirty: true });
    } else if (getValues("organizationId") === "" && organizations.length > 0 && !isLoadingOrganizations) {
        setValue("organizationId", organizations[0].id, { shouldValidate: true, shouldDirty: true });
    }
  }, [globalSelectedOrgId, getValues, setValue, organizations, isLoadingOrganizations]);
  
 useEffect(() => {
    const currentFormKeyPersonnel = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];
    let changed = false;

    // Add or update selected personnel
    Object.keys(selectedPersonnelMap).forEach(personId => {
      if (selectedPersonnelMap[personId]) {
        const personDetails = currentAvailablePersonnel.find(p => p.id === personId);
        if (personDetails) {
          const existingEntryIndex = currentFormKeyPersonnel.findIndex(kp => kp.personnelId === personId);
          if (existingEntryIndex > -1) {
            newKeyPersonnelArray.push(currentFormKeyPersonnel[existingEntryIndex]); // Keep existing role
          } else {
            newKeyPersonnelArray.push({
              personnelId: personDetails.id,
              name: personDetails.name,
              projectRole: "", // Default to empty, user will select
            });
            changed = true;
          }
        }
      }
    });

    // Check if anything was actually removed
    if (newKeyPersonnelArray.length !== currentFormKeyPersonnel.length) {
      changed = true;
    } else {
      // Check if content differs if lengths are same
      for (let i = 0; i < newKeyPersonnelArray.length; i++) {
        const newKp = newKeyPersonnelArray[i];
        const currentKp = currentFormKeyPersonnel.find(kp => kp.personnelId === newKp.personnelId);
        if (!currentKp || newKp.projectRole !== currentKp.projectRole) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      setValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedPersonnelMap, currentAvailablePersonnel, getValues, setValue]);


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

  const handleAddNewPersonnelToRosterDialog = (newPersonnel: WizardAvailablePersonnel) => {
    const newPersonForStep2: Step2AvailablePersonnel = {
        ...newPersonnel,
        personnelId: newPersonnel.id, // Map id to personnelId for KeyPersonnel consistency
        projectRole: "" // Initialize projectRole
    };
    setCurrentAvailablePersonnel(prev => [...prev, newPersonForStep2]);
    const currentMap = getValues("selectedPersonnelMap") || {};
    currentMap[newPersonnel.id] = true; // Automatically select them
    setValue("selectedPersonnelMap", currentMap , { shouldValidate: true, shouldDirty: true });
  };

  const handleNextStep = async () => {
    let isValidStep = false;
    clearErrors(); 

    if (currentStep === 1) {
      isValidStep = await trigger(["name", "startDate", "endDate", "status", "organizationId"]);
      if (!isValidStep) {
        toast({ title: "Core Details Incomplete", description: "Please fill all required fields for Step 1, including Organization.", variant: "destructive" });
        return;
      }
    } else if (currentStep === 2) {
        // Validation for keyPersonnel roles
        const keyPersonnelValues = getValues("keyPersonnel") || [];
        if (keyPersonnelValues.length > 0) {
            isValidStep = await trigger("keyPersonnel"); // This will use Zod schema
            if (!isValidStep) {
                 toast({
                    title: "Missing Roles",
                    description: "Please assign a project role to all selected key personnel.",
                    variant: "destructive",
                });
                return; // Stop if roles are missing for selected personnel
            }
        } else {
            isValidStep = true; // No personnel selected, so no roles to validate
             trigger("keyPersonnel"); // Clear any previous errors if list is now empty
        }

    } else if (currentStep === 3) {
      isValidStep = await trigger("location"); // Zod schema will validate if it's optional or not
    } else {
      isValidStep = true;
    }

    if (isValidStep) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
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
    };

    const currentUserId = "user_admin_demo"; 

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
          <p className="text-3xl font-bold tracking-tight">New Project Setup Wizard</p>
          <p className="text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}: Guiding you through project creation.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Exit
        </Button>
      </div>

      <Progress value={progressValue} className="w-full mb-4" />

      <AddPersonnelToRosterDialog
        isOpen={isAddPersonnelDialogOpen}
        onOpenChange={setIsAddPersonnelDialogOpen}
        onPersonnelAdded={handleAddNewPersonnelToRosterDialog}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          {currentStep === 1 && (
            <>
              <CardHeader>
                <p className="text-lg font-semibold">Step 1: Core Project Details</p> 
                <div className="text-sm text-muted-foreground">Basic information for your new project.</div> 
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="organizationId">Organization <span className="text-destructive">*</span></Label>
                    <Controller
                      name="organizationId"
                      control={control}
                      render={({ field }) => (
                        <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isLoadingOrganizations || (globalSelectedOrgId !== ALL_ORGANIZATIONS_ID && !!globalSelectedOrgId)}
                        >
                          <SelectTrigger className={errors.organizationId ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select organization for this project" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org: Organization) => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                             {organizations.length === 0 && <p className="p-2 text-xs text-muted-foreground">No organizations available.</p>}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.organizationId && <p className="text-xs text-destructive mt-1">{errors.organizationId.message}</p>}
                     {globalSelectedOrgId && globalSelectedOrgId !== ALL_ORGANIZATIONS_ID && (
                         <p className="text-xs text-muted-foreground mt-1">Project will be assigned to your currently selected organization: {organizations.find(o => o.id === globalSelectedOrgId)?.name}</p>
                     )}
                  </div>
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
                  <p className="text-lg font-semibold flex items-center gap-2"><Users className="h-6 w-6" />Step 2: Assign Key Roles & Personnel</p> 
                  <div className="text-sm text-muted-foreground">Select team members and their project-specific roles.</div> 
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsAddPersonnelDialogOpen(true)} className="shrink-0 mt-2 sm:mt-0">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New to Roster
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Available Team Members:</Label>
                <ScrollArea className="h-72 w-full rounded-none border p-3">
                  {currentAvailablePersonnel.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No personnel in roster. Add some first using the button above.</p>}
                  {currentAvailablePersonnel.map((person) => {
                    const isSelected = !!selectedPersonnelMap?.[person.id];
                    const keyPersonnelEntryIndex = watchedKeyPersonnel.findIndex(kp => kp.personnelId === person.id);
                    
                    return (
                      <div key={person.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2.5 rounded-none hover:bg-muted/50 min-h-[48px] border-b last:border-b-0">
                        <div className="flex items-center flex-shrink-0 mb-2 sm:mb-0">
                          <Checkbox
                            id={`wizard-person-select-${person.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const newMap = { ...(getValues("selectedPersonnelMap") || {}) };
                              newMap[person.id] = !!checked;
                              setValue("selectedPersonnelMap", newMap , { shouldValidate: true, shouldDirty: true });
                            }}
                            className="mr-2.5"
                          />
                          <Label htmlFor={`wizard-person-select-${person.id}`} className="font-normal sm:w-40 truncate" title={person.name}>
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
                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={!person.capabilities || person.capabilities.length === 0}>
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
                                      <SelectItem value="" disabled>No capabilities defined</SelectItem>
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
                            <p className="text-xs text-muted-foreground italic w-full text-center sm:text-left sm:w-60 sm:ml-auto">Processing selection...</p>
                         )}
                      </div>
                    );
                  })}
                </ScrollArea>
                 <p className="text-xs text-muted-foreground">
                  Select personnel to add them to this project. Then, choose their specific role for this project from their capabilities. A role must be assigned for each selected member before proceeding.
                </p>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader>
                <p className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-6 w-6" />Step 3: Set Project Location</p> 
                <div className="text-sm text-muted-foreground">Specify the primary location or venue for this project. (Optional)</div> 
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
                    Start typing for address suggestions. Google Maps Autocomplete integration is symbolic and requires API key setup.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 4 && (
            <>
              <CardHeader>
                <p className="text-lg font-semibold">Step 4: Review & Create Project</p> 
                <div className="text-sm text-muted-foreground">Please review the project details below before creating.</div> 
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
              <Button type="button" variant="accent" onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button type="submit" variant="accent" disabled={!isFormOverallValid}>
                <CheckCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
