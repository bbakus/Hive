
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, User, CheckCircle, Edit3, RotateCcw, Inbox, Palette, GalleryThumbnails, UserCheck, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { RevisionRequestDialog } from "@/components/modals/RevisionRequestDialog";

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

const initialTasksData: KanbanTask[] = [
  { id: 'task1', title: 'Keynote Speaker Candids', content: '150 Images', status: 'ingestion', eventName: 'G9e Summit - Day 1 Keynote', photographerName: 'Alice W.', lastActivity: 'Awaiting culling' },
  { id: 'task2', title: 'Networking Reception - Batch 1', content: '200 Images', status: 'ingestion', eventName: 'G9e Summit - Day 1 Reception', photographerName: 'Bob B.', lastActivity: 'Awaiting culling' },
  { id: 'task3', title: 'Workshop Alpha - Selects', content: '80 Images (Culled from 250)', status: 'culling', assignedEditorId: MOCK_CURRENT_USER_ID, eventName: 'Tech Conference X - Workshop A', photographerName: 'Diana P.', lastActivity: `Culling by ${MOCK_EDITORS.find(e=>e.id === MOCK_CURRENT_USER_ID)?.name}` },
  { id: 'task4', title: 'Product Launch - Hero Shots', content: '30 Images (Color Processed)', status: 'color', assignedEditorId: 'editor2', eventName: 'Product Launch Q3', photographerName: 'Fiona G.', lastActivity: `Color grading by ${MOCK_EDITORS.find(e=>e.id === 'editor2')?.name}` },
  { id: 'task5', title: 'VIP Portraits - Final Review', content: '90 Images', status: 'review', assignedEditorId: 'editor1', eventName: 'Corporate Gala Dinner', photographerName: 'Alice W.', lastActivity: `Awaiting approval from ${MOCK_EDITORS.find(e=>e.id === 'editor1')?.name}` },
  { id: 'task6', title: 'Awards Ceremony - Stage & Winners', content: '200 Images', status: 'ingestion', eventName: 'Annual Shareholder Meeting', photographerName: 'Bob B.', lastActivity: 'Awaiting culling'},
  { id: 'task7', title: 'Team Headshots - Batch 1 (Color)', content: '25 Images', status: 'color', assignedEditorId: MOCK_CURRENT_USER_ID, eventName: 'Internal Photoshoot', photographerName: 'Diana P.', lastActivity: `Color grading by ${MOCK_EDITORS.find(e=>e.id === MOCK_CURRENT_USER_ID)?.name}` },
  { id: 'task8', title: 'Summer Fest - Day Highlights', content: '500 Images', status: 'completed', assignedEditorId: 'editor1', eventName: 'Summer Music Fest', photographerName: 'Alice W.', lastActivity: `Completed by ${MOCK_EDITORS.find(e=>e.id === 'editor1')?.name}` },
];

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

