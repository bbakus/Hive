
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

// Enhanced available personnel list with capabilities
const availablePersonnelList: (KeyPersonnel & { capabilities: string[] })[] = [
  { id: "user001", name: "Alice Wonderland", capabilities: ["Director", "Producer", "Lead Camera Op"], personnelId: "user001", projectRole: "" },
  { id: "user002", name: "Bob The Builder", capabilities: ["Audio Engineer", "Grip", "Technical Director"], personnelId: "user002", projectRole: "" },
  { id: "user003", name: "Charlie Chaplin", capabilities: ["Producer", "Editor", "Writer"], personnelId: "user003", projectRole: "" },
  { id: "user004", name: "Diana Prince", capabilities: ["Drone Pilot", "Photographer", "Camera Operator"], personnelId: "user004", projectRole: "" },
  { id: "user005", name: "Edward Scissorhands", capabilities: ["Grip", "Set Designer", "Editor"], personnelId: "user005", projectRole: "" },
  { id: "user006", name: "Fiona Gallagher", capabilities: ["Coordinator", "Project Manager"], personnelId: "user006", projectRole: "" },
  { id: "user007", name: "George Jetson", capabilities: ["Tech Lead", "IT Support", "Streaming Engineer"], personnelId: "user007", projectRole: "" },
];

const keyPersonnelSchema = z.object({
  personnelId: z.string(),
  name: z.string(),
  projectRole: z.string().min(1, "Role is required.").max(100, "Role too long"),
});

const projectWizardSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelSchema).optional(),
  // This map tracks which personnel are CHECKED in the selection list
  selectedPersonnelMap: z.record(z.boolean()).optional(),
});

type ProjectWizardFormDataInternal = z.infer<typeof projectWizardSchema>;

