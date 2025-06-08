
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, User, CheckCircle, Edit3, RotateCcw, Inbox, Palette, GalleryThumbnails, UserCheck, UploadCloud, PlusCircle, Settings, Download, Filter as FilterIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { RevisionRequestDialog } from "@/components/modals/RevisionRequestDialog";
import { IngestionReportDialog } from "@/components/modals/IngestionReportDialog";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEventContext } from "@/contexts/EventContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { type Personnel, PHOTOGRAPHY_ROLES } from "@/app/(app)/personnel/page";
import { useRouter } from "next/navigation"; // Added for reportUrl navigation

type Editor = { id: string; name: string };
export type TaskStatus = 'ingestion' | 'culling' | 'color' | 'review' | 'completed';

interface KanbanTask {
  id: string;
  title: string;
  content: string;
  status: TaskStatus;
  assignedEditorId?: string | null;
  lastActivity?: string;
  eventName?: string;
  photographerName?: string;
  ingestionJobId?: string;
  reportUrl?: string;
  sourceEventId?: string; // To link back to the original event
}

interface KanbanColumnDef {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
}

const MOCK_EDITORS: Editor[] = [
  { id: 'editor1', name: 'Alice Editor' },
  { id: 'editor2', name: 'Bob Retoucher' },
  { id: 'editor_current_user', name: 'Charlie CurrentUser' },
];

const MOCK_CURRENT_USER_ID = 'editor_current_user';

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'ingestion', title: 'Ingestion Queue', icon: Inbox },
  { id: 'culling', title: 'Culling', icon: GalleryThumbnails },
  { id: 'color', title: 'Color Treatment', icon: Palette },
  { id: 'review', title: 'Review', icon: UserCheck },
  { id: 'completed', title: 'Completed', icon: CheckCircle },
];

const REVISION_TARGET_STAGES: { value: TaskStatus; label: string }[] = [
  { value: 'culling', label: 'Culling' },
  { value: 'color', label: 'Color Treatment' },
];

const taskStatusFilterOptions: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Task Statuses" },
  ...KANBAN_COLUMNS.map(col => ({ value: col.id, label: col.title }))
];