export default function PostProductionPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasksData);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [revisionTaskDetails, setRevisionTaskDetails] = useState<{ taskId: string; taskTitle: string; currentAssigneeId?: string | null } | null>(null);

  const getEditorName = (editorId?: string | null) => {
    if (!editorId) return null;
    return MOCK_EDITORS.find(e => e.id === editorId)?.name || 'Unknown Editor';
  };

  const handleTaskAction = (
    taskId: string,
    newStatus: TaskStatus,
    newAssignedEditorId?: string | null | undefined, 
    specificAction?: string,
    revisionReason?: string
  ) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const editorForLog = newAssignedEditorId === undefined ? task.assignedEditorId : newAssignedEditorId;
          const editorName = getEditorName(editorForLog) || getEditorName(MOCK_CURRENT_USER_ID) || 'System'; 
          let newActivity = task.lastActivity;

          switch(specificAction) {
            case "claim_ingestion": newActivity = `Culling started by ${editorName}`; break;
            case "claim_culling_task": newActivity = `Culling task claimed by ${editorName}`; break;
            case "claim_color_task": newActivity = `Color task claimed by ${editorName}`; break;
            case "culling_complete": newActivity = `Culling completed by ${editorName}, moved to Color`; break;
            case "release_from_culling": newActivity = `Released from Culling by ${editorName}, back to Ingestion Queue`; break;
            case "color_complete": newActivity = `Color treatment completed by ${editorName}, moved to Review`; break;
            case "release_from_color": newActivity = `Released from Color by ${editorName}, back to Culling`; break;
            case "approve_complete": newActivity = `Approved and completed by ${editorName}`; break;
            case "submit_revisions": 
              newActivity = `Revisions requested by ${editorName}${revisionReason ? `: "${revisionReason}"` : ''}. Moved to ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || newStatus}.`;
              break;
            default:
              newActivity = `${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title || 'Task'} updated by ${editorName}.`;
          }
          
          const assignmentUpdate = newAssignedEditorId === undefined 
            ? { assignedEditorId: task.assignedEditorId } 
            : { assignedEditorId: newAssignedEditorId };

          return { ...task, status: newStatus, ...assignmentUpdate, lastActivity: newActivity };
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
      // When submitting revisions, the task becomes unassigned for the target stage
      handleTaskAction(revisionTaskDetails.taskId, targetStage, null, 'submit_revisions', reason);
    }
    setIsRevisionDialogOpen(false);
    setRevisionTaskDetails(null);
  };


  const tasksByColumn = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = tasks.filter(task => task.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, KanbanTask[]>);
  }, [tasks]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ImageIcon className="h-8 w-8 text-primary" /> Photo Editing Workflow
        </h1>
        <p className="text-muted-foreground">Manage photo editing tasks through different stages.</p>
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

      <ScrollArea className="flex-grow pb-4">
        <div className="flex gap-4 items-start">
          {KANBAN_COLUMNS.map((column) => (
            <div key={column.id} className="w-72 min-w-[18rem] flex-shrink-0">
              <Card className="border-0 bg-muted/30 h-full">
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
                    <p className="text-xs text-muted-foreground text-center py-4">No tasks in this stage.</p>
                  )}
                  {tasksByColumn[column.id]?.map((task) => {
                    const assignedEditorName = getEditorName(task.assignedEditorId);
                    const isCurrentUserAssigned = task.assignedEditorId === MOCK_CURRENT_USER_ID;

                    return (
                      <Card key={task.id} className="border-0 shadow-none hover:shadow-sm transition-shadow bg-background">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            {task.eventName && <p>Event: {task.eventName}</p>}
                            {task.photographerName && <p>Photographer: {task.photographerName}</p>}
                            <p>{task.content}</p>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1 text-xs">
                          {assignedEditorName && (
                            <p className="text-muted-foreground mb-1">
                              Assigned to: <span className="font-medium text-foreground">{assignedEditorName}</span>
                            </p>
                          )}
                          <p className="text-muted-foreground/80 italic">Last Activity: {task.lastActivity}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {task.status === 'ingestion' && !task.assignedEditorId && (
                              <Button size="xs" variant="outline" onClick={() => handleTaskAction(task.id, 'culling', MOCK_CURRENT_USER_ID, 'claim_ingestion')} className="text-xs">
                                Start Culling
                              </Button>
                            )}
                            {task.status === 'culling' && !task.assignedEditorId && (
                               <Button size="xs" variant="outline" onClick={() => handleTaskAction(task.id, 'culling', MOCK_CURRENT_USER_ID, 'claim_culling_task')} className="text-xs">
                                Claim Culling Task
                              </Button>
                            )}
                            {task.status === 'culling' && isCurrentUserAssigned && (
                              <>
                                <Button size="xs" variant="outline" onClick={() => handleTaskAction(task.id, 'color', task.assignedEditorId, 'culling_complete')} className="text-xs">
                                  Culling Complete
                                </Button>
                                <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-destructive text-xs" onClick={() => handleTaskAction(task.id, 'ingestion', null, 'release_from_culling')}>
                                  Release Task
                                </Button>
                              </>
                            )}
                            {task.status === 'color' && !task.assignedEditorId && (
                               <Button size="xs" variant="outline" onClick={() => handleTaskAction(task.id, 'color', MOCK_CURRENT_USER_ID, 'claim_color_task')} className="text-xs">
                                Claim Color Task
                              </Button>
                            )}
                             {task.status === 'color' && isCurrentUserAssigned && (
                              <>
                                <Button size="xs" variant="outline" onClick={() => handleTaskAction(task.id, 'review', task.assignedEditorId, 'color_complete')} className="text-xs">
                                  Color Complete
                                </Button>
                                <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-destructive text-xs" onClick={() => handleTaskAction(task.id, 'culling', null, 'release_from_color')}>
                                  Release Task
                                </Button>
                              </>
                            )}
                            {task.status === 'review' && (
                                <>
                                  <Button size="xs" variant="accent" onClick={() => handleTaskAction(task.id, 'completed', task.assignedEditorId, 'approve_complete')} className="text-xs">
                                      Approve & Complete
                                  </Button>
                                  <Button size="xs" variant="ghost" className="text-muted-foreground text-xs" onClick={() => openRevisionDialog(task.id, task.title, task.assignedEditorId)}>
                                      <RotateCcw className="mr-1 h-3 w-3" /> Request Revisions
                                  </Button>
                                </>
                            )}
                             {task.status === 'completed' && (
                                <>
                                  <Badge variant="default" className="pointer-events-none mr-2">
                                      <CheckCircle className="mr-1 h-3 w-3 text-primary-foreground"/> Completed
                                  </Badge>
                                   <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-destructive text-xs" onClick={() => openRevisionDialog(task.id, task.title, task.assignedEditorId)}>
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

declare module "@/components/ui/button" {
    interface ButtonProps {
      size?: "default" | "sm" | "lg" | "icon" | "xs"; 
    }
  }
