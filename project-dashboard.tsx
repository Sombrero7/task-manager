import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Papa from 'papaparse';
import _ from 'lodash';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, List, PieChart, Clock, Calendar, User, Link, X, Plus, Save, Edit2, GripVertical } from 'lucide-react';

// Your existing component declarations (TaskDetailView, MultiSelect, etc.) here...

const DailyScheduleView = ({ tasks }) => {
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [draggingTask, setDraggingTask] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [startResizeY, setStartResizeY] = useState(0);
  const [startResizeHeight, setStartResizeHeight] = useState(0);

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          tasks: []
        });
      }
    }
    return slots;
  }, []);

  const handleDragStart = (e, task) => {
    if (resizing) return; // Don't start drag if we're resizing
    setDraggingTask(task);
    e.dataTransfer.setData('text/plain', task['Task ID']);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverSlot(null);
  };

  const handleDrop = (e, timeSlot) => {
    e.preventDefault();
    if (draggingTask) {
      const updatedSchedule = scheduledTasks.filter(t => t['Task ID'] !== draggingTask['Task ID']);
      setScheduledTasks([...updatedSchedule, { 
        ...draggingTask, 
        scheduledTime: timeSlot.time,
        duration: draggingTask.duration || parseInt(draggingTask.timeEstimate) || 30
      }]);
      setDraggingTask(null);
      setDragOverSlot(null);
    }
  };

  const handleDragOver = (e, timeSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(timeSlot.time);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverSlot(null);
  };

  const handleResizeStart = (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(task);
    setStartResizeY(e.clientY);
    setStartResizeHeight(task.duration || parseInt(task.timeEstimate) || 30);
  };

  const handleResizeMove = (e) => {
    if (!resizing) return;
    
    const deltaY = e.clientY - startResizeY;
    const deltaMinutes = Math.round(deltaY / (64 / 30)) * 30; // Snap to 30-minute intervals
    const newDuration = Math.max(30, startResizeHeight + deltaMinutes); // Minimum 30 minutes
    
    const updatedTasks = scheduledTasks.map(task =>
      task['Task ID'] === resizing['Task ID']
        ? { ...task, duration: newDuration }
        : task
    );
    
    setScheduledTasks(updatedTasks);
  };

  const handleResizeEnd = () => {
    setResizing(null);
    setStartResizeY(0);
    setStartResizeHeight(0);
  };

  useEffect(() => {
    if (resizing) {
      const handleMouseMove = (e) => handleResizeMove(e);
      const handleMouseUp = () => handleResizeEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing, startResizeY, startResizeHeight]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const TaskList = () => (
    <div className="w-80 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="font-semibold mb-4">Available Tasks</h3>
        <div className="space-y-2">
          {tasks
            .filter(task => !scheduledTasks.find(st => st['Task ID'] === task['Task ID']))
            .map(task => (
              <div
                key={task['Task ID']}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                className={`p-2 bg-white border rounded-lg cursor-move hover:bg-gray-50 
                  flex items-center gap-2 ${draggingTask?.['Task ID'] === task['Task ID'] ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task['Task Description']}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{task.timeEstimate || '30'} min</span>
                    {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const ScheduleTimeline = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="relative min-h-full bg-gray-50">
        {/* Current time indicator */}
        <div 
          className="absolute w-full border-t-2 border-red-500 z-10"
          style={{ 
            top: `${(currentTime.getHours() * 60 + currentTime.getMinutes()) / 1440 * 100}%` 
          }}
        >
          <div className="absolute -top-3 -left-16 text-red-500 text-sm">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {timeSlots.map((slot, index) => (
          <div 
            key={slot.time}
            className={`flex border-b border-gray-200 h-16 transition-colors ${
              dragOverSlot === slot.time ? 'bg-blue-50' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, slot)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, slot)}
          >
            <div className="w-16 flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-sm text-gray-500">
              {slot.time}
            </div>
            <div className="flex-1 relative">
              {scheduledTasks
                .filter(task => task.scheduledTime === slot.time)
                .map((task) => (
                  <div
                    key={task['Task ID']}
                    className={`absolute left-0 right-2 bg-blue-100 border border-blue-200 rounded p-2 m-1 
                      ${resizing?.['Task ID'] === task['Task ID'] ? 'cursor-ns-resize' : 'cursor-move'}`}
                    style={{
                      height: `${(task.duration || parseInt(task.timeEstimate) || 30) / 30 * 64}px`,
                      zIndex: 20
                    }}
                    draggable={!resizing}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  >
                    <p className="text-sm font-medium truncate">{task['Task Description']}</p>
                    <p className="text-xs text-gray-500">{task.duration || task.timeEstimate || '30'} min</p>
                    
                    {/* Resize handle */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-blue-200 rounded-b"
                      onMouseDown={(e) => handleResizeStart(e, task)}
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-200px)]">
      <TaskList />
      <ScheduleTimeline />
    </div>
  );
};

const TaskDetailView = ({ 
  task, 
  editMode, 
  editedTask, 
  setEditedTask
}) => {
  const Field = ({ label, value, field, type = "text" }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {editMode ? (
        type === "textarea" ? (
          <Textarea
            value={editedTask[field]}
            onChange={(e) => setEditedTask({ ...editedTask, [field]: e.target.value })}
            className="w-full"
          />
        ) : (
          <Input
            value={editedTask[field]}
            onChange={(e) => setEditedTask({ ...editedTask, [field]: e.target.value })}
            type={type}
          />
        )
      ) : (
        <p className="text-gray-700">{value}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-6">
        <Field label="Task Description" value={task['Task Description']} field="Task Description" />
        <Field label="Status" value={task.Status} field="Status" />
        <Field label="Owner" value={task.owner} field="owner" />
        <Field label="Category" value={task.Category} field="Category" />
        <Field label="Project" value={task.Project} field="Project" />
        <Field label="Initiative" value={task.Initiative} field="Initiative" />
        <Field label="Tags" value={task.Tags} field="Tags" />
        <Field label="Time Estimate" value={task.timeEstimate} field="timeEstimate" />
      </div>

      <Field 
        label="Status Update" 
        value={task['Status Update']} 
        field="Status Update"
        type="textarea" 
      />

      <Field 
        label="Desired Outcome" 
        value={task['Desired Outcome']} 
        field="Desired Outcome"
        type="textarea" 
      />
    </div>
  );
};

const TaskDialog = ({ task, onEdit }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onEdit(editedTask);
    setEditMode(false);
  };

  return (
    <DialogContent className="max-w-2xl h-[90vh]">
      <DialogHeader className="flex justify-between items-center">
        <DialogTitle>Task Details</DialogTitle>
        <div>
          {editMode ? (
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          ) : (
            <Button onClick={() => setEditMode(true)} className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit Task
            </Button>
          )}
        </div>
      </DialogHeader>
      <div className="overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 120px)' }}>
        <TaskDetailView 
          task={task} 
          editMode={editMode} 
          editedTask={editedTask}
          setEditedTask={setEditedTask}
        />
      </div>
    </DialogContent>
  );
};

const TaskCard = ({ task, onEdit }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Card className="w-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 w-full">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{task['Task Description']}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  task.Status === 'Completed' ? 'bg-green-100 text-green-800' :
                  task.Status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  task.Status === 'Not Started' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {task.Status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Owner: {task.owner}
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Est. Time: {task.timeEstimate}
                  </p>
                </div>
                <div>
                  <p>Category: {task.Category}</p>
                  <p>Project: {task.Project}</p>
                  <p>Initiative: {task.Initiative}</p>
                  <p>Tags: {task.Tags}</p>
                </div>
              </div>
              
              {task['Status Update'] && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>Current Update:</strong> {task['Status Update']}
                  </p>
                </div>
              )}
              
              {task['Desired Outcome'] && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>Desired Outcome:</strong> {task['Desired Outcome']}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </DialogTrigger>
    <TaskDialog task={task} onEdit={onEdit} />
  </Dialog>
);

const MultiSelect = ({ options, value, onChange, placeholder, label }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-[200px] justify-start">
        {value.length ? `${value.length} selected` : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="p-0" align="start">
      <div className="p-2">
        <div className="font-medium mb-2">{label}</div>
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={option}
                checked={value.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...value, option]);
                  } else {
                    onChange(value.filter((v) => v !== option));
                  }
                }}
              />
              <label htmlFor={option} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

const ProjectDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [view, setView] = useState('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sortConfig, setSortConfig] = useState({ field: 'priority', direction: 'desc' });
  const [filters, setFilters] = useState({
    statuses: [],
    categories: [],
    projects: [],
    tags: [],
    priorities: []
  });

  const handleTaskEdit = (editedTask) => {
    const updatedTasks = tasks.map(task => 
      task['Task ID'] === editedTask['Task ID'] ? editedTask : task
    );
    setTasks(updatedTasks);
    setFilteredTasks(updatedTasks);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        const result = Papa.parse(response, {
          header: true,
          skipEmptyLines: true
        });
        
        const enhancedData = result.data.map(task => ({
          ...task,
          owner: task.owner || 'Unassigned',
          timeEstimate: task.timeEstimate || 'Not estimated',
          dependencies: task.dependencies ? task.dependencies.split(',') : [],
          'Status Update': task['Status Update'] || 'No updates yet',
          'Desired Outcome': task['Desired Outcome'] || 'No desired outcome specified',
          tags: task.Tags ? task.Tags.split(',').map(tag => tag.trim()) : [],
          priority: task.priority || 'Medium',
          startDate: task.startDate || null,
          dueDate: task.dueDate || null,
          duration: task.duration || null,
          actualTime: task.actualTime || 0,
          progress: task.progress || 0
        }));
        
        setTasks(enhancedData);
        setFilteredTasks(enhancedData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = tasks;
    
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        const field = key === 'statuses' ? 'Status' :
                     key === 'categories' ? 'Category' :
                     key === 'projects' ? 'Project' :
                     key === 'priorities' ? 'priority' : 'tags';
        
        filtered = filtered.filter(task => {
          if (field === 'tags') {
            return task.tags.some(tag => values.includes(tag));
          }
          return values.includes(task[field]);
        });
      }
    });
    
    // Apply sorting
    const sortedTasks = _.orderBy(
      filtered,
      [sortConfig.field],
      [sortConfig.direction]
    );
    
    setFilteredTasks(sortedTasks);
  }, [filters, tasks, sortConfig]);

  const uniqueValues = {
    statuses: _.uniq(tasks.map(task => task.Status)).filter(Boolean),
    categories: _.uniq(tasks.map(task => task.Category)).filter(Boolean),
    projects: _.uniq(tasks.map(task => task.Project)).filter(Boolean),
    tags: _.uniq(_.flatMap(tasks, task => task.tags)).filter(Boolean)
  };

  const statusData = _.chain(tasks)
    .groupBy('Status')
    .map((value, key) => ({
      name: key || 'Unspecified',
      value: value.length
    }))
    .value();

  const categoryData = _.chain(tasks)
    .groupBy('Category')
    .map((value, key) => ({
      name: key || 'Unspecified',
      count: value.length
    }))
    .value();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Management Dashboard</h1>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('list')}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            className={`px-4 py-2 rounded ${view === 'analytics' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('analytics')}
          >
            <PieChart className="w-5 h-5" />
          </button>
          <button
            className={`px-4 py-2 rounded ${view === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('calendar')}
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button
            className={`px-4 py-2 rounded ${view === 'schedule' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('schedule')}
          >
            <Clock className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <MultiSelect
            options={uniqueValues.statuses}
            value={filters.statuses}
            onChange={(value) => setFilters(prev => ({ ...prev, statuses: value }))}
            placeholder="Select statuses"
            label="Statuses"
          />
          <MultiSelect
            options={uniqueValues.categories}
            value={filters.categories}
            onChange={(value) => setFilters(prev => ({ ...prev, categories: value }))}
            placeholder="Select categories"
            label="Categories"
          />
          <MultiSelect
            options={uniqueValues.projects}
            value={filters.projects}
            onChange={(value) => setFilters(prev => ({ ...prev, projects: value }))}
            placeholder="Select projects"
            label="Projects"
          />
          <MultiSelect
            options={uniqueValues.tags}
            value={filters.tags}
            onChange={(value) => setFilters(prev => ({ ...prev, tags: value }))}
            placeholder="Select tags"
            label="Tags"
          />
          <MultiSelect
            options={['High', 'Medium', 'Low']}
            value={filters.priorities}
            onChange={(value) => setFilters(prev => ({ ...prev, priorities: value }))}
            placeholder="Select priorities"
            label="Priorities"
          />
          <Select
            value={sortConfig.field}
            onValueChange={(value) => setSortConfig(prev => ({ ...prev, field: value }))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="Status">Status</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setSortConfig(prev => ({
              ...prev,
              direction: prev.direction === 'asc' ? 'desc' : 'asc'
            }))}
          >
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setFilters({
                statuses: [],
                categories: [],
                projects: [],
                tags: [],
                priorities: []
              });
              setSortConfig({ field: 'priority', direction: 'desc' });
            }}
          >
            Clear All
          </Button>
        </div>

        {view === 'list' ? (
          <div className="grid gap-4">
            {filteredTasks.map((task, index) => (
              <TaskCard key={index} task={task} onEdit={handleTaskEdit} />
            ))}
          </div>
        ) : view === 'analytics' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tasks by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : view === 'schedule' ? (
          <DailyScheduleView tasks={filteredTasks} />
        ) : null}
      </div>
    </div>
  );
};

export default ProjectDashboard;