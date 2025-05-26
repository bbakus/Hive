
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type KeyPersonnel } from "@/contexts/ProjectContext";
import { ArrowLeft, ArrowRight, CheckCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Updated type for local use in this wizard
type WizardAvailablePersonnel = {
  id: string;
  name: string;
  capabilities: string[];
};

// Mock data for available personnel with capabilities
const availablePersonnelList: WizardAvailablePersonnel[] = [
  { id: "user001", name: "Alice Wonderland", capabilities: ["Director", "Producer", "Lead Camera Op"] },
  { id: "user002", name: "Bob The Builder", capabilities: ["Audio Engineer", "Grip", "Technical Director"] },
  { id: "user003", name: "Charlie Chaplin", capabilities: ["Producer", "Editor", "Writer"] },
  { id: "user004", name: "Diana Prince", capabilities: ["Drone Pilot", "Photographer", "Camera Operator"] },
  { id: "user005", name: "Edward Scissorhands", capabilities: ["Grip", "Set Designer", "Editor"] },
  { id: "user006", name: "Fiona Gallagher", capabilities: ["Coordinator", "Project Manager"] },
  { id: "user007", name: "George Jetson", capabilities: ["Tech Lead", "IT Support", "Streaming Engineer"] },
];

const keyPersonnelSchema = z.object({
  personnelId: z.string(),
  name: z.string(), // Store name for convenience in review step
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
  selectedPersonnelMap: z.record(z.boolean()).optional(), // For checkbox state
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
    mode: "onChange", // "onChange" is good for immediate feedback
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

  const selectedPersonnelMap = watch("selectedPersonnelMap", {}); // Watched value
  const watchedKeyPersonnel = watch("keyPersonnel", []); // Watched value for keyPersonnel

  // Sync selectedPersonnelMap with the keyPersonnel array in the form state
  useEffect(() => {
    const currentKeyPersonnelInForm = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];

    availablePersonnelList.forEach(person => {
      if (selectedPersonnelMap?.[person.id]) { // If this person is checked
        const existingEntry = currentKeyPersonnelInForm.find(kp => kp.personnelId === person.id);
        newKeyPersonnelArray.push({
          personnelId: person.id,
          name: person.name,
          projectRole: existingEntry?.projectRole || "", // Preserve existing role or default to empty
        });
      }
    });
    
    // Only update if the array content has actually changed to prevent potential infinite loops
    if (JSON.stringify(newKeyPersonnelArray) !== JSON.stringify(currentKeyPersonnelInForm)) {
      setValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedPersonnelMap, getValues, setValue]);


  const handleNextStep = async () => {
    let isValidStep = false;

    if (currentStep === 1) {
      isValidStep = await trigger(["name", "startDate", "endDate", "status"]);
    } else if (currentStep === 2) {
      const keyPersonnelValues = getValues("keyPersonnel") || [];
      if (keyPersonnelValues.length > 0) {
        // Trigger Zod validation for the entire keyPersonnel array
        // This will check min(1, "Role is required.") for each projectRole
        isValidStep = await trigger("keyPersonnel");
        if (!isValidStep) {
          toast({
            title: "Missing Roles",
            description: "Please assign a project role to all selected key personnel.",
            variant: "destructive",
          });
        }
      } else {
        isValidStep = true; // No personnel selected, step is valid.
        // Clear any previous errors for keyPersonnel if the list is now empty
        if (errors.keyPersonnel) {
            clearErrors("keyPersonnel");
        }
      }
    } else if (currentStep === 3) {
      // Location is optional, so it should always be valid unless specific rules are added
      isValidStep = await trigger("location"); 
    } else { // Step 4 (Review)
      isValidStep = true; 
    }

    if (isValidStep) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    } else if (currentStep === 1 && (errors.name || errors.startDate || errors.endDate || errors.status)) {
      // This specific toast for step 1 can be removed if generic "trigger" failure is enough
      toast({ title: "Core Details Incomplete", description: "Please fill all required fields for Step 1.", variant: "destructive" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit: SubmitHandler<ProjectWizardFormDataInternal> = (data) => {
    // Ensure keyPersonnel only includes those actively selected and with roles.
    // The Zod schema validation should already enforce role presence if person is in keyPersonnel.
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

    // TODO: Get these from actual authenticated user context in a real app
    const organizationId = "org_default_demo"; 
    const userId = "user_admin_demo"; 

    addProject(projectDataToSubmit, organizationId, userId);
    toast({
      title: "Project Created!",
      description: `Project "${data.name}" has been successfully created.`,
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-accent" />Step 2: Assign Key Roles &amp; Personnel</CardTitle>
                <CardDescription>Select team members for this project and assign their project-specific roles from their capabilities. Roles are required for selected personnel. (Optional step if no personnel are assigned to the project)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Select Team Members & Assign Roles:</Label>
                <ScrollArea className="h-72 w-full rounded-md border p-3 space-y-1">
                  {availablePersonnelList.map((person) => {
                    const isSelected = !!selectedPersonnelMap?.[person.id];
                    // Find the index of this person in the watchedKeyPersonnel array
                    // This is crucial for binding the Controller to the correct field path
                    const keyPersonnelEntryIndex = watchedKeyPersonnel.findIndex(kp => kp.personnelId === person.id);

                    return (
                      <div key={person.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors min-h-[40px]">
                        <Checkbox
                          id={`person-select-${person.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            // Update the entire selectedPersonnelMap object to ensure useEffect triggers reliably
                            const currentMap = getValues("selectedPersonnelMap") || {};
                            const newMap = { ...currentMap, [person.id]: !!checked };
                            setValue("selectedPersonnelMap", newMap, { shouldDirty: true }); 
                            // useEffect will handle updating keyPersonnel array and validation will trigger on "Next"
                          }}
                        />
                        <Label htmlFor={`person-select-${person.id}`} className="font-normal flex-grow w-40 truncate" title={person.name}>
                          {person.name}
                        </Label>
                        
                        {isSelected && (
                          <div className="w-60">
                            {/* Only render Controller if the person exists in watchedKeyPersonnel (i.e., form state) */}
                            {keyPersonnelEntryIndex !== -1 && watchedKeyPersonnel[keyPersonnelEntryIndex] ? (
                              <>
                                <Controller
                                  name={`keyPersonnel.${keyPersonnelEntryIndex}.projectRole`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ""} // Ensure controlled component
                                    >
                                      <SelectTrigger 
                                        className={errors.keyPersonnel?.[keyPersonnelEntryIndex]?.projectRole ? "border-destructive" : ""}
                                      >
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
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Loading role...</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
                 <p className="text-xs text-muted-foreground">
                  If key personnel are selected, their roles are required to proceed. This step is optional if no personnel are being assigned.
                </p>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle>Step 3: Set Project Location</CardTitle>
                <CardDescription>Specify the primary location or venue for this project. (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="location">Project Location</Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="e.g., City Conference Center, Remote, Multiple Venues"
                    className={errors.location ? "border-destructive" : ""}
                  />
                  {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
                </div>
                {/* Placeholder for more detailed location notes, can be uncommented and schema updated if needed
                <div className="space-y-2">
                  <Label htmlFor="location-description">Further Location Details (Optional)</Label>
                  <Textarea id="location-description" placeholder="Any specific address details, notes about the venue, or logistical considerations for the location." />
                </div>
                */}
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
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between border-t pt-6 mt-6">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            )}
            {currentStep === 1 && <div />} {/* Placeholder to keep Next button on the right */}

            {currentStep < TOTAL_STEPS && (
              <Button type="button" onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button type="submit" disabled={!isFormOverallValid}> {/* Rely on overall form validity for the final step */}
                <CheckCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
    
