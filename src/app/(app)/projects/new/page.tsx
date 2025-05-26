
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
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type KeyPersonnel } from "@/contexts/ProjectContext";
import { ArrowLeft, ArrowRight, CheckCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
// import { useUser } from '@/contexts/UserContext'; // Hypothetical UserContext

// Mock available personnel for the wizard
// TODO: In a multi-tenant app, this list should be fetched for the current user's organization.
const availablePersonnelList = [
  { id: "user001", name: "Alice Wonderland" },
  { id: "user002", name: "Bob The Builder" },
  { id: "user003", name: "Charlie Chaplin" },
  { id: "user004", name: "Diana Prince" },
  { id: "user005", name: "Edward Scissorhands" },
  { id: "user006", name: "Fiona Gallagher" },
  { id: "user007", name: "George Jetson" },
];

const keyPersonnelSchema = z.object({
  personnelId: z.string(),
  name: z.string(), // Name is included for easier display in review step
  projectRole: z.string().min(1, "Role is required.").max(50, "Role too long"),
});

const projectWizardSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelSchema).optional(),
  // For internal form state for selecting personnel before assigning roles
  selectedPersonnelMap: z.record(z.boolean()).optional(),
});

// This type is what the form produces.
type ProjectWizardFormDataInternal = z.infer<typeof projectWizardSchema>;