type ProjectContextInputData = Omit<import('@/contexts/ProjectContext').ProjectFormData, 'organizationId' | 'createdByUserId'> & {
  location?: string;
  keyPersonnel?: KeyPersonnel[]; // This is the type from ProjectContext
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
      keyPersonnel: [], // This array will hold { personnelId, name, projectRole } for selected personnel
      selectedPersonnelMap: {}, // Tracks checkbox state: { "user001": true, "user002": false }
    },
  });

  const selectedPersonnelMap = watch("selectedPersonnelMap");
  const watchedKeyPersonnel = watch("keyPersonnel"); // Watch for rendering updates

  // Effect to synchronize keyPersonnel array with selectedPersonnelMap
  useEffect(() => {
    if (selectedPersonnelMap === undefined) return;

    const newKeyPersonnelArray: KeyPersonnel[] = [];
    const currentKeyPersonnelInForm = getValues("keyPersonnel") || [];

    availablePersonnelList.forEach(person => {
      if (selectedPersonnelMap[person.id]) { // If person is checked
        const existingEntry = currentKeyPersonnelInForm.find(kp => kp.personnelId === person.id);
        newKeyPersonnelArray.push({
          personnelId: person.id,
          name: person.name,
          projectRole: existingEntry?.projectRole || "", // Preserve role if already set
        });
      }
    });
    
    // Only update if there's an actual change to avoid infinite loops
    if (JSON.stringify(newKeyPersonnelArray) !== JSON.stringify(currentKeyPersonnelInForm)) {
      setValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedPersonnelMap, getValues, setValue]);


  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ProjectWizardFormDataInternal)[] = [];
    let isValidStep = false;

    if (currentStep === 1) {
      fieldsToValidate = ["name", "startDate", "endDate", "status"];
      isValidStep = await trigger(fieldsToValidate);
    } else if (currentStep === 2) {
      const keyPersonnelValues = getValues("keyPersonnel") || [];
      let allRolesValid = true;
      if (keyPersonnelValues.length > 0) {
         // Validate roles ONLY for personnel who are currently in the keyPersonnel array
        for (let i = 0; i < keyPersonnelValues.length; i++) {
          const kp = keyPersonnelValues[i];
          if (!kp.projectRole || kp.projectRole.trim() === "") {
            control.setError(`keyPersonnel.${i}.projectRole`, { type: "manual", message: "Role is required." });
            allRolesValid = false;
          } else {
            control.clearErrors(`keyPersonnel.${i}.projectRole`);
          }
        }
      }
      // If not all roles are valid, show a toast and prevent proceeding
      if (!allRolesValid) {
        toast({
          title: "Missing Information",
          description: "Please assign a project role to all selected key personnel.",
          variant: "destructive",
        });
        return; 
      }
      // If all roles are valid (or no personnel selected), then trigger Zod validation for the keyPersonnel array itself.
      isValidStep = await trigger("keyPersonnel");

    } else if (currentStep === 3) {
      fieldsToValidate.push("location"); 
      isValidStep = await trigger(fieldsToValidate);
    } else { 
        isValidStep = true;
    }

    if (isValidStep) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    } else if (currentStep === 1 && errors.name) {
      toast({ title: "Core Details Incomplete", description: errors.name.message || "Please fill all required fields.", variant: "destructive" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit: SubmitHandler<ProjectWizardFormDataInternal> = (data) => {
    // Final keyPersonnel array is already correctly populated by the useEffect
    const finalKeyPersonnel = data.keyPersonnel || [];

    const projectDataToSubmit: ProjectContextInputData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
      status: data.status,
      location: data.location,
      keyPersonnel: finalKeyPersonnel,
    };

    // TODO: In a real app, get these from auth context
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
                <CardDescription>Select team members for this project and assign their project-specific roles from their capabilities. (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Select Team Members:</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-3 mb-4">
                  {availablePersonnelList.map((person) => (
                    <div key={person.id} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`person-select-${person.id}`}
                        checked={!!selectedPersonnelMap?.[person.id]}
                        onCheckedChange={(checked) => {
                          setValue(`selectedPersonnelMap.${person.id}`, !!checked, { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      <Label htmlFor={`person-select-${person.id}`} className="font-normal">{person.name}</Label>
                    </div>
                  ))}
                </ScrollArea>

                {(watchedKeyPersonnel && watchedKeyPersonnel.length > 0) && <Label>Assign Roles to Selected Personnel:</Label>}
                <ScrollArea className="h-48 w-full space-y-3">
                  {(watchedKeyPersonnel || []).map((kpMember, index) => {
                    // Find the full details for the person, including capabilities
                    const personDetails = availablePersonnelList.find(p => p.id === kpMember.personnelId);
                    if (!personDetails) return null; // Should not happen if data is consistent

                    return (
                      <div key={kpMember.personnelId} className="grid grid-cols-3 items-center gap-3 p-2 border rounded-md bg-muted/20">
                        <Label htmlFor={`keyPersonnel.${index}.projectRole`} className="col-span-1 truncate text-sm" title={personDetails.name}>
                          {personDetails.name}
                        </Label>
                        <div className="col-span-2">
                          <Controller
                            name={`keyPersonnel.${index}.projectRole`} // Correctly namespaced field
                            control={control}
                            defaultValue={kpMember.projectRole || ""} // Ensure Controller gets a default value
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value} // Controller handles value
                              >
                                <SelectTrigger className={errors.keyPersonnel?.[index]?.projectRole ? "border-destructive" : ""}>
                                  <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {personDetails.capabilities.map(capability => (
                                    <SelectItem key={capability} value={capability}>
                                      {capability}
                                    </SelectItem>
                                  ))}
                                  {personDetails.capabilities.length === 0 && (
                                      <SelectItem value="" disabled>No capabilities defined</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.keyPersonnel?.[index]?.projectRole && (
                            <p className="text-xs text-destructive mt-1">{errors.keyPersonnel?.[index]?.projectRole?.message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Message if no personnel currently in keyPersonnel array but some might be checked (i.e. waiting for useEffect sync) */}
                  {(!watchedKeyPersonnel || watchedKeyPersonnel.length === 0) && 
                    Object.values(selectedPersonnelMap || {}).some(isSelected => isSelected) && (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                        Loading selected personnel for role assignment...
                    </p>
                  )}
                  {/* Message if no personnel are checked via selectedPersonnelMap */}
                   {(!watchedKeyPersonnel || watchedKeyPersonnel.length === 0) &&
                    !Object.values(selectedPersonnelMap || {}).some(isSelected => isSelected) && (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                        Select team members from the list above to assign their project roles.
                    </p>
                  )}
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  Roles are required for all selected key personnel.
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
                <div className="space-y-2">
                  <Label htmlFor="location-description">Further Location Details (Optional)</Label>
                  <Textarea id="location-description" placeholder="Any specific address details, notes about the venue, or logistical considerations for the location." />
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
                {(getValues("keyPersonnel")?.length || 0) > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Key Personnel &amp; Roles:</h3>
                    <ul className="list-disc list-inside pl-4 mt-1">
                      {getValues("keyPersonnel")?.map(kp => (
                        <li key={kp.personnelId} className="text-sm">{kp.name}: <span className="font-semibold">{kp.projectRole}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No key personnel assigned with roles for this project.</p>
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
            {currentStep === 1 && <div />} 

            {currentStep < TOTAL_STEPS && (
              <Button type="button" onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button type="submit" disabled={!isFormOverallValid && !(Object.keys(errors).length === 0)}> 
                <CheckCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

    