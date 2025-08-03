export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
}

export interface Task {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  dueDate: string;
} 