// This type aligns with what ProjectContext's addProject expects (excluding system-managed IDs)
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

  // const { user } = useUser(); // Hypothetical: To get current user's orgId and userId

  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors, isValid: isFormOverallValid }, // isValid here refers to the whole form
  } = useForm<ProjectWizardFormDataInternal>({
    resolver: zodResolver(projectWizardSchema),
    mode: "onChange", // "onChange" or "onBlur" for more responsive validation feedback
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "keyPersonnel",
  });

  const selectedPersonnelMap = watch("selectedPersonnelMap");

  useEffect(() => {
    if (!selectedPersonnelMap) return;

    const currentKeyPersonnelIds = fields.map(f => f.personnelId);

    // Add new selections to keyPersonnel if they are checked in selectedPersonnelMap
    // and not already in the keyPersonnel array
    availablePersonnelList.forEach(person => {
      if (selectedPersonnelMap[person.id] && !currentKeyPersonnelIds.includes(person.id)) {
        append({ personnelId: person.id, name: person.name, projectRole: "" });
      }
    });

    // Remove personnel from keyPersonnel if they are unchecked in selectedPersonnelMap
    const personnelToRemoveIndices: number[] = [];
    fields.forEach((field, index) => {
      if (!selectedPersonnelMap[field.personnelId]) {
        personnelToRemoveIndices.push(index);
      }
    });
    // Iterate backwards to avoid index shifting issues when removing
    for (let i = personnelToRemoveIndices.length - 1; i >= 0; i--) {
      remove(personnelToRemoveIndices[i]);
    }
  }, [selectedPersonnelMap, fields, append, remove, availablePersonnelList]);


  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ProjectWizardFormDataInternal)[] = [];
    let isValidStep = false;

    if (currentStep === 1) {
      fieldsToValidate = ["name", "startDate", "endDate", "status"];
      isValidStep = await trigger(fieldsToValidate);
    } else if (currentStep === 2) {
      const keyPersonnelValues = getValues("keyPersonnel");
      let allRolesValid = true;
      if (keyPersonnelValues && keyPersonnelValues.length > 0) {
        keyPersonnelValues.forEach((kp, index) => {
          if (!kp.projectRole || kp.projectRole.trim() === "") {
            control.setError(`keyPersonnel.${index}.projectRole`, { type: "manual", message: "Role is required." });
            allRolesValid = false;
          } else {
            control.clearErrors(`keyPersonnel.${index}.projectRole`);
          }
        });
      }
      if (!allRolesValid) {
         toast({
          title: "Missing Information",
          description: "Please assign a role to all selected key personnel.",
          variant: "destructive",
        });
        return; // Stop if roles are missing for selected personnel
      }
      // If allRolesValid is true, then we can proceed with Zod validation for the array structure itself
      isValidStep = await trigger("keyPersonnel"); // Zod validates min length for roles here
    } else if (currentStep === 3) {
      // Location is optional, description is optional.
      // We might still want to trigger validation if specific rules apply (e.g. URL format if it was a URL)
      // For now, simple text fields don't need explicit trigger unless they have minLength etc.
      // However, to be safe and consistent:
      fieldsToValidate.push("location"); // Add other fields if they exist and need validation
      isValidStep = await trigger(fieldsToValidate); 
    }


    if (isValidStep) {
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === 1 && errors.name) { // Example: specific toast for common step 1 error
        toast({ title: "Core Details Incomplete", description: errors.name.message || "Please fill all required fields.", variant: "destructive" });
    } else if (currentStep === 2 && errors.keyPersonnel && errors.keyPersonnel.length > 0) {
         // Zod error messages are usually displayed inline by RHF.
         // This toast is a fallback or general notification.
        toast({ title: "Role Assignment Incomplete", description: "Please ensure all selected personnel have a valid role assigned.", variant: "destructive" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit: SubmitHandler<ProjectWizardFormDataInternal> = (data) => {
    // Filter out keyPersonnel where personnelId might be empty OR role is empty for selected ones (though role validation should prevent this)
    // The main filtering is ensuring only those intended (implicitly, those who were ever selected) are passed.
    // Since `keyPersonnel` array now only contains those selected via `selectedPersonnelMap`, we just ensure roles are not empty.
    const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.projectRole && kp.projectRole.trim() !== "") || [];

    const projectDataToSubmit: ProjectContextInputData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
      status: data.status,
      location: data.location,
      keyPersonnel: finalKeyPersonnel,
    };

    // TODO: Replace with actual organizationId and userId from logged-in user context
    const organizationId = "org_default_demo"; // Placeholder for current user's org
    const userId = "user_admin_demo"; // Placeholder for current user

    addProject(projectDataToSubmit, organizationId, userId);
    toast({
      title: "Project Created!",
      description: `Project "${data.name}" has been successfully created.`,
    });
    router.push("/projects");
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
                  <Textarea id="description" {...register("description")} placeholder="Provide a brief overview of the project."/>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-accent" />Step 2: Assign Key Roles & Personnel</CardTitle>
                <CardDescription>Select team members for this project and assign their project-specific roles. (Optional)</CardDescription>
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
                            setValue(`selectedPersonnelMap.${person.id}`, !!checked, { shouldValidate: true });
                          }}
                        />
                        <Label htmlFor={`person-select-${person.id}`} className="font-normal">{person.name}</Label>
                      </div>
                    ))}
                </ScrollArea>

                {fields.length > 0 && <Label>Assign Roles to Selected Personnel:</Label>}
                <ScrollArea className="h-48 w-full space-y-3">
                    {fields.map((field, index) => (
                        // This check 'selectedPersonnelMap?.[field.personnelId]' is actually redundant
                        // because 'fields' itself is derived from selected personnel.
                        // However, it doesn't hurt.
                      selectedPersonnelMap?.[field.personnelId] && ( 
                        <div key={field.id} className="grid grid-cols-3 items-center gap-3 p-2 border rounded-md bg-muted/20">
                          <Label htmlFor={`keyPersonnel.${index}.projectRole`} className="col-span-1 truncate text-sm" title={field.name}>
                            {field.name}
                          </Label>
                          <div className="col-span-2">
                            <Input
                              id={`keyPersonnel.${index}.projectRole`}
                              placeholder="e.g., Project Manager, Lead Camera"
                              {...register(`keyPersonnel.${index}.projectRole`)}
                              className={errors.keyPersonnel?.[index]?.projectRole ? "border-destructive" : ""}
                            />
                            {errors.keyPersonnel?.[index]?.projectRole && (
                              <p className="text-xs text-destructive mt-1">{errors.keyPersonnel?.[index]?.projectRole?.message}</p>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                </ScrollArea>
                 <p className="text-xs text-muted-foreground">
                    Only personnel with an assigned role will be saved to the project.
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
                  <Textarea id="location-description" placeholder="Any specific address details, notes about the venue, or logistical considerations for the location."/>
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
                {(getValues("keyPersonnel")?.filter(kp => kp.projectRole && kp.projectRole.trim() !== "").length || 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Key Personnel & Roles:</h3>
                    <ul className="list-disc list-inside pl-4 mt-1">
                      {getValues("keyPersonnel")?.filter(kp => kp.projectRole && kp.projectRole.trim() !== "").map(kp => (
                         <li key={kp.personnelId} className="text-sm">{kp.name}: <span className="font-semibold">{kp.projectRole}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                 {(getValues("keyPersonnel")?.filter(kp => kp.projectRole && kp.projectRole.trim() !== "").length === 0) && (
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
            {currentStep === 1 && <div />} {/* Placeholder to keep Next button to the right */}

            {currentStep < TOTAL_STEPS && (
              <Button type="button" onClick={handleNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button type="submit" disabled={!isFormOverallValid}> {/* isFormOverallValid might not be enough if step-specific validation is more granular */}
                <CheckCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

      