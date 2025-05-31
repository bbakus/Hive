
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, User, CheckCircle, Edit3, RotateCcw, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Editor = { id: string; name: string };
type TaskStatus = 'todo' | 'inProgress' | 'review' | 'completed';

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
  { id: 'editor_current_user', name: 'Charlie CurrentUser' }, // Current simulated user
];

const MOCK_CURRENT_USER_ID = 'editor_current_user';

const initialTasksData: KanbanTask[] = [
  { id: 'task1', title: 'Keynote Speaker Closeups', content: '75 Images', status: 'todo', eventName: 'G9e Summit - Day 1 Keynote', photographerName: 'Alice W.', lastActivity: 'Ingested yesterday' },
  { id: 'task2', title: 'Networking Candids - Evening Reception', content: '120 Images', status: 'todo', eventName: 'G9e Summit - Day 1 Reception', photographerName: 'Bob B.', lastActivity: 'Ingested 2 hours ago' },
  { id: 'task3', title: 'Workshop Alpha - Group Photos', content: '50 Images', status: 'inProgress', assignedEditorId: MOCK_CURRENT_USER_ID, eventName: 'Tech Conference X - Workshop A', photographerName: 'Diana P.', lastActivity: `Claimed by ${MOCK_EDITORS.find(e=>e.id === MOCK_CURRENT_USER_ID)?.name}` },
  { id: 'task4', title: 'Product Launch - Hero Shots', content: '30 Images', status: 'review', assignedEditorId: 'editor2', eventName: 'Product Launch Q3', photographerName: 'Fiona G.', lastActivity: `Marked for review by ${MOCK_EDITORS.find(e=>e.id === 'editor2')?.name}` },
  { id: 'task5', title: 'VIP Portraits - Gala Dinner', content: '90 Images', status: 'completed', assignedEditorId: 'editor1', eventName: 'Corporate Gala Dinner', photographerName: 'Alice W.', lastActivity: `Completed by ${MOCK_EDITORS.find(e=>e.id === 'editor1')?.name}` },
  { id: 'task6', title: 'Awards Ceremony - Stage & Winners', content: '200 Images', status: 'todo', eventName: 'Annual Shareholder Meeting', photographerName: 'Bob B.', lastActivity: 'Ingested this morning'},
  { id: 'task7', title: 'Team Headshots - Batch 1', content: '25 Images', status: 'inProgress', assignedEditorId: 'editor2', eventName: 'Internal Photoshoot', photographerName: 'Diana P.', lastActivity: `Claimed by ${MOCK_EDITORS.find(e=>e.id === 'editor2')?.name}` },
];

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'todo', title: 'To Edit', icon: Inbox },
  { id: 'inProgress', title: 'In Progress', icon: Edit3 },
  { id: 'review', title: 'Needs Review', icon: User },
  { id: 'completed', title: 'Completed', icon: CheckCircle },
];

export default function PostProductionPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasksData);

  const getEditorName = (editorId?: string | null) => {
    if (!editorId) return null;
    return MOCK_EDITORS.find(e => e.id === editorId)?.name || 'Unknown Editor';
  };

  const handleTaskAction = (taskId: string, newStatus: TaskStatus, newAssignedEditorId?: string | null) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const editorName = getEditorName(newAssignedEditorId === undefined ? task.assignedEditorId : newAssignedEditorId);
          let newActivity = task.lastActivity;
          if (newStatus === 'inProgress' && editorName) newActivity = `Claimed by ${editorName}`;
          else if (newStatus === 'review' && editorName) newActivity = `Marked for Review by ${editorName}`;
          else if (newStatus === 'completed' && editorName) newActivity = `Completed by ${editorName}`;
          else if (newStatus === 'todo' && newAssignedEditorId === null) newActivity = 'Released to queue'; // Ensure assignedEditorId is explicitly null for release
          
          return { ...task, status: newStatus, assignedEditorId: newAssignedEditorId === undefined ? task.assignedEditorId : newAssignedEditorId, lastActivity: newActivity };
        }
        return task;
      })
    );
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
          <ImageIcon className="h-8 w-8 text-accent" /> Photo Editing Workflow
        </h1>
        <p className="text-muted-foreground">Manage photo editing tasks through different stages. (Prototype)</p>
      </div>

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
                            {task.status === 'todo' && !task.assignedEditorId && (
                              <Button size="sm" variant="outline" onClick={() => handleTaskAction(task.id, 'inProgress', MOCK_CURRENT_USER_ID)} className="text-xs">
                                Claim Task
                              </Button>
                            )}
                            {task.status === 'inProgress' && task.assignedEditorId === MOCK_CURRENT_USER_ID && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleTaskAction(task.id, 'review')} className="text-xs">
                                  Mark for Review
                                </Button>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive text-xs" onClick={() => handleTaskAction(task.id, 'todo', null)}>
                                  Release Task
                                </Button>
                              </>
                            )}
                            {task.status === 'review' && (
                                <>
                                {task.assignedEditorId === MOCK_CURRENT_USER_ID || !task.assignedEditorId ? (
                                    <Button size="sm" variant="accent" onClick={() => handleTaskAction(task.id, 'completed')} className="text-xs">
                                        Mark Completed
                                    </Button>
                                ) : <Badge variant="outline">Reviewing (by {assignedEditorName})</Badge>}
                                {(task.assignedEditorId === MOCK_CURRENT_USER_ID || MOCK_CURRENT_USER_ID === "editor_current_user") && (
                                    <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={() => handleTaskAction(task.id, 'inProgress')}>
                                        <RotateCcw className="mr-1 h-3 w-3" /> Revert
                                    </Button>
                                )}
                                </>
                            )}
                             {task.status === 'completed' && (
                                <Badge variant="default" className="pointer-events-none">
                                    <CheckCircle className="mr-1 h-3 w-3 text-green-500"/> Completed
                                </Badge>
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

// Extend ButtonProps to include a size 'xs' if it doesn't exist
declare module "@/components/ui/button" {
  interface ButtonProps {
    size?: "default" | "sm" | "lg" | "icon" | "xs";
  }
}
// For the prototype, assuming 'xs' would be added to buttonVariants or simulated with 'sm' and className="text-xs".
// Used size="sm" and className="text-xs" for buttons inside Kanban cards.