export default function PostProductionPage() {
  const { eventsForSelectedProjectAndOrg, isLoadingEvents, getShotRequestsForEvent } = useEventContext();
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const router = useRouter();

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [revisionTaskDetails, setRevisionTaskDetails] = useState<{ taskId: string; taskTitle: string; currentAssigneeId?: string | null } | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentReportUrl, setCurrentReportUrl] = useState<string | undefined>(undefined);

  const [filterTaskStatus, setFilterTaskStatus] = useState<TaskStatus | "all">("all");
  const [filterAssignedEditorId, setFilterAssignedEditorId] = useState<string>("all");
  const [filterOnlyMyTasks, setFilterOnlyMyTasks] = useState(false);
  const [filterHideCompleted, setFilterHideCompleted] = useState(false);

  const getPersonnelName = (personnelId?: string): string => {
    if (!personnelId) return "N/A";
    // Note: initialPersonnelMock was removed. Need to fetch actual personnel data.
    return "Unknown (Personnel Data Needed)";
  };

  useEffect(() => {
    if (isLoadingEvents || isLoadingProjects || isLoadingSettings) {
      setTasks([]);
      return;
    }
    
    const eventDerivedStatuses: TaskStatus[] = ['ingestion', 'culling', 'color'];

    const derivedTasks: KanbanTask[] = eventsForSelectedProjectAndOrg
      .filter(event => event.isCovered)
      .map((event, index) => {
        let photographerDisplay = "N/A";
        const photoPersonnelIds = event.assignedPersonnelIds?.filter(pid => {
            const p = initialPersonnelMock.find(person => person.id === pid);
            return p && PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role !== "Client";
        }) || [];

        if (photoPersonnelIds.length === 1) {
          photographerDisplay = getPersonnelName(photoPersonnelIds[0]);
        } else if (photoPersonnelIds.length > 1) {
          photographerDisplay = `${getPersonnelName(photoPersonnelIds[0])} & Team`;
        }
        
        const shotsForEvent = getShotRequestsForEvent(event.id);
        const shotCount = shotsForEvent.length;

        const initialStatus = eventDerivedStatuses[index % eventDerivedStatuses.length];
        let initialActivity = "";
        switch(initialStatus) {
            case 'ingestion': initialActivity = `Awaiting culling (from event: ${event.name})`; break;
            case 'culling': initialActivity = `Awaiting color treatment (from event: ${event.name})`; break;
            case 'color': initialActivity = `Awaiting review (from event: ${event.name})`; break;
            default: initialActivity = `Task created for event: ${event.name}`;
        }


        return {
          id: `event-task-${event.id}`,
          title: event.name,
          content: `${shotCount} shots`,
          status: initialStatus,
          assignedEditorId: null, // Keep null initially
          lastActivity: initialActivity,
          eventName: `${event.project} - ${event.name}`,
          photographerName: photographerDisplay,
          ingestionJobId: `event-ingest-${event.id}`,
          reportUrl: `/events/${event.id}/shots`, // Link to event's shot list page
          sourceEventId: event.id,
        };
      });
    
    setTasks(prevTasks => {
      const simulatedTasks = prevTasks.filter(pt => pt.id.startsWith('task_sim_'));
      return [...derivedTasks, ...simulatedTasks];
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsForSelectedProjectAndOrg, isLoadingEvents, isLoadingProjects, isLoadingSettings, selectedProject, getShotRequestsForEvent]);


  const getEditorName = (editorId?: string | null) => {
    if (!editorId) return null;
    return MOCK_EDITORS.find(e => e.id === editorId)?.name || 'Unknown Editor';
  };

  const filteredTasks = useMemo(() => {
    let currentTasks = [...tasks];
    if (filterTaskStatus !== "all") {
      currentTasks = currentTasks.filter(task => task.status === filterTaskStatus);
    }
    if (filterAssignedEditorId !== "all") {
      if (filterAssignedEditorId === "unassigned") {
        currentTasks = currentTasks.filter(task => !task.assignedEditorId);
      } else {
        currentTasks = currentTasks.filter(task => task.assignedEditorId === filterAssignedEditorId);
      }
    }
    if (filterOnlyMyTasks) {
      currentTasks = currentTasks.filter(task => task.assignedEditorId === MOCK_CURRENT_USER_ID);
    }
    if (filterHideCompleted) {
      currentTasks = currentTasks.filter(task => task.status !== "completed");
    }
    return currentTasks;
  }, [tasks, filterTaskStatus, filterAssignedEditorId, filterOnlyMyTasks, filterHideCompleted]);


  const handleTaskAction = (
    taskId: string,
    newStatus: TaskStatus,
    newAssignedEditorId: string | null | undefined,
    specificAction?: string,
    revisionReason?: string
  ) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const editorForLog = newAssignedEditorId === undefined
                               ? task.assignedEditorId
                               : (newAssignedEditorId === null ? task.assignedEditorId : newAssignedEditorId);

          const finalAssignedEditorId = newAssignedEditorId === undefined
                                        ? task.assignedEditorId
                                        : newAssignedEditorId;

          const editorName = getEditorName(finalAssignedEditorId) || getEditorName(MOCK_CURRENT_USER_ID) || 'System Action';
          let newActivity = task.lastActivity;

          switch(specificAction) {
            case "claim_culling_task": newActivity = `Culling claimed by ${editorName}`; break;
            case "complete_culling": newActivity = `Culling completed by ${editorName}, sent to Color Treatment`; break;
            case "release_from_culling": newActivity = `Released from Culling by ${editorName}, back to Ingestion Queue`; break;
            case "claim_color_task": newActivity = `Color Treatment claimed by ${editorName}`; break;
            case "complete_color": newActivity = `Color Treatment completed by ${editorName}, sent to Review`; break;
            case "release_from_color": newActivity = `Released from Color Treatment by ${editorName}, back to Culling`; break;
            case "approve_review": newActivity = `Approved and completed by ${editorName}`; break;
            case "request_revision_from_review":
              newActivity = `Revisions requested by ${editorName}${revisionReason ? `: "${revisionReason}"` : ''}. Moved to ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || newStatus}.`;
              break;
            case "reopen_completed_task":
              newActivity = `Task reopened by ${editorName}${revisionReason ? `: "${revisionReason}"` : ''}. Moved to ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || newStatus}.`;
              break;
            default:
              newActivity = `${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || 'Task'} updated by ${editorName}.`;
          }

          return { ...task, status: newStatus, assignedEditorId: finalAssignedEditorId, lastActivity: newActivity };
        }
        return task;
      })
    );
  };

  const openRevisionDialog = (taskId: string, taskTitle: string, currentAssigneeId?: string | null) => {
    setRevisionTaskDetails({ taskId, taskTitle, currentAssigneeId });
    setIsRevisionDialogOpen(true);
  };

  const handleRevisionSubmit = (targetStage: TaskStatus, reason: string) => {
    if (revisionTaskDetails) {
      const taskToRevise = tasks.find(t => t.id === revisionTaskDetails.taskId);
      if (!taskToRevise) return;

      const actionType = taskToRevise.status === 'completed'
        ? 'reopen_completed_task'
        : 'request_revision_from_review';

      handleTaskAction(revisionTaskDetails.taskId, targetStage, null, actionType, reason);
    }
    setIsRevisionDialogOpen(false);
    setRevisionTaskDetails(null);
  };

  const handleSimulateNewIngestion = () => {
    const newTaskId = `task_sim_${Date.now()}`;
    const randomEventNames = ["Charity Gala Dinner", "Music Festival - Day 2", "Corporate Retreat", "Tech Startup Launch"];
    const randomPhotographerNames = ["Greg Adams", "Laura Chen", "Mike Davis", "Sarah Bell"];
    const randomImageCount = Math.floor(Math.random() * 150) + 50; // 50-200 images
    const jobSimId = `SIM_JOB_${Date.now()}`;

    const newSimulatedTask: KanbanTask = {
      id: newTaskId,
      title: `Ingested: ${randomEventNames[Math.floor(Math.random() * randomEventNames.length)]}`,
      content: `${randomImageCount} Images`,
      status: 'ingestion',
      assignedEditorId: null,
      eventName: randomEventNames[Math.floor(Math.random() * randomEventNames.length)],
      photographerName: randomPhotographerNames[Math.floor(Math.random() * randomPhotographerNames.length)],
      lastActivity: `Awaiting culling (Simulated Ingestion - ${new Date().toLocaleTimeString()})`,
      ingestionJobId: jobSimId,
      reportUrl: '/reports/mock/sample_ingest_report.json' // Keep mock for simulated tasks
    };
    setTasks(prevTasks => [newSimulatedTask, ...prevTasks]);
  };

  const handleOpenReportModal = (reportUrl?: string) => {
    if (reportUrl) {
      setCurrentReportUrl(reportUrl);
      setIsReportModalOpen(true);
    }
  };

  const tasksByColumn = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = filteredTasks.filter(task => task.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, KanbanTask[]>);
  }, [filteredTasks]);

  const isLoadingAllContexts = isLoadingEvents || isLoadingProjects || isLoadingSettings;

  if (isLoadingAllContexts) {
    return (
      <div className="flex flex-col gap-6 h-full">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ImageIcon className="h-8 w-8 text-accent" /> Photo Editing Workflow
        </h1>
        <p>Loading workflow data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-accent" /> Photo Editing Workflow
            </h1>
            <p className="text-muted-foreground">Manage photo editing tasks. { selectedProject ? `For project: ${selectedProject.name}` : "Select a project." }</p>
        </div>
        <Button variant="outline" onClick={handleSimulateNewIngestion} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Simulate New Ingested Task
        </Button>
      </div>

      {revisionTaskDetails && (
        <RevisionRequestDialog
          isOpen={isRevisionDialogOpen}
          onOpenChange={setIsRevisionDialogOpen}
          onSubmit={handleRevisionSubmit}
          taskTitle={revisionTaskDetails.taskTitle}
          availableStages={REVISION_TARGET_STAGES}
        />
      )}

      {currentReportUrl && currentReportUrl.startsWith('/reports/mock/') && (
        <IngestionReportDialog
          isOpen={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          reportUrl={currentReportUrl}
        />
      )}

      <Card className="p-4 shadow-sm border bg-card/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <Label htmlFor="filter-task-status" className="text-xs text-muted-foreground">Task Status</Label>
                <Select value={filterTaskStatus} onValueChange={(value) => setFilterTaskStatus(value as any)}>
                    <SelectTrigger id="filter-task-status" className="h-9">
                        <SelectValue placeholder="Filter by task status" />
                    </SelectTrigger>
                    <SelectContent>
                        {taskStatusFilterOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filter-assigned-editor" className="text-xs text-muted-foreground">Assigned Editor</Label>
                <Select value={filterAssignedEditorId} onValueChange={setFilterAssignedEditorId}>
                    <SelectTrigger id="filter-assigned-editor" className="h-9">
                        <SelectValue placeholder="Filter by editor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Editors</SelectItem>
                        {MOCK_EDITORS.map(editor => (
                            <SelectItem key={editor.id} value={editor.id}>{editor.name}</SelectItem>
                        ))}
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-2 flex items-center justify-end gap-x-4">
              <div className="flex items-center space-x-2">
                  <Checkbox
                      id="filter-only-my-tasks"
                      checked={filterOnlyMyTasks}
                      onCheckedChange={(checked) => setFilterOnlyMyTasks(!!checked)}
                  />
                  <Label htmlFor="filter-only-my-tasks" className="font-normal text-sm whitespace-nowrap">Only My Tasks</Label>
              </div>
              <div className="flex items-center space-x-2">
                  <Checkbox
                      id="filter-hide-completed"
                      checked={filterHideCompleted}
                      onCheckedChange={(checked) => setFilterHideCompleted(!!checked)}
                  />
                  <Label htmlFor="filter-hide-completed" className="font-normal text-sm whitespace-nowrap">Hide Completed</Label>
              </div>
            </div>
        </div>
      </Card>


      <ScrollArea className="flex-grow pb-4">
        <div className="flex w-full justify-start gap-4 items-start">
          {(filterHideCompleted ? KANBAN_COLUMNS.filter(col => col.id !== 'completed') : KANBAN_COLUMNS).map((column) => (
            <div key={column.id} className="min-w-[18rem] flex-1">
              <Card className="border-0 bg-transparent h-full">
                <CardHeader className="pb-3 pt-4 px-4 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <column.icon className="h-5 w-5 text-muted-foreground" />
                    {column.title}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {tasksByColumn[column.id]?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3 min-h-[200px]">
                  {tasksByColumn[column.id]?.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {filteredTasks.length > 0 && tasks.length > filteredTasks.length
                        ? "No tasks match current filters for this stage."
                        : "No tasks in this stage."
                      }
                    </p>
                  )}
                  {tasksByColumn[column.id]?.map((task) => {
                    const assignedEditorName = getEditorName(task.assignedEditorId);
                    const isCurrentUserAssigned = task.assignedEditorId === MOCK_CURRENT_USER_ID;

                    return (
                      <Card
                        key={task.id}
                        className={cn(
                          "shadow-none bg-background",
                          isCurrentUserAssigned ? "border border-accent" : "border-0"
                        )}
                      >
                        <CardHeader className="p-3 pb-2 flex flex-row justify-between items-start">
                           <div className="flex-grow">
                            <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {task.eventName && <p>Event: {task.eventName}</p>}
                              {task.photographerName && <p>Photographer: {task.photographerName}</p>}
                              <p>{task.content}</p>
                            </CardDescription>
                          </div>
                          {task.reportUrl && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0 ml-2"
                                    onClick={() => task.reportUrl?.startsWith('/reports/mock/') ? handleOpenReportModal(task.reportUrl) : router.push(task.reportUrl!)}
                                   >
                                    <Settings className="h-4 w-4" />
                                    <span className="sr-only">View Report / Event Shots</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{task.reportUrl?.startsWith('/reports/mock/') ? "View Ingestion Report" : "View Event Shot List"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </CardHeader>
                        <CardContent className="p-3 pt-1 text-xs">
                          {assignedEditorName && (
                            <p className="text-muted-foreground mb-1">
                              Assigned to: <span className="font-medium text-foreground">{assignedEditorName}</span>
                            </p>
                          )}
                           {!assignedEditorName && task.status !== 'ingestion' && task.status !== 'completed' && (
                              <p className="text-muted-foreground italic mb-1">Unassigned</p>
                          )}
                          <p className="text-muted-foreground/80 italic">Last Activity: {task.lastActivity}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {task.status === 'ingestion' && !task.assignedEditorId && (
                              <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'culling', MOCK_CURRENT_USER_ID, 'claim_culling_task')} className="text-xs text-accent">
                                Start Culling
                              </Button>
                            )}
                            {task.status === 'culling' && !task.assignedEditorId && (
                               <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'culling', MOCK_CURRENT_USER_ID, 'claim_culling_task')} className="text-xs text-accent">
                                Start Culling
                              </Button>
                            )}
                            {task.status === 'culling' && isCurrentUserAssigned && (
                              <>
                                <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'color', task.assignedEditorId, 'complete_culling')} className="text-xs text-accent">
                                  Mark Culling Complete
                                </Button>
                                <Button size="xs" variant="ghost" className="text-xs text-destructive" onClick={() => handleTaskAction(task.id, 'ingestion', null, 'release_from_culling')}>
                                  Release Task
                                </Button>
                              </>
                            )}
                             {task.status === 'color' && !task.assignedEditorId && (
                               <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'color', MOCK_CURRENT_USER_ID, 'claim_color_task')} className="text-xs text-accent">
                                Start Color Treatment
                              </Button>
                            )}
                             {task.status === 'color' && isCurrentUserAssigned && (
                              <>
                                <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'review', task.assignedEditorId, 'complete_color')} className="text-xs text-accent">
                                  Mark Color Complete
                                </Button>
                                <Button size="xs" variant="ghost" className="text-xs text-destructive" onClick={() => handleTaskAction(task.id, 'culling', null, 'release_from_color')}>
                                  Release Task
                                </Button>
                              </>
                            )}
                            {task.status === 'review' && (
                                <>
                                  <Button size="xs" variant="ghost" onClick={() => handleTaskAction(task.id, 'completed', MOCK_CURRENT_USER_ID, 'approve_review')} className="text-xs text-green-600 dark:text-green-400">
                                      Approve & Complete
                                  </Button>
                                  <Button size="xs" variant="ghost" className="text-xs text-accent" onClick={() => openRevisionDialog(task.id, task.title, task.assignedEditorId)}>
                                      <RotateCcw className="mr-1 h-3 w-3" /> Request Revisions
                                  </Button>
                                </>
                            )}
                             {task.status === 'completed' && (
                                <>
                                   <Button size="xs" variant="ghost" className="text-xs text-accent" onClick={() => openRevisionDialog(task.id, task.title, task.assignedEditorId)}>
                                      <RotateCcw className="mr-1 h-3 w-3" /> Reopen Task
                                  </Button>
                                </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
