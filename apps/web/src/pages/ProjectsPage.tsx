import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { IProject, ITask, IProjectMember, IFusion, TaskStatus } from '@teambrain/shared';
import {
  FolderGit2,
  Plus,
  CheckCircle,
  Clock,
  Circle,
  Users,
  Sparkles,
  AlertTriangle,
  BookmarkCheck,
  Check,
  Trash2,
  Lock,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { user, currentTeam, currentRole } = useAuth();
  const isDemoUser = Boolean(user?.email?.endsWith('@teambrain.io'));
  const [projects, setProjects] = useState<IProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
  const [subTab, setSubTab] = useState<'tasks' | 'fusions' | 'members'>('tasks');

  // Tasks state
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  // Members state
  const [members, setMembers] = useState<IProjectMember[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');

  // Fusions state
  const [fusions, setFusions] = useState<IFusion[]>([]);
  const [fusionTopic, setFusionTopic] = useState('');
  const [isFusing, setIsFusing] = useState(false);

  // New project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const isTeamAdmin = currentRole === 'owner' || currentRole === 'admin';

  const loadProjects = async () => {
    if (!currentTeam) return;
    try {
      const list = await apiRequest<IProject[]>(`/projects?teamId=${currentTeam.id}`);
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        setSelectedProject(list[0] ?? null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load projects');
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const [taskList, fusionList, memberList] = await Promise.all([
        apiRequest<ITask[]>(`/projects/${projectId}/tasks`),
        apiRequest<IFusion[]>(`/projects/${projectId}/fusions`),
        apiRequest<IProjectMember[]>(`/projects/${projectId}/members`),
      ]);
      setTasks(taskList);
      setFusions(fusionList);
      setMembers(memberList);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load project details');
    }
  };

  useEffect(() => {
    loadProjects();
  }, [currentTeam]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !projectName.trim()) return;

    try {
      const newProj = await apiRequest<IProject>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          teamId: currentTeam.id,
          name: projectName.trim(),
          description: projectDesc.trim() || undefined,
        }),
      });

      setProjects([...projects, newProj]);
      setSelectedProject(newProj);
      setShowProjectModal(false);
      setProjectName('');
      setProjectDesc('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle.trim()) return;

    try {
      const newTask = await apiRequest<ITask>(`/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
        }),
      });

      setTasks([newTask, ...tasks]);
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updated = await apiRequest<ITask>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete task');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !memberEmail.trim()) return;

    try {
      const added = await apiRequest<IProjectMember>(
        `/projects/${selectedProject.id}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
        }
      );
      setMembers([...members, added]);
      setMemberEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add project member');
    }
  };

  const handleTriggerFusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsFusing(true);
    setErrorMessage('');

    try {
      const newFusion = await apiRequest<IFusion>(
        `/projects/${selectedProject.id}/fuse`,
        {
          method: 'POST',
          body: JSON.stringify({ topic: fusionTopic.trim() || undefined }),
        }
      );
      setFusions([newFusion, ...fusions]);
      setFusionTopic('');
    } catch (err: any) {
      setErrorMessage(err.message || 'AI fusion synthesis failed');
    } finally {
      setIsFusing(false);
    }
  };

  const handleConfirmFusion = async (fusionId: string) => {
    try {
      const confirmed = await apiRequest<IFusion>(`/fusions/${fusionId}/confirm`, {
        method: 'POST',
      });
      setFusions(fusions.map((f) => (f.id === fusionId ? confirmed : f)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm fusion');
    }
  };

  if (isDemoUser) {
    return (
      <div className="flex-1 bg-[#0B0F19] text-white flex items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <Lock className="h-8 w-8" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <span>Demo Guest Restriction</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Projects Workspace Locked</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
            You are signed in as a demo user (<b>{user?.name}</b>). Opening projects, managing tasks, and running AI knowledge fusions are restricted to registered member accounts.
          </p>
          <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-xs text-slate-400 mb-6 text-left space-y-2">
            <div className="font-bold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Available in Demo Mode:</span>
            </div>
            <div>• Explore the AI Assistant with Memory ON/OFF comparison toggle</div>
            <div>• Inspect Team Memories, Vector Search, and Review Queue</div>
            <div>• View institutional knowledge and citation sources</div>
          </div>
          <div className="text-[11px] text-slate-500">
            Create a standard account from the cover page to unlock full project management.
          </div>
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    return <div className="p-8 text-center text-slate-400">Please select a team.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects & Tasks</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Scoped workspaces with linked tasks, AI knowledge fusion, and conflict resolution.
          </p>
        </div>

        {isTeamAdmin && (
          <button
            onClick={() => setShowProjectModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="my-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      {/* Main Layout: Project Selector Sidebar + Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        {/* Project Selector */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1 mb-2">
            Projects ({projects.length})
          </span>
          {projects.length === 0 ? (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500 text-center">
              No projects yet.
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className={`w-full text-left p-3.5 rounded-xl border transition ${
                  selectedProject?.id === p.id
                    ? 'bg-indigo-950/80 border-indigo-600/70 text-white font-semibold shadow-md'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FolderGit2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </div>
                {p.description && (
                  <p className="text-xs text-slate-400 font-normal mt-1 line-clamp-1">{p.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Selected Project Main View */}
        <div className="lg:col-span-3">
          {selectedProject ? (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
              {/* Project Title Bar */}
              <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                  {selectedProject.description && (
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">{selectedProject.description}</p>
                  )}
                </div>

                {/* Sub-tab navigation */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSubTab('tasks')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      subTab === 'tasks' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tasks ({tasks.length})
                  </button>
                  <button
                    onClick={() => setSubTab('fusions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      subTab === 'fusions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Fusions ({fusions.length})
                  </button>
                  <button
                    onClick={() => setSubTab('members')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      subTab === 'members' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Members ({members.length})
                  </button>
                </div>
              </div>

              {/* Sub-tab: Tasks */}
              {subTab === 'tasks' && (
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Action Items</span>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/60 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tasks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">No tasks created yet.</div>
                    ) : (
                      tasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4 hover:border-slate-700 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  handleUpdateTaskStatus(
                                    t.id,
                                    t.status === 'done' ? 'todo' : 'done'
                                  )
                                }
                                className="text-slate-500 hover:text-indigo-400"
                              >
                                {t.status === 'done' ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </button>
                              <span
                                className={`text-sm font-medium ${
                                  t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                                }`}
                              >
                                {t.title}
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-xs text-slate-400 pl-7">{t.description}</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value as TaskStatus)}
                              className="text-xs border border-slate-700 rounded-lg px-2 py-1 bg-slate-900 text-slate-200 font-medium focus:outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Completed</option>
                            </select>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab: AI Fusions */}
              {subTab === 'fusions' && (
                <div className="p-6 space-y-6">
                  {/* Trigger Fusion Box */}
                  <div className="p-5 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl">
                    <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm mb-1">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span>Synthesize Project Knowledge & Identify Conflicts</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Runs an OpenAI synthesis across all approved team and project memories. Detects opposing rules and creates a verifiable draft record.
                    </p>
                    <form onSubmit={handleTriggerFusion} className="flex gap-2">
                      <input
                        type="text"
                        value={fusionTopic}
                        onChange={(e) => setFusionTopic(e.target.value)}
                        placeholder="Focus topic (optional, e.g. 'Authentication architecture' or 'Release deadlines')..."
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isFusing}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isFusing ? 'Synthesizing...' : 'Generate Fusion'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Fusions List */}
                  <div className="space-y-4">
                    {fusions.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No synthesis records generated yet. Click Generate Fusion above.
                      </div>
                    ) : (
                      fusions.map((f) => (
                        <div key={f.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                  f.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {f.status}
                              </span>
                              {f.topic && <span className="text-xs font-bold text-slate-700">Topic: {f.topic}</span>}
                            </div>

                            {f.status === 'draft' && (currentRole === 'owner' || currentRole === 'admin') && (
                              <button
                                onClick={() => handleConfirmFusion(f.id)}
                                className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Confirm Draft</span>
                              </button>
                            )}
                          </div>

                          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {f.synthesis}
                          </div>

                          {/* Conflict Groups */}
                          {f.conflictGroups && f.conflictGroups.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <div className="flex items-center space-x-1 text-xs font-bold text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                <span>Identified Contradictions / Conflicts:</span>
                              </div>
                              {f.conflictGroups.map((cg, idx) => (
                                <div key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1">
                                  {cg.topic && <div className="font-semibold text-amber-900">{cg.topic}</div>}
                                  <div className="text-amber-800">{cg.description}</div>
                                  <div className="text-[11px] font-mono text-amber-700">
                                    Conflicting Sources: {cg.memoryIds.map((id) => id.slice(-6)).join(', ')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Source Citations */}
                          {f.sourceMemoryIds && f.sourceMemoryIds.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center text-xs text-slate-400">
                              <span>Cited Memories:</span>
                              {f.sourceMemoryIds.map((sid) => (
                                <span key={sid} className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-600">
                                  {sid.slice(-6)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab: Members */}
              {subTab === 'members' && (
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Assigned Project Members</span>
                  </div>

                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="Add team member by email..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Assign
                    </button>
                  </form>

                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.userId}
                        className="p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.email}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium uppercase">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Select a project from the left or create one to view tasks and knowledge fusions.
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Backend Core API"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Goals, boundaries, or requirements for this project workspace..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Project Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Implement Atlas vector pre-filtering..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Actionable details and checklist items..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
