
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
import { ArrowLeft, ArrowRight, CheckCircle, Users, MapPin, PlusCircle, UserPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

// Updated type for local use in this wizard
type WizardAvailablePersonnel = {
  id: string;
  name: string;
  capabilities: string[];
};

// Initial mock data for available personnel with capabilities
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
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(), // For managing checkboxes for personnel selection
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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [currentAvailablePersonnel, setCurrentAvailablePersonnel] = useState<WizardAvailablePersonnel[]>(initialAvailablePersonnelList);
  const [isAddPersonnelDialogOpen, setIsAddPersonnelDialogOpen] = useState(false);
  const [newPersonnelName, setNewPersonnelName] = useState("");
  const [newPersonnelCapabilities, setNewPersonnelCapabilities] = useState<Record<string, boolean>>({});
  const [notifyTeam, setNotifyTeam] = useState(true); // State for the notification checkbox

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
      location: "",
      keyPersonnel: [],
      selectedPersonnelMap: {},
    },
  });

  const selectedPersonnelMap = watch("selectedPersonnelMap", {});
  const watchedKeyPersonnel = watch("keyPersonnel", []);

  useEffect(() => {
    const currentKeyPersonnelInForm = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];

    currentAvailablePersonnel.forEach(person => {
      if (selectedPersonnelMap?.[person.id]) {
        const existingEntry = currentKeyPersonnelInForm.find(kp => kp.personnelId === person.id);
        newKeyPersonnelArray.push({
          personnelId: person.id,
          name: person.name,
          projectRole: existingEntry?.projectRole || "",
        });
      }
    });
    
    const currentKeyPersonnelString = JSON.stringify(currentKeyPersonnelInForm.map(kp => ({p: kp.personnelId, r: kp.projectRole})).sort((a,b) => a.p.localeCompare(b.p)));
    const newKeyPersonnelString = JSON.stringify(newKeyPersonnelArray.map(kp => ({p: kp.personnelId, r: kp.projectRole})).sort((a,b) => a.p.localeCompare(b.p)));

    if (newKeyPersonnelString !== currentKeyPersonnelString) {
      setValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedPersonnelMap, getValues, setValue, currentAvailablePersonnel]);


  useEffect(() => {
    if (currentStep === 3 && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places && locationInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ["address"],
        }
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
      toast({ title: "Error", description: "Please select at least one capability for the new team member.", variant: "destructive" });
      return;
    }

    const newId = `user_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPerson: WizardAvailablePersonnel = {
      id: newId,
      name: newPersonnelName.trim(),
      capabilities: selectedCapabilities,
    };

    setCurrentAvailablePersonnel(prev => [...prev, newPerson]);

    // Automatically select the newly added person for the project
    const currentMap = getValues("selectedPersonnelMap") || {};
    setValue("selectedPersonnelMap", { ...currentMap, [newId]: true }, { shouldDirty: true });

    toast({ title: "Team Member Added", description: `${newPerson.name} added to roster and selected for this project.` });
    setIsAddPersonnelDialogOpen(false);
    setNewPersonnelName("");
    setNewPersonnelCapabilities({});
  };


  const handleNextStep = async () => {
    let isValidStep = false;

    if (currentStep === 1) {
      isValidStep = await trigger(["name", "startDate", "endDate", "status"]);
    } else if (currentStep === 2) {
      const keyPersonnelValues = getValues("keyPersonnel") || [];
      if (keyPersonnelValues.length > 0) {
        isValidStep = await trigger("keyPersonnel"); // Zod schema ensures projectRole is present
        if (!isValidStep) {
          toast({
            title: "Missing Roles",
            description: "Please assign a project role to all selected key personnel.",
            variant: "destructive",
          });
        }
      } else {
        isValidStep = true; // No personnel selected, so this step is valid.
        if (errors.keyPersonnel) {
            clearErrors("keyPersonnel"); // Clear any previous errors if no one is selected
        }
      }
    } else if (currentStep === 3) {
      isValidStep = await trigger("location");
    } else {
      isValidStep = true;
    }

    if (isValidStep) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    } else if (currentStep === 1 && (errors.name || errors.startDate || errors.endDate || errors.status)) {
      toast({ title: "Core Details Incomplete", description: "Please fill all required fields for Step 1.", variant: "destructive" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit: SubmitHandler<ProjectWizardFormDataInternal> = (data) => {
    const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && kp.projectRole) || [];

    const projectDataToSubmit: ProjectContextInputData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
      status: data.status,
      location: data.location,
      keyPersonnel: finalKeyPersonnel,
    };

    const organizationId = "org_default_demo"; // Placeholder for actual org ID from auth context
    const userId = "user_admin_demo"; // Placeholder for actual user ID from auth context

    addProject(projectDataToSubmit, organizationId, userId);
    
    let toastMessage = `Project "${data.name}" has been successfully created.`;
    if (notifyTeam && finalKeyPersonnel.length > 0) {
      console.log("SIMULATING: Sending project creation notifications to team members:", finalKeyPersonnel.map(p => p.name).join(", "));
      // In a real app, you would trigger an API call here to send emails/notifications.
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

      {/* Dialog for Adding New Personnel to Roster */}
      <Dialog open={isAddPersonnelDialogOpen} onOpenChange={setIsAddPersonnelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Team Member to Roster</DialogTitle>
            <DialogDescription>
              Define the new team member's name and their general capabilities. They will be added to the available personnel list for future projects as well.
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
              setIsAddPersonnelDialogOpen(false);
              setNewPersonnelName("");
              setNewPersonnelCapabilities({});
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
                <CardDescription>Let's start with the basic information for your new project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
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
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
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
                  <CardDescription>Select team members for this project and assign their project-specific roles from their capabilities.</CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsAddPersonnelDialogOpen(true)} className="shrink-0 mt-2 sm:mt-0">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New to Roster
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Available Team Members:</Label>
                <ScrollArea className="h-72 w-full rounded-md border p-3">
                  {currentAvailablePersonnel.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No personnel available. Add some to the roster.</p>}
                  {currentAvailablePersonnel.map((person, personIndex) => {
                    const isSelected = !!selectedPersonnelMap?.[person.id];
                    const keyPersonnelEntryIndex = watchedKeyPersonnel.findIndex(kp => kp.personnelId === person.id);

                    return (
                      <div key={person.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors min-h-[40px] border-b last:border-b-0">
                        <div className="flex items-center flex-shrink-0">
                          <Checkbox
                            id={`person-select-${person.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentMap = getValues("selectedPersonnelMap") || {};
                              const newMap = { ...currentMap, [person.id]: !!checked };
                              setValue("selectedPersonnelMap", newMap, { shouldDirty: true });
                            }}
                            className="mr-2"
                          />
                          <Label htmlFor={`person-select-${person.id}`} className="font-normal sm:w-40 truncate" title={person.name}>
                            {person.name}
                          </Label>
                        </div>

                        {isSelected && (
                          <div className="w-full sm:w-60 sm:ml-auto">
                            {keyPersonnelEntryIndex !== -1 && watchedKeyPersonnel[keyPersonnelEntryIndex] ? (
                                <Controller
                                  name={`keyPersonnel.${keyPersonnelEntryIndex}.projectRole`}
                                  control={control}
                                  defaultValue=""
                                  render={({ field }) => (
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ""}
                                    >
                                      <SelectTrigger
                                        className={errors.keyPersonnel?.[keyPersonnelEntryIndex]?.projectRole ? "border-destructive h-9" : "h-9"}
                                      >
                                        <SelectValue placeholder="Select role for project..." />
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
                            ) : (
                              <span className="text-xs text-muted-foreground italic w-full text-center sm:text-left">Loading role assignment...</span>
                            )}
                            {errors.keyPersonnel?.[keyPersonnelEntryIndex]?.projectRole && (
                              <p className="text-xs text-destructive mt-1">
                                {errors.keyPersonnel[keyPersonnelEntryIndex]?.projectRole?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
                 <p className="text-xs text-muted-foreground">
                  Select personnel to add them to this project. Then, choose their specific role for this project from their capabilities. If a team member isn't listed, use "Add New to Roster".
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
                    Start typing to see address suggestions. (Google Maps Autocomplete requires API key and setup).
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle>Step 4: Review &amp; Create Project</CardTitle>
                <CardDescription>Please review the project details below before creating.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Project Name:</h3>
                  <p className="text-lg font-semibold">{getValues("name")}</p>
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
                    <h3 className="text-sm font-medium text-muted-foreground">Key Personnel &amp; Roles:</h3>
                    <ul className="list-disc list-inside pl-4 mt-1">
                      {watchedKeyPersonnel.map(kp => (
                        <li key={kp.personnelId} className="text-sm">{kp.name}: <span className="font-semibold">{kp.projectRole || "N/A"}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No key personnel assigned for this project.</p>
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
            {currentStep === 1 && <div />} {/* Placeholder to keep layout consistent */}

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